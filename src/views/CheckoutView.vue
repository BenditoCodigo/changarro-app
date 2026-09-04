<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useSettingsStore } from '@/stores/settings'
import { playCheckoutSuccessAnimation } from '@/composables/useParticles'

const router = useRouter()
const cartStore = useCartStore()
const settingsStore = useSettingsStore()

const cashReceived = ref('')
const isSubmitting = ref(false)
const countdown = ref(3)
let timerId: ReturnType<typeof setInterval> | null = null

const availablePaymentMethods = computed(() => {
  const list: { id: 'cash' | 'card' | 'transfer'; label: string; icon: string }[] = []
  if (settingsStore.paymentMethods.cash) {
    list.push({ id: 'cash', label: 'Efectivo', icon: 'payments' })
  }
  if (settingsStore.paymentMethods.card) {
    list.push({ id: 'card', label: 'Tarjeta', icon: 'credit_card' })
  }
  if (settingsStore.paymentMethods.transfer) {
    list.push({ id: 'transfer', label: 'Transferencia', icon: 'account_balance' })
  }
  return list
})

const selectedPaymentMethod = ref<'cash' | 'card' | 'transfer'>('cash')

onMounted(() => {
  // If the cart is empty, go back to the cart view
  if (cartStore.items.length === 0) {
    router.replace('/cart')
    return
  }

  // Ensure default method is an active payment method
  if (
    availablePaymentMethods.value.length > 0 &&
    !availablePaymentMethods.value.some((m) => m.id === selectedPaymentMethod.value)
  ) {
    selectedPaymentMethod.value = availablePaymentMethods.value[0]!.id
  }

  // Start the 3-second countdown to prevent accidental double clicks
  timerId = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      if (timerId) clearInterval(timerId)
    }
  }, 1000)
})

onUnmounted(() => {
  if (timerId) clearInterval(timerId)
})

const total = computed(() => cartStore.total)

// Parse cash received as a float number
const cashAmount = computed(() => {
  const parsed = parseFloat(cashReceived.value)
  return isNaN(parsed) ? 0 : parsed
})

// Calculate change to return
const change = computed(() => {
  if (cashAmount.value < total.value) return 0
  return cashAmount.value - total.value
})

// Calculate remaining amount needed
const remaining = computed(() => {
  if (cashAmount.value >= total.value) return 0
  return total.value - cashAmount.value
})

// Validate if the payment is valid
const isValid = computed(() => {
  if (selectedPaymentMethod.value === 'cash') {
    return cashAmount.value >= total.value
  }
  return true
})

// Quick cash bill suggestions (Mexico/Latin America standard: 50, 100, 200, 500)
const denominations = [50, 100, 150, 200, 500, 700, 800, 1000]

const suggestedDenominations = computed(() => {
  // Only suggest bills that are greater than or equal to the total
  return denominations.filter((d) => d >= total.value).slice(0, 4)
})

function selectDenomination(amount: number) {
  cashReceived.value = amount.toString()
}

function setExactPayment() {
  cashReceived.value = total.value.toFixed(2)
}

function adjustCash(amount: number) {
  const currentVal = parseFloat(cashReceived.value) || 0
  const newVal = Math.max(0, currentVal + amount)
  cashReceived.value = Number.isInteger(newVal) ? newVal.toString() : newVal.toFixed(2)
}

function formatPrice(price: number): string {
  return price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const clabeCopied = ref(false)

async function copyClabe() {
  if (!settingsStore.transferClabe) return
  try {
    await navigator.clipboard.writeText(settingsStore.transferClabe)
    clabeCopied.value = true
    setTimeout(() => {
      clabeCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Error al copiar CLABE:', err)
  }
}

const isButtonDisabled = computed(() => {
  return !isValid.value || countdown.value > 0 || isSubmitting.value
})

const buttonText = computed(() => {
  if (isSubmitting.value) {
    if (selectedPaymentMethod.value === 'transfer') return 'Procesando...'
    return 'Cobrando...'
  }
  const baseLabel =
    selectedPaymentMethod.value === 'card'
      ? 'Cobrado'
      : selectedPaymentMethod.value === 'transfer'
        ? 'Recibida'
        : 'Cobrar'

  if (countdown.value > 0) return `${baseLabel} (${countdown.value})`
  return baseLabel
})

async function handleConfirmSale() {
  if (isButtonDisabled.value || isSubmitting.value) return
  isSubmitting.value = true
  try {
    const received = selectedPaymentMethod.value === 'cash' ? cashAmount.value : total.value
    const changeVal = selectedPaymentMethod.value === 'cash' ? change.value : 0
    await cartStore.finalizeSale(received, changeVal, selectedPaymentMethod.value)
    await playCheckoutSuccessAnimation()
    router.push('/')
  } catch (error) {
    console.error('Error finalizando la venta:', error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto pb-32">
    <!-- Header with Back Button -->
    <div class="flex items-center gap-3 mb-6">
      <button
        class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-variant transition-colors active:scale-95"
        aria-label="Volver al carrito"
        @click="router.back()"
      >
        <span class="material-symbols-outlined text-on-surface-variant">arrow_back</span>
      </button>
      <h1
        class="text-[26px] leading-[34px] tracking-[-0.02em] font-bold font-display text-on-background"
      >
        Cobrar Venta
      </h1>
    </div>

    <!-- Sale Summary Card -->
    <section class="bg-surface-container border border-outline-variant rounded-[2rem] p-8 mb-6">
      <div class="text-center mb-6">
        <p
          class="text-[14px] uppercase tracking-wider font-semibold text-on-surface-variant font-display mb-1"
        >
          Total a Cobrar
        </p>
        <p class="text-[40px] leading-[48px] font-bold text-surface-tint font-display">
          ${{ formatPrice(total) }}
        </p>
      </div>

      <!-- Item count summary -->
      <div
        class="flex justify-between items-center text-[15px] text-on-surface-variant/80 border-t border-outline-variant pt-4"
      >
        <span>Artículos en el carrito</span>
        <span class="font-bold text-on-surface">{{ cartStore.itemCount }} producto(s)</span>
      </div>
    </section>

    <!-- Payment Method Selector Card (only if multiple payment methods are active) -->
    <section
      v-if="availablePaymentMethods.length > 1"
      class="bg-surface-container border border-outline-variant rounded-[2rem] p-6 mb-6"
    >
      <h2 class="text-[17px] font-bold font-display text-on-surface mb-4">
        Método de Pago
      </h2>
      <div class="grid grid-cols-3 gap-3">
        <button
          v-for="method in availablePaymentMethods"
          :key="method.id"
          :class="[
            'flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl border transition-all duration-200 active:scale-95',
            selectedPaymentMethod === method.id
              ? 'bg-primary-container text-on-primary-container border-primary-container font-bold shadow-md'
              : 'bg-surface-container-high border-outline-variant text-on-surface-variant hover:border-surface-tint'
          ]"
          @click="selectedPaymentMethod = method.id"
        >
          <span class="material-symbols-outlined text-[24px]">{{ method.icon }}</span>
          <span class="text-[14px] font-display">{{ method.label }}</span>
        </button>
      </div>
    </section>

    <!-- Cash Input Card (when selected payment method is Cash) -->
    <section
      v-if="selectedPaymentMethod === 'cash'"
      class="bg-surface-container border border-outline-variant rounded-[2rem] p-8 mb-6"
    >
      <h2 class="text-[17px] font-bold font-display text-on-surface mb-4">
        ¿Con cuánto paga el cliente?
      </h2>

      <!-- Input Field and Adjust Buttons -->
      <div class="flex items-center gap-3 mb-6">
        <div class="relative flex-1">
          <span
            class="absolute left-6 top-1/2 -translate-y-1/2 text-[24px] font-bold text-on-surface-variant"
          >
            $
          </span>
          <input
            v-model="cashReceived"
            type="number"
            inputmode="decimal"
            placeholder="0.00"
            min="0"
            step="any"
            class="w-full bg-surface-container-low border border-outline-variant rounded-full pl-12 pr-6 py-5 text-[20px] font-bold text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary-fixed-dim focus:border-transparent outline-none transition-all"
            autofocus
          />
        </div>
        <!-- Quick adjustment buttons -->
        <div class="flex gap-2 shrink-0">
          <button
            class="flex items-center justify-center w-14 h-14 rounded-full border border-outline-variant bg-surface-container-highest hover:bg-surface-variant transition-colors active:scale-90 text-[18px] font-bold text-on-surface"
            aria-label="Restar 1 peso"
            @click="adjustCash(-1)"
          >
            -1
          </button>
          <button
            class="flex items-center justify-center w-14 h-14 rounded-full border border-outline-variant bg-surface-container-highest hover:bg-surface-variant transition-colors active:scale-90 text-[18px] font-bold text-on-surface"
            aria-label="Sumar 1 peso"
            @click="adjustCash(1)"
          >
            +1
          </button>
        </div>
      </div>

      <!-- Quick Denominations -->
      <div class="mb-6">
        <p
          class="text-[13px] uppercase tracking-wider font-semibold text-on-surface-variant font-display mb-3"
        >
          Sugerencias de pago
        </p>
        <div class="flex flex-wrap gap-2.5">
          <!-- Exact payment button -->
          <button
            class="px-5 py-3 rounded-full border border-primary-container text-[14px] font-bold text-on-primary-container bg-primary-container transition-all active:scale-95 hover:shadow-lg"
            @click="setExactPayment"
          >
            Exacto
          </button>

          <!-- Suggested bills -->
          <button
            v-for="amount in suggestedDenominations"
            :key="amount"
            class="px-5 py-3 rounded-full border border-outline-variant text-[14px] font-semibold text-on-surface bg-surface-container-high transition-all active:scale-95 hover:border-surface-tint"
            @click="selectDenomination(amount)"
          >
            ${{ amount }}
          </button>
        </div>
      </div>

      <!-- Change / Missing Calculations -->
      <div class="border-t border-outline-variant pt-6">
        <!-- Change display (when paid enough) -->
        <div
          v-if="isValid"
          class="flex justify-between items-center bg-primary-container/10 p-5 rounded-2xl border border-primary-container/20"
        >
          <span class="text-[16px] font-semibold text-on-surface">Cambio a entregar</span>
          <span class="text-[24px] font-bold text-primary-fixed-dim font-display">
            ${{ formatPrice(change) }}
          </span>
        </div>

        <!-- Missing display (when payment is incomplete) -->
        <div
          v-else
          class="flex justify-between items-center bg-error/5 p-5 rounded-2xl border border-error/20"
        >
          <span class="text-[15px] font-semibold text-on-surface-variant">Falta por pagar</span>
          <span class="text-[20px] font-bold text-error font-display">
            ${{ formatPrice(remaining) }}
          </span>
        </div>
      </div>
    </section>

    <!-- Card Information Card -->
    <section
      v-else-if="selectedPaymentMethod === 'card'"
      class="bg-surface-container border border-outline-variant rounded-[2rem] p-8 mb-6 text-center"
    >
      <div class="flex justify-center mb-4">
        <div
          class="flex items-center justify-center w-16 h-16 rounded-full bg-primary-container/20 text-surface-tint"
        >
          <span class="material-symbols-outlined text-[32px]">credit_card</span>
        </div>
      </div>
      <h2 class="text-[19px] font-bold font-display text-on-surface mb-2">
        Pago con Tarjeta
      </h2>
      <p class="text-[14px] text-on-surface-variant font-sans max-w-sm mx-auto">
        Procesa el cobro en tu terminal bancaria por el monto exacto de
        <strong class="text-on-surface">${{ formatPrice(total) }}</strong>.
      </p>
    </section>

    <!-- Transfer Information Card -->
    <section
      v-else-if="selectedPaymentMethod === 'transfer'"
      class="bg-surface-container border border-outline-variant rounded-[2rem] p-8 mb-6 text-center"
    >
      <div class="flex justify-center mb-4">
        <div
          class="flex items-center justify-center w-16 h-16 rounded-full bg-primary-container/20 text-surface-tint"
        >
          <span class="material-symbols-outlined text-[32px]">account_balance</span>
        </div>
      </div>
      <h2 class="text-[19px] font-bold font-display text-on-surface mb-2">
        Pago con Transferencia
      </h2>
      <p class="text-[14px] text-on-surface-variant font-sans max-w-sm mx-auto mb-6">
        Verifica la transferencia en tu banco por el monto exacto de
        <strong class="text-on-surface">${{ formatPrice(total) }}</strong>.
      </p>

      <!-- Prominent CLABE Display -->
      <div
        v-if="settingsStore.transferClabe"
        class="bg-surface-container-low border border-primary-fixed-dim/40 rounded-2xl p-5 text-left flex items-center justify-between gap-4"
      >
        <div class="min-w-0 flex-1">
          <p class="text-[12px] uppercase tracking-wider font-semibold text-on-surface-variant font-display mb-1">
            CLABE Interbancaria
          </p>
          <p class="text-[20px] font-bold font-mono text-surface-tint tracking-widest break-all select-all">
            {{ settingsStore.transferClabe }}
          </p>
        </div>
        <button
          class="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-surface-container-high border border-outline-variant hover:border-surface-tint text-on-surface text-[13px] font-semibold transition-all active:scale-95"
          @click="copyClabe"
        >
          <span class="material-symbols-outlined text-[16px]">
            {{ clabeCopied ? 'check' : 'content_copy' }}
          </span>
          <span>{{ clabeCopied ? 'Copiada' : 'Copiar' }}</span>
        </button>
      </div>

      <!-- No CLABE configured notice -->
      <div
        v-else
        class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/50 text-[13px] text-on-surface-variant/70 font-sans"
      >
        Puedes agregar tu CLABE interbancaria en Ajustes para mostrarla aquí durante tus cobros.
      </div>
    </section>

    <!-- Bottom Action Button -->
    <div class="fixed bottom-20 left-0 right-0 z-40 mx-4">
      <button
        class="w-full py-5 bg-surface-tint text-on-primary rounded-full text-[19px] font-bold flex items-center justify-center gap-3 transition-all duration-200 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100"
        :disabled="isButtonDisabled"
        @click="handleConfirmSale"
      >
        <span class="material-symbols-outlined text-[19px]">check_circle</span>
        {{ buttonText }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Remove spinner arrows from number inputs */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}
</style>
