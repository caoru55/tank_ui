'use client'

import { useEffect, useRef, useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import TankNumberBoom from './TankNumberBoom'
import { useTankStore } from '@/src/store/tankStore'
import { OPERATION_COLORS } from '@/src/store/operationTheme'
import { parseQrCode, verifyCrc16 } from '@/src/store/qrCode'
import { playError, playSuccess } from '@/src/store/sound'
import { UI } from '@/src/store/uiTheme'
import type { TankOperation } from '@/src/store/determineTransition'

type QRScannerProps = {
  operation: TankOperation
}

const getScannedCodeForDisplay = (result: unknown): string | null => {
  if (typeof result === 'string') {
    const value = result.trim()
    return value.length > 0 ? value : null
  }

  if (Array.isArray(result) && result.length > 0) {
    const first = result[0] as { rawValue?: unknown }
    if (typeof first?.rawValue === 'string') {
      const value = first.rawValue.trim()
      return value.length > 0 ? value : null
    }
  }

  return null
}

export default function QRScannerPanel({ operation }: QRScannerProps) {
  const transitionStatus = useTankStore((s) => s.transitionStatus)
  const setLastScannedTank = useTankStore((s) => s.setLastScannedTank)
  const setErrorMessage = useTankStore((s) => s.setErrorMessage)
  const [isAbnormalBorder, setIsAbnormalBorder] = useState(false)
  const cooldownRef = useRef(false)
  const clearTimerRef = useRef<number | null>(null)
  const abnormalTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current)
      }
      if (abnormalTimerRef.current !== null) {
        window.clearTimeout(abnormalTimerRef.current)
      }
    }
  }, [])

  const handleScan = async (result: unknown) => {
    if (cooldownRef.current) return

    const scannedRaw = getScannedCodeForDisplay(result)
    if (!scannedRaw) return

    let tankNumber: string
    try {
      const parsed = parseQrCode(scannedRaw)
      tankNumber = parsed.tankNumber

      if (parsed.crcHex && !verifyCrc16(parsed.tankNumber, parsed.crcHex)) {
        throw new Error(`QRコードのCRC16検証に失敗しました（${parsed.raw}）`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'QRコードの解析に失敗しました'
      setErrorMessage(message)
      playError()
      navigator.vibrate?.(200)
      return
    }

    cooldownRef.current = true
    setLastScannedTank(scannedRaw ?? tankNumber)

    await transitionStatus(tankNumber)

    const { errorMessage, lastTransition } = useTankStore.getState()
    const isCurrentScanTransition = lastTransition?.tank === tankNumber
    const isNormalTransition = isCurrentScanTransition ? lastTransition?.isNormal === true : false
    const isAbnormalTransition = isCurrentScanTransition ? lastTransition?.isNormal === false : false

    if (isNormalTransition) {
      playSuccess()
      navigator.vibrate?.(50)
    } else if (errorMessage || isAbnormalTransition) {
      playError()

      if (isAbnormalTransition) {
        navigator.vibrate?.([100, 50, 100])
        setIsAbnormalBorder(true)
        if (abnormalTimerRef.current !== null) {
          window.clearTimeout(abnormalTimerRef.current)
        }
        abnormalTimerRef.current = window.setTimeout(() => {
          setIsAbnormalBorder(false)
        }, 700)
      } else {
        navigator.vibrate?.(200)
      }
    } else {
      navigator.vibrate?.([100, 50, 100])
      playError()
    }

    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current)
    }

    clearTimerRef.current = window.setTimeout(() => {
      cooldownRef.current = false
      setLastScannedTank(null)
    }, 700)
  }

  return (
    <div
      style={{
        position: 'relative',
        border: `4px solid ${isAbnormalBorder ? '#d32f2f' : OPERATION_COLORS[operation]}`,
        borderRadius: UI.radius,
        padding: 6,
        boxShadow: UI.shadow,
        transition: 'border-color 700ms ease-out',
        background: '#fff',
      }}
    >
      <TankNumberBoom />
      <Scanner
        onScan={handleScan}
        onError={(err) => console.error(err)}
        constraints={{ facingMode: 'environment' }}
      />
    </div>
  )
}