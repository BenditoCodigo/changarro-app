#!/bin/bash
#
# Compila el paquete instalador DMG de Changarro para macOS usando Capacitor Electron.
#
# Uso:
#   ./scripts/build-dmg.sh
#
# Requisitos:
#   - macOS (Darwin)
#   - Node.js 22+ y npm
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

# Verificar que el sistema es macOS
if [ "$(uname)" != "Darwin" ]; then
    echo -e "${RED}Error: La compilación de paquetes DMG para macOS debe ejecutarse en macOS.${NC}"
    exit 1
fi

# Leer versión del package.json
VERSION=$(node -p "require('./package.json').version")

echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Changarro macOS Builder v${VERSION}    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""

# Verificar que existe la carpeta electron
if [ ! -d "electron" ]; then
    echo -e "${RED}Error: No se encontró la carpeta nativa 'electron'. Ejecuta 'npx cap add @capawesome/capacitor-electron' primero.${NC}"
    exit 1
fi

# Compilar frontend y sincronizar con Capacitor Electron
echo -e "${YELLOW}▶ Compilando frontend web y sincronizando con Capacitor Electron...${NC}"
npm run build
npx cap sync @capawesome/capacitor-electron

# Compilar ejecutable con Electron Builder
echo -e "${YELLOW}▶ Empaquetando instalador DMG con Electron Builder...${NC}"
cd electron
npm run pack
cd ..

# Buscar el archivo DMG generado
DMG_FILE=$(find electron/dist -maxdepth 2 -name "*.dmg" 2>/dev/null | head -n 1)

if [ -z "$DMG_FILE" ] || [ ! -f "$DMG_FILE" ]; then
    echo -e "${RED}Error: No se encontró el archivo .dmg generado en electron/dist.${NC}"
    exit 1
fi

# Copiar el paquete DMG a la raíz con nombre versionado
OUTPUT_DMG="changarro-v${VERSION}.dmg"
cp "$DMG_FILE" "$OUTPUT_DMG"

SIZE=$(du -h "$OUTPUT_DMG" | cut -f1)

echo ""
echo -e "${GREEN}✓ Paquete macOS DMG generado con éxito: ${OUTPUT_DMG} (${SIZE})${NC}"
echo -e "${GREEN}✓ Listo para instalar o distribuir en macOS.${NC}"
