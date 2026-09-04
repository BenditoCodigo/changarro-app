---
trigger: always_on
glob: "**/*"
description: Overview general del proyecto Changarro, arquitectura y stack técnico.
---

# Changarro - Overview del Proyecto

## Qué es

Changarro es una aplicación de gestión de ventas diarias para negocios locales.
Permite a comerciantes, tiendas de barrio y microemprendedores llevar un control
sencillo de sus productos y ventas sin necesidad de sistemas complejos ni costosos.

El nombre viene del modismo mexicano "changarro": un negocio pequeño, familiar,
de barrio. Refleja exactamente el público objetivo: negocios locales que necesitan
herramientas accesibles y prácticas.

---

## Por qué existe

Los sistemas de punto de venta y gestión comercial existentes:

- Son costosos para micronegocios con márgenes reducidos
- Requieren conexión a internet permanente para funcionar
- Tienen curvas de aprendizaje excesivas para comerciantes no técnicos
- Dependen de suscripciones mensuales que se acumulan sin dar valor proporcional
- Almacenan datos del negocio en servidores de terceros sin transparencia

Changarro existe para ofrecer a negocios locales una herramienta gratuita,
instalable en su propio dispositivo, que funciona sin internet y mantiene
sus datos bajo su control absoluto.

---

## Para quién

- Dueños de tiendas de barrio, papelerías, abarrotes, fondas, etc.
- Microemprendedores que venden productos de forma recurrente
- Comerciantes que actualmente llevan control en libreta o no llevan control alguno
- Negocios pequeños que no pueden (o no quieren) pagar software de punto de venta

No es un ERP empresarial ni un sistema de inventario complejo.
Es una caja registradora digital: simple, rápida y confiable.

---

## Visión a futuro

1. **Código abierto**: El proyecto será open source eventualmente. Para que otros
   desarrolladores puedan adaptarlo a contextos locales distintos, auditarlo y mejorarlo.

2. **Local-first por diseño**: Funciona completamente sin internet. Los datos viven
   en el dispositivo del usuario. Eventual sincronización opcional a la nube como backup.

3. **Multiplataforma**: Disponible en Android (principal) y multiplataforma vía Capacitor.
   El comerciante usa la herramienta en el dispositivo que tenga a la mano.

4. **Sin telemetría, sin tracking, sin analytics**: Zero datos enviados a ningún lado.

---

## Arquitectura general

```
┌────────────────────────────────────────────────────┐
│                   Frontend (este repo)              │
│            Vue 3 + Vite + Tailwind CSS 4           │
│                SPA empaquetada en Capacitor         │
├────────────────────────────────────────────────────┤
│                   Runtime nativo                   │
│               Capacitor 8 (Bridge Android)         │
│         Acceso a filesystem, plugins nativos       │
├────────────────────────────────────────────────────┤
│                   Storage                          │
│           IndexedDB (datos estructurados)           │
│     Eventual: SQLite vía Capacitor para persistencia│
├────────────────────────────────────────────────────┤
│                   Plataformas                      │
│                Android • Multiplataforma           │
└────────────────────────────────────────────────────┘
```

### Este repositorio

Contiene la aplicación completa (frontend + shell Capacitor). Es una aplicación que:

- Se instala como app nativa en Android y otras plataformas
- Funciona completamente offline (local-first)
- Almacena datos en IndexedDB en la etapa POC
- No requiere backend ni conexión a internet para operar

---

## Stack técnico

| Capa         | Tecnología                                      |
| ------------ | ----------------------------------------------- |
| Bundler      | Vite 6+                                         |
| Framework    | Vue 3.5+ (Composition API, `<script setup>`)    |
| Router       | Vue Router 4                                    |
| Estado       | Pinia (setup stores)                            |
| Styling      | Tailwind CSS 4 (CSS-first, `@tailwindcss/vite`) |
| TypeScript   | Strict mode                                     |
| Shell nativo | Capacitor 8                                     |
| Storage POC  | IndexedDB (Dexie.js o abstracción propia)       |
| Testing      | Vitest + Playwright (cuando se requiera)        |

---

## Principios de desarrollo

1. **Offline-first**: La app funciona sin internet en todo momento
2. **Simplicidad radical**: Un comerciante sin experiencia técnica debe poder usarla en minutos
3. **Rendimiento**: Debe correr fluido en dispositivos Android de gama baja
4. **Privacidad**: Los datos del negocio nunca salen del dispositivo sin consentimiento explícito
5. **Código limpio**: Mantener los steering, seguir convenciones, código legible para el futuro
6. **Interfaz en español neutro**: Todo texto visible para el usuario en español neutro
   (sin regionalismos). El código (variables, funciones, archivos, comments) en inglés.
   Este proyecto impulsa el open source latino.

---

## Modelo de datos (POC)

### Producto

```typescript
interface Product {
  id: string
  name: string
  price: number // precio unitario de venta
  cost?: number // costo de compra (opcional)
  category?: string // categoría del producto
  unit: string // pieza, kg, litro, etc.
  isActive: boolean
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}
```

### Venta

```typescript
interface Sale {
  id: string
  items: SaleItem[]
  total: number
  paymentMethod: 'cash' | 'card' | 'transfer'
  createdAt: string // ISO 8601
}

interface SaleItem {
  productId: string
  productName: string // snapshot del nombre al momento de la venta
  quantity: number
  unitPrice: number // precio al momento de la venta
  subtotal: number
}
```

---

## Stores (Pinia)

- `useProductsStore` — catálogo de productos, búsqueda
- `useCartStore` — carrito de venta actual
- `useSalesStore` — historial de ventas completadas
- `useSettingsStore` — preferencias del negocio

## Rutas

```
/                       → HomeView (catálogo de productos + FAB venta rápida)
/cart                   → CartView (carrito + total + finalizar)
/sales                  → SalesView (historial de ventas)
/quick-sale             → QuickSaleView (formulario venta rápida)
/settings               → SettingsView (acceso desde TopAppBar)
/settings/inventory     → InventoryView (gestión de productos)
```

---

## Estado actual

**Fase: POC funcional (Fase 1)**

El proyecto tiene implementado:

- Stack técnico completo
- Lineamientos visuales (Serene Hearth design system)
- Convenciones de código (Vue, Tailwind, TypeScript)
- Configuración base de Capacitor 8 (con soporte Android)
- Modelo de datos
- Layout base (TopAppBar + Bottom Nav 3 tabs)
- Vistas principales (Inicio, Carrito, Ventas, Venta Rápida, Ajustes, Inventario)

Siguiente paso: integrar stores con IndexedDB para persistencia.

---

## Marca

**Proyecto de**: Bendito Código (agencia de desarrollo de software y UI/UX)
**Tipo**: Proyecto interno, eventualmente open source
**Licencia**: Por definir (probablemente MIT o similar permisiva)
