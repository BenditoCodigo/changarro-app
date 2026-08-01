<script setup lang="ts">
import { ref, computed, watchEffect, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { db, type Sale } from '@/services/db'
import { useSettingsStore } from '@/stores/settings'
import { useShiftsStore } from '@/stores/shifts'

const router = useRouter()
const settingsStore = useSettingsStore()
const shiftsStore = useShiftsStore()

// ─── Filter state ────────────────────────────────────────────────────────────
const activeFilter = ref<'Turno' | 'Hoy' | 'Mes'>(settingsStore.shiftsEnabled ? 'Turno' : 'Hoy')
const selectedMonth = ref('')
const showMonthSelector = ref(false)
const showShiftMenu = ref(false)
const isLoading = ref(false)

// ─── Filtered results (fetched directly from IndexedDB) ──────────────────────
const filteredSales = ref<Sale[]>([])

// ─── Month range ─────────────────────────────────────────────────────────────
const firstSaleDate = ref<Date | null>(null)

// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayRange(): { lower: string; upper: string } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { lower: start.toISOString(), upper: end.toISOString() }
}

function monthRange(yyyyMM: string): { lower: string; upper: string } {
  const [yearStr, monthStr] = yyyyMM.split('-')
  const year = parseInt(yearStr!)
  const month = parseInt(monthStr!) - 1
  const start = new Date(year, month, 1, 0, 0, 0, 0)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { lower: start.toISOString(), upper: end.toISOString() }
}

// ─── Core: query IndexedDB only for the visible date range ───────────────────
async function fetchSalesForFilter() {
  isLoading.value = true
  try {
    if (activeFilter.value === 'Turno' && settingsStore.shiftsEnabled && shiftsStore.activeShift) {
      // Query by shiftId index — most targeted possible query
      filteredSales.value = await db.sales
        .where('shiftId')
        .equals(shiftsStore.activeShift.id)
        .reverse()
        .sortBy('createdAt')
    } else if (activeFilter.value === 'Mes') {
      const range = monthRange(selectedMonth.value)
      filteredSales.value = await db.sales
        .where('createdAt')
        .between(range.lower, range.upper, true, true)
        .reverse()
        .toArray()
    } else {
      // 'Hoy' or 'Turno' when shifts disabled: filter by today
      const range = todayRange()
      filteredSales.value = await db.sales
        .where('createdAt')
        .between(range.lower, range.upper, true, true)
        .reverse()
        .toArray()
    }
  } finally {
    isLoading.value = false
  }
}

// ─── Reactively re-fetch when filter changes ──────────────────────────────────
watchEffect(() => {
  void activeFilter.value
  void selectedMonth.value
  void shiftsStore.activeShift
  fetchSalesForFilter()
})

// ─── Load oldest sale date for month selector ─────────────────────────────────
async function loadOldestSaleDate() {
  const oldest = await db.sales.orderBy('createdAt').first()
  firstSaleDate.value = oldest ? new Date(oldest.createdAt) : new Date()
}

// ─── Init ─────────────────────────────────────────────────────────────────────
const today = new Date()
selectedMonth.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

onMounted(async () => {
  await loadOldestSaleDate()
})

// ─── Close dropdowns on outside click ────────────────────────────────────────
function handleOutsideClick(e: Event) {
  const target = e.target as HTMLElement
  if (!target.closest('[data-dropdown]')) {
    showMonthSelector.value = false
    showShiftMenu.value = false
  }
}

onMounted(() => document.addEventListener('click', handleOutsideClick))
onUnmounted(() => document.removeEventListener('click', handleOutsideClick))

// ─── Month selector ───────────────────────────────────────────────────────────
function getAvailableMonths(firstDate: Date | null): { label: string; value: string }[] {
  const months: { label: string; value: string }[] = []
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const startDate = firstDate ?? now
  const startYear = startDate.getFullYear()
  const startMonth = startDate.getMonth()

  let y = currentYear
  let m = currentMonth

  while (y > startYear || (y === startYear && m >= startMonth)) {
    const d = new Date(y, m, 1)
    const name = d.toLocaleDateString('es-MX', { month: 'long' })
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1)
    months.push({
      label: `${capitalized} ${d.getFullYear().toString().slice(-2)}`,
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    })
    m--
    if (m < 0) {
      m = 11
      y--
    }
  }

  if (months.length === 0) {
    const name = now.toLocaleDateString('es-MX', { month: 'long' })
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1)
    months.push({
      label: `${capitalized} ${now.getFullYear().toString().slice(-2)}`,
      value: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    })
  }

  return months
}

const availableMonths = computed(() => getAvailableMonths(firstSaleDate.value))

const selectedMonthLabel = computed(() => {
  if (activeFilter.value !== 'Mes') return 'Mes'
  return availableMonths.value.find((m) => m.value === selectedMonth.value)?.label ?? 'Mes'
})

// ─── Filter UI interactions ───────────────────────────────────────────────────
function selectFilter(filter: 'Turno' | 'Hoy' | 'Mes') {
  if (filter === 'Mes') {
    if (activeFilter.value === 'Mes') {
      showMonthSelector.value = !showMonthSelector.value
    } else {
      activeFilter.value = 'Mes'
      const now = new Date()
      selectedMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      showMonthSelector.value = false
    }
  } else {
    activeFilter.value = filter
    showMonthSelector.value = false
  }
  showShiftMenu.value = false
}

function selectMonth(value: string) {
  selectedMonth.value = value
  showMonthSelector.value = false
}

function goToShiftClose() {
  showShiftMenu.value = false
  router.push('/shift-close')
}

function goToReport() {
  showShiftMenu.value = false
  router.push('/sales/report')
}

function goToShiftHistory() {
  showShiftMenu.value = false
  router.push('/shifts')
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatPrice(price: number): string {
  return price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header with Filters -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <h1 class="text-[26px] leading-[34px] tracking-[-0.02em] font-bold font-display text-on-background">
        Ventas
      </h1>

      <!-- Filter Buttons + Shift Menu -->
      <div class="flex items-center gap-2 self-end">

        <!-- Date filters -->
        <div class="flex items-center gap-2">
          <!-- Turno filter: only visible when shifts enabled -->
          <button
            v-if="settingsStore.shiftsEnabled"
            :class="[
              'px-5 py-2 rounded-full text-label-md transition-all active:scale-95',
              activeFilter === 'Turno'
                ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
            ]"
            @click="selectFilter('Turno')"
          >
            Turno
          </button>

          <button
            :class="[
              'px-5 py-2 rounded-full text-label-md transition-all active:scale-95',
              activeFilter === 'Hoy'
                ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
            ]"
            @click="selectFilter('Hoy')"
          >
            Hoy
          </button>

          <!-- Mes button + dropdown -->
          <div class="relative" data-dropdown>
            <button
              :class="[
                'flex items-center gap-1.5 px-5 py-2 rounded-full text-label-md transition-all active:scale-95',
                activeFilter === 'Mes'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
              ]"
              @click="selectFilter('Mes')"
            >
              <span>{{ selectedMonthLabel }}</span>
              <span
                class="material-symbols-outlined text-[16px] transition-transform duration-200"
                :class="{ 'rotate-180': showMonthSelector }"
              >
                keyboard_arrow_down
              </span>
            </button>

            <!-- Month Selector Dropdown -->
            <Transition name="fade-scale">
              <div
                v-if="showMonthSelector && activeFilter === 'Mes'"
                class="absolute right-0 top-full mt-2 z-50 bg-surface-container-high border border-outline-variant rounded-2xl p-3 shadow-[0_12px_32px_rgba(0,0,0,0.5)] w-56 max-h-64 overflow-y-auto"
              >
                <div class="flex flex-col gap-1">
                  <button
                    v-for="month in availableMonths"
                    :key="month.value"
                    :class="[
                      'w-full text-left px-4 py-2.5 rounded-xl text-[14px] font-sans transition-all active:scale-98',
                      selectedMonth === month.value
                        ? 'bg-primary-container/10 text-surface-tint font-bold'
                        : 'text-on-surface hover:bg-surface-variant'
                    ]"
                    @click="selectMonth(month.value)"
                  >
                    {{ month.label }}
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Menu button: always available -->
        <div class="relative" data-dropdown>
          <button
            class="flex items-center justify-center w-9 h-9 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-all active:scale-95"
            aria-label="Opciones de ventas"
            @click.stop="showShiftMenu = !showShiftMenu"
          >
            <span class="material-symbols-outlined text-[20px]">more_vert</span>
          </button>

          <!-- Dropdown Menu -->
          <Transition name="fade-scale">
            <div
              v-if="showShiftMenu"
              class="absolute right-0 top-full mt-2 z-50 bg-surface-container-high border border-outline-variant rounded-2xl p-2 shadow-[0_12px_32px_rgba(0,0,0,0.5)] w-56"
            >
              <!-- Report item -->
              <button
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-sans text-on-surface hover:bg-surface-variant transition-all active:scale-95 text-left"
                @click="goToReport"
              >
                <span class="material-symbols-outlined text-[20px] text-primary-fixed-dim">analytics</span>
                <div>
                  <div class="font-medium">Reporte del negocio</div>
                  <div class="text-[11px] text-on-surface-variant/60">Ver resumen de ventas y exportar Excel</div>
                </div>
              </button>

              <template v-if="settingsStore.shiftsEnabled">
                <!-- Separator -->
                <div class="my-1 border-t border-outline-variant/50" />

                <button
                  :class="[
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-sans transition-all active:scale-95 text-left',
                    shiftsStore.activeShift
                      ? 'text-on-surface hover:bg-surface-variant'
                      : 'text-on-surface-variant/40 cursor-not-allowed'
                  ]"
                  :disabled="!shiftsStore.activeShift"
                  @click="goToShiftClose"
                >
                  <span class="material-symbols-outlined text-[18px]">lock_clock</span>
                  <div>
                    <div class="font-medium">Cerrar turno</div>
                    <div v-if="!shiftsStore.activeShift" class="text-[11px] text-on-surface-variant/40">
                      No hay turno activo
                    </div>
                    <div v-else class="text-[11px] text-on-surface-variant/60">
                      Turno #{{ shiftsStore.activeShift.id }}
                    </div>
                  </div>
                </button>

                <!-- Separator -->
                <div class="my-1 border-t border-outline-variant/50" />

                <button
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-sans text-on-surface hover:bg-surface-variant transition-all active:scale-95 text-left"
                  @click="goToShiftHistory"
                >
                  <span class="material-symbols-outlined text-[18px]">history</span>
                  <div>
                    <div class="font-medium">Historial de turnos</div>
                    <div class="text-[11px] text-on-surface-variant/60">Ver todos los turnos</div>
                  </div>
                </button>
              </template>
            </div>
          </Transition>
        </div>

      </div>
    </div>

    <!-- Active Shift Banner: visible only when Turno filter is active -->
    <div
      v-if="activeFilter === 'Turno' && settingsStore.shiftsEnabled && shiftsStore.activeShift"
      class="flex items-center gap-3 mb-5 px-4 py-3 bg-surface-container-high border border-outline-variant/60 rounded-2xl"
    >
      <span class="relative flex shrink-0">
        <span class="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-green-400 opacity-60" />
        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
      </span>
      <div class="flex-1 min-w-0">
        <span class="text-[14px] font-semibold text-on-surface font-display">
          Turno #{{ shiftsStore.activeShift.id }}
        </span>
        <span class="text-[13px] text-on-surface-variant font-sans ml-2">
          · Abierto desde las {{ new Date(shiftsStore.activeShift.startedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) }}
        </span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <span class="material-symbols-outlined text-[40px] text-on-surface-variant/50 animate-spin">
        progress_activity
      </span>
    </div>

    <!-- Sales List -->
    <div v-else-if="filteredSales.length > 0" class="flex flex-col gap-4">
      <RouterLink
        v-for="sale in filteredSales"
        :key="sale.id"
        :to="`/sales/${sale.id}`"
        class="flex items-center gap-4 bg-surface-container border border-outline-variant rounded-[1rem] p-[24px] transition-all duration-200 hover:border-surface-tint"
      >
        <!-- Icon -->
        <div class="shrink-0 w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center">
          <span class="material-symbols-outlined text-on-surface-variant text-[24px]">receipt_long</span>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <p class="text-[14px] font-bold font-display text-on-surface">
            {{ sale.items.length }} producto{{ sale.items.length > 1 ? 's' : '' }}
          </p>
          <p class="mt-0.5 text-[14px] text-on-surface-variant font-sans">
            {{ formatDate(sale.createdAt) }} · {{ formatTime(sale.createdAt) }}
          </p>
        </div>

        <!-- Total -->
        <div class="shrink-0 text-right">
          <p class="text-[17px] font-bold text-surface-tint">${{ formatPrice(sale.total) }}</p>
          <p v-if="sale.taxIncluded" class="text-[12px] text-on-surface-variant/60">IVA incluido</p>
        </div>

        <!-- Chevron -->
        <span class="material-symbols-outlined text-on-surface-variant/50">chevron_right</span>
      </RouterLink>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-24">
      <span class="material-symbols-outlined text-[40px] text-on-surface-variant/50 mb-4">
        receipt_long
      </span>
      <p class="text-[17px] font-display font-semibold text-on-surface-variant text-center">
        No hay ventas en este período
      </p>
      <p class="mt-2 text-[14px] text-on-surface-variant/60 text-center font-sans">
        Las ventas finalizadas aparecerán aquí
      </p>
    </div>
  </div>
</template>
