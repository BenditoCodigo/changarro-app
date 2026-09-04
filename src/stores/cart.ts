import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import { useSalesStore } from '@/stores/sales'
import { db, type Sale, type SaleItem, type CartItemRecord } from '@/services/db'

export interface CartItem {
  id: string
  productId: string
  productName: string
  unitPrice: number
  quantity: number
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const isLoaded = ref(false)

  const settingsStore = useSettingsStore()

  const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))

  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  )

  const taxEnabled = computed(() => settingsStore.taxEnabled)
  const taxRate = computed(() => settingsStore.taxRate)
  const tax = computed(() => (taxEnabled.value ? subtotal.value * taxRate.value : 0))
  const total = computed(() => subtotal.value + tax.value)

  // Load cart from IndexedDB
  async function loadCart() {
    const stored = await db.cartItems.toArray()
    items.value = stored
    isLoaded.value = true
  }

  // Persist entire cart to IndexedDB (called on every change)
  async function persistCart() {
    if (!isLoaded.value) return
    await db.cartItems.clear()
    if (items.value.length > 0) {
      const records: CartItemRecord[] = items.value.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      }))
      await db.cartItems.bulkPut(records)
    }
  }

  // Watch for changes and persist
  watch(items, persistCart, { deep: true })

  function addItem(product: { id: string; name: string; price: number }) {
    const existing = items.value.find((item) => item.productId === product.id)
    if (existing) {
      existing.quantity++
    } else {
      items.value.push({
        id: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: 1,
      })
    }
  }

  function addCustomItem(name: string, price: number) {
    items.value.push({
      id: crypto.randomUUID(),
      productId: `custom-${crypto.randomUUID()}`,
      productName: name,
      unitPrice: price,
      quantity: 1,
    })
  }

  function incrementQuantity(id: string) {
    const item = items.value.find((i) => i.id === id)
    if (item) item.quantity++
  }

  function decrementQuantity(id: string) {
    const item = items.value.find((i) => i.id === id)
    if (item && item.quantity > 1) {
      item.quantity--
    }
  }

  function removeItem(id: string) {
    items.value = items.value.filter((i) => i.id !== id)
  }

  function clearCart() {
    items.value = []
  }

  async function finalizeSale(
    receivedAmount?: number,
    changeAmount?: number,
    paymentMethod: 'cash' | 'card' | 'transfer' = 'cash',
  ): Promise<Sale> {
    const salesStore = useSalesStore()
    const { useShiftsStore } = await import('@/stores/shifts')
    const shiftsStore = useShiftsStore()

    const saleItems: SaleItem[] = items.value.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.unitPrice * item.quantity,
    }))

    const sale: Sale = {
      id: crypto.randomUUID(),
      items: saleItems,
      subtotal: subtotal.value,
      taxIncluded: taxEnabled.value,
      taxRate: taxEnabled.value ? taxRate.value : 0,
      taxAmount: tax.value,
      total: total.value,
      receivedAmount: paymentMethod === 'cash' ? receivedAmount : total.value,
      changeAmount: paymentMethod === 'cash' ? changeAmount : 0,
      paymentMethod,
      // Assign to active shift only when shifts are enabled and one is open
      ...(settingsStore.shiftsEnabled && shiftsStore.activeShift
        ? { shiftId: shiftsStore.activeShift.id }
        : {}),
      createdAt: new Date().toISOString(),
    }

    await salesStore.createSale(sale)
    clearCart()

    return sale
  }

  return {
    items,
    itemCount,
    isLoaded,
    subtotal,
    taxEnabled,
    taxRate,
    tax,
    total,
    loadCart,
    addItem,
    addCustomItem,
    incrementQuantity,
    decrementQuantity,
    removeItem,
    clearCart,
    finalizeSale,
  }
})
