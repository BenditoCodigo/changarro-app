import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProductsStore } from './products'
import { db } from '@/services/db'

describe('Products Store - Barcode & CRUD', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await db.products.clear()
  })

  it('createProduct saves product with barcode and persists to IndexedDB', async () => {
    const store = useProductsStore()
    const product = await store.createProduct({
      name: 'Sabritas Sal 45g',
      price: 18.5,
      category: 'PRODUCTO',
      unit: 'pieza',
      barcode: '7501000111223',
    })

    expect(product.id).toBeDefined()
    expect(product.barcode).toBe('7501000111223')
    expect(store.products).toHaveLength(1)
    expect(store.products[0]?.barcode).toBe('7501000111223')

    const fromDb = await db.products.get(product.id)
    expect(fromDb).toBeDefined()
    expect(fromDb?.barcode).toBe('7501000111223')
  })

  it('updateProduct modifies barcode of an existing product', async () => {
    const store = useProductsStore()
    const product = await store.createProduct({
      name: 'Coca Cola 600ml',
      price: 20,
      category: 'PRODUCTO',
      unit: 'pieza',
    })

    expect(product.barcode).toBeUndefined()

    await store.updateProduct(product.id, { barcode: '7501055300078' })

    expect(store.products[0]?.barcode).toBe('7501055300078')

    const fromDb = await db.products.get(product.id)
    expect(fromDb?.barcode).toBe('7501055300078')
  })

  it('getProductByBarcode retrieves correct product by exact barcode match', async () => {
    const store = useProductsStore()
    await store.createProduct({
      name: 'Galletas Chokis',
      price: 22,
      category: 'PRODUCTO',
      unit: 'pieza',
      barcode: '7501055300078',
    })

    const found = await store.getProductByBarcode('7501055300078')
    expect(found).toBeDefined()
    expect(found?.name).toBe('Galletas Chokis')

    const notFound = await store.getProductByBarcode('9999999999999')
    expect(notFound).toBeUndefined()
  })

  it('deleteProduct removes product from store and IndexedDB', async () => {
    const store = useProductsStore()
    const product = await store.createProduct({
      name: 'Pan Bimbo',
      price: 45,
      category: 'PRODUCTO',
      unit: 'pieza',
      barcode: '7501000000011',
    })

    await store.deleteProduct(product.id)

    expect(store.products).toHaveLength(0)
    const fromDb = await db.products.get(product.id)
    expect(fromDb).toBeUndefined()
  })
})
