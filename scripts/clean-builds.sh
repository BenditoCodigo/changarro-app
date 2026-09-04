#!/bin/bash
#
# Limpia todos los artefactos de build de Capacitor para liberar espacio.
#
# Uso:
#   ./scripts/clean-builds.sh        # Muestra qué se eliminará y pide confirmación
#   ./scripts/clean-builds.sh --force # Elimina sin preguntar
#

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
DIM='\033[2m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

FORCE="${1:-}"

echo -e "${YELLOW}╔══════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   Changarro - Limpiar Build          ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════╝${NC}"
echo ""

# Directorios a limpiar para Capacitor
TARGETS=(
    "dist"
    "android/app/build"
    "android/.gradle"
    "android/build"
)

# APKs sueltos en la raíz específicos de Capacitor
APKS=($(find . -maxdepth 1 -name "changarro-*.apk" -o -name "*-aligned.apk" 2>/dev/null))

# Calcular espacio
TOTAL_SIZE=0
ITEMS_FOUND=0

echo -e "${YELLOW}Artefactos encontrados:${NC}"
echo ""

for dir in "${TARGETS[@]}"; do
    if [ -d "$dir" ]; then
        SIZE=$(du -sh "$dir" 2>/dev/null | cut -f1)
        echo -e "  ${DIM}$dir${NC} — ${SIZE}"
        ITEMS_FOUND=$((ITEMS_FOUND + 1))
    fi
done

for apk in "${APKS[@]}"; do
    if [ -f "$apk" ]; then
        SIZE=$(du -sh "$apk" 2>/dev/null | cut -f1)
        echo -e "  ${DIM}$apk${NC} — ${SIZE}"
        ITEMS_FOUND=$((ITEMS_FOUND + 1))
    fi
done

if [ $ITEMS_FOUND -eq 0 ]; then
    echo -e "  ${GREEN}No hay artefactos que limpiar.${NC}"
    exit 0
fi

echo ""

# Calcular total
TOTAL=$(du -shc ${TARGETS[@]} ${APKS[@]} 2>/dev/null | grep total | cut -f1)
echo -e "${YELLOW}Espacio total a liberar: ~${TOTAL}${NC}"
echo ""

# Confirmar
if [ "$FORCE" != "--force" ]; then
    echo -e "¿Eliminar todos los artefactos? ${DIM}(s/n)${NC}"
    read -r REPLY
    if [ "$REPLY" != "s" ] && [ "$REPLY" != "S" ]; then
        echo -e "${RED}Cancelado.${NC}"
        exit 0
    fi
fi

# Limpiar
echo ""
for dir in "${TARGETS[@]}"; do
    if [ -d "$dir" ]; then
        rm -rf "$dir"
        echo -e "  ${GREEN}✓${NC} Eliminado $dir"
    fi
done

for apk in "${APKS[@]}"; do
    if [ -f "$apk" ]; then
        rm -f "$apk"
        echo -e "  ${GREEN}✓${NC} Eliminado $apk"
    fi
done

echo ""
echo -e "${GREEN}✓ Limpieza completada.${NC}"
echo -e "${DIM}  Nota: La próxima compilación tardará más al regenerar estos archivos.${NC}"
