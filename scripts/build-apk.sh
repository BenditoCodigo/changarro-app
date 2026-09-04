#!/bin/bash
#
# Compila el APK de Changarro para Android usando Capacitor.
#
# Uso:
#   ./scripts/build-apk.sh          # Build debug (se instala directo)
#   ./scripts/build-apk.sh release  # Build release firmado
#
# Requisitos:
#   - Node.js, npm
#   - Android SDK con build-tools
#   - Java 17+ (export JAVA_HOME=...)
#   - Para release: keystore en ./changarro-release.keystore
#

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directorio del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Configurar JAVA_HOME para usar Java 21 (requerido por Capacitor 6+) si está disponible en macOS
if [ -x "/usr/libexec/java_home" ]; then
    JAVA_21_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || true)
    if [ -n "$JAVA_21_HOME" ]; then
        echo -e "${YELLOW}▶ Configurando JAVA_HOME para usar Java 21: $JAVA_21_HOME${NC}"
        export JAVA_HOME="$JAVA_21_HOME"
    fi
fi

# Verificar que existe la carpeta android
if [ ! -d "android" ]; then
    echo -e "${RED}Error: No se encontró la carpeta nativa 'android'. Ejecuta 'npx cap add android' primero.${NC}"
    exit 1
fi

# Detectar build-tools
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
BUILD_TOOLS_DIR=$(ls -d "$ANDROID_HOME/build-tools/"* 2>/dev/null | sort -V | tail -1)

if [ -z "$BUILD_TOOLS_DIR" ]; then
    echo -e "${RED}Error: No se encontraron Android build-tools en $ANDROID_HOME${NC}"
    exit 1
fi

ZIPALIGN="$BUILD_TOOLS_DIR/zipalign"
APKSIGNER="$BUILD_TOOLS_DIR/apksigner"

# Leer versión del package.json
VERSION=$(node -p "require('./package.json').version")

# Modo (debug o release)
MODE="${1:-debug}"

echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Changarro Capacitor Builder v${VERSION}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""

# Compilar frontend y sincronizar
echo -e "${YELLOW}▶ Compilando frontend y sincronizando con Capacitor...${NC}"
npm run build
npx cap sync android

if [ "$MODE" = "release" ]; then
    echo -e "${YELLOW}▶ Modo: RELEASE (Capacitor)${NC}"
    echo ""

    # Verificar keystore
    KEYSTORE="./changarro-release.keystore"
    if [ ! -f "$KEYSTORE" ]; then
        echo -e "${YELLOW}No se encontró changarro-release.keystore${NC}"
        echo "¿Deseas crear uno nuevo? (s/n)"
        read -r REPLY
        if [ "$REPLY" = "s" ] || [ "$REPLY" = "S" ]; then
            echo -e "${YELLOW}Ingresa una contraseña para el keystore:${NC}"
            read -rs KS_PASS
            echo ""
            keytool -genkey -v \
                -keystore "$KEYSTORE" \
                -alias changarro-release \
                -keyalg RSA -keysize 2048 \
                -validity 10000 \
                -storepass "$KS_PASS" \
                -keypass "$KS_PASS" \
                -dname "CN=Changarro, O=Bendito Codigo, L=Mexico, C=MX"
            echo -e "${GREEN}✓ Keystore creado${NC}"
        else
            echo -e "${RED}Abortado. Se necesita un keystore para builds release.${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Ingresa la contraseña del keystore:${NC}"
        read -rs KS_PASS
        echo ""
    fi

    # Build release con Gradle
    echo -e "${YELLOW}▶ Compilando APK release con Gradle...${NC}"
    cd android
    ./gradlew assembleRelease
    cd ..

    UNSIGNED_APK="android/app/build/outputs/apk/release/app-release-unsigned.apk"

    if [ ! -f "$UNSIGNED_APK" ]; then
        echo -e "${RED}Error: No se generó el APK en $UNSIGNED_APK.${NC}"
        exit 1
    fi

    # Alinear
    ALIGNED_APK="changarro-aligned.apk"
    echo -e "${YELLOW}▶ Alineando APK...${NC}"
    "$ZIPALIGN" -f 4 "$UNSIGNED_APK" "$ALIGNED_APK"

    # Firmar
    OUTPUT_APK="changarro-v${VERSION}.apk"
    echo -e "${YELLOW}▶ Firmando APK...${NC}"
    "$APKSIGNER" sign \
        --ks "$KEYSTORE" \
        --ks-key-alias changarro-release \
        --ks-pass "pass:$KS_PASS" \
        --key-pass "pass:$KS_PASS" \
        --out "$OUTPUT_APK" \
        "$ALIGNED_APK"

    # Limpiar temporal
    rm -f "$ALIGNED_APK"

    # Verificar
    echo -e "${YELLOW}▶ Verificando firma...${NC}"
    "$APKSIGNER" verify "$OUTPUT_APK"

    SIZE=$(du -h "$OUTPUT_APK" | cut -f1)
    echo ""
    echo -e "${GREEN}✓ APK release generado: ${OUTPUT_APK} (${SIZE})${NC}"

else
    echo -e "${YELLOW}▶ Modo: DEBUG (Capacitor)${NC}"
    echo ""

    # Build debug con Gradle
    echo -e "${YELLOW}▶ Compilando APK debug con Gradle...${NC}"
    cd android
    ./gradlew assembleDebug
    cd ..

    DEBUG_APK="android/app/build/outputs/apk/debug/app-debug.apk"

    if [ ! -f "$DEBUG_APK" ]; then
        echo -e "${RED}Error: No se generó el APK en $DEBUG_APK.${NC}"
        exit 1
    fi

    # Copiar con nombre legible
    OUTPUT_APK="changarro-v${VERSION}-debug.apk"
    cp "$DEBUG_APK" "$OUTPUT_APK"

    SIZE=$(du -h "$OUTPUT_APK" | cut -f1)
    echo ""
    echo -e "${GREEN}✓ APK debug generado: ${OUTPUT_APK} (${SIZE})${NC}"
fi

echo -e "${GREEN}✓ Listo para instalar en Android.${NC}"
