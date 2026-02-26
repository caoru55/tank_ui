'use client'

import { useTankStore } from '@/src/store/tankStore'
import { UI } from '@/src/store/uiTheme'

export default function StatusPanel() {
  const errorMessage = useTankStore((s) => s.errorMessage)
  const last = useTankStore((s) => s.lastTransition)
  const queuedCount = useTankStore((s) => s.scannedTanks.length)

  if (errorMessage) {
    return (
      <div
        style={{
          color: '#c62828',
          background: '#ffebee',
          borderRadius: UI.radius,
          padding: 12,
          boxShadow: UI.shadow,
        }}
      >
        <div>{errorMessage}</div>
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>送信待ち: {queuedCount} 件</div>
      </div>
    )
  }

  if (last) {
    return (
      <div
        style={{
          color: last.isNormal ? '#2e7d32' : '#ef6c00',
          background: last.isNormal ? '#e8f5e9' : '#fff8e1',
          borderRadius: UI.radius,
          padding: 12,
          boxShadow: UI.shadow,
        }}
      >
        <div style={{ fontWeight: 600 }}>
          {last.tank} : {last.from} → {last.to}
        </div>
        <div>{last.isNormal ? '正常遷移' : `例外遷移 (${last.exceptionType})`}</div>
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>送信待ち: {queuedCount} 件</div>
      </div>
    )
  }

  return (
    <div style={{ borderRadius: UI.radius, padding: 12, background: '#f6f6f6', boxShadow: UI.shadow }}>
      <div>QR を読み取ってください</div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>送信待ち: {queuedCount} 件</div>
    </div>
  )
}