#!/usr/bin/env python3
"""
Genera los íconos requeridos por Capacitor Electron (macOS .icns y .png) a partir de una imagen PNG fuente.

Uso:
    python3 scripts/generate-icons-macos.py path/to/icon-1024x1024.png

Requisitos:
    pip install Pillow

Genera y guarda en electron/assets/:
    - icon.png (1024x1024 px)
    - icon.icns (Formato nativo de íconos macOS para finder y dock)
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow no está instalado.")
    print("Instálalo con: pip install Pillow")
    sys.exit(1)


def main() -> None:
    if len(sys.argv) != 2:
        print("Uso: python3 scripts/generate-icons-macos.py <ruta-a-imagen-png>")
        print("  La imagen debe ser cuadrada, idealmente 1024x1024 px.")
        sys.exit(1)

    source_path = Path(sys.argv[1])
    if not source_path.exists():
        print(f"Error: No se encontró el archivo '{source_path}'")
        sys.exit(1)

    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    electron_assets_dir = project_root / "electron" / "assets"

    if not electron_assets_dir.exists():
        print(f"Creando directorio de recursos en '{electron_assets_dir}'...")
        electron_assets_dir.mkdir(parents=True, exist_ok=True)

    img = Image.open(source_path).convert("RGBA")
    width, height = img.size
    if width != height:
        print(f"Advertencia: La imagen no es cuadrada ({width}x{height}). Se recortará al centro.")
        min_dim = min(width, height)
        left = (width - min_dim) // 2
        top = (height - min_dim) // 2
        img = img.crop((left, top, left + min_dim, top + min_dim))

    print(f"Imagen fuente: {source_path} ({img.size[0]}x{img.size[1]})")
    print(f"Directorio de recursos Electron: {electron_assets_dir}")
    print()

    # 1. Guardar icon.png base (1024x1024)
    main_icon_path = electron_assets_dir / "icon.png"
    icon_1024 = img.resize((1024, 1024), Image.LANCZOS)
    icon_1024.save(str(main_icon_path), format="PNG")
    print(f"  ✓ Generado {main_icon_path.name} (1024x1024)")

    # 2. Generar icon.icns usando iconutil si se ejecuta en macOS
    iconutil_path = shutil.which("iconutil")
    if iconutil_path:
        iconset_dir = electron_assets_dir / "AppIcon.iconset"
        iconset_dir.mkdir(parents=True, exist_ok=True)

        sizes = [
            ("icon_16x16.png", 16),
            ("icon_16x16@2x.png", 32),
            ("icon_32x32.png", 32),
            ("icon_32x32@2x.png", 64),
            ("icon_128x128.png", 128),
            ("icon_128x128@2x.png", 256),
            ("icon_256x256.png", 256),
            ("icon_256x256@2x.png", 512),
            ("icon_512x512.png", 512),
            ("icon_512x512@2x.png", 1024),
        ]

        print("  Generando conjunto de íconos .iconset para macOS...")
        for filename, size in sizes:
            resized = img.resize((size, size), Image.LANCZOS)
            resized.save(str(iconset_dir / filename), format="PNG")

        icns_path = electron_assets_dir / "icon.icns"
        print(f"  Compilando archivo .icns nativo con iconutil...")
        result = subprocess.run(
            [iconutil_path, "-c", "icns", str(iconset_dir), "-o", str(icns_path)],
            capture_output=True,
            text=True,
        )

        # Limpiar carpeta temporal .iconset
        shutil.rmtree(iconset_dir, ignore_errors=True)

        if result.returncode == 0 and icns_path.exists():
            print(f"  ✓ Generado {icns_path.name} (macOS Apple Icon Image)")
        else:
            print(f"  ⚠ Advertencia al compilar .icns: {result.stderr}")
    else:
        print("  ⓘ iconutil no disponible en esta plataforma; Electron Builder usará icon.png automáticamente.")

    print()
    print("¡Listo! Los íconos para macOS (Electron) fueron generados con éxito.")


if __name__ == "__main__":
    main()
