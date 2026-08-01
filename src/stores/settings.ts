import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db, type AppSettings } from '@/services/db'

const DEFAULT_SETTINGS: AppSettings = {
  id: 'app-settings',
  taxEnabled: true,
  taxRate: 0.16,
  businessName: 'Mi Changarro',
  currency: 'MXN',
  shiftsEnabled: false,
  barcodeScannerEnabled: true,
  defaultHomeTab: 'catalog',
}

export const useSettingsStore = defineStore('settings', () => {
  const taxEnabled = ref(DEFAULT_SETTINGS.taxEnabled)
  const taxRate = ref(DEFAULT_SETTINGS.taxRate)
  const businessName = ref(DEFAULT_SETTINGS.businessName)
  const currency = ref(DEFAULT_SETTINGS.currency)
  const shiftsEnabled = ref(DEFAULT_SETTINGS.shiftsEnabled)
  const barcodeScannerEnabled = ref(DEFAULT_SETTINGS.barcodeScannerEnabled ?? true)
  const defaultHomeTab = ref<'catalog' | 'scanner'>(DEFAULT_SETTINGS.defaultHomeTab ?? 'catalog')
  const isLoaded = ref(false)

  async function loadSettings() {
    const stored = await db.settings.get('app-settings')
    if (stored) {
      taxEnabled.value = stored.taxEnabled
      taxRate.value = stored.taxRate
      businessName.value = stored.businessName
      currency.value = stored.currency
      shiftsEnabled.value = stored.shiftsEnabled ?? false
      barcodeScannerEnabled.value = stored.barcodeScannerEnabled ?? true
      defaultHomeTab.value = stored.defaultHomeTab ?? 'catalog'
    } else {
      await db.settings.put(DEFAULT_SETTINGS)
    }
    isLoaded.value = true
  }

  async function setTaxEnabled(value: boolean) {
    taxEnabled.value = value
    await persist()
  }

  async function setTaxRate(value: number) {
    taxRate.value = value
    await persist()
  }

  async function setBusinessName(value: string) {
    businessName.value = value
    await persist()
  }

  async function setBarcodeScannerEnabled(value: boolean) {
    barcodeScannerEnabled.value = value
    await persist()
  }

  async function setDefaultHomeTab(value: 'catalog' | 'scanner') {
    defaultHomeTab.value = value
    await persist()
  }

  async function setShiftsEnabled(value: boolean) {
    shiftsEnabled.value = value
    await persist()

    // Lazy import to avoid circular dependency
    const { useShiftsStore } = await import('@/stores/shifts')
    const shiftsStore = useShiftsStore()

    if (value) {
      // Open first shift if there's no active one
      await shiftsStore.loadActiveShift()
      if (!shiftsStore.activeShift) {
        await shiftsStore.openShift()
      }
    } else {
      // Close current shift silently without requiring user confirmation
      if (shiftsStore.activeShift) {
        const shiftId = shiftsStore.activeShift.id
        const sales = await shiftsStore.getShiftSales(shiftId)
        const totalCash = sales.reduce((sum, s) => sum + s.total, 0)
        await shiftsStore.closeShift(totalCash, sales.length)
      }
    }
  }

  async function persist() {
    await db.settings.put({
      id: 'app-settings',
      taxEnabled: taxEnabled.value,
      taxRate: taxRate.value,
      businessName: businessName.value,
      currency: currency.value,
      shiftsEnabled: shiftsEnabled.value,
      barcodeScannerEnabled: barcodeScannerEnabled.value,
      defaultHomeTab: defaultHomeTab.value,
    })
  }

  return {
    taxEnabled,
    taxRate,
    businessName,
    currency,
    shiftsEnabled,
    barcodeScannerEnabled,
    defaultHomeTab,
    isLoaded,
    loadSettings,
    setTaxEnabled,
    setTaxRate,
    setBusinessName,
    setShiftsEnabled,
    setBarcodeScannerEnabled,
    setDefaultHomeTab,
  }
})
