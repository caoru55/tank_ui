'use client'

import { useMemo, useState } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FeedbackLayer from './FeedbackLayer'
import LogPanel from './LogPanel'
import QRScannerPanel from './QRScanner'
import StatusPanel from './StatusPanel'
import TankNumberBoom from './TankNumberBoom'
import {
  OPERATION_COLORS,
  OPERATION_ICONS,
  OPERATION_LABELS,
  OPERATION_VOICE,
} from '@/src/store/operationTheme'
import { speak } from '@/src/store/speak'
import { useTankStore } from '@/src/store/tankStore'
import { UI } from '@/src/store/uiTheme'
import type { TankOperation } from '@/src/store/determineTransition'

const modes: TankOperation[] = ['use_tanks', 'retrieve_tanks', 'refill_tanks', 'testfail_tanks', 'discard_tanks']

export default function QRRegisterPage() {
  const router = useRouter()
  const [operation, setOperation] = useState<TankOperation>('retrieve_tanks')
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const fetchStatuses = useTankStore((s) => s.fetchStatuses)
  const setJwtToken = useTankStore((s) => s.setJwtToken)
  const setCurrentOperation = useTankStore((s) => s.setCurrentOperation)
  const sendQueue = useTankStore((s) => s.sendQueue)
  const scannedTanks = useTankStore((s) => s.scannedTanks)

  const themeColor = useMemo(() => OPERATION_COLORS[operation], [operation])

  useEffect(() => {
    const token = window.localStorage.getItem('jwt')
    const user = window.localStorage.getItem('user')

    if (!token || !user) {
      router.replace('/')
      return
    }

    try {
      JSON.parse(user)
    } catch {
      window.localStorage.removeItem('jwt')
      window.localStorage.removeItem('user')
      router.replace('/')
      return
    }

    setJwtToken(token)
    setCurrentOperation(operation)
    void fetchStatuses()
    setIsAuthReady(true)
  }, [fetchStatuses, operation, router, setCurrentOperation, setJwtToken])

  if (!isAuthReady) {
    return <p style={{ padding: 20 }}>認証状態を確認中…</p>
  }

  const handleModeChange = (op: TankOperation) => {
    setOperation(op)
    setCurrentOperation(op)
    speak(OPERATION_VOICE[op])
  }

  const handleSendQueue = async () => {
    if (isSending || scannedTanks.length === 0) {
      return
    }

    setIsSending(true)
    try {
      await sendQueue()
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 20,
        background: `linear-gradient(180deg, ${themeColor}22 0%, ${themeColor}11 40%, transparent 100%)`,
        transition: `background ${UI.transition}`,
      }}
    >
      <h1 style={{ marginBottom: 16, fontSize: 28, fontWeight: 700 }}>QR 登録機</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {modes.map((mode) => {
          const isSelected = operation === mode
          return (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              style={{
                padding: '12px 18px',
                borderRadius: UI.radius,
                border: 'none',
                background: isSelected ? OPERATION_COLORS[mode] : '#f3f3f3',
                color: isSelected ? '#fff' : '#333',
                boxShadow: isSelected ? UI.shadow : 'none',
                transition: UI.transition,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              <span>{OPERATION_ICONS[mode]}</span>
              <span>{OPERATION_LABELS[mode]}</span>
            </button>
          )
        })}
      </div>

      <div style={{ position: 'relative', borderRadius: UI.radius, overflow: 'hidden' }}>
        <FeedbackLayer operation={operation} />
        <TankNumberBoom operation={operation} />
        <StatusPanel />
        <div style={{ marginTop: 12 }}>
          <QRScannerPanel operation={operation} />
        </div>
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => void handleSendQueue()}
            disabled={isSending || scannedTanks.length === 0}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: UI.radius,
              border: 'none',
              background: themeColor,
              color: '#fff',
              boxShadow: UI.shadow,
              opacity: isSending || scannedTanks.length === 0 ? 0.6 : 1,
              cursor: isSending || scannedTanks.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {isSending ? '送信中…' : `一括送信 (${scannedTanks.length})`}
          </button>
        </div>
      </div>

      <LogPanel />
    </div>
  )
}