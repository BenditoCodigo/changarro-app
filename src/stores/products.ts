import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { db, type Product } from '@/services/db'
import { deleteProductImage } from '@/composables/useProductImages'

export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([])
  const isLoading = ref(false)

  const activeProducts = computed(() => products.value.filter((p) => p.isActive))

  async function loadProducts() {
    isLoading.value = true
    try {
      products.value = await db.products.orderBy('createdAt').reverse().toArray()
    } finally {
      isLoading.value = false
    }
  }

  async function getProductById(id: string): Promise<Product | undefined> {
    return await db.products.get(id)
  }

  async function getProductByBarcode(barcode: string): Promise<Product | undefined> {
    if (!barcode) return undefined
    return await db.products.where('barcode').equals(barcode).first()
  }

  async function createProduct(data: {
    name: string
    price: number
    category: string
    unit: string
    barcode?: string
  }): Promise<Product> {
    const now = new Date().toISOString()
    const product: Product = {
      id: crypto.randomUUID(),
      name: data.name,
      price: data.price,
      category: data.category,
      unit: data.unit,
      barcode: data.barcode?.trim() || undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
    await db.products.add(product)
    products.value.unshift(product)
    return product
  }

  async function updateProduct(
    id: string,
    data: { name?: string; price?: number; category?: string; unit?: string; barcode?: string; isActive?: boolean },
  ): Promise<void> {
    const updatedAt = new Date().toISOString()
    const payload = {
      ...data,
      barcode: data.barcode !== undefined ? (data.barcode.trim() || undefined) : undefined,
      updatedAt,
    }
    await db.products.update(id, payload)
    const index = products.value.findIndex((p) => p.id === id)
    const existing = products.value[index]
    if (index !== -1 && existing) {
      products.value[index] = { ...existing, ...payload }
    }
  }

  async function deleteProduct(id: string): Promise<void> {
    await db.products.delete(id)
    await deleteProductImage(id)
    products.value = products.value.filter((p) => p.id !== id)
  }

  return {
    products,
    activeProducts,
    isLoading,
    loadProducts,
    getProductById,
    getProductByBarcode,
    createProduct,
    updateProduct,
    deleteProduct,
  }
})
