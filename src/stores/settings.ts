import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db, type AppSettings, type PaymentMethodsConfig } from '@/services/db'

const DEFAULT_PAYMENT_METHODS: PaymentMethodsConfig = {
  cash: true,
  card: false,
  transfer: false,
}

const DEFAULT_SETTINGS: AppSettings = {
  id: 'app-settings',
  taxEnabled: false,
  taxRate: 0.16,
  businessName: 'Mi Changarro',
  currency: 'MXN',
  shiftsEnabled: false,
  barcodeScannerEnabled: false,
  defaultHomeTab: 'catalog',
  paymentMethods: DEFAULT_PAYMENT_METHODS,
}

export const useSettingsStore = defineStore('settings', () => {
  const taxEnabled = ref(DEFAULT_SETTINGS.taxEnabled)
  const taxRate = ref(DEFAULT_SETTINGS.taxRate)
  const businessName = ref(DEFAULT_SETTINGS.businessName)
  const currency = ref(DEFAULT_SETTINGS.currency)
  const shiftsEnabled = ref(DEFAULT_SETTINGS.shiftsEnabled)
  const barcodeScannerEnabled = ref(DEFAULT_SETTINGS.barcodeScannerEnabled)
  const defaultHomeTab = ref<'catalog' | 'scanner'>(DEFAULT_SETTINGS.defaultHomeTab ?? 'catalog')
  const paymentMethods = ref<PaymentMethodsConfig>({ ...DEFAULT_PAYMENT_METHODS })
  const transferClabe = ref(DEFAULT_SETTINGS.transferClabe ?? '')
  const isLoaded = ref(false)

  async function loadSettings() {
    const stored = await db.settings.get('app-settings')
    if (stored) {
      taxEnabled.value = stored.taxEnabled ?? false
      taxRate.value = stored.taxRate ?? 0.16
      businessName.value = stored.businessName
      currency.value = stored.currency
      shiftsEnabled.value = stored.shiftsEnabled ?? false
      barcodeScannerEnabled.value = stored.barcodeScannerEnabled ?? false
      defaultHomeTab.value = stored.defaultHomeTab ?? 'catalog'
      paymentMethods.value = stored.paymentMethods
        ? { ...DEFAULT_PAYMENT_METHODS, ...stored.paymentMethods }
        : { ...DEFAULT_PAYMENT_METHODS }
      transferClabe.value = stored.transferClabe ?? ''
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

  async function setTransferClabe(value: string) {
    transferClabe.value = value.trim()
    await persist()
  }

  async function setPaymentMethodEnabled(method: 'cash' | 'card' | 'transfer', enabled: boolean): Promise<boolean> {
    if (!enabled) {
      const activeCount = Object.values(paymentMethods.value).filter(Boolean).length
      if (activeCount <= 1 && paymentMethods.value[method]) {
        return false
      }
    }
    paymentMethods.value = {
      ...paymentMethods.value,
      [method]: enabled,
    }
    await persist()
    return true
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
      paymentMethods: { ...paymentMethods.value },
      transferClabe: transferClabe.value,
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
    paymentMethods,
    transferClabe,
    isLoaded,
    loadSettings,
    setTaxEnabled,
    setTaxRate,
    setBusinessName,
    setShiftsEnabled,
    setBarcodeScannerEnabled,
    setDefaultHomeTab,
    setPaymentMethodEnabled,
    setTransferClabe,
  }
})
