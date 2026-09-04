<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useSalesStore } from '@/stores/sales'
import type { Sale } from '@/services/db'

const route = useRoute()
const router = useRouter()
const salesStore = useSalesStore()

const sale = ref<Sale | null>(null)
const isLoading = ref(true)

onMounted(async () => {
  const id = route.params.id as string
  const found = await salesStore.getSaleById(id)
  if (found) {
    sale.value = found
  } else {
    router.replace('/sales')
  }
  isLoading.value = false
})

function formatPrice(price: number): string {
  return price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
function paymentMethodLabel(method?: 'cash' | 'card' | 'transfer'): string {
  switch (method) {
    case 'card':
      return 'Tarjeta'
    case 'transfer':
      return 'Transferencia'
    case 'cash':
    default:
      return 'Efectivo'
  }
}

function paymentMethodIcon(method?: 'cash' | 'card' | 'transfer'): string {
  switch (method) {
    case 'card':
      return 'credit_card'
    case 'transfer':
      return 'account_balance'
    case 'cash':
    default:
      return 'payments'
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header with back button -->
    <div class="flex items-center gap-3 mb-6">
      <RouterLink
        to="/sales"
        class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-variant transition-colors active:scale-95"
        aria-label="Volver a ventas"
      >
        <span class="material-symbols-outlined text-on-surface-variant">arrow_back</span>
      </RouterLink>
      <h1
        class="text-[26px] leading-[34px] tracking-[-0.02em] font-bold font-display text-on-background"
      >
        Detalle de Venta
      </h1>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <span class="material-symbols-outlined text-[40px] text-on-surface-variant/50 animate-spin"
        >progress_activity</span
      >
    </div>

    <div v-else-if="sale">
      <!-- Date/time -->
      <p class="text-[14px] text-on-surface-variant font-sans mb-6 capitalize">
        {{ formatDate(sale.createdAt) }} — {{ formatTime(sale.createdAt) }}
      </p>

      <!-- Items -->
      <div class="flex flex-col gap-3 mb-8">
        <article
          v-for="(item, index) in sale.items"
          :key="index"
          class="flex items-center gap-4 bg-surface-container border border-outline-variant rounded-[1rem] px-5 py-4"
        >
          <!-- Quantity badge -->
          <span
            class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-highest text-on-surface text-[14px] font-bold"
          >
            {{ item.quantity }}
          </span>

          <!-- Name -->
          <span class="flex-1 text-[14px] text-on-surface font-sans truncate">
            {{ item.productName }}
          </span>

          <!-- Subtotal -->
          <span class="shrink-0 text-[14px] font-bold text-surface-tint">
            ${{ formatPrice(item.subtotal) }}
          </span>
        </article>
      </div>

      <!-- Totals card -->
      <div class="bg-surface-container border border-outline-variant rounded-[1.5rem] p-6">
        <!-- Payment Method -->
        <div class="flex items-center justify-between mb-3">
          <span
            class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display"
          >
            Método de Pago
          </span>
          <span class="inline-flex items-center gap-1.5 text-[14px] font-bold text-on-surface">
            <span class="material-symbols-outlined text-[18px] text-surface-tint">
              {{ paymentMethodIcon(sale.paymentMethod) }}
            </span>
            {{ paymentMethodLabel(sale.paymentMethod) }}
          </span>
        </div>

        <!-- Subtotal -->
        <div class="flex items-center justify-between mb-3">
          <span
            class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display"
          >
            Subtotal
          </span>
          <span class="text-[15px] font-bold text-on-surface">
            ${{ formatPrice(sale.subtotal) }}
          </span>
        </div>

        <!-- Tax (only if was included) -->
        <div v-if="sale.taxIncluded" class="flex items-center justify-between mb-4">
          <span
            class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display"
          >
            IVA ({{ Math.round(sale.taxRate * 100) }}%)
          </span>
          <span class="text-[15px] font-bold text-on-surface">
            ${{ formatPrice(sale.taxAmount) }}
          </span>
        </div>

        <!-- Separator -->
        <div class="h-px bg-outline-variant mb-4"></div>

        <!-- Total -->
        <div class="flex items-center justify-between">
          <span
            class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display"
          >
            Total
          </span>
          <span class="text-[19px] font-bold text-surface-tint">
            ${{ formatPrice(sale.total) }}
          </span>
        </div>

        <!-- Cash Details Separator -->
        <div v-if="sale.paymentMethod === 'cash' && sale.receivedAmount !== undefined" class="h-px bg-outline-variant my-4"></div>

        <!-- Cash received -->
        <div v-if="sale.paymentMethod === 'cash' && sale.receivedAmount !== undefined" class="flex items-center justify-between mb-3">
          <span
            class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display"
          >
            Efectivo Recibido
          </span>
          <span class="text-[15px] font-bold text-on-surface">
            ${{ formatPrice(sale.receivedAmount) }}
          </span>
        </div>

        <!-- Change returned -->
        <div v-if="sale.paymentMethod === 'cash' && sale.changeAmount !== undefined" class="flex items-center justify-between">
          <span
            class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display"
          >
            Cambio
          </span>
          <span class="text-[16px] font-bold text-primary-fixed-dim font-display">
            ${{ formatPrice(sale.changeAmount) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
