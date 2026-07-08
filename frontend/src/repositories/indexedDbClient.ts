import { DB_NAME, DB_VERSION } from '@/constants/app'
import type { GraphLink, GraphNode, JournalDay, KnowledgeEntry, NoteItem, Source } from '@/types/knowledge'

export const STORE_NAMES = {
  knowledge: 'knowledge',
  sources: 'sources',
  notes: 'notes',
  journal: 'journal',
  graphNodes: 'graphNodes',
  graphLinks: 'graphLinks',
} as const

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES]

interface StoreMap {
  knowledge: KnowledgeEntry
  sources: Source
  notes: NoteItem
  journal: JournalDay
  graphNodes: GraphNode
  graphLinks: GraphLink & { id: string }
}

let dbPromise: Promise<IDBDatabase> | null = null

function getKeyPath(storeName: StoreName): string {
  if (storeName === STORE_NAMES.knowledge) return 'slug'
  if (storeName === STORE_NAMES.journal) return 'date'
  return 'id'
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      Object.values(STORE_NAMES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: getKeyPath(storeName) })
        }
      })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'))
  })
  return dbPromise
}

export async function getAllFromStore<K extends keyof StoreMap>(storeName: K): Promise<StoreMap[K][]> {
  const db = await openDatabase()
  const tx = db.transaction(storeName, 'readonly')
  return requestToPromise(tx.objectStore(storeName).getAll())
}

export async function getFromStore<K extends keyof StoreMap>(storeName: K, key: string): Promise<StoreMap[K] | undefined> {
  const db = await openDatabase()
  const tx = db.transaction(storeName, 'readonly')
  const result = await requestToPromise(tx.objectStore(storeName).get(key))
  return result as StoreMap[K] | undefined
}

export async function putInStore<K extends keyof StoreMap>(storeName: K, value: StoreMap[K]): Promise<void> {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error(`Could not save ${storeName}`))
  })
}

export async function deleteFromStore(storeName: StoreName, key: string): Promise<void> {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error(`Could not delete key from ${storeName}`))
  })
}
