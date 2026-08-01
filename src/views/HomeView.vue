<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { useProductsStore } from '@/stores/products'
import { useCartStore } from '@/stores/cart'
import { useSettingsStore } from '@/stores/settings'
import { useProductImages } from '@/composables/useProductImages'
import { emitParticles } from '@/composables/useParticles'
import { searchItems } from '@/utils/search'
import BarcodeUnregisteredModal from '@/components/ui/BarcodeUnregisteredModal.vue'

const productsStore = useProductsStore()
const cartStore = useCartStore()
const settingsStore = useSettingsStore()
const { imageUrls, loadImages } = useProductImages()

// Tabs state
const activeTab = ref<'catalog' | 'scanner'>(settingsStore.defaultHomeTab || 'catalog')

// Catalog search & view mode
const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>('list')

// Supermarket Scanner State
const scannerVideoRef = ref<HTMLVideoElement | null>(null)
const isScannerActive = ref(false)
const hasCameraPermission = ref<boolean | null>(null)
const cameraError = ref<string | null>(null)
const isFlashlightOn = ref(false)

const lastScannedCode = ref('')
const lastScannedTime = ref(0)
const COOLDOWN_MS = 2000

const showUnregisteredModal = ref(false)
const unregisteredCode = ref('')

const toastMessage = ref<string | null>(null)
let toastTimer: number | null = null

let mediaStream: MediaStream | null = null
let scanInterval: number | null = null

onMounted(async () => {
  await settingsStore.loadSettings()
  await productsStore.loadProducts()

  if (!settingsStore.barcodeScannerEnabled) {
    activeTab.value = 'catalog'
  } else {
    activeTab.value = settingsStore.defaultHomeTab || 'catalog'
  }
})

// Ensure tab sync with settings
watch(
  () => settingsStore.barcodeScannerEnabled,
  (enabled) => {
    if (!enabled) {
      activeTab.value = 'catalog'
      stopContinuousCamera()
    }
  },
)

// Handle tab switching & camera lifecycle
watch(
  activeTab,
  async (newTab) => {
    if (newTab === 'scanner' && settingsStore.barcodeScannerEnabled) {
      await nextTick()
      startContinuousCamera()
    } else {
      stopContinuousCamera()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopContinuousCamera()
})

// Load images when active products change
watch(
  () => productsStore.activeProducts,
  (products) => {
    if (products.length > 0) {
      loadImages(products.map((p) => p.id))
    }
  },
  { immediate: true },
)

const filteredProducts = computed(() => {
  return searchItems(productsStore.activeProducts, searchQuery.value, ['name', 'category', 'barcode'])
})

function formatPrice(price: number): string {
  return price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function addToCart(
  product: { id: string; name: string; price: number },
  event?: MouseEvent | TouchEvent,
) {
  cartStore.addItem(product)
  if (event) {
    emitParticles(event)
  }
}

function clearSearch() {
  searchQuery.value = ''
}

function toggleView() {
  viewMode.value = viewMode.value === 'list' ? 'grid' : 'list'
}

function triggerToast(msg: string) {
  toastMessage.value = msg
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastMessage.value = null
  }, 2500)
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
    console.warn('Could not play audio feedback', e)
  }
}

function triggerHapticFeedback() {
  if ('vibrate' in navigator) {
    navigator.vibrate([40, 30, 40])
  }
}

// Continuous Camera Scanner logic
const hasTorchSupport = ref(false)

async function startContinuousCamera() {
  cameraError.value = null
  hasCameraPermission.value = null
  hasTorchSupport.value = false

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    hasCameraPermission.value = false
    cameraError.value = 'Navegador sin soporte de cámara.'
    return
  }

  try {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })
    } catch {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      })
    }

    hasCameraPermission.value = true

    if (mediaStream) {
      const track = mediaStream.getVideoTracks()[0]
      if (track && typeof track.getCapabilities === 'function') {
        const capabilities = track.getCapabilities() as { torch?: boolean }
        hasTorchSupport.value = !!capabilities.torch
      }
    }

    await nextTick()
    if (scannerVideoRef.value) {
      scannerVideoRef.value.srcObject = mediaStream
      await scannerVideoRef.value.play()
      startContinuousDetectionLoop()
    }
  } catch (err) {
    console.error('Camera access error:', err)
    hasCameraPermission.value = false
    cameraError.value = 'No se pudo acceder a la cámara. Por favor otorga permisos en tu navegador.'
  }
}

function stopContinuousCamera() {
  isScannerActive.value = false
  if (scanInterval) {
    window.clearInterval(scanInterval)
    scanInterval = null
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop())
    mediaStream = null
  }
}

async function startContinuousDetectionLoop() {
  isScannerActive.value = true
  const BarcodeDetector = window.BarcodeDetector

  if (!BarcodeDetector) {
    console.warn('BarcodeDetector API not supported in this browser.')
    return
  }

  let detector: InstanceType<NonNullable<typeof window.BarcodeDetector>>
  try {
    detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
    })
  } catch (e) {
    console.warn('BarcodeDetector init error:', e)
    return
  }

  scanInterval = window.setInterval(async () => {
    if (
      !scannerVideoRef.value ||
      !isScannerActive.value ||
      showUnregisteredModal.value ||
      scannerVideoRef.value.readyState < 2
    ) {
      return
    }

    try {
      const barcodes = await detector.detect(scannerVideoRef.value)
      if (barcodes.length > 0 && barcodes[0]?.rawValue) {
        const rawCode = barcodes[0].rawValue.trim()
        if (!rawCode) return

        const now = Date.now()
        // Check 2-second cooldown for consecutive scans
        if (rawCode === lastScannedCode.value && now - lastScannedTime.value < COOLDOWN_MS) {
          return
        }

        lastScannedCode.value = rawCode
        lastScannedTime.value = now

        handleCodeScanned(rawCode)
      }
    } catch {
      // Ignore frame read errors
    }
  }, 250)
}

function handleCodeScanned(code: string) {
  // Find product in catalog
  const foundProduct = productsStore.activeProducts.find((p) => p.barcode === code)

  if (foundProduct) {
    playBeepSound()
    triggerHapticFeedback()
    addToCart(foundProduct)
    triggerToast(`➕ Agregado: ${foundProduct.name} ($${formatPrice(foundProduct.price)})`)
  } else {
    // Unregistered barcode found! Pause scanner and present modal
    isScannerActive.value = false
    unregisteredCode.value = code
    showUnregisteredModal.value = true
  }
}

function handleQuickSaleFromModal(data: { name: string; price: number }) {
  cartStore.addItem({
    id: `quick-${Date.now()}`,
    name: data.name,
    price: data.price,
  })
  triggerToast(`➕ Venta rápida: ${data.name} ($${formatPrice(data.price)})`)
  resumeScanning()
}

function handleCloseUnregisteredModal() {
  showUnregisteredModal.value = false
  resumeScanning()
}

function resumeScanning() {
  showUnregisteredModal.value = false
  isScannerActive.value = true
}

async function toggleTorch() {
  if (!mediaStream) return
  const track = mediaStream.getVideoTracks()[0]
  if (!track) return

  try {
    const capabilities = track.getCapabilities() as { torch?: boolean }
    if (capabilities.torch) {
      isFlashlightOn.value = !isFlashlightOn.value
      await (track.applyConstraints as (constraints: unknown) => Promise<void>)({
        advanced: [{ torch: isFlashlightOn.value }],
      })
    }
  } catch (e) {
    console.warn('Torch toggle failed', e)
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header with optional Tabs -->
    <section class="mb-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-[26px] leading-[34px] tracking-[-0.02em] font-bold font-display text-on-background">
            Vender
          </h1>
          <p class="mt-0.5 text-[14px] text-on-surface-variant font-sans">
            {{ activeTab === 'catalog' ? 'Toca un producto para agregarlo al carrito' : 'Pasa tus productos frente a la cámara' }}
          </p>
        </div>
      </div>

      <!-- Navigation Tabs (if Scanner Mode is Enabled) -->
      <div
        v-if="settingsStore.barcodeScannerEnabled"
        class="flex items-center p-1 mt-4 bg-surface-container-low border border-outline-variant rounded-full"
      >
        <button
          type="button"
          class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-semibold font-display transition-all"
          :class="
            activeTab === 'catalog'
              ? 'bg-primary-container text-on-primary-container shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          "
          @click="activeTab = 'catalog'"
        >
          <span class="material-symbols-outlined text-lg">grid_view</span>
          Catálogo
        </button>
        <button
          type="button"
          class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-semibold font-display transition-all"
          :class="
            activeTab === 'scanner'
              ? 'bg-primary-container text-on-primary-container shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          "
          @click="activeTab = 'scanner'"
        >
          <span class="material-symbols-outlined text-lg">qr_code_scanner</span>
          Escáner Cajero
        </button>
      </div>
    </section>

    <!-- TAB 1: CATALOG VIEW -->
    <div v-if="activeTab === 'catalog'">
      <!-- Search + View Toggle -->
      <div class="flex items-center gap-3 mb-5">
        <!-- Search input -->
        <div class="relative flex-1">
          <span class="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">
            search
          </span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nombre, categoría o código..."
            class="w-full bg-surface-container-low border border-outline-variant rounded-full pl-14 pr-12 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary-fixed-dim focus:border-transparent outline-none transition-all"
          />
          <!-- Clear button -->
          <button
            v-if="searchQuery"
            class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full hover:bg-surface-variant transition-colors active:scale-95"
            aria-label="Borrar búsqueda"
            @click="clearSearch"
          >
            <span class="material-symbols-outlined text-on-surface-variant text-[17px]">close</span>
          </button>
        </div>

        <!-- View toggle -->
        <button
          class="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-low border border-outline-variant hover:bg-surface-variant transition-colors active:scale-95"
          :aria-label="viewMode === 'list' ? 'Cambiar a cuadrícula' : 'Cambiar a lista'"
          @click="toggleView"
        >
          <span class="material-symbols-outlined text-on-surface-variant">
            {{ viewMode === 'list' ? 'grid_view' : 'view_list' }}
          </span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="productsStore.isLoading" class="flex justify-center py-16">
        <span class="material-symbols-outlined text-[40px] text-on-surface-variant/50 animate-spin">
          progress_activity
        </span>
      </div>

      <!-- List View -->
      <div v-else-if="filteredProducts.length > 0 && viewMode === 'list'" class="flex flex-col gap-3">
        <article
          v-for="product in filteredProducts"
          :key="product.id"
          class="flex items-center gap-4 bg-surface-container border border-outline-variant rounded-[1rem] p-5 transition-all duration-200 hover:border-surface-tint cursor-pointer active:scale-[0.98]"
          role="button"
          :aria-label="`Agregar ${product.name} al carrito`"
          @click="addToCart(product, $event)"
        >
          <!-- Thumbnail -->
          <div
            class="shrink-0 w-14 h-14 bg-surface-container-high rounded-[0.75rem] border border-outline-variant flex items-center justify-center overflow-hidden"
          >
            <img
              v-if="imageUrls[product.id]"
              :src="imageUrls[product.id]"
              :alt="product.name"
              class="w-full h-full object-cover"
            />
            <span v-else class="material-symbols-outlined text-on-surface-variant/50 text-[24px]">
              inventory_2
            </span>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <h3 class="text-[14px] font-bold font-display text-on-surface truncate">
              {{ product.name }}
            </h3>
            <div class="flex items-center gap-2 mt-0.5">
              <p class="text-[15px] font-bold text-surface-tint">
                ${{ formatPrice(product.price) }}
              </p>
              <span
                v-if="product.barcode"
                class="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant/80 border border-outline-variant/50"
              >
                {{ product.barcode }}
              </span>
            </div>
          </div>

          <!-- Add to cart icon -->
          <div class="shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-surface-container-high">
            <span class="material-symbols-outlined text-on-surface text-[19px]">add_shopping_cart</span>
          </div>
        </article>
      </div>

      <!-- Grid View -->
      <div v-else-if="filteredProducts.length > 0 && viewMode === 'grid'" class="grid grid-cols-2 md:grid-cols-3 gap-3">
        <article
          v-for="product in filteredProducts"
          :key="product.id"
          class="flex flex-col items-center bg-surface-container border border-outline-variant rounded-[1rem] p-4 transition-all duration-200 hover:border-surface-tint cursor-pointer active:scale-[0.97]"
          role="button"
          :aria-label="`Agregar ${product.name} al carrito`"
          @click="addToCart(product, $event)"
        >
          <!-- Thumbnail -->
          <div
            class="w-14 h-14 mb-3 bg-surface-container-high rounded-[0.75rem] border border-outline-variant flex items-center justify-center overflow-hidden"
          >
            <img
              v-if="imageUrls[product.id]"
              :src="imageUrls[product.id]"
              :alt="product.name"
              class="w-full h-full object-cover"
            />
            <span v-else class="material-symbols-outlined text-on-surface-variant/50 text-[24px]">
              inventory_2
            </span>
          </div>

          <!-- Name -->
          <h3 class="text-[14px] font-bold font-display text-on-surface text-center line-clamp-2 mb-1">
            {{ product.name }}
          </h3>

          <!-- Price -->
          <p class="text-[14px] font-bold text-surface-tint">${{ formatPrice(product.price) }}</p>
        </article>
      </div>

      <!-- Empty state: no products at all -->
      <div
        v-else-if="productsStore.activeProducts.length === 0 && !searchQuery.trim()"
        class="flex flex-col items-center justify-center py-16 gap-4"
      >
        <span class="material-symbols-outlined text-[40px] text-on-surface-variant/50">storefront</span>
        <p class="text-[17px] font-display font-semibold text-on-surface-variant text-center">
          No hay productos en tu inventario
        </p>
        <p class="text-[14px] text-on-surface-variant/60 text-center">
          Agrega productos desde Ajustes → Inventario
        </p>
        <RouterLink
          to="/settings/inventory/new"
          class="mt-4 px-6 py-3 bg-primary-container text-on-primary-container rounded-full text-label-md transition-all duration-200 hover:shadow-lg active:scale-95"
        >
          Agregar primer producto
        </RouterLink>
      </div>

      <!-- Empty state: no search results -->
      <div
        v-else-if="filteredProducts.length === 0 && searchQuery.trim()"
        class="flex flex-col items-center justify-center py-16 gap-4"
      >
        <span class="material-symbols-outlined text-[40px] text-on-surface-variant/50">search_off</span>
        <p class="text-[15px] text-on-surface-variant font-sans text-center">
          No se encontraron productos con "{{ searchQuery }}"
        </p>
      </div>

      <!-- FAB: Venta Rápida -->
      <RouterLink
        to="/quick-sale"
        class="fixed bottom-28 right-5 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary-container text-on-primary-container shadow-lg transition-all duration-200 hover:shadow-xl active:scale-95"
        aria-label="Venta Rápida"
      >
        <span class="material-symbols-outlined text-[19px]">add</span>
      </RouterLink>
    </div>

    <!-- TAB 2: SUPERMARKET SCANNER VIEW -->
    <div v-else-if="activeTab === 'scanner'" class="flex flex-col gap-4">
      <div
        class="relative w-full aspect-[4/3] max-h-[420px] bg-black rounded-3xl overflow-hidden border border-outline-variant shadow-2xl flex flex-col justify-center items-center"
      >
        <!-- Camera Video Feed (Mirrored for intuitive user experience) -->
        <video
          ref="scannerVideoRef"
          playsinline
          muted
          class="w-full h-full object-cover scale-x-[-1]"
        ></video>

        <!-- Scanner Viewfinder Overlay with Light Frame Mask -->
        <div class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <div class="relative w-64 h-48 border-2 border-indigo-600 rounded-2xl overflow-hidden shadow-[0_0_0_9999px_rgba(245,245,250,0.92)]">
            <!-- Scanning Laser Line -->
            <div class="absolute inset-x-0 h-0.5 bg-indigo-600 shadow-[0_0_10px_#4f46e5] animate-pulse top-1/2 -translate-y-1/2"></div>
          </div>
          <span class="mt-4 px-3.5 py-1.5 bg-slate-900/90 text-white backdrop-blur-md rounded-full text-xs font-semibold shadow-lg border border-slate-700/50">
            Cámara activa · Pausa de 2s entre escaneos
          </span>
        </div>

        <!-- Controls (Flashlight - Only visible if device supports torch LED) -->
        <div v-if="hasTorchSupport" class="absolute top-4 right-4 z-10 flex gap-2">
          <button
            type="button"
            class="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Encender linterna"
            @click="toggleTorch"
          >
            <span class="material-symbols-outlined text-xl">
              {{ isFlashlightOn ? 'flashlight_on' : 'flashlight_off' }}
            </span>
          </button>
        </div>

        <!-- Camera Permission / Error Overlay -->
        <div
          v-if="hasCameraPermission === false || cameraError"
          class="absolute inset-0 bg-surface-container/95 p-6 flex flex-col items-center justify-center text-center gap-3"
        >
          <span class="material-symbols-outlined text-4xl text-error">videocam_off</span>
          <p class="text-sm font-semibold text-on-surface">{{ cameraError || 'Acceso a la cámara denegado' }}</p>
          <button
            type="button"
            class="mt-2 px-5 py-2.5 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold shadow-md active:scale-95"
            @click="startContinuousCamera"
          >
            Reintentar cámara
          </button>
        </div>
      </div>

      <!-- Scanned Toast Floating Notification -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div
          v-if="toastMessage"
          class="flex items-center gap-3 p-4 bg-primary-container text-on-primary-container rounded-2xl shadow-lg border border-primary-fixed-dim/30"
        >
          <span class="material-symbols-outlined text-2xl">check_circle</span>
          <span class="font-display font-semibold text-sm">{{ toastMessage }}</span>
        </div>
      </Transition>

      <!-- Cart Counter Summary Box -->
      <div class="flex items-center justify-between p-5 bg-surface-container rounded-2xl border border-outline-variant">
        <div>
          <span class="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Carrito en Curso</span>
          <span class="block text-lg font-bold font-display text-on-surface mt-0.5">
            {{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'producto' : 'productos' }}
          </span>
        </div>
        <RouterLink
          to="/cart"
          class="px-5 py-2.5 rounded-full bg-primary-container text-on-primary-container text-xs font-bold font-display flex items-center gap-2 shadow-md active:scale-95 transition-transform"
        >
          <span class="material-symbols-outlined text-base">shopping_cart</span>
          Ver Carrito (${{ formatPrice(cartStore.total) }})
        </RouterLink>
      </div>
    </div>

    <!-- Unregistered Barcode Modal -->
    <BarcodeUnregisteredModal
      :open="showUnregisteredModal"
      :barcode="unregisteredCode"
      @close="handleCloseUnregisteredModal"
      @quick-sale="handleQuickSaleFromModal"
    />
  </div>
</template>
