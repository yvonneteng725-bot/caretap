// Queues log writes in IndexedDB when the device is offline, and flushes
// them to Supabase once connectivity returns.
import { supabase } from './supabase'
import type { Log } from '../types'

const DB_NAME = 'caretap-offline'
const STORE_NAME = 'queued-logs'
const DB_VERSION = 1

export type QueuedLog = Partial<Log> & {
  queueId: string
  elder_id: string
  card_type: Log['card_type']
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'queueId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueueLog(entry: QueuedLog): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(entry)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getQueuedLogs(): Promise<QueuedLog[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result as QueuedLog[])
    req.onerror = () => reject(req.error)
  })
}

async function removeQueuedLog(queueId: string): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(queueId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export type SyncListener = (count: number) => void
const syncListeners = new Set<SyncListener>()

export function onQueueSynced(listener: SyncListener): () => void {
  syncListeners.add(listener)
  return () => syncListeners.delete(listener)
}

export async function flushQueue(): Promise<void> {
  const queued = await getQueuedLogs()
  if (queued.length === 0) return

  let syncedCount = 0
  for (const entry of queued) {
    const { queueId, ...log } = entry
    const { error } = await supabase.from('logs').insert(log)
    if (!error) {
      await removeQueuedLog(queueId)
      syncedCount++
    }
  }
  if (syncedCount > 0) {
    syncListeners.forEach((listener) => listener(syncedCount))
  }
}

export function initOfflineSync(): void {
  window.addEventListener('online', () => {
    flushQueue().catch(() => {
      // will retry on the next 'online' event or app load
    })
  })
  if (navigator.onLine) {
    flushQueue().catch(() => {})
  }
}
