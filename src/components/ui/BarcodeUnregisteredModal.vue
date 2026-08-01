<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  open: boolean
  barcode: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'quickSale', data: { name: string; price: number }): void
}>()

const router = useRouter()
const quickName = ref('')
const quickPrice = ref<number | ''>('')
const priceInputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      quickName.value = `Producto (${props.barcode.slice(-4)})`
      quickPrice.value = ''
    }
  },
)

function handleAddQuickSale() {
  const price = typeof quickPrice.value === 'number' ? quickPrice.value : Number.parseFloat(quickPrice.value)
  if (Number.isNaN(price) || price <= 0) return

  const name = quickName.value.trim() || 'Producto sin registro'
  emit('quickSale', { name, price })
  emit('close')
}

function handleRegisterInInventory() {
  emit('close')
  router.push({
    path: '/settings/inventory/new',
    query: { barcode: props.barcode },
  })
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity"
    >
      <div
        class="flex flex-col w-full max-w-md bg-surface rounded-3xl border border-outline-variant overflow-hidden shadow-2xl animate-fade-in"
      >
        <!-- Header -->
        <header class="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container/60">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-2xl">error_outline</span>
            </div>
            <div>
              <h3 class="font-display text-base font-semibold text-on-surface">Código no encontrado</h3>
              <p class="text-xs text-on-surface-variant">El producto no está en el catálogo</p>
            </div>
          </div>
          <button
            type="button"
            class="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            @click="handleClose"
          >
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </header>

        <!-- Body -->
        <div class="p-6 space-y-5">
          <!-- Code pill -->
          <div class="flex items-center justify-between p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant">
            <span class="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Código Leído</span>
            <span class="font-mono text-sm font-bold text-primary-fixed-dim bg-surface-container px-3 py-1 rounded-full border border-outline-variant">
              {{ barcode }}
            </span>
          </div>

          <!-- Quick Sale Form -->
          <div class="space-y-3 pt-1">
            <h4 class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Opción A: Agregar como Venta Rápida
            </h4>

            <div>
              <label class="block text-xs text-on-surface-variant mb-1">Nombre o concepto</label>
              <input
                v-model="quickName"
                type="text"
                class="w-full h-12 px-4 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim"
                placeholder="Nombre del producto"
              />
            </div>

            <div>
              <label class="block text-xs text-on-surface-variant mb-1">Precio (MXN)</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">$</span>
                <input
                  ref="priceInputRef"
                  v-model="quickPrice"
                  type="number"
                  step="0.5"
                  min="0"
                  class="w-full h-12 pl-8 pr-4 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface text-sm font-semibold focus:outline-none focus:border-primary-fixed-dim"
                  placeholder="0.00"
                  @keyup.enter="handleAddQuickSale"
                />
              </div>
            </div>

            <button
              type="button"
              class="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform disabled:opacity-50"
              :disabled="!quickPrice || Number(quickPrice) <= 0"
              @click="handleAddQuickSale"
            >
              <span class="material-symbols-outlined text-lg">add_shopping_cart</span>
              Agregar al Carrito
            </button>
          </div>

          <div class="relative flex py-1 items-center">
            <div class="flex-grow border-t border-outline-variant"></div>
            <span class="flex-shrink mx-4 text-[11px] text-on-surface-variant/60 font-semibold uppercase tracking-widest">o bien</span>
            <div class="flex-grow border-t border-outline-variant"></div>
          </div>

          <!-- Register in Inventory option -->
          <button
            type="button"
            class="w-full h-12 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-medium text-sm flex items-center justify-center gap-2 border border-outline-variant transition-colors active:scale-[0.98]"
            @click="handleRegisterInInventory"
          >
            <span class="material-symbols-outlined text-lg">inventory_2</span>
            Registrar producto en Inventario
          </button>
        </div>

        <!-- Footer -->
        <footer class="px-6 py-3 bg-surface-container-low border-t border-outline-variant flex justify-end">
          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
            @click="handleClose"
          >
            Continuar escaneando
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
