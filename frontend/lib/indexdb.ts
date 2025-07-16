interface CacheData {
  key: string
  data: any
  timestamp: number
  expiry?: number
}

class IndexedDBCache {
  private dbName = "skybooker-cache"
  private version = 1
  private storeName = "cache"

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "key" })
        }
      }
    })
  }

  async set(key: string, data: any, expiryMinutes = 60): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], "readwrite")
      const store = transaction.objectStore(this.storeName)

      const cacheData: CacheData = {
        key,
        data,
        timestamp: Date.now(),
        expiry: expiryMinutes * 60 * 1000,
      }

      await store.put(cacheData)
    } catch (error) {
      console.error("IndexedDB set error:", error)
    }
  }

  async get(key: string): Promise<any | null> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], "readonly")
      const store = transaction.objectStore(this.storeName)

      return new Promise((resolve) => {
        const request = store.get(key)
        request.onsuccess = () => {
          const result = request.result as CacheData
          if (!result) {
            resolve(null)
            return
          }

          // Check if expired
          if (result.expiry && Date.now() - result.timestamp > result.expiry) {
            this.delete(key)
            resolve(null)
            return
          }

          resolve(result.data)
        }
        request.onerror = () => resolve(null)
      })
    } catch (error) {
      console.error("IndexedDB get error:", error)
      return null
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], "readwrite")
      const store = transaction.objectStore(this.storeName)
      await store.delete(key)
    } catch (error) {
      console.error("IndexedDB delete error:", error)
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], "readwrite")
      const store = transaction.objectStore(this.storeName)
      await store.clear()
    } catch (error) {
      console.error("IndexedDB clear error:", error)
    }
  }
}

export const cache = new IndexedDBCache()
