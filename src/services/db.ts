import Dexie, { type EntityTable } from 'dexie'

export interface Product {
  id: string
  name: string
  price: number
  category: string
  unit: string
  barcode?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductImage {
  productId: string
  blob: Blob
}

export interface SaleItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Sale {
  id: string
  items: SaleItem[]
  subtotal: number
  taxIncluded: boolean
  taxRate: number
  taxAmount: number
  total: number
  receivedAmount?: number
  changeAmount?: number
  paymentMethod?: 'cash' | 'card' | 'transfer'
  shiftId?: number          // optional: assigned only when shifts are enabled
  createdAt: string
}

export interface Shift {
  id: number                // incremental: 1, 2, 3...
  startedAt: string         // ISO 8601
  closedAt?: string         // ISO 8601 — undefined means active
  totalCash: number         // sum of sale totals in this shift
  salesCount: number        // number of sales in this shift
  notes?: string            // optional notes written at shift close
  shortage?: number         // optional cash shortage amount (informational)
}

export interface PaymentMethodsConfig {
  cash: boolean
  card: boolean
  transfer: boolean
}

export interface AppSettings {
  id: string
  taxEnabled: boolean
  taxRate: number
  businessName: string
  currency: string
  shiftsEnabled: boolean
  barcodeScannerEnabled?: boolean
  defaultHomeTab?: 'catalog' | 'scanner'
  paymentMethods?: PaymentMethodsConfig
  transferClabe?: string
}

export interface CartItemRecord {
  id: string
  productId: string
  productName: string
  unitPrice: number
  quantity: number
}

const db = new Dexie('changarro') as Dexie & {
  products: EntityTable<Product, 'id'>
  productImages: EntityTable<ProductImage, 'productId'>
  sales: EntityTable<Sale, 'id'>
  settings: EntityTable<AppSettings, 'id'>
  cartItems: EntityTable<CartItemRecord, 'id'>
  shifts: EntityTable<Shift, 'id'>
}

db.version(4).stores({
  products: 'id, name, category, isActive, createdAt',
  productImages: 'productId',
  sales: 'id, createdAt',
  settings: 'id',
  cartItems: 'id, productId',
})

db.version(5).stores({
  products: 'id, name, category, isActive, createdAt',
  productImages: 'productId',
  sales: 'id, createdAt, shiftId',
  settings: 'id',
  cartItems: 'id, productId',
  shifts: 'id, startedAt, closedAt',
})

db.version(6).stores({
  products: 'id, name, category, barcode, isActive, createdAt',
  productImages: 'productId',
  sales: 'id, createdAt, shiftId',
  settings: 'id',
  cartItems: 'id, productId',
  shifts: 'id, startedAt, closedAt',
})

db.version(7).stores({
  products: 'id, name, category, barcode, isActive, createdAt',
  productImages: 'productId',
  sales: 'id, createdAt, shiftId',
  settings: 'id',
  cartItems: 'id, productId',
  shifts: 'id, startedAt, closedAt',
})

export { db }
