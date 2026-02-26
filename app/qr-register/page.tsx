'use client'

import { useMemo, useState } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LogPanel from './LogPanel'
import QRScannerPanel from './QRScanner'
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
  const fetchStatuses = useTankStore((s) => s.fetchStatuses)
  const setJwtToken = useTankStore((s) => s.setJwtToken)
  const setCurrentOperation = useTankStore((s) => s.setCurrentOperation)
  const scannedTanks = useTankStore((s) => s.scannedTanks)

  const themeColor = useMemo(() => OPERATION_COLORS[operation], [operation])

  const isAuthReady = useMemo(() => {
    if (typeof window === 'undefined') {
      return false
    }

    const token = window.localStorage.getItem('jwt')
    const user = window.localStorage.getItem('user')

    if (!token || !user) {
      return false
    }

    try {
      JSON.parse(user)
      return true
    } catch {
      return false
    }
  }, [])

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
  }, [fetchStatuses, operation, router, setCurrentOperation, setJwtToken])

  if (!isAuthReady) {
    return <p style={{ padding: 20 }}>認証状態を確認中…</p>
  }

  const handleModeChange = (op: TankOperation) => {
    if (op === operation) {
      return
    }

    if (scannedTanks.length > 0) {
      const ok = window.confirm('操作モードを切り替えてもよろしいですか？\n注意：読み取ったタンク一覧は消去されます。')
      if (!ok) {
        return
      }

      useTankStore.setState({ scannedTanks: [] })
    }

    setOperation(op)
    setCurrentOperation(op)
    speak(OPERATION_VOICE[op])
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
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          paddingBottom: 12,
          marginBottom: 12,
          background: `linear-gradient(180deg, ${themeColor}22 0%, ${themeColor}10 70%, transparent 100%)`,
        }}
      >
        <div style={{ position: 'relative', borderRadius: UI.radius, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <QRScannerPanel operation={operation} />
            </div>
            <div style={{ width: 68, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {modes.map((mode) => {
                const isSelected = operation === mode
                return (
                  <button
                    key={mode}
                    onClick={() => handleModeChange(mode)}
                    title={OPERATION_LABELS[mode]}
                    aria-label={OPERATION_LABELS[mode]}
                    style={{
                      width: 60,
                      height: 44,
                      borderRadius: 8,
                      border: 'none',
                      background: isSelected ? OPERATION_COLORS[mode] : '#f3f3f3',
                      color: isSelected ? '#fff' : '#333',
                      boxShadow: isSelected ? UI.shadow : 'none',
                      transition: UI.transition,
                      fontSize: 20,
                      fontWeight: 700,
                    }}
                  >
                    {OPERATION_ICONS[mode]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <LogPanel />
    </div>
  )
}