const CACHE_NAME = 'tank-ui-cache-v2'
const APP_SHELL = ['/', '/qr-register/', '/help/', '/manifest.json']
const DB_NAME = 'tank-ui-offline-db'
const STORE_NAME = 'movementsQueue'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith('tank-ui-cache-') && key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const isNavigationRequest =
    request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')

  if (isNavigationRequest) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => undefined)
          return response
        })
        .catch(async () => {
          return (
            (await caches.match(request)) ||
            (await caches.match('/index.html')) ||
            (await caches.match('/qr-register/index.html')) ||
            Response.error()
          )
        }),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => undefined)
          return response
        })
        .catch(() => caches.match('/qr-register/index.html'))
    }),
  )
})

const openDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed'))
  })

const readAllQueue = async () => {
  const db = await openDb()
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error || new Error('Queue read failed'))
    tx.oncomplete = () => db.close()
  })
}

const deleteById = async (id) => {
  const db = await openDb()
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => resolve(undefined)
    request.onerror = () => reject(request.error || new Error('Queue delete failed'))
    tx.oncomplete = () => db.close()
  })
}

const sendQueuedMovements = async () => {
  const queue = await readAllQueue()

  for (const item of queue) {
    if (typeof item?.id !== 'number') continue

    try {
      const response = await fetch('http://163.44.121.247:5000/api/movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${item.token}`,
        },
        body: JSON.stringify(item.payload),
      })

      if (response.ok) {
        await deleteById(item.id)
        continue
      }

      if (response.status >= 500) {
        break
      }

      await deleteById(item.id)
    } catch {
      break
    }
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-movements') {
    event.waitUntil(sendQueuedMovements())
  }
})