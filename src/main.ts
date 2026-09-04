import 'material-symbols/outlined.css'
import '@fontsource/plus-jakarta-sans'
import '@fontsource/atkinson-hyperlegible'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useSettingsStore } from '@/stores/settings'
import { useCartStore } from '@/stores/cart'
import { useShiftsStore } from '@/stores/shifts'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Load persisted data before mounting
const settingsStore = useSettingsStore()
const cartStore = useCartStore()
const shiftsStore = useShiftsStore()

Promise.all([
  settingsStore.loadSettings(),
  cartStore.loadCart(),
]).then(async () => {
  // Load active shift only if shifts feature is enabled
  if (settingsStore.shiftsEnabled) {
    await shiftsStore.loadActiveShift()
  }
  app.mount('#app')
})
