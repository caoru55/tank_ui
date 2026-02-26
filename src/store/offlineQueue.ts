type MovementQueueItem = {
  payload: Record<string, unknown>
  token: string
  queuedAt: string
}

const DB_NAME = 'tank-ui-offline-db'
const STORE_NAME = 'movementsQueue'
const KEY_PATH = 'id'

type QueueRecord = MovementQueueItem & { id?: number }
type ServiceWorkerRegistrationWithSync = ServiceWorkerRegistration & {
  sync?: {
    register: (tag: string) => Promise<void>
  }
}

const openQueueDb = async (): Promise<IDBDatabase> =>
  await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: KEY_PATH, autoIncrement: true })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
  })

const runTransaction = async <T>(
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore, done: (value: T) => void, fail: (error: unknown) => void) => void,
): Promise<T> => {
  const db = await openQueueDb()

  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const store = tx.objectStore(STORE_NAME)
    runner(store, resolve, reject)
    tx.oncomplete = () => db.close()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
  })
}

export const enqueueMovement = async (item: MovementQueueItem): Promise<void> => {
  await runTransaction<void>('readwrite', (store, done, fail) => {
    const request = store.add(item)
    request.onsuccess = () => done()
    request.onerror = () => fail(request.error ?? new Error('Queue add failed'))
  })

  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => (registration as ServiceWorkerRegistrationWithSync).sync?.register('sync-movements'))
      .catch(() => undefined)
  }
}

export const getQueuedMovements = async (): Promise<QueueRecord[]> =>
  await runTransaction<QueueRecord[]>('readonly', (store, done, fail) => {
    const request = store.getAll()
    request.onsuccess = () => done((request.result ?? []) as QueueRecord[])
    request.onerror = () => fail(request.error ?? new Error('Queue read failed'))
  })

export const removeQueuedMovement = async (id: number): Promise<void> => {
  await runTransaction<void>('readwrite', (store, done, fail) => {
    const request = store.delete(id)
    request.onsuccess = () => done()
    request.onerror = () => fail(request.error ?? new Error('Queue delete failed'))
  })
}

export const sendQueuedMovements = async (): Promise<void> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return
  }

  const queue = await getQueuedMovements()

  for (const item of queue) {
    if (typeof item.id !== 'number') continue

    const response = await fetch('/api/movements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${item.token}`,
      },
      body: JSON.stringify(item.payload),
    })

    if (response.ok) {
      await removeQueuedMovement(item.id)
      continue
    }

    if (response.status >= 500) {
      break
    }

    await removeQueuedMovement(item.id)
  }
}

export const isLikelyOfflineError = (error: unknown): boolean => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true
  }

  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return message.includes('failed to fetch') || message.includes('networkerror') || message.includes('network request failed')
}

export type { MovementQueueItem, QueueRecord }