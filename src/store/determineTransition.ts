export type TankState =
  | 'Available'
  | 'InUse'
  | 'Retrieved'
  | 'ToBeDiscarded'
  | 'Discarded'

export type TankOperation =
  | 'use_tanks'
  | 'retrieve_tanks'
  | 'refill_tanks'
  | 'testfail_tanks'
  | 'discard_tanks'

export type NormalTransition = {
  nextState: TankState
  isNormal: true
  exceptionType: null
}

export type ExceptionTransition = {
  nextState: TankState
  isNormal: false
  exceptionType: string
}

export type TransitionResult = NormalTransition | ExceptionTransition

export type GPSLocation =
  | {
      lat: number
      lng: number
    }
  | null

export function determineTransition(currentState: TankState, operation: TankOperation): TransitionResult {
  const nextStateMap: Record<TankOperation, TankState> = {
    use_tanks: 'InUse',
    retrieve_tanks: 'Retrieved',
    refill_tanks: 'Available',
    testfail_tanks: 'ToBeDiscarded',
    discard_tanks: 'Discarded',
  }

  const nextState = nextStateMap[operation]

  const normalTransitions = new Set([
    'Available→InUse',
    'InUse→Retrieved',
    'Retrieved→Available',
    'ToBeDiscarded→Discarded',
  ])

  const transitionKey = `${currentState}→${nextState}`

  if (normalTransitions.has(transitionKey)) {
    return {
      nextState,
      isNormal: true,
      exceptionType: null,
    }
  }

  const exceptionTransitions = new Set([
    'Available→Retrieved',
    'InUse→Available',
    'InUse→ToBeDiscarded',
    'Available→ToBeDiscarded',
    'Retrieved→ToBeDiscarded',
  ])

  if (exceptionTransitions.has(transitionKey)) {
    return {
      nextState,
      isNormal: false,
      exceptionType: transitionKey,
    }
  }

  throw new Error(`禁止された状態遷移: ${transitionKey}`)
}