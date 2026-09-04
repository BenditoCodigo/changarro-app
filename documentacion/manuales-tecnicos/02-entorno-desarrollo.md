# Entorno de desarrollo

Este documento explica cómo preparar tu máquina para trabajar en Changarro.

---

## Requisitos previos

### Herramientas base

| Herramienta | Versión mínima | Para qué                            |
| ----------- | -------------- | ----------------------------------- |
| Node.js     | 22+            | Ejecutar el frontend en desarrollo  |
| npm         | 10+            | Gestionar dependencias del frontend |
| Java        | 21 (JDK)       | Requerido por Gradle y Capacitor 8  |
| Git         | 2.x            | Control de versiones                |

### Para desarrollo Android

| Herramienta    | Notas                                        |
| -------------- | -------------------------------------------- |
| Android Studio | SDK y emulador                               |
| Android SDK    | API 24+ (Android 7.0 mínimo)                 |

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

---

## Desarrollo

### Servidor de desarrollo frontend

```bash
npm run dev
```

Abre `http://localhost:5173` en el navegador. Útil para desarrollo rápido de UI.

### Ejecutar en Android (Capacitor)

```bash
npm run cap:run
```

Compila el frontend, lo sincroniza con Capacitor y ejecuta la aplicación en un dispositivo Android o emulador conectado.

### Abrir en Android Studio

```bash
npm run cap:open
```

Abre el proyecto nativo en Android Studio para depuración o ajustes en el manifest.

---

## Build de producción

### Solo frontend

```bash
npm run build
```

Ejecuta verificación de tipos con TypeScript y genera los archivos estáticos optimizados en `dist/`.

### Android APK (Capacitor)

Compilación mediante los scripts automatizados de Capacitor:

```bash
npm run build:apk          # Build debug (.apk)
npm run build:apk:release  # Build release firmado (.apk)
```

O directamente mediante el script:

```bash
./scripts/build-apk.sh          # Build debug (.apk)
./scripts/build-apk.sh release  # Build release firmado (.apk)
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
| `npm run cap:run`             | Compila, sincroniza y ejecuta en dispositivo Android       |
| `npm run cap:open`            | Abre el proyecto Android en Android Studio                 |
| `npm run build:apk`           | Compila el APK de debug de Android con Capacitor           |
| `npm run build:apk:release`   | Compila el APK de release firmado de Android               |
| `npm run clean:builds`        | Limpia directorios de build y archivos de compilación      |

---

## Siguientes pasos

- [Arquitectura del proyecto](./01-arquitectura.md)
- [Estructura del código](./03-estructura-codigo.md)
- [Volver al índice](./README.md)

