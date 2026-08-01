<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useProductsStore } from '@/stores/products'
import { useCartStore } from '@/stores/cart'
import { useProductImages } from '@/composables/useProductImages'
import { emitParticles } from '@/composables/useParticles'
import { searchItems } from '@/utils/search'

const productsStore = useProductsStore()
const cartStore = useCartStore()
const { imageUrls, loadImages } = useProductImages()

const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>('list')

onMounted(() => {
  productsStore.loadProducts()
})

// Load images when products change
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
  event: MouseEvent | TouchEvent,
) {
  cartStore.addItem(product)
  emitParticles(event)
}

function clearSearch() {
  searchQuery.value = ''
}

function toggleView() {
  viewMode.value = viewMode.value === 'list' ? 'grid' : 'list'
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <section class="mb-4">
      <h1
        class="text-[26px] leading-[34px] tracking-[-0.02em] font-bold font-display text-on-background"
      >
        Productos
      </h1>
      <p class="mt-1 text-[14px] text-on-surface-variant font-sans">
        Toca un producto para agregarlo al carrito
      </p>
    </section>

    <!-- Search + View Toggle -->
    <div class="flex items-center gap-3 mb-5">
      <!-- Search input -->
      <div class="relative flex-1">
        <span
          class="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant"
        >
          search
        </span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar producto..."
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
      <span class="material-symbols-outlined text-[40px] text-on-surface-variant/50 animate-spin"
        >progress_activity</span
      >
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
          <span v-else class="material-symbols-outlined text-on-surface-variant/50 text-[24px]"
            >inventory_2</span
          >
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <h3 class="text-[14px] font-bold font-display text-on-surface truncate">
            {{ product.name }}
          </h3>
          <p class="mt-0.5 text-[15px] font-bold text-surface-tint">
            ${{ formatPrice(product.price) }}
          </p>
        </div>

        <!-- Add to cart icon -->
        <div
          class="shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-surface-container-high"
        >
          <span class="material-symbols-outlined text-on-surface text-[19px]"
            >add_shopping_cart</span
          >
        </div>
      </article>
    </div>

    <!-- Grid View -->
    <div
      v-else-if="filteredProducts.length > 0 && viewMode === 'grid'"
      class="grid grid-cols-2 md:grid-cols-3 gap-3"
    >
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
          <span v-else class="material-symbols-outlined text-on-surface-variant/50 text-[24px]"
            >inventory_2</span
          >
        </div>

        <!-- Name -->
        <h3
          class="text-[14px] font-bold font-display text-on-surface text-center line-clamp-2 mb-1"
        >
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
      <span class="material-symbols-outlined text-[40px] text-on-surface-variant/50"
        >storefront</span
      >
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
      <span class="material-symbols-outlined text-[40px] text-on-surface-variant/50"
        >search_off</span
      >
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
</template>
