import { create } from 'zustand'
import { buildPayload } from './buildPayload'
import { calcDistance } from './calcDistance'
import { determineTransition, type GPSLocation, type TankOperation, type TankState, type TransitionResult } from './determineTransition'
import { postMovement } from './postMovement'

const TANK_STATUS_KEYS = ['Available', 'InUse', 'Retrieved', 'ToBeDiscarded', 'Discarded'] as const

type TankStatusKey = (typeof TANK_STATUS_KEYS)[number]

export type TankStatuses = Record<TankStatusKey, string[]>

type ParsedTankStatuses = {
  statuses: TankStatuses
  updatedAt: string
}

type LastTransition = {
  tank: string
  from: TankState
  to: TankState
  operation: TankOperation
  timestamp: string
  isNormal: boolean
  exceptionType: string | null
}

const parseCoordinate = (value: string | undefined): number | null => {
  if (typeof value !== 'string') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const fillingStationLat = parseCoordinate(process.env.NEXT_PUBLIC_FILLING_STATION_LAT)
const fillingStationLng = parseCoordinate(process.env.NEXT_PUBLIC_FILLING_STATION_LNG)

const FILLING_STATION_LOCATION =
  fillingStationLat !== null && fillingStationLng !== null
    ? { lat: fillingStationLat, lng: fillingStationLng }
    : null

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
  setJwtToken: (token: string | null) => void
  fetchStatuses: () => Promise<void>
  transitionStatus: (tankNumber: string, operation: TankOperation, gps: GPSLocation) => Promise<void>
}

export const useTankStore = create<TankStore>((set, get) => ({
  statuses: null,
  updatedAt: null,
  isLoading: false,
  errorMessage: null,
  jwtToken: null,
  lastTransition: null,
  setJwtToken: (token) => {
    set({ jwtToken: token })
  },
  fetchStatuses: async () => {
    set({ isLoading: true, errorMessage: null })

    try {
      const response = await fetch('/api/tanks/statuses', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch tank statuses: ${response.status}`)
      }

      const payload: unknown = await response.json()
      const parsed = parseTankStatusesResponse(payload)

      set({ statuses: parsed.statuses, updatedAt: parsed.updatedAt, isLoading: false, errorMessage: null })
    } catch (error) {
      const message = getErrorMessage(error, 'Unexpected error while fetching tank statuses')
      set({ isLoading: false, errorMessage: message })
    }
  },
  transitionStatus: async (tankNumber: string, operation: TankOperation, gps: GPSLocation) => {
    const state = get()

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

    if (!transition.isNormal) {
      if (!FILLING_STATION_LOCATION) {
        set({ errorMessage: '充填所の座標が未設定です。環境変数を設定してください。' })
        return
      }

      const distance = calcDistance(gps, FILLING_STATION_LOCATION)

      if (distance > 50) {
        set({ errorMessage: `例外遷移「${transition.exceptionType}」は充填所の半径50m以内でのみ許可されます` })
        return
      }
    }

    const payload = buildPayload(operation, tankNumber)
    const token =
      state.jwtToken ?? (typeof window !== 'undefined' ? window.localStorage.getItem('jwt') : null)

    if (!token) {
      set({ errorMessage: 'JWT が未設定です。再ログインしてください。' })
      return
    }

    try {
      await postMovement(payload, token)
    } catch (error) {
      set({ errorMessage: getErrorMessage(error, 'Movements API 呼び出しに失敗しました') })
      return
    }

    await state.fetchStatuses()

    set({
      errorMessage: null,
      lastTransition: {
        tank: tankNumber,
        from: currentState,
        to: transition.nextState,
        operation,
        timestamp: new Date().toISOString(),
        isNormal: transition.isNormal,
        exceptionType: transition.exceptionType,
      },
    })
  },
}))