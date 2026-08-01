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

  it('initializes with default barcodeScannerEnabled=true and defaultHomeTab=catalog', async () => {
    const store = useSettingsStore()
    await store.loadSettings()

    expect(store.barcodeScannerEnabled).toBe(true)
    expect(store.defaultHomeTab).toBe('catalog')
  })

  it('setBarcodeScannerEnabled toggles scanner and persists to IndexedDB', async () => {
    const store = useSettingsStore()
    await store.loadSettings()

    await store.setBarcodeScannerEnabled(false)
    expect(store.barcodeScannerEnabled).toBe(false)

    const fromDb = await db.settings.get('app-settings')
    expect(fromDb?.barcodeScannerEnabled).toBe(false)
  })

  it('setDefaultHomeTab updates default tab and persists to IndexedDB', async () => {
    const store = useSettingsStore()
    await store.loadSettings()

    await store.setDefaultHomeTab('scanner')
    expect(store.defaultHomeTab).toBe('scanner')

    const fromDb = await db.settings.get('app-settings')
    expect(fromDb?.defaultHomeTab).toBe('scanner')
  })
})
