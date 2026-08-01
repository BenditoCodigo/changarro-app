<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSalesStore } from '@/stores/sales'
import { useProductsStore } from '@/stores/products'
import {
  calculateReportData,
  exportReportToExcel,
  type ReportPeriod,
} from '@/services/reportsService'

const router = useRouter()
const salesStore = useSalesStore()
const productsStore = useProductsStore()

const selectedPeriod = ref<ReportPeriod>('week')
const isExporting = ref(false)
const exportSuccessToast = ref(false)

onMounted(async () => {
  await salesStore.loadSales()
  await productsStore.loadProducts()
})

const reportData = computed(() => {
  return calculateReportData(salesStore.sales, productsStore.products, selectedPeriod.value)
})

function formatPrice(val: number): string {
  return val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function selectPeriod(p: ReportPeriod) {
  selectedPeriod.value = p
}

function playBeepSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, audioCtx.currentTime)
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15)

    osc.connect(gain)
    gain.connect(audioCtx.destination)

    osc.start()
    osc.stop(audioCtx.currentTime + 0.15)
  } catch (e) {
    console.warn('Audio play error:', e)
  }
}

function triggerHaptic() {
  if ('vibrate' in navigator) {
    navigator.vibrate([40, 30, 40])
  }
}

async function handleExportExcel() {
  if (isExporting.value) return
  isExporting.value = true

  try {
    playBeepSound()
    triggerHaptic()
    await exportReportToExcel(reportData.value, productsStore.products)
    exportSuccessToast.value = true
    setTimeout(() => {
      exportSuccessToast.value = false
    }, 3000)
  } catch (e) {
    console.error('Export Excel failed:', e)
  } finally {
    isExporting.value = false
  }
}

function goBack() {
  router.push('/sales')
}
</script>

<template>
  <div class="max-w-2xl mx-auto pb-12">
    <!-- Header -->
    <header class="flex items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="w-10 h-10 rounded-full bg-surface-container-low border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors active:scale-95"
          aria-label="Regresar a ventas"
          @click="goBack"
        >
          <span class="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div>
          <h1 class="text-[24px] font-bold font-display text-on-background leading-tight">
            Reporte del Negocio
          </h1>
          <p class="text-xs text-on-surface-variant font-sans">
            Resumen claro de tus ventas y productos
          </p>
        </div>
      </div>

      <!-- Export Excel Action Button -->
      <button
        type="button"
        class="px-4 py-2.5 rounded-full bg-primary-container text-on-primary-container font-semibold text-xs flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
        :disabled="isExporting"
        @click="handleExportExcel"
      >
        <span v-if="isExporting" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
        <span v-else class="material-symbols-outlined text-base">download_for_offline</span>
        <span class="hidden sm:inline">Exportar Excel</span>
        <span class="sm:hidden">Excel</span>
      </button>
    </header>

    <!-- Export Success Notification Toast -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="exportSuccessToast"
        class="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 shadow-lg"
      >
        <span class="material-symbols-outlined text-xl text-emerald-400">check_circle</span>
        <p class="text-xs font-semibold font-sans">
          ¡Reporte en Excel (.xlsx) generado y descargado correctamente!
        </p>
      </div>
    </Transition>

    <!-- Period Filter Pills -->
    <div class="flex items-center gap-1.5 p-1 mb-6 bg-surface-container-low border border-outline-variant rounded-full overflow-x-auto">
      <button
        type="button"
        class="flex-1 py-2 px-3 rounded-full text-xs font-semibold font-display transition-all whitespace-nowrap"
        :class="selectedPeriod === 'today' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
        @click="selectPeriod('today')"
      >
        Hoy
      </button>
      <button
        type="button"
        class="flex-1 py-2 px-3 rounded-full text-xs font-semibold font-display transition-all whitespace-nowrap"
        :class="selectedPeriod === 'week' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
        @click="selectPeriod('week')"
      >
        Esta Semana
      </button>
      <button
        type="button"
        class="flex-1 py-2 px-3 rounded-full text-xs font-semibold font-display transition-all whitespace-nowrap"
        :class="selectedPeriod === 'month' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
        @click="selectPeriod('month')"
      >
        Este Mes
      </button>
      <button
        type="button"
        class="flex-1 py-2 px-3 rounded-full text-xs font-semibold font-display transition-all whitespace-nowrap"
        :class="selectedPeriod === 'all' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
        @click="selectPeriod('all')"
      >
        Todo
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-if="reportData.kpis.salesCount === 0"
      class="flex flex-col items-center justify-center py-20 bg-surface-container border border-outline-variant rounded-3xl p-8 text-center"
    >
      <span class="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-3">analytics</span>
      <h3 class="font-display text-lg font-semibold text-on-surface">No hay ventas registradas</h3>
      <p class="text-xs text-on-surface-variant max-w-xs mt-1">
        Las ventas completadas en el período "{{ reportData.periodLabel }}" aparecerán aquí procesadas en gráficos e insights.
      </p>
    </div>

    <!-- Report Dashboard Content -->
    <div v-else class="space-y-6">
      <!-- 1. KPI CARDS GRID -->
      <section class="grid grid-cols-2 gap-3 sm:gap-4">
        <!-- Card 1: Total Cobrado -->
        <div class="p-5 bg-surface-container border border-outline-variant rounded-3xl relative overflow-hidden flex flex-col justify-between">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Cobrado</span>
            <div class="w-8 h-8 rounded-full bg-primary-fixed-dim/10 text-primary-fixed-dim flex items-center justify-center">
              <span class="material-symbols-outlined text-lg">payments</span>
            </div>
          </div>
          <div>
            <span class="block text-2xl sm:text-3xl font-extrabold font-display text-surface-tint">
              ${{ formatPrice(reportData.kpis.totalRevenue) }}
            </span>
            <span class="text-[11px] text-on-surface-variant/70 font-sans mt-1 block">
              Ingresos en {{ reportData.periodLabel.toLowerCase() }}
            </span>
          </div>
        </div>

        <!-- Card 2: Clientes Atendidos -->
        <div class="p-5 bg-surface-container border border-outline-variant rounded-3xl relative overflow-hidden flex flex-col justify-between">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Compras Atendidas</span>
            <div class="w-8 h-8 rounded-full bg-primary-container/20 text-on-primary-container flex items-center justify-center">
              <span class="material-symbols-outlined text-lg">shopping_bag</span>
            </div>
          </div>
          <div>
            <span class="block text-2xl sm:text-3xl font-extrabold font-display text-on-surface">
              {{ reportData.kpis.salesCount }}
            </span>
            <span class="text-[11px] text-on-surface-variant/70 font-sans mt-1 block">
              Ventas realizadas
            </span>
          </div>
        </div>

        <!-- Card 3: Ticket Promedio -->
        <div class="p-5 bg-surface-container border border-outline-variant rounded-3xl relative overflow-hidden flex flex-col justify-between">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Ticket Promedio</span>
            <div class="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center">
              <span class="material-symbols-outlined text-lg">receipt</span>
            </div>
          </div>
          <div>
            <span class="block text-2xl sm:text-3xl font-extrabold font-display text-on-surface">
              ${{ formatPrice(reportData.kpis.averageTicket) }}
            </span>
            <span class="text-[11px] text-on-surface-variant/70 font-sans mt-1 block">
              Promedio por cliente
            </span>
          </div>
        </div>

        <!-- Card 4: Efectivo vs Tarjeta -->
        <div class="p-5 bg-surface-container border border-outline-variant rounded-3xl relative overflow-hidden flex flex-col justify-between">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Método Principal</span>
            <div class="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center">
              <span class="material-symbols-outlined text-lg">credit_card</span>
            </div>
          </div>
          <div>
            <span class="block text-xl font-bold font-display text-on-surface truncate">
              {{ reportData.kpis.cashPercentage >= reportData.kpis.cardPercentage ? 'Efectivo' : 'Tarjeta' }}
            </span>
            <div class="w-full bg-surface-container-high h-2 rounded-full mt-2 overflow-hidden flex">
              <div class="bg-primary-fixed-dim h-full" :style="{ width: `${reportData.kpis.cashPercentage}%` }"></div>
              <div class="bg-indigo-400 h-full" :style="{ width: `${reportData.kpis.cardPercentage}%` }"></div>
            </div>
            <span class="text-[11px] text-on-surface-variant/70 font-sans mt-1.5 block">
              💵 {{ reportData.kpis.cashPercentage }}% Efec · 💳 {{ reportData.kpis.cardPercentage }}% Tarj
            </span>
          </div>
        </div>
      </section>

      <!-- 2. HUMAN INSIGHTS (Sentences) -->
      <section class="p-6 bg-surface-container border border-outline-variant rounded-3xl space-y-4">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-display">
          Conclusiones del Negocio
        </h2>

        <div class="space-y-3">
          <!-- Insight 1: Top Product -->
          <div class="flex items-start gap-3.5 p-4 rounded-2xl bg-surface-container-low border border-outline-variant">
            <div class="w-9 h-9 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <span class="material-symbols-outlined text-xl">workspace_premium</span>
            </div>
            <div>
              <span class="block text-xs font-semibold text-amber-400 uppercase tracking-wider">Producto Estrella</span>
              <p v-if="reportData.insights.topProduct" class="text-sm font-sans text-on-surface mt-0.5 leading-relaxed">
                Tu producto con mayor rotación es
                <strong class="text-primary-fixed-dim font-bold">{{ reportData.insights.topProduct.name }}</strong>
                con <strong class="text-on-surface">{{ reportData.insights.topProduct.quantity }} unidades</strong> vendidas
                (${{ formatPrice(reportData.insights.topProduct.revenue) }} MXN).
              </p>
              <p v-else class="text-xs text-on-surface-variant">Sin datos de productos en el período.</p>
            </div>
          </div>

          <!-- Insight 2: Busiest Day -->
          <div class="flex items-start gap-3.5 p-4 rounded-2xl bg-surface-container-low border border-outline-variant">
            <div class="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <span class="material-symbols-outlined text-xl">calendar_today</span>
            </div>
            <div>
              <span class="block text-xs font-semibold text-indigo-400 uppercase tracking-wider">Día Más Fuerte</span>
              <p v-if="reportData.insights.busiestDay" class="text-sm font-sans text-on-surface mt-0.5 leading-relaxed">
                Tu día con mayor ingreso suele ser el
                <strong class="text-primary-fixed-dim font-bold">{{ reportData.insights.busiestDay.dayName }}</strong>
                con un acumulado de <strong class="text-on-surface">${{ formatPrice(reportData.insights.busiestDay.total) }} MXN</strong>.
              </p>
              <p v-else class="text-xs text-on-surface-variant">Sin datos suficientes en el período.</p>
            </div>
          </div>

          <!-- Insight 3: Peak Hour -->
          <div v-if="reportData.insights.peakHour" class="flex items-start gap-3.5 p-4 rounded-2xl bg-surface-container-low border border-outline-variant">
            <div class="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <span class="material-symbols-outlined text-xl">schedule</span>
            </div>
            <div>
              <span class="block text-xs font-semibold text-emerald-400 uppercase tracking-wider">Hora Pico de Movimiento</span>
              <p class="text-sm font-sans text-on-surface mt-0.5 leading-relaxed">
                Tu horario preferido por los clientes es entre las
                <strong class="text-primary-fixed-dim font-bold">{{ reportData.insights.peakHour.hourRange }}</strong>
                registrando {{ reportData.insights.peakHour.count }} compras.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. SVG LIGHTWEIGHT CHARTS -->
      <!-- Chart 1: Weekly Trend Bar Chart -->
      <section class="p-6 bg-surface-container border border-outline-variant rounded-3xl">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-display">
              Tendencia de Ventas (Últimos 7 días)
            </h2>
            <p class="text-xs text-on-surface-variant/60 font-sans">
              Ingresos diarios comparativos
            </p>
          </div>
        </div>

        <div class="pt-4 pb-2">
          <div class="flex items-end justify-between gap-2 h-44 px-2">
            <div
              v-for="item in reportData.weeklyTrend"
              :key="item.dateStr"
              class="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
            >
              <span class="text-[10px] font-bold text-on-surface-variant/80">
                ${{ item.total > 0 ? Math.round(item.total) : 0 }}
              </span>

              <!-- SVG Bar -->
              <div class="w-full max-w-[36px] bg-surface-container-high rounded-full overflow-hidden flex items-end h-32 relative">
                <div
                  class="w-full rounded-full transition-all duration-300"
                  :class="item.isPeak ? 'bg-primary-fixed-dim shadow-[0_0_12px_rgba(197,197,216,0.5)]' : 'bg-surface-tint/60 hover:bg-surface-tint'"
                  :style="{
                    height: `${Math.max(8, Math.min(100, (item.total / (reportData.weeklyTrend.reduce((max, d) => Math.max(max, d.total), 1))) * 100))}%`
                  }"
                ></div>
              </div>

              <span
                class="text-xs font-medium font-display transition-colors"
                :class="item.isPeak ? 'text-primary-fixed-dim font-bold' : 'text-on-surface-variant'"
              >
                {{ item.dayLabel }}
                <span v-if="item.isPeak">⭐️</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Chart 2: Top 5 Products Horizontal Progress Bars -->
      <section class="p-6 bg-surface-container border border-outline-variant rounded-3xl">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-display">
            Top 5 Productos Más Vendidos
          </h2>
          <span class="text-xs text-on-surface-variant font-sans">Por unidades</span>
        </div>

        <div class="space-y-4">
          <div
            v-for="(item, index) in reportData.topProducts"
            :key="item.productId"
            class="space-y-1.5"
          >
            <div class="flex items-center justify-between text-xs font-sans">
              <div class="flex items-center gap-2 truncate pr-2">
                <span class="w-5 h-5 rounded-full bg-surface-container-high text-on-surface-variant font-bold text-[10px] flex items-center justify-center shrink-0">
                  #{{ index + 1 }}
                </span>
                <span class="font-semibold text-on-surface truncate">{{ item.productName }}</span>
              </div>
              <span class="font-bold text-surface-tint shrink-0">
                {{ item.quantity }} pzas · ${{ formatPrice(item.revenue) }}
              </span>
            </div>

            <!-- Progress Bar -->
            <div class="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
              <div
                class="h-full bg-primary-container rounded-full transition-all duration-300"
                :style="{
                  width: `${Math.max(5, (item.quantity / (reportData.topProducts[0]?.quantity || 1)) * 100)}%`
                }"
              ></div>
            </div>
          </div>
        </div>
      </section>

      <!-- EXPORT EXCEL ACTION FOOTER -->
      <div class="pt-4 flex flex-col items-center gap-3">
        <button
          type="button"
          class="w-full h-14 rounded-full bg-primary-container text-on-primary-container font-semibold text-sm flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"
          :disabled="isExporting"
          @click="handleExportExcel"
        >
          <span v-if="isExporting" class="material-symbols-outlined text-xl animate-spin">progress_activity</span>
          <span v-else class="material-symbols-outlined text-xl">download_for_offline</span>
          Exportar Reporte a Excel (.xlsx)
        </button>

        <p class="text-xs text-on-surface-variant/60 text-center max-w-sm font-sans">
          El archivo Excel incluye 3 pestañas: Resumen e Insights, Detalle Completo de Ventas e Inventario.
        </p>
      </div>
    </div>
  </div>
</template>
