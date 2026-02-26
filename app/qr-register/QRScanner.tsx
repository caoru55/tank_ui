'use client'

import { useEffect, useRef, useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { useTankStore } from '@/src/store/tankStore'
import { OPERATION_COLORS } from '@/src/store/operationTheme'
import { playBeep } from '@/src/store/playBeep'
import { parseQrCode, verifyCrc16 } from '@/src/store/qrCode'
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
  const [isCooldown, setIsCooldown] = useState(false)
  const cooldownRef = useRef(false)
  const clearTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current)
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
      playBeep('error')
      navigator.vibrate?.(200)
      return
    }

    cooldownRef.current = true
    setIsCooldown(true)
    setLastScannedTank(scannedRaw ?? tankNumber)

    await transitionStatus(tankNumber)

    const { errorMessage, lastTransition } = useTankStore.getState()

    if (errorMessage) {
      playBeep('error')
      navigator.vibrate?.(200)
    } else if (lastTransition && !lastTransition.isNormal) {
      playBeep('exception')
      navigator.vibrate?.([100, 50, 100])
    } else {
      playBeep('success')
      navigator.vibrate?.(50)
    }

    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current)
    }

    clearTimerRef.current = window.setTimeout(() => {
      cooldownRef.current = false
      setIsCooldown(false)
      setLastScannedTank(null)
    }, 800)
  }

  return (
    <div
      style={{
        border: `4px solid ${OPERATION_COLORS[operation]}`,
        borderRadius: UI.radius,
        padding: 6,
        boxShadow: UI.shadow,
        transition: `border-color ${UI.transition}`,
        background: '#fff',
      }}
    >
      <Scanner
        onScan={handleScan}
        onError={(err) => console.error(err)}
        constraints={{ facingMode: 'environment' }}
      />
      {isCooldown && <p style={{ marginTop: 10, color: '#666' }}>次のスキャンを準備中…</p>}
    </div>
  )
}