import { db, type AppSettings, type Product, type Sale, type CartItemRecord, type Shift } from './db'

/**
 * Converts a Blob to a Base64 string for JSON serialization.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // Extract base64 part from data URL
      const base64 = result.split(',')[1]!
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Converts a Base64 string back to a Blob for database storage.
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = Array.from({ length: byteCharacters.length }) as number[]
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

export interface BackupData {
  version: number
  exportedAt: string
  settings: AppSettings[]
  products: Product[]
  images: Array<{ productId: string; base64: string; type: string }>
  sales: Sale[]
  cartItems: CartItemRecord[]
  shifts: Shift[]
}

/**
 * Exports all settings, products, images, sales, and cartItems as a JSON string.
 */
export async function exportDatabase(): Promise<string> {
  const products = await db.products.toArray()
  const sales = await db.sales.toArray()
  const settings = await db.settings.toArray()
  const cartItems = await db.cartItems.toArray()

  // Retrieve and encode product images to Base64
  const imagesRaw = await db.productImages.toArray()
  const images = await Promise.all(
    imagesRaw.map(async (img) => {
      const base64 = await blobToBase64(img.blob)
      return {
        productId: img.productId,
        base64,
        type: img.blob.type,
      }
    })
  )

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    products,
    images,
    sales,
    cartItems,
    shifts: await db.shifts.toArray(),
  }

  return JSON.stringify(backup)
}

/**
 * Merges backup data into the local IndexedDB without deleting existing data.
 */
export async function importDatabaseMerge(backupJson: string): Promise<void> {
  const backupData = JSON.parse(backupJson) as BackupData

  if (!backupData || typeof backupData !== 'object') {
    throw new Error('Formato de archivo inválido.')
  }
  if (!Array.isArray(backupData.products) || !Array.isArray(backupData.sales)) {
    throw new Error('El archivo no contiene un formato de respaldo válido de Changarro.')
  }

  await db.transaction('rw', [db.products, db.productImages, db.sales, db.settings, db.cartItems, db.shifts], async () => {
    // Merge settings
    if (Array.isArray(backupData.settings)) {
      for (const s of backupData.settings) {
        await db.settings.put(s)
      }
    }

    // Merge products
    for (const p of backupData.products) {
      await db.products.put(p)
    }

    // Merge images
    if (Array.isArray(backupData.images)) {
      for (const img of backupData.images) {
        const blob = base64ToBlob(img.base64, img.type)
        await db.productImages.put({
          productId: img.productId,
          blob,
        })
      }
    }

    // Merge sales
    for (const s of backupData.sales) {
      await db.sales.put(s)
    }

    // Merge cartItems
    if (Array.isArray(backupData.cartItems)) {
      for (const item of backupData.cartItems) {
        await db.cartItems.put(item)
      }
    }

    // Merge shifts
    if (Array.isArray(backupData.shifts)) {
      for (const shift of backupData.shifts) {
        await db.shifts.put(shift)
      }
    }
  })
}
