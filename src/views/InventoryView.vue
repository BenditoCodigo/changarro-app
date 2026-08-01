<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useProductsStore } from '@/stores/products'
import { useProductImages } from '@/composables/useProductImages'
import { searchItems } from '@/utils/search'

const store = useProductsStore()
const { imageUrls, loadImages } = useProductImages()
const searchQuery = ref('')

// Delete confirmation modal
const showDeleteModal = ref(false)
const productToDelete = ref<{ id: string; name: string } | null>(null)

onMounted(() => {
  store.loadProducts()
})

// Load images when products change
watch(
  () => store.products,
  (products) => {
    if (products.length > 0) {
      loadImages(products.map((p) => p.id))
    }
  },
  { immediate: true },
)

function formatPrice(price: number): string {
  return price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function requestDelete(product: { id: string; name: string }) {
  productToDelete.value = product
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (productToDelete.value) {
    await store.deleteProduct(productToDelete.value.id)
  }
  cancelDelete()
}

function cancelDelete() {
  showDeleteModal.value = false
  productToDelete.value = null
}

const filteredProducts = computed(() => {
  return searchItems(store.products, searchQuery.value, ['name', 'category', 'barcode'])
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header with back button -->
    <div class="flex items-center gap-3 mb-6">
      <RouterLink
        to="/settings"
        class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-variant transition-colors active:scale-95"
        aria-label="Volver a ajustes"
      >
        <span class="material-symbols-outlined text-on-surface-variant">arrow_back</span>
      </RouterLink>
      <h1
        class="text-[26px] leading-[34px] tracking-[-0.02em] font-bold font-display text-on-background"
      >
        Inventario
      </h1>
      <span
        class="text-label-md bg-surface-container-high px-3 py-1 rounded-full border border-outline-variant text-on-surface-variant"
      >
        {{ filteredProducts.length }} PRODUCTOS
      </span>
    </div>

    <!-- Search -->
    <div class="relative mb-6">
      <span
        class="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant"
      >
        search
      </span>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar producto..."
        class="w-full bg-surface-container-low border border-outline-variant rounded-full pl-14 pr-6 py-4 text-[15px] text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary-fixed-dim focus:border-transparent outline-none transition-all"
      />
    </div>

    <!-- Loading -->
    <div v-if="store.isLoading" class="flex justify-center py-16">
      <span class="material-symbols-outlined text-[40px] text-on-surface-variant/50 animate-spin"
        >progress_activity</span
      >
    </div>

    <!-- Product List -->
    <div v-else-if="filteredProducts.length > 0" class="flex flex-col gap-4">
      <article
        v-for="product in filteredProducts"
        :key="product.id"
        class="flex items-center gap-4 bg-surface-container border border-outline-variant rounded-[1rem] p-[24px] transition-all duration-200 hover:border-surface-tint"
      >
        <!-- Thumbnail -->
        <div
          class="shrink-0 w-16 h-16 bg-surface-container-high rounded-[1rem] border border-outline-variant flex items-center justify-center overflow-hidden"
        >
          <img
            v-if="imageUrls[product.id]"
            :src="imageUrls[product.id]"
            :alt="product.name"
            class="w-full h-full object-cover"
          />
          <span v-else class="material-symbols-outlined text-on-surface-variant/50 text-[19px]"
            >inventory_2</span
          >
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <h3 class="text-[14px] font-bold font-display text-on-surface truncate">
            {{ product.name }}
          </h3>
          <p class="mt-1 text-[17px] font-bold text-surface-tint">
            ${{ formatPrice(product.price) }}
          </p>
          <p class="mt-0.5 text-[13px] text-on-surface-variant/60 capitalize flex items-center gap-1.5 flex-wrap">
            <span>{{ product.category }} · {{ product.unit }}</span>
            <span v-if="product.barcode" class="inline-flex items-center gap-0.5 text-[11px] bg-surface-container-high px-2 py-0.5 rounded-full text-primary-fixed-dim/90 font-mono">
              <span class="material-symbols-outlined text-[12px]">barcode</span>
              {{ product.barcode }}
            </span>
          </p>
        </div>

        <!-- Edit button -->
        <RouterLink
          :to="`/settings/inventory/${product.id}/edit`"
          class="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-high hover:bg-surface-variant transition-colors active:scale-95"
          aria-label="Editar producto"
        >
          <span class="material-symbols-outlined text-on-surface">edit</span>
        </RouterLink>

        <!-- Delete button -->
        <button
          class="shrink-0 flex items-center justify-center w-10 h-10 rounded-full hover:bg-error/10 transition-colors active:scale-95"
          aria-label="Eliminar producto"
          @click="requestDelete(product)"
        >
          <span class="material-symbols-outlined text-error">delete</span>
        </button>
      </article>
    </div>

    <!-- Empty state: no products -->
    <div
      v-else-if="!searchQuery.trim() && filteredProducts.length === 0"
      class="flex flex-col items-center justify-center py-16 gap-4"
    >
      <span class="material-symbols-outlined text-[40px] text-on-surface-variant/50"
        >inventory_2</span
      >
      <p class="text-[17px] font-display font-semibold text-on-surface-variant text-center">
        Tu inventario está vacío
      </p>
      <p class="text-[14px] text-on-surface-variant/60 text-center">
        Agrega tu primer producto tocando el botón +
      </p>
    </div>

    <!-- Empty state: no search results -->
    <div
      v-else-if="searchQuery.trim() && filteredProducts.length === 0"
      class="flex flex-col items-center justify-center py-16 gap-4"
    >
      <span class="material-symbols-outlined text-[40px] text-on-surface-variant/50"
        >search_off</span
      >
      <p class="text-[15px] text-on-surface-variant font-sans text-center">
        No se encontraron productos con "{{ searchQuery }}"
      </p>
    </div>

    <!-- FAB: Add Product -->
    <RouterLink
      to="/settings/inventory/new"
      class="fixed bottom-28 right-5 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary-container text-on-primary-container shadow-lg transition-all duration-200 hover:shadow-xl active:scale-95"
      aria-label="Agregar producto"
    >
      <span class="material-symbols-outlined text-[19px]">add</span>
    </RouterLink>
  </div>

  <!-- Delete Confirmation Modal -->
  <Teleport to="body">
    <Transition name="fade-scale">
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 z-[100] flex items-center justify-center px-5"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="cancelDelete"></div>

        <!-- Modal -->
        <div
          class="relative w-full max-w-sm bg-surface-container-high border border-outline-variant rounded-[2rem] p-8 shadow-[0_16px_48px_0_rgba(0,0,0,0.5)]"
        >
          <!-- Icon -->
          <div class="flex justify-center mb-5">
            <div class="flex items-center justify-center w-16 h-16 rounded-full bg-error/10">
              <span class="material-symbols-outlined text-error text-[26px]">delete</span>
            </div>
          </div>

          <!-- Title -->
          <h2 class="text-center text-[19px] font-bold font-display text-on-surface mb-3">
            Eliminar producto
          </h2>

          <!-- Message -->
          <p class="text-center text-[14px] text-on-surface-variant font-sans mb-8">
            ¿Estás seguro de que deseas eliminar
            <strong class="text-on-surface">{{ productToDelete?.name }}</strong
            >? Esta acción no se puede deshacer.
          </p>

          <!-- Actions -->
          <div class="flex flex-col gap-3">
            <button
              class="w-full py-4 bg-error text-on-error rounded-full text-[15px] font-bold font-display transition-all duration-200 hover:shadow-lg active:scale-95"
              @click="confirmDelete"
            >
              Eliminar
            </button>
            <button
              class="w-full py-4 border border-outline-variant text-on-surface-variant rounded-full text-[15px] font-semibold font-display transition-all duration-200 hover:bg-surface-variant active:scale-95"
              @click="cancelDelete"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
