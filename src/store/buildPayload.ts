import type { TankOperation } from './determineTransition'

export function buildPayload(operation: TankOperation, tankNumber: string): Record<string, string[]> {
  return {
    [operation]: [tankNumber],
  }
}