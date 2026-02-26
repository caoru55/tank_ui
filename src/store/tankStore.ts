import { create } from 'zustand'
import { buildPayload } from './buildPayload'
import { determineTransition, type TankOperation, type TankState, type TransitionResult } from './determineTransition'
import { enqueueMovement, isLikelyOfflineError } from './offlineQueue'
import { postMovement } from './postMovement'

const TANK_STATUS_KEYS = ['Available', 'InUse', 'Retrieved', 'ToBeDiscarded', 'Discarded'] as const

type TankStatusKey = (typeof TANK_STATUS_KEYS)[number]

export type TankStatuses = Record<TankStatusKey, string[]>

type ParsedTankStatuses = {
  statuses: TankStatuses
  updatedAt: string
}

export type LastTransition = {
  tank: string
  from: TankState
  to: TankState
  operation: TankOperation
  timestamp: string
  isNormal: boolean
  exceptionType: string | null
}

const TANK_STATUSES_ENDPOINT = '/api/tanks/statuses'

const createEmptyStatuses = (): TankStatuses => ({
  Available: [],
  InUse: [],
  Retrieved: [],
  ToBeDiscarded: [],
  Discarded: [],
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback

const getCurrentGps = async (): Promise<{ lat: number; lng: number }> => {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    throw new Error('GPS が利用できません')
  }

  return await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      () => reject(new Error('GPS の取得に失敗しました')),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 },
    )
  })
}

const findTankState = (statuses: TankStatuses, tankNumber: string): TankState | null => {
  for (const key of TANK_STATUS_KEYS) {
    if (statuses[key].includes(tankNumber)) {
      return key
    }
  }

  return null
}

const parseTankStatusesResponse = (payload: unknown): ParsedTankStatuses => {
  if (!isRecord(payload)) {
    throw new Error('Invalid API response: expected object payload')
  }

  const rawStatuses = payload.statuses
  const rawUpdatedAt = payload.updated_at

  if (!isRecord(rawStatuses)) {
    throw new Error('Invalid API response: "statuses" is missing or invalid')
  }

  if (typeof rawUpdatedAt !== 'string' || rawUpdatedAt.length === 0) {
    throw new Error('Invalid API response: "updated_at" is missing or invalid')
  }

  const normalizedStatuses = createEmptyStatuses()

  for (const key of TANK_STATUS_KEYS) {
    const value = rawStatuses[key]

    if (!Array.isArray(value)) {
      normalizedStatuses[key] = []
      continue
    }

    normalizedStatuses[key] = value.filter((item): item is string => typeof item === 'string')
  }

  return {
    statuses: normalizedStatuses,
    updatedAt: rawUpdatedAt,
  }
}

type TankStore = {
  statuses: TankStatuses | null
  updatedAt: string | null
  isLoading: boolean
  errorMessage: string | null
  jwtToken: string | null
  lastTransition: LastTransition | null
  logs: LastTransition[]
  lastScannedTank: string | null
  currentOperation: TankOperation
  scannedTanks: string[]
  setJwtToken: (token: string | null) => void
  setErrorMessage: (message: string | null) => void
  addLog: (entry: LastTransition) => void
  setLastScannedTank: (tank: string | null) => void
  setCurrentOperation: (operation: TankOperation) => void
  fetchStatuses: () => Promise<void>
  transitionStatus: (tankNumber: string) => Promise<void>
  addScannedTank: (tankNumber: string) => void
  sendQueue: () => Promise<void>
}

export const useTankStore = create<TankStore>((set, get) => ({
  statuses: null,
  updatedAt: null,
  isLoading: false,
  errorMessage: null,
  jwtToken: null,
  lastTransition: null,
  logs: [],
  lastScannedTank: null,
  currentOperation: 'retrieve_tanks',
  scannedTanks: [],
  setJwtToken: (token) => {
    set({ jwtToken: token })
  },
  setErrorMessage: (message) => {
    set({ errorMessage: message })
  },
  addLog: (entry) => {
    set((state) => ({
      logs: [entry, ...state.logs].slice(0, 20),
    }))
  },
  setLastScannedTank: (tank) => {
    set({ lastScannedTank: tank })
  },
  setCurrentOperation: (operation) => {
    set({ currentOperation: operation })
  },
  fetchStatuses: async () => {
    set({ isLoading: true, errorMessage: null })

    try {
      const response = await fetch(TANK_STATUSES_ENDPOINT, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(`Failed to fetch tank statuses: ${response.status}${detail ? ` ${detail}` : ''}`)
      }

      const payload: unknown = await response.json()
      const parsed = parseTankStatusesResponse(payload)

      set({ statuses: parsed.statuses, updatedAt: parsed.updatedAt, isLoading: false, errorMessage: null })
    } catch (error) {
      const message = getErrorMessage(error, 'Unexpected error while fetching tank statuses')
      set({ isLoading: false, errorMessage: message })
    }
  },
  transitionStatus: async (tankNumber: string) => {
    const state = get()
    const operation = state.currentOperation

    if (!state.statuses) {
      set({ errorMessage: 'タンク状態が未取得です。先に状態を取得してください。' })
      return
    }

    const currentState = findTankState(state.statuses, tankNumber)
    if (!currentState) {
      set({ errorMessage: `タンク ${tankNumber} の状態が取得できません` })
      return
    }

    let transition: TransitionResult
    try {
      transition = determineTransition(currentState, operation)
    } catch (error) {
      set({ errorMessage: getErrorMessage(error, '状態遷移の判定に失敗しました') })
      return
    }

    const nextLog: LastTransition = {
      tank: tankNumber,
      from: currentState,
      to: transition.nextState,
      operation,
      timestamp: new Date().toISOString(),
      isNormal: transition.isNormal,
      exceptionType: transition.exceptionType,
    }

    set((prev) => ({
      errorMessage: null,
      lastTransition: nextLog,
      scannedTanks: [...prev.scannedTanks, tankNumber],
    }))

    get().addLog(nextLog)
  },
  addScannedTank: (tankNumber) => {
    set((state) => ({
      scannedTanks: [...state.scannedTanks, tankNumber],
    }))
  },
  sendQueue: async () => {
    const state = get()

    if (state.scannedTanks.length === 0) {
      return
    }

    const token = state.jwtToken ?? (typeof window !== 'undefined' ? window.localStorage.getItem('jwt') : null)

    if (!token) {
      set({ errorMessage: 'JWT が未設定です。再ログインしてください。' })
      return
    }

    if (!state.jwtToken) {
      set({ jwtToken: token })
    }

    let gps: { lat: number; lng: number }
    try {
      gps = await getCurrentGps()
    } catch (error) {
      set({ errorMessage: getErrorMessage(error, 'GPS の取得に失敗しました') })
      return
    }

    const payload = buildPayload(state.currentOperation, state.scannedTanks, {
      gps_lat: gps.lat,
      gps_lng: gps.lng,
    })

    const queuedAt = new Date().toISOString()

    try {
      await postMovement(payload, token)
    } catch (error) {
      if (isLikelyOfflineError(error)) {
        try {
          await enqueueMovement({ payload, token, queuedAt })
          set({
            errorMessage: 'オフラインのためキューに保存しました。オンライン復帰後に同期されます。',
          })
          return
        } catch {
          set({ errorMessage: 'オフラインキューへの保存に失敗しました' })
          return
        }
      }

      set({ errorMessage: getErrorMessage(error, 'Movements API 呼び出しに失敗しました') })
      return
    }

    set({
      scannedTanks: [],
      errorMessage: null,
    })

    await get().fetchStatuses()
  },
}))