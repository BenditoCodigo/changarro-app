<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'scan', barcode: string): void
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const isScanning = ref(false)
const hasCameraPermission = ref<boolean | null>(null)
const errorMessage = ref<string | null>(null)
const manualBarcode = ref('')
const isFlashlightOn = ref(false)

let mediaStream: MediaStream | null = null
let scanTimer: number | null = null

// Define BarcodeDetector type for TypeScript
interface DetectedBarcode {
  rawValue: string
  format: string
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): {
        detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>
      }
      getSupportedFormats(): Promise<string[]>
    }
  }
}

function playBeepSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, audioCtx.currentTime) // A5 note
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

async function startCamera() {
  errorMessage.value = null
  hasCameraPermission.value = null

  try {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    }

    mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
    hasCameraPermission.value = true

    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
      await videoRef.value.play()
      startDetectionLoop()
    }
  } catch (err) {
    console.error('Camera access error:', err)
    hasCameraPermission.value = false
    errorMessage.value = 'No se pudo acceder a la cámara. Por favor permite el acceso o ingresa el código manualmente.'
  }
}

function stopCamera() {
  isScanning.value = false
  if (scanTimer) {
    window.clearInterval(scanTimer)
    scanTimer = null
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop())
    mediaStream = null
  }
}

async function startDetectionLoop() {
  isScanning.value = true

  // Check if native BarcodeDetector API is supported
  const BarcodeDetector = window.BarcodeDetector

  if (!BarcodeDetector) {
    console.warn('BarcodeDetector API is not supported in this browser environment.')
    return
  }

  let detector: InstanceType<NonNullable<typeof window.BarcodeDetector>>

  try {
    detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
    })
  } catch (e) {
    console.warn('Error initializing BarcodeDetector:', e)
    return
  }

  scanTimer = window.setInterval(async () => {
    if (!videoRef.value || !isScanning.value || videoRef.value.readyState < 2) return

    try {
      const barcodes = await detector.detect(videoRef.value)
      if (barcodes.length > 0 && barcodes[0]?.rawValue) {
        const detectedValue = barcodes[0].rawValue.trim()
        if (detectedValue) {
          handleSuccessScan(detectedValue)
        }
      }
    } catch {
      // Ignore frame detection errors (happens when video frame is unready)
    }
  }, 250)
}

function handleSuccessScan(code: string) {
  playBeepSound()
  triggerHapticFeedback()
  stopCamera()
  emit('scan', code)
  emit('close')
}

function handleManualSubmit() {
  if (!manualBarcode.value.trim()) return
  handleSuccessScan(manualBarcode.value.trim())
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

function handleClose() {
  stopCamera()
  emit('close')
}

onMounted(() => {
  if (props.open) {
    startCamera()
  }
})

onBeforeUnmount(() => {
  stopCamera()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md transition-opacity"
    >
      <!-- Main Container -->
      <div
        class="flex flex-col w-full max-w-lg mx-auto h-[90vh] bg-surface rounded-t-3xl border-t border-outline-variant overflow-hidden shadow-2xl relative"
      >
        <!-- Header -->
        <header class="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container/60 shrink-0">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-primary-fixed-dim text-2xl">qr_code_scanner</span>
            <div>
              <h3 class="font-display text-lg font-semibold text-on-surface">Escanear código</h3>
              <p class="text-xs text-on-surface-variant">Apunta la cámara al código de barras</p>
            </div>
          </div>
          <button
            type="button"
            class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            @click="handleClose"
          >
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </header>

        <!-- Viewfinder / Camera Feed Area -->
        <div class="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          <video
            ref="videoRef"
            class="w-full h-full object-cover"
            playsinline
            muted
          ></video>

          <!-- Laser Target Overlay -->
          <div
            v-if="hasCameraPermission"
            class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6"
          >
            <!-- Frame Guide -->
            <div class="w-64 h-48 border-2 border-primary-fixed-dim/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] overflow-hidden">
              <!-- Corner indicators -->
              <div class="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-fixed-dim rounded-tl-lg"></div>
              <div class="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-fixed-dim rounded-tr-lg"></div>
              <div class="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-fixed-dim rounded-bl-lg"></div>
              <div class="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-fixed-dim rounded-br-lg"></div>

              <!-- Animated Scan Laser Line -->
              <div class="w-full h-0.5 bg-primary-fixed-dim shadow-[0_0_8px_#c5c5d8] animate-pulse relative top-1/2 -translate-y-1/2"></div>
            </div>

            <p class="mt-6 text-sm font-medium text-white/90 bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
              Coloca el código dentro del marco
            </p>
          </div>

          <!-- Permission / Error State -->
          <div
            v-if="hasCameraPermission === false"
            class="absolute inset-0 bg-surface-container flex flex-col items-center justify-center p-6 text-center"
          >
            <span class="material-symbols-outlined text-4xl text-error mb-3">videocam_off</span>
            <p class="text-on-surface font-medium text-base mb-2">Acceso a cámara no disponible</p>
            <p class="text-on-surface-variant text-sm mb-6 max-w-xs">{{ errorMessage }}</p>
            <button
              type="button"
              class="px-6 py-3 rounded-full bg-primary-container text-on-primary-container font-medium text-sm hover:scale-[1.02] active:scale-95 transition-transform"
              @click="startCamera"
            >
              Reintentar cámara
            </button>
          </div>

          <!-- Flashlight Toggle Floating Button -->
          <button
            v-if="hasCameraPermission"
            type="button"
            class="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-90 transition-transform"
            @click="toggleTorch"
          >
            <span class="material-symbols-outlined text-xl">{{ isFlashlightOn ? 'flashlight_on' : 'flashlight_off' }}</span>
          </button>
        </div>

        <!-- Manual Input Alternative (Footer) -->
        <footer class="p-6 bg-surface-container border-t border-outline-variant shrink-0">
          <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
            O escribe el código manualmente
          </p>
          <form class="flex gap-2" @submit.prevent="handleManualSubmit">
            <input
              v-model="manualBarcode"
              type="text"
              placeholder="Ej. 7501055300078"
              class="flex-1 px-4 py-3 bg-surface-container-low border border-outline-variant rounded-full text-on-surface text-sm placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary-fixed-dim"
            />
            <button
              type="submit"
              :disabled="!manualBarcode.trim()"
              class="px-5 py-3 rounded-full bg-primary-container text-on-primary-container font-medium text-sm disabled:opacity-50 disabled:pointer-events-none active:scale-95 transition-all"
            >
              Usar
            </button>
          </form>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
