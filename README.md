<div align="center">

<img src="documentacion/assets/logo.png" alt="Changarro" width="120" height="120" />

# Changarro

**Tu negocio, bajo control. Sin complicaciones.**

Una caja registradora digital gratuita, hecha para tiendas de barrio,
fondas, papelerías y cualquier negocio pequeño que quiera llevar el control
de sus ventas sin depender de internet ni pagar suscripciones.

[![Versión](https://img.shields.io/badge/versión-0.11.0-c5c5d8?style=flat-square&labelColor=20201f)](https://github.com/bendito-codigo/changarro-app/releases)
[![Plataforma](https://img.shields.io/badge/plataforma-Android%20%7C%20macOS%20(.dmg)%20%7C%20Web-4ade80?style=flat-square&labelColor=20201f)](https://github.com/bendito-codigo/changarro-app/releases)
[![Sin internet](https://img.shields.io/badge/funciona-100%25%20offline-c5c5d8?style=flat-square&labelColor=20201f)](#)
[![Licencia](https://img.shields.io/badge/licencia-PolyForm%20NC-c5c5d8?style=flat-square&labelColor=20201f)](./LICENSE)
[![Desarrollada con propósito por Bendito Código](https://img.shields.io/badge/desarrollada%20con%20propósito%20por-Bendito%20Código-c5c5d8?style=flat-square&labelColor=20201f)](https://benditocodigo.com)

</div>

---

## 🎯 ¿Para quién es Changarro?

Para ti, si:

- 🏪 Tienes una tienda de barrio, abarrotes, papelería, fonda o negocio similar
- 📓 Llevas el control en libreta o directamente en la memoria
- 📵 No tienes internet estable o simplemente no quieres depender de él
- 💸 No quieres pagar una suscripción mensual por un software caro y complicado
- 🔒 Quieres que los datos de tu negocio se queden **en tu teléfono o computadora**, no en servidores de terceros

---

## ✨ ¿Qué puedes hacer con Changarro?

| Función | Descripción |
|---|---|
| 🛒 **Registrar ventas** | Toca un producto y se agrega al carrito. Así de fácil |
| 💳 **Métodos de pago flexibles** | Acepta múltiples formas de pago para no perder ninguna venta: efectivo, tarjetas y transferencias |
| 🎨 **Interfaz dinámica** | Experiencia fluida e intuitiva que se adapta automáticamente a tu dispositivo y flujo de trabajo |
| ⚡ **Venta rápida** | Cobra un producto o servicio sin necesidad de registrarlo previamente en el catálogo |
| 💵 **Calcular cambio** | Ingresa el efectivo recibido y calcula el cambio al instante |
| 📷 **Escáner de código de barras** | Asigna y busca productos rápidamente usando la cámara de tu dispositivo |
| 📦 **Gestionar productos** | Organiza tu catálogo completo con precios, códigos, unidades y categorías |
| 💰 **Historial de ventas** | Consulta tus transacciones registradas por turno, día o mes |
| 🕐 **Turnos de caja** | Control de ventas por turno con resúmenes claros para cierres de caja |
| 💻 **Cobro rápido en escritorio** | Acceso directo al carrito mediante botón flotante en pantallas grandes |
| 💾 **Respaldo de datos** | Guarda o restaura la información de tu negocio en un archivo con un solo clic |
| 📵 **100% Offline** | Funciona sin conexión a internet ni servidores externos; tus datos jamás salen de tu dispositivo |

---

## 📸 Capturas de pantalla

<div align="center">

| Inicio | Carrito | Ventas |
|:---:|:---:|:---:|
| ![Pantalla de inicio con catálogo de productos](documentacion/assets/screenshot-inicio.png) | ![Pantalla de carrito con productos y total](documentacion/assets/screenshot-carrito.png) | ![Pantalla de historial de ventas](documentacion/assets/screenshot-ventas.png) |

| Cobro (Checkout) | Turnos | Ajustes |
|:---:|:---:|:---:|
| ![Pantalla de cobro con cálculo de cambio](documentacion/assets/screenshot-cobro.png) | ![Pantalla de cierre de turno](documentacion/assets/screenshot-turno.png) | ![Pantalla de ajustes](documentacion/assets/screenshot-ajustes.png) |

</div>

---

## 📲 Descarga

Encuentra los paquetes e instaladores ejecutables en la sección de [**Releases**](https://github.com/bendito-codigo/changarro-app/releases):

- 📱 **Android** — archivo `.apk` o `.aab` listo para instalar (Plataforma nativa activa)
- 🍎 **macOS** — instalador `.dmg` ejecutable empaquetado con Electron (Plataforma nativa activa)
- 🌐 **Web (SPA / PWA)** — ejecutable offline instalable en cualquier navegador o dispositivo

---

## 🚀 Primeros pasos (instalación desde código fuente)

¿Quieres compilar la app tú mismo o contribuir al proyecto? Necesitas:

**Requisitos previos:**
- [Node.js](https://nodejs.org) v22 o superior
- [Git](https://git-scm.com)
- [Android Studio](https://developer.android.com/studio) (solo para compilar el APK de Android)

**Pasos:**

```bash
# 1. Clona el repositorio
git clone https://github.com/bendito-codigo/changarro-app.git
cd changarro-app

# 2. Instala las dependencias de la raíz y de electron
npm install
cd electron && npm install && cd ..

# 3. Inicia el modo de desarrollo (versión web)
npm run dev
```

Abre tu navegador en `http://localhost:5173` y ya puedes usar Changarro.

**Compilar paquetes nativos:**
```bash
# Compilar ejecutable macOS (.dmg)
npm run build:dmg

# Compilar paquete APK de Android
npm run build:apk:release
```

Para más detalles, consulta la [guía de entorno de desarrollo](./documentacion/manuales-tecnicos/02-entorno-desarrollo.md).

---

## 📖 Documentación

| Documento | Descripción |
|---|---|
| [📘 Introducción](./documentacion/manuales-usuario/01-introduccion.md) | Qué es Changarro y cómo empezar |
| [🚦 Primeros pasos](./documentacion/manuales-usuario/02-primeros-pasos.md) | Tu primera venta paso a paso |
| [🗺️ Navegación](./documentacion/manuales-usuario/03-navegacion.md) | Guía completa de todas las pantallas |
| [🏗️ Arquitectura](./documentacion/manuales-tecnicos/01-arquitectura.md) | Cómo está construida la app (para desarrolladores) |
| [💻 Entorno de desarrollo](./documentacion/manuales-tecnicos/02-entorno-desarrollo.md) | Cómo configurar tu entorno para contribuir |
| [🗂️ Estructura del código](./documentacion/manuales-tecnicos/03-estructura-codigo.md) | Organización interna del proyecto |

---

## 🛡️ Privacidad y datos

Changarro está diseñado con un principio claro:

> **Tus datos son tuyos. Siempre.**

- ❌ No hay servidor central
- ❌ No hay telemetría ni analytics
- ❌ No necesita cuenta ni correo electrónico
- ✅ Todo se guarda en tu dispositivo
- ✅ Puedes exportar e importar todo en cualquier momento con un solo botón

---

## 💬 Comunidad y reportes

Changarro es desarrollado y mantenido exclusivamente por [Bendito Código](https://benditocodigo.com). **No aceptamos Pull Requests** — todo el desarrollo, revisión de código y decisiones de producto se gestionan internamente para garantizar los estándares de calidad y seguridad de la aplicación.

Lo que sí puedes hacer:

- 🐛 **Reportar un bug** → abre un [Issue](https://github.com/bendito-codigo/changarro-app/issues) describiendo el problema
- 💡 **Proponer una mejora** → abre un Issue con la etiqueta `sugerencia` y cuéntanos tu idea
- ❓ **Hacer una pregunta** → usa la sección de [Discussions](https://github.com/bendito-codigo/changarro-app/discussions)

> Tu feedback como usuario es lo que guía el desarrollo. Cada reporte e idea se lee y se toma en cuenta.

---

## 🏗️ Stack tecnológico

<div align="center">

[![Vue 3](https://img.shields.io/badge/Vue-3.5-42b883?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119eff?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![Electron](https://img.shields.io/badge/Electron-43-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org)
[![Dexie.js](https://img.shields.io/badge/Dexie.js-IndexedDB-f97316?style=flat-square)](https://dexie.org)

</div>

---

## 📄 Licencia

Changarro se distribuye bajo la licencia **PolyForm Noncommercial License 1.0.0**.

Esto significa que puedes:
- ✅ Usarlo libremente para tu negocio o de forma personal
- ✅ Modificarlo y adaptarlo a tus necesidades
- ✅ Compartirlo con otras personas
- ❌ No puedes comercializarlo ni venderlo como producto propio

Consulta el archivo [LICENSE](./LICENSE) para los términos completos.
© 2026 Mauro Nava Luevanos — [benditocodigo.com](https://benditocodigo.com)

---

<div align="center">

Desarrollada con propósito 🫀 por [**Bendito Código**](https://benditocodigo.com)

*Un changarro pa' los changarros* 🏪

</div>
