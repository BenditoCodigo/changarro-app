import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from './settings'
import { db } from '@/services/db'

describe('Settings Store - Scanner & Cashier Mode', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await db.settings.clear()
  })

  it('initializes with default barcodeScannerEnabled=false, taxEnabled=false, and defaultHomeTab=catalog', async () => {
    const store = useSettingsStore()
    await store.loadSettings()

    expect(store.barcodeScannerEnabled).toBe(false)
    expect(store.taxEnabled).toBe(false)
    expect(store.defaultHomeTab).toBe('catalog')
  })

  it('setBarcodeScannerEnabled toggles scanner and persists to IndexedDB', async () => {
    const store = useSettingsStore()
    await store.loadSettings()

    await store.setBarcodeScannerEnabled(true)
    expect(store.barcodeScannerEnabled).toBe(true)

    const fromDb = await db.settings.get('app-settings')
    expect(fromDb?.barcodeScannerEnabled).toBe(true)
  })

  it('setTaxRate updates tax rate percentage and persists to IndexedDB', async () => {
    const store = useSettingsStore()
    await store.loadSettings()

    await store.setTaxRate(0.08)
    expect(store.taxRate).toBe(0.08)

    const fromDb = await db.settings.get('app-settings')
    expect(fromDb?.taxRate).toBe(0.08)
  })

  it('setDefaultHomeTab updates default tab and persists to IndexedDB', async () => {
    const store = useSettingsStore()
    await store.loadSettings()

    await store.setDefaultHomeTab('scanner')
    expect(store.defaultHomeTab).toBe('scanner')

    const fromDb = await db.settings.get('app-settings')
    expect(fromDb?.defaultHomeTab).toBe('scanner')
  })

  describe('Payment Methods Configuration', () => {
    it('initializes with only cash payment method enabled by default', async () => {
      const store = useSettingsStore()
      await store.loadSettings()

      expect(store.paymentMethods).toEqual({
        cash: true,
        card: false,
        transfer: false,
      })
    })

    it('setPaymentMethodEnabled updates and persists payment methods', async () => {
      const store = useSettingsStore()
      await store.loadSettings()

      const success = await store.setPaymentMethodEnabled('card', true)
      expect(success).toBe(true)
      expect(store.paymentMethods.card).toBe(true)

      const fromDb = await db.settings.get('app-settings')
      expect(fromDb?.paymentMethods?.card).toBe(true)
    })

    it('prevents disabling the last active payment method', async () => {
      const store = useSettingsStore()
      await store.loadSettings()

      expect(store.paymentMethods).toEqual({
        cash: true,
        card: false,
        transfer: false,
      })

      // Attempt to disable cash (the only active method)
      const success = await store.setPaymentMethodEnabled('cash', false)
      expect(success).toBe(false)
      // Cash should remain enabled
      expect(store.paymentMethods.cash).toBe(true)
    })

    it('setTransferClabe saves and persists CLABE number', async () => {
      const store = useSettingsStore()
      await store.loadSettings()

      expect(store.transferClabe).toBe('')

      await store.setTransferClabe(' 123456789012345678 ')
      expect(store.transferClabe).toBe('123456789012345678')

      const fromDb = await db.settings.get('app-settings')
      expect(fromDb?.transferClabe).toBe('123456789012345678')
    })
  })
})
