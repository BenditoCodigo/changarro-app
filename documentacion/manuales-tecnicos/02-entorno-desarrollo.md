# Entorno de desarrollo

Este documento explica cómo preparar tu máquina para trabajar en Changarro.

---

## Requisitos previos

### Herramientas base

| Herramienta | Versión mínima | Para qué                            |
| ----------- | -------------- | ----------------------------------- |
| Node.js     | 20+            | Ejecutar el frontend en desarrollo  |
| npm         | 10+            | Gestionar dependencias del frontend |
| Rust        | 1.77+          | Compilar el shell nativo de Tauri   |
| Git         | 2.x            | Control de versiones                |

### Para desarrollo Android (opcional)

| Herramienta    | Notas                                        |
| -------------- | -------------------------------------------- |
| Android Studio | SDK y emulador                               |
| Android SDK    | API 24+ (Android 7.0 mínimo)                 |
| NDK            | Requerido por Tauri para compilación cruzada |

### Para desarrollo de escritorio

- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Windows**: Visual Studio Build Tools con carga de trabajo "Desktop development with C++"
- **Linux**: `build-essential`, `libwebkit2gtk-4.1-dev`, `libssl-dev`

---

## Instalación del proyecto

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd changarro-app
```

### 2. Instalar dependencias del frontend

```bash
npm install
```

### 3. Verificar que Tauri funciona

```bash
cd src-tauri
cargo check
```

Si no tienes Rust instalado:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

---

## Desarrollo

### Aplicación completa (frontend + shell nativo)

```bash
npm run tauri:dev
```

Esto levanta el servidor de Vite y abre la ventana nativa de Tauri con
recarga automática. Es la forma recomendada para trabajar en el proyecto.

### Solo el frontend (sin Tauri)

```bash
npm run dev
```

Abre `http://localhost:5173` en el navegador. Útil para desarrollo rápido
de UI sin esperar la compilación de Rust.

### Desarrollo Android

```bash
npm run tauri android dev
```

Requiere un emulador corriendo o un dispositivo conectado por USB con
depuración habilitada.

---

## Build de producción

### Escritorio (plataforma actual)

```bash
npm run tauri:build
```

Genera el instalador para la plataforma actual en `src-tauri/target/release/bundle/`.

### Solo frontend

```bash
npm run build
```

Ejecuta verificación de tipos con TypeScript y genera los archivos estáticos
optimizados en `dist/`.

### Android (Capacitor)

Compilación mediante los scripts automatizados de Capacitor:

```bash
./scripts/build-apk-capacitor.sh          # Build debug (.apk)
./scripts/build-apk-capacitor.sh release  # Build release firmado (.apk)
```

Para generar un **Android App Bundle (.aab)** para Google Play Store:

```bash
npm run cap:sync
cd android && ./gradlew bundleRelease
```

El archivo se genera en `android/app/build/outputs/bundle/release/app-release.aab`.

---

## Integración Continua (CI/CD con GitHub Actions)

El proyecto cuenta con un flujo automatizado en `.github/workflows/build-android.yml` que:

1. Ejecuta verificación de tipos y tests unitarios.
2. Compila la app web y sincroniza con Capacitor.
3. Genera tanto el paquete **AAB (.aab)** para Play Store como el **APK (.apk)** para pruebas directas.
4. Firma ambos archivos si los secretos de firma (`KEYSTORE_BASE64`, `KEY_ALIAS`, `KEYSTORE_PASSWORD`, `KEY_PASSWORD`) están configurados en el repositorio de GitHub.
5. Al publicar una versión con tag `v*` (ejemplo `v0.6.0`), crea automáticamente una Release en GitHub anexando los instalables.

---

## Estructura de comandos

| Comando                       | Descripción                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `npm run dev`                 | Servidor de desarrollo (solo frontend, localhost:5173)     |
| `npm run build`               | Build de producción del frontend con verificación de tipos |
| `npm run test:unit`           | Ejecutar pruebas unitarias con Vitest                      |
| `npm run cap:sync`            | Compila frontend y sincroniza con Capacitor Android        |
| `npm run cap:open`            | Abre el proyecto Android en Android Studio                 |
| `npm run tauri:dev`           | Desarrollo completo con shell nativo + hot reload          |
| `npm run tauri:build`         | Build de producción completo para la plataforma actual     |

---

## Siguientes pasos

- [Arquitectura del proyecto](./01-arquitectura.md)
- [Estructura del código](./03-estructura-codigo.md)
- [Volver al índice](./README.md)

