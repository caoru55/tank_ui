import { create } from 'zustand'

const TANK_STATUS_KEYS = ['Available', 'InUse', 'Retrieved', 'ToBeDiscarded', 'Discarded'] as const

type TankStatusKey = (typeof TANK_STATUS_KEYS)[number]

export type TankStatuses = Record<TankStatusKey, string[]>

type ParsedTankStatuses = {
  statuses: TankStatuses
  updatedAt: string
}

const createEmptyStatuses = (): TankStatuses => ({
  Available: [],
  InUse: [],
  Retrieved: [],
  ToBeDiscarded: [],
  Discarded: [],
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

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
  fetchStatuses: () => Promise<void>
}

export const useTankStore = create<TankStore>((set) => ({
  statuses: null,
  updatedAt: null,
  isLoading: false,
  errorMessage: null,
  fetchStatuses: async () => {
    console.log("fetchStatuses start") // ← ここにブレーク
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
      const message = error instanceof Error ? error.message : 'Unexpected error while fetching tank statuses'
      set({ isLoading: false, errorMessage: message })
    }
  },
}))