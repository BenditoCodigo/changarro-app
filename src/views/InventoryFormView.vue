<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useProductsStore } from '@/stores/products'
import { resizeImage, saveProductImage } from '@/composables/useProductImages'
import { db } from '@/services/db'
import BarcodeScannerModal from '@/components/ui/BarcodeScannerModal.vue'

const route = useRoute()
const router = useRouter()
const store = useProductsStore()

const isEditing = computed(() => route.name === 'inventory-edit')
const productId = computed(() => route.params.id as string | undefined)

// Form state
const name = ref('')
const price = ref('')
const selectedCategory = ref('PRODUCTO')
const selectedUnit = ref('pieza')
const barcode = ref('')
const showScanner = ref(false)
const isLoadingProduct = ref(false)

// Image state
const imagePreviewUrl = ref<string | null>(null)
const imageBlob = ref<Blob | null>(null)
const imageRemoved = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const categories = ['SERVICIO', 'PRODUCTO', 'OTRO']
const units = ['pieza', 'kg', 'litro', 'paquete', 'servicio']

const pageTitle = computed(() => (isEditing.value ? 'Editar Producto' : 'Nuevo Producto'))

const isFormValid = computed(() => {
  return name.value.trim().length > 0 && parseFloat(price.value) > 0
})

onMounted(async () => {
  if (isEditing.value && productId.value) {
    isLoadingProduct.value = true
    try {
      const product = await store.getProductById(productId.value)
      if (product) {
        name.value = product.name
        price.value = product.price.toString()
        selectedCategory.value = product.category
        selectedUnit.value = product.unit
        barcode.value = product.barcode || ''

        // Load existing image
        const img = await db.productImages.get(productId.value)
        if (img) {
          imagePreviewUrl.value = URL.createObjectURL(img.blob)
          imageBlob.value = img.blob
        }
      } else {
        router.replace({ name: 'inventory' })
      }
    } finally {
      isLoadingProduct.value = false
    }
  } else if (route.query.barcode) {
    barcode.value = String(route.query.barcode)
  }
})

onBeforeUnmount(() => {
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value)
  }
})

function onBarcodeScanned(code: string) {
  barcode.value = code
}

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const resized = await resizeImage(file, 400)
    imageBlob.value = resized
    imageRemoved.value = false

    // Revoke old preview
    if (imagePreviewUrl.value) {
      URL.revokeObjectURL(imagePreviewUrl.value)
    }
    imagePreviewUrl.value = URL.createObjectURL(resized)
  } catch (e) {
    console.error('Error processing image:', e)
  }

  // Reset input so same file can be selected again
  input.value = ''
}

function removeImage() {
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value)
  }
  imagePreviewUrl.value = null
  imageBlob.value = null
  imageRemoved.value = true
}

async function save() {
  if (!isFormValid.value) return

  const data = {
    name: name.value.trim(),
    price: parseFloat(price.value),
    category: selectedCategory.value,
    unit: selectedUnit.value,
    barcode: barcode.value.trim() || undefined,
  }

  let id: string

  if (isEditing.value && productId.value) {
    await store.updateProduct(productId.value, data)
    id = productId.value
  } else {
    const product = await store.createProduct(data)
    id = product.id
  }

  // Save or delete image
  if (imageBlob.value && !imageRemoved.value) {
    await saveProductImage(id, imageBlob.value)
  } else if (imageRemoved.value) {
    const { deleteProductImage } = await import('@/composables/useProductImages')
    await deleteProductImage(id)
  }

  router.push({ name: 'inventory' })
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header with back button -->
    <div class="flex items-center gap-3 mb-8">
      <RouterLink
        to="/settings/inventory"
        class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-variant transition-colors active:scale-95"
        aria-label="Volver al inventario"
      >
        <span class="material-symbols-outlined text-on-surface-variant">arrow_back</span>
      </RouterLink>
      <h1
        class="text-[26px] leading-[34px] tracking-[-0.02em] font-bold font-display text-on-background"
      >
        {{ pageTitle }}
      </h1>
    </div>

    <!-- Loading state for edit mode -->
    <div v-if="isLoadingProduct" class="flex justify-center py-16">
      <span class="material-symbols-outlined text-[40px] text-on-surface-variant/50 animate-spin"
        >progress_activity</span
      >
    </div>

    <!-- Form Card -->
    <div
      v-else
      class="bg-surface-container border border-white/5 rounded-[2rem] shadow-soft p-8 md:p-[48px]"
    >
      <form @submit.prevent="save" class="flex flex-col gap-8">
        <!-- Image Upload -->
        <div class="flex flex-col gap-3">
          <label
            class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display"
          >
            Foto del producto
          </label>

          <div class="flex items-center gap-4">
            <!-- Preview or placeholder -->
            <div
              class="relative shrink-0 w-24 h-24 rounded-[1rem] border border-outline-variant overflow-hidden bg-surface-container-high flex items-center justify-center cursor-pointer transition-all hover:border-surface-tint"
              @click="triggerFileInput"
            >
              <img
                v-if="imagePreviewUrl"
                :src="imagePreviewUrl"
                alt="Vista previa"
                class="w-full h-full object-cover"
              />
              <span v-else class="material-symbols-outlined text-[26px] text-on-surface-variant/40">
                add_a_photo
              </span>
            </div>

            <!-- Buttons -->
            <div class="flex flex-col gap-2">
              <button
                type="button"
                class="px-5 py-2 rounded-full border border-outline-variant text-on-surface-variant text-label-md transition-all hover:bg-surface-variant active:scale-95"
                @click="triggerFileInput"
              >
                {{ imagePreviewUrl ? 'Cambiar foto' : 'Seleccionar foto' }}
              </button>
              <button
                v-if="imagePreviewUrl"
                type="button"
                class="px-5 py-2 rounded-full text-error text-label-md transition-all hover:bg-error/10 active:scale-95"
                @click="removeImage"
              >
                Eliminar foto
              </button>
            </div>
          </div>

          <!-- Hidden file input -->
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelect"
          />
        </div>

        <!-- Barcode Field with Camera Scanner Button -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <label
              class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display"
            >
              Código de Barras (Opcional)
            </label>
            <span v-if="barcode" class="text-xs text-primary-fixed-dim font-medium flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">check_circle</span> Capturado
            </span>
          </div>

          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <span class="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/40 text-xl">
                barcode
              </span>
              <input
                v-model="barcode"
                type="text"
                placeholder="Ej. 7501055300078"
                class="w-full bg-surface-container-low border border-outline-variant rounded-full pl-12 pr-6 py-4 text-[17px] text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary-fixed-dim focus:border-transparent outline-none transition-all"
              />
            </div>

            <button
              type="button"
              class="shrink-0 h-14 px-5 rounded-full bg-surface-container-high border border-outline-variant text-on-surface hover:border-surface-tint active:scale-95 transition-all flex items-center gap-2 font-medium text-sm"
              @click="showScanner = true"
            >
              <span class="material-symbols-outlined text-primary-fixed-dim text-xl">qr_code_scanner</span>
              <span class="hidden sm:inline">Escanear</span>
            </button>
          </div>
        </div>

        <!-- Product Name -->
        <div class="flex flex-col gap-3">
          <label
            class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display"
          >
            Nombre del Producto
          </label>
          <input
            v-model="name"
            type="text"
            placeholder="e.g. Playera Negra"
            class="w-full bg-surface-container-low border border-outline-variant rounded-full px-6 py-4 text-[17px] text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary-fixed-dim focus:border-transparent outline-none transition-all"
          />
        </div>

        <!-- Price -->
        <div class="flex flex-col gap-3">
          <label
            class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display"
          >
            Precio de venta (MXN)
          </label>
          <div class="relative">
            <span
              class="absolute left-6 top-1/2 -translate-y-1/2 text-[32px] text-primary-fixed-dim font-bold"
            >
              $
            </span>
            <input
              v-model="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              class="w-full bg-surface-container-low border border-outline-variant rounded-full pl-14 pr-6 py-6 text-[32px] text-primary-fixed-dim font-bold placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary-fixed-dim focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <!-- Category Chips -->
        <div class="flex flex-col gap-3">
          <label
            class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display"
          >
            Categoría
          </label>
          <div class="flex flex-wrap gap-3">
            <button
              v-for="category in categories"
              :key="category"
              type="button"
              :class="[
                'px-6 py-2.5 rounded-full text-label-md transition-all duration-200 active:scale-95',
                selectedCategory === category
                  ? 'bg-primary-container text-on-primary-container border border-primary-container'
                  : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant',
              ]"
              @click="selectedCategory = category"
            >
              {{ category }}
            </button>
          </div>
        </div>

        <!-- Unit selector -->
        <div class="flex flex-col gap-3">
          <label
            class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display"
          >
            Unidad de medida
          </label>
          <div class="flex flex-wrap gap-3">
            <button
              v-for="unit in units"
              :key="unit"
              type="button"
              :class="[
                'px-5 py-2.5 rounded-full text-label-md transition-all duration-200 active:scale-95 capitalize',
                selectedUnit === unit
                  ? 'bg-primary-container text-on-primary-container border border-primary-container'
                  : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant',
              ]"
              @click="selectedUnit = unit"
            >
              {{ unit }}
            </button>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="!isFormValid"
          :class="[
            'w-full py-5 text-[19px] font-semibold rounded-full shadow-lg flex items-center justify-center gap-3 transition-all duration-200 active:scale-95',
            isFormValid
              ? 'bg-primary-container text-on-primary-container hover:shadow-xl'
              : 'bg-surface-container-highest text-on-surface-variant/50 cursor-not-allowed shadow-none',
          ]"
        >
          <span
            class="material-symbols-outlined text-[19px]"
            style="font-variation-settings: 'FILL' 1"
          >
            {{ isEditing ? 'save' : 'add_circle' }}
          </span>
          {{ isEditing ? 'Guardar Cambios' : 'Crear Producto' }}
        </button>
      </form>
    </div>

    <!-- Barcode Scanner Modal -->
    <BarcodeScannerModal
      :open="showScanner"
      @close="showScanner = false"
      @scan="onBarcodeScanned"
    />
  </div>
</template>
