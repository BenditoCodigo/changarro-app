<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import packageJson from '../../package.json'
import { exportDatabase, importDatabaseMerge } from '@/services/backup'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const settingsStore = useSettingsStore()

// Editable business name
const isEditingName = ref(false)
const editingName = ref('')

function startEditingName() {
  editingName.value = settingsStore.businessName
  isEditingName.value = true
}

function saveName() {
  const trimmed = editingName.value.trim()
  if (trimmed) {
    settingsStore.setBusinessName(trimmed)
  }
  isEditingName.value = false
}

function cancelEditName() {
  isEditingName.value = false
}

function toggleTax() {
  settingsStore.setTaxEnabled(!settingsStore.taxEnabled)
}

function toggleShifts() {
  settingsStore.setShiftsEnabled(!settingsStore.shiftsEnabled)
}

function toggleBarcodeScanner() {
  settingsStore.setBarcodeScannerEnabled(!settingsStore.barcodeScannerEnabled)
}

function setDefaultTab(tab: 'catalog' | 'scanner') {
  settingsStore.setDefaultHomeTab(tab)
}

const paymentMethodWarning = ref('')

async function togglePaymentMethod(method: 'cash' | 'card' | 'transfer') {
  paymentMethodWarning.value = ''
  const current = settingsStore.paymentMethods[method]
  const success = await settingsStore.setPaymentMethodEnabled(method, !current)
  if (!success) {
    paymentMethodWarning.value = 'Debes mantener al menos un método de pago activo.'
    setTimeout(() => {
      paymentMethodWarning.value = ''
    }, 3000)
  }
}

// Backup & Restore state
const showExportModal = ref(false)
const showImportModal = ref(false)
const exporting = ref(false)
const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function openExport() {
  showExportModal.value = true
}

function closeExport() {
  showExportModal.value = false
}

function openImport() {
  showImportModal.value = true
}

function closeImport() {
  showImportModal.value = false
}

function triggerFilePicker() {
  fileInput.value?.click()
}

async function handleExport() {
  if (exporting.value) return
  exporting.value = true
  try {
    const jsonStr = await exportDatabase()
    
    // Auto naming: prefix + clean business name + date
    const dateStr = new Date().toISOString().split('T')[0]!
    const cleanName = settingsStore.businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const fileName = `changarro_respaldo_${cleanName}_${dateStr}.json`
    
    if (Capacitor.isNativePlatform()) {
      // Escribir archivo temporal en el directorio de caché
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: jsonStr,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      })

      // Compartir con el menú nativo del dispositivo
      await Share.share({
        title: 'Respaldo Changarro',
        url: writeResult.uri,
        dialogTitle: 'Guardar respaldo de Changarro'
      })
    } else {
      // Descarga clásica en navegador
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
    
    showExportModal.value = false
  } catch (error) {
    console.error('Error al exportar:', error)
    alert('Error al exportar los datos.')
  } finally {
    exporting.value = false
  }
}

function handleImport(event: Event) {
  if (importing.value) return
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  importing.value = true
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const content = e.target?.result as string
      await importDatabaseMerge(content)
      alert('Respaldo combinado con éxito. La aplicación se recargará.')
      showImportModal.value = false
      window.location.reload()
    } catch (error) {
      const err = error as Error
      console.error('Error al importar:', err)
      alert('Error al restaurar el respaldo: ' + (err.message || String(err)))
    } finally {
      importing.value = false
      target.value = '' // Clear input
    }
  }
  reader.onerror = () => {
    alert('Error al leer el archivo.')
    importing.value = false
    target.value = ''
  }
  reader.readAsText(file)
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <h1
      class="text-[26px] leading-[34px] tracking-[-0.02em] font-bold font-display text-on-background mb-6"
    >
      Ajustes
    </h1>

    <!-- INVENTARIO Section -->
    <h2
      class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display mt-8 mb-4"
    >
      Productos
    </h2>

    <RouterLink
      to="/settings/inventory"
      class="flex justify-between items-center py-4 border-b border-outline-variant group"
    >
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-on-surface-variant">inventory_2</span>
        <span class="text-[15px] text-on-surface font-sans">Gestionar inventario</span>
      </div>
      <span
        class="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface transition-colors"
      >
        chevron_right
      </span>
    </RouterLink>

    <!-- GENERAL Section -->
    <h2
      class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display mt-8 mb-4"
    >
      General
    </h2>

    <div class="flex justify-between items-center py-4 border-b border-outline-variant">
      <span class="text-[15px] text-on-surface font-sans">Nombre del negocio</span>

      <!-- Editing mode -->
      <div v-if="isEditingName" class="flex items-center gap-2">
        <input
          v-model="editingName"
          type="text"
          class="w-40 bg-surface-container-low border border-outline-variant rounded-full px-4 py-2 text-[14px] text-on-surface focus:ring-2 focus:ring-primary-fixed-dim focus:border-transparent outline-none"
          @keyup.enter="saveName"
          @keyup.escape="cancelEditName"
          autofocus
        />
        <button
          class="flex items-center justify-center w-9 h-9 rounded-full bg-primary-container text-on-primary-container active:scale-95"
          aria-label="Guardar"
          @click="saveName"
        >
          <span class="material-symbols-outlined text-[17px]">check</span>
        </button>
        <button
          class="flex items-center justify-center w-9 h-9 rounded-full hover:bg-surface-variant text-on-surface-variant active:scale-95"
          aria-label="Cancelar"
          @click="cancelEditName"
        >
          <span class="material-symbols-outlined text-[17px]">close</span>
        </button>
      </div>

      <!-- Display mode -->
      <button
        v-else
        class="flex items-center gap-2 text-[15px] text-on-surface-variant font-sans hover:text-on-surface transition-colors"
        @click="startEditingName"
      >
        {{ settingsStore.businessName }}
        <span class="material-symbols-outlined text-[15px]">edit</span>
      </button>
    </div>

    <div class="flex justify-between items-center py-4 border-b border-outline-variant">
      <span class="text-[15px] text-on-surface font-sans">Moneda</span>
      <span class="text-[15px] text-on-surface-variant font-sans">{{
        settingsStore.currency
      }}</span>
    </div>

    <!-- IMPUESTOS Section -->
    <h2
      class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display mt-8 mb-4"
    >
      Impuestos
    </h2>

    <div class="flex justify-between items-center py-4 border-b border-outline-variant">
      <span class="text-[15px] text-on-surface font-sans">Incluir IVA en ventas</span>
      <!-- Toggle -->
      <button
        class="relative w-12 h-6 rounded-full transition-colors duration-200"
        :class="settingsStore.taxEnabled ? 'bg-primary-fixed-dim' : 'bg-surface-container-highest'"
        aria-label="Incluir impuestos"
        @click="toggleTax"
      >
        <span
          class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200"
          :class="settingsStore.taxEnabled ? 'translate-x-6' : 'translate-x-0.5'"
        ></span>
      </button>
    </div>

    <div class="flex justify-between items-center py-4 border-b border-outline-variant">
      <span class="text-[15px] text-on-surface font-sans">Porcentaje</span>
      <span class="text-[15px] text-on-surface-variant font-sans"
        >{{ Math.round(settingsStore.taxRate * 100) }}%</span
      >
    </div>

    <!-- MÉTODOS DE PAGO Section -->
    <h2
      class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display mt-8 mb-4"
    >
      Métodos de Pago
    </h2>

    <p class="text-[13px] text-on-surface-variant/60 font-sans mb-3 leading-relaxed">
      Selecciona las formas de cobro aceptadas en tu negocio. Debe haber al menos un método activo.
    </p>

    <Transition name="fade-up">
      <div
        v-if="paymentMethodWarning"
        class="mb-3 px-4 py-2.5 rounded-xl bg-error/10 border border-error/30 text-error text-[13px] font-sans flex items-center gap-2"
      >
        <span class="material-symbols-outlined text-[18px]">warning</span>
        <span>{{ paymentMethodWarning }}</span>
      </div>
    </Transition>

    <!-- Efectivo -->
    <div class="flex justify-between items-center py-4 border-b border-outline-variant">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-on-surface-variant">payments</span>
        <div>
          <div class="text-[15px] text-on-surface font-sans">Efectivo</div>
          <div class="text-[13px] text-on-surface-variant/60 font-sans">Cobro tradicional con dinero físico</div>
        </div>
      </div>
      <button
        class="shrink-0 relative w-12 h-6 rounded-full transition-colors duration-200"
        :class="settingsStore.paymentMethods.cash ? 'bg-primary-fixed-dim' : 'bg-surface-container-highest'"
        aria-label="Habilitar efectivo"
        @click="togglePaymentMethod('cash')"
      >
        <span
          class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200"
          :class="settingsStore.paymentMethods.cash ? 'translate-x-6' : 'translate-x-0.5'"
        ></span>
      </button>
    </div>

    <!-- Tarjeta -->
    <div class="flex justify-between items-center py-4 border-b border-outline-variant">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-on-surface-variant">credit_card</span>
        <div>
          <div class="text-[15px] text-on-surface font-sans">Tarjeta de débito / crédito</div>
          <div class="text-[13px] text-on-surface-variant/60 font-sans">Cobro con terminal punto de venta (TPV)</div>
        </div>
      </div>
      <button
        class="shrink-0 relative w-12 h-6 rounded-full transition-colors duration-200"
        :class="settingsStore.paymentMethods.card ? 'bg-primary-fixed-dim' : 'bg-surface-container-highest'"
        aria-label="Habilitar tarjeta"
        @click="togglePaymentMethod('card')"
      >
        <span
          class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200"
          :class="settingsStore.paymentMethods.card ? 'translate-x-6' : 'translate-x-0.5'"
        ></span>
      </button>
    </div>

    <!-- Transferencia -->
    <div class="flex justify-between items-center py-4 border-b border-outline-variant">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-on-surface-variant">account_balance</span>
        <div>
          <div class="text-[15px] text-on-surface font-sans">Transferencia bancaria</div>
          <div class="text-[13px] text-on-surface-variant/60 font-sans">Cobro por SPEI o transferencia electrónica</div>
        </div>
      </div>
      <button
        class="shrink-0 relative w-12 h-6 rounded-full transition-colors duration-200"
        :class="settingsStore.paymentMethods.transfer ? 'bg-primary-fixed-dim' : 'bg-surface-container-highest'"
        aria-label="Habilitar transferencia"
        @click="togglePaymentMethod('transfer')"
      >
        <span
          class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200"
          :class="settingsStore.paymentMethods.transfer ? 'translate-x-6' : 'translate-x-0.5'"
        ></span>
      </button>
    </div>

    <!-- MODO CAJERO Y ESCÁNER Section -->
    <h2
      class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display mt-8 mb-4"
    >
      Modo Cajero y Escáner
    </h2>

    <div class="flex justify-between items-center py-4 border-b border-outline-variant">
      <div class="flex-1 pr-4">
        <div class="text-[15px] text-on-surface font-sans">Escáner de código de barras</div>
        <div class="text-[13px] text-on-surface-variant/60 font-sans mt-1 leading-relaxed">
          Activa la pestaña de escáner en Inicio para cobrar como en caja de supermercado.
        </div>
      </div>
      <!-- Toggle -->
      <button
        class="shrink-0 relative w-12 h-6 rounded-full transition-colors duration-200"
        :class="settingsStore.barcodeScannerEnabled ? 'bg-primary-fixed-dim' : 'bg-surface-container-highest'"
        aria-label="Habilitar escáner"
        @click="toggleBarcodeScanner"
      >
        <span
          class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200"
          :class="settingsStore.barcodeScannerEnabled ? 'translate-x-6' : 'translate-x-0.5'"
        ></span>
      </button>
    </div>

    <div
      v-if="settingsStore.barcodeScannerEnabled"
      class="flex justify-between items-center py-4 border-b border-outline-variant"
    >
      <div class="flex-1 pr-4">
        <div class="text-[15px] text-on-surface font-sans">Pestaña inicial en Inicio</div>
        <div class="text-[13px] text-on-surface-variant/60 font-sans mt-1 leading-relaxed">
          Selecciona qué vista abre por defecto al entrar a la aplicación.
        </div>
      </div>
      <div class="flex items-center gap-1 bg-surface-container-high p-1 rounded-full shrink-0">
        <button
          type="button"
          class="px-3 py-1 text-xs font-medium rounded-full transition-colors"
          :class="settingsStore.defaultHomeTab === 'catalog' ? 'bg-primary-container text-on-primary-container font-semibold' : 'text-on-surface-variant hover:text-on-surface'"
          @click="setDefaultTab('catalog')"
        >
          Catálogo
        </button>
        <button
          type="button"
          class="px-3 py-1 text-xs font-medium rounded-full transition-colors"
          :class="settingsStore.defaultHomeTab === 'scanner' ? 'bg-primary-container text-on-primary-container font-semibold' : 'text-on-surface-variant hover:text-on-surface'"
          @click="setDefaultTab('scanner')"
        >
          Escáner
        </button>
      </div>
    </div>

    <!-- TURNOS Section -->
    <h2
      class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display mt-8 mb-4"
    >
      Turnos de caja
    </h2>

    <div class="flex justify-between items-center py-4 border-b border-outline-variant">
      <div class="flex-1 pr-4">
        <div class="text-[15px] text-on-surface font-sans">Habilitar turnos</div>
        <div class="text-[13px] text-on-surface-variant/60 font-sans mt-1 leading-relaxed">
          Registra las ventas por turno de caja. Al cerrar un turno verás el resumen de efectivo y podrás comenzar uno nuevo.
        </div>
      </div>
      <!-- Toggle -->
      <button
        class="shrink-0 relative w-12 h-6 rounded-full transition-colors duration-200"
        :class="settingsStore.shiftsEnabled ? 'bg-primary-fixed-dim' : 'bg-surface-container-highest'"
        aria-label="Habilitar turnos"
        @click="toggleShifts"
      >
        <span
          class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200"
          :class="settingsStore.shiftsEnabled ? 'translate-x-6' : 'translate-x-0.5'"
        ></span>
      </button>
    </div>

    <!-- DATOS Section -->
    <h2
      class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display mt-8 mb-4"
    >
      Datos
    </h2>

    <div class="flex justify-between items-center py-4 border-b border-outline-variant">
      <div>
        <div class="text-[15px] text-on-surface font-sans">Respaldar datos (Exportar)</div>
        <div class="text-[13px] text-on-surface-variant/60 font-sans mt-0.5">Guarda tu inventario, ventas y ajustes en un archivo</div>
      </div>
      <button
        @click="openExport"
        class="px-5 py-2 rounded-full border border-outline-variant text-on-surface-variant text-label-md transition-all duration-200 hover:bg-surface-variant active:scale-95"
      >
        Exportar
      </button>
    </div>

    <div class="flex justify-between items-center py-4 border-b border-outline-variant">
      <div>
        <div class="text-[15px] text-on-surface font-sans">Restaurar respaldo (Importar)</div>
        <div class="text-[13px] text-on-surface-variant/60 font-sans mt-0.5">Combina un archivo de respaldo con tus datos locales</div>
      </div>
      <button
        @click="openImport"
        class="px-5 py-2 rounded-full border border-outline-variant text-on-surface-variant text-label-md transition-all duration-200 hover:bg-surface-variant active:scale-95"
      >
        Importar
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".json"
        class="hidden"
        @change="handleImport"
      />
    </div>

    <!-- ACERCA DE Section -->
    <h2
      class="uppercase tracking-wider text-[14px] font-semibold text-on-surface-variant font-display mt-8 mb-4"
    >
      Acerca de
    </h2>

    <div class="flex justify-between items-center py-4 border-b border-outline-variant">
      <span class="text-[15px] text-on-surface font-sans">Versión</span>
      <span class="text-[15px] text-on-surface-variant font-sans">{{ packageJson.version }}</span>
    </div>

    <!-- Footer note -->
    <div class="mt-12 text-center text-[14px] text-on-surface-variant/60 font-sans flex items-center justify-center gap-1.5 pb-8">
      <span>Desarrollada con propósito</span>
      <span class="material-symbols-outlined text-surface-tint text-[16px]" style="font-variation-settings: 'FILL' 1">favorite</span>
      <span>por</span>
      <a
        href="https://benditocodigo.com"
        target="_blank"
        rel="noopener noreferrer"
        class="text-surface-tint font-bold hover:underline"
      >
        Bendito Código
      </a>
    </div>
  </div>

  <!-- Modales de Respaldo -->
  <Teleport to="body">
    <!-- Export Modal -->
    <Transition name="fade-scale">
      <div
        v-if="showExportModal"
        class="fixed inset-0 z-[100] flex items-center justify-center px-5"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeExport"></div>

        <!-- Card -->
        <div
          class="relative w-full max-w-sm bg-surface-container-high border border-outline-variant rounded-[2rem] p-8 shadow-[0_16px_48px_0_rgba(0,0,0,0.5)]"
        >
          <!-- Icon -->
          <div class="flex justify-center mb-5">
            <div class="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <span class="material-symbols-outlined text-surface-tint text-[26px]"
                >cloud_download</span
              >
            </div>
          </div>

          <!-- Title -->
          <h2 class="text-center text-[19px] font-bold font-display text-on-surface mb-3">
            Respaldar Datos
          </h2>

          <!-- Description -->
          <p class="text-center text-[14px] text-on-surface-variant font-sans mb-8">
            Se descargará un archivo de respaldo con la configuración del negocio, todo tu inventario (incluyendo imágenes) y tu historial de ventas. Guarda este archivo para cargarlo después.
          </p>

          <!-- Buttons -->
          <div class="flex flex-col gap-2">
            <button
              class="w-full py-3.5 rounded-full bg-primary-container text-on-primary-container text-label-md font-bold transition-all active:scale-95 hover:shadow-lg"
              :disabled="exporting"
              @click="handleExport"
            >
              {{ exporting ? 'Descargando...' : 'Descargar Respaldo' }}
            </button>
            <button
              class="w-full py-3.5 rounded-full hover:bg-surface-variant text-on-surface-variant text-label-md transition-all active:scale-95"
              @click="closeExport"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Import Modal -->
    <Transition name="fade-scale">
      <div
        v-if="showImportModal"
        class="fixed inset-0 z-[100] flex items-center justify-center px-5"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeImport"></div>

        <!-- Card -->
        <div
          class="relative w-full max-w-sm bg-surface-container-high border border-outline-variant rounded-[2rem] p-8 shadow-[0_16px_48px_0_rgba(0,0,0,0.5)]"
        >
          <!-- Icon -->
          <div class="flex justify-center mb-5">
            <div class="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <span class="material-symbols-outlined text-surface-tint text-[26px]"
                >cloud_upload</span
              >
            </div>
          </div>

          <!-- Title -->
          <h2 class="text-center text-[19px] font-bold font-display text-on-surface mb-3">
            Restaurar / Combinar
          </h2>

          <!-- Description -->
          <p class="text-center text-[14px] text-on-surface-variant font-sans mb-8">
            Selecciona un archivo de respaldo para combinarlo con tus datos actuales. Los productos y ventas del archivo se agregarán sin borrar lo que tengas registrado ahora.
          </p>

          <!-- Buttons -->
          <div class="flex flex-col gap-2">
            <button
              class="w-full py-3.5 rounded-full bg-primary-container text-on-primary-container text-label-md font-bold transition-all active:scale-95 hover:shadow-lg"
              :disabled="importing"
              @click="triggerFilePicker"
            >
              {{ importing ? 'Importando...' : 'Seleccionar Archivo' }}
            </button>
            <button
              class="w-full py-3.5 rounded-full hover:bg-surface-variant text-on-surface-variant text-label-md transition-all active:scale-95"
              @click="closeImport"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
