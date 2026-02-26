import type { TankOperation } from './determineTransition'

export function buildPayload(
  operation: TankOperation,
  tanks: string[],
  extraFields?: Record<string, unknown>
): Record<string, unknown> {
  return {
    [operation]: tanks,
    ...(extraFields ?? {}),
  }
}