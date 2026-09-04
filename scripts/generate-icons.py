#!/usr/bin/env python3
"""
Genera los íconos requeridos por Capacitor (Android) a partir de una imagen PNG fuente.

Uso:
    python scripts/generate-icons.py path/to/icon-1024x1024.png

Requisitos:
    pip install Pillow

Genera y copia en android/app/src/main/res/:
    - mipmap-mdpi/ (48x48)
    - mipmap-hdpi/ (72x72)
    - mipmap-xhdpi/ (96x96)
    - mipmap-xxhdpi/ (144x144)
    - mipmap-xxxhdpi/ (192x192)
"""

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
        print("Uso: python scripts/generate-icons.py <ruta-a-imagen-png>")
        print("  La imagen debe ser cuadrada, idealmente 1024x1024 px.")
        sys.exit(1)

    source_path = Path(sys.argv[1])
    if not source_path.exists():
        print(f"Error: No se encontró el archivo '{source_path}'")
        sys.exit(1)

    # Resolve output directory
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    android_res_dir = project_root / "android" / "app" / "src" / "main" / "res"

    if not android_res_dir.exists():
        print(f"Error: No se encontró el directorio de recursos de Android en '{android_res_dir}'")
        print("Asegúrate de haber inicializado el proyecto Android con 'npx cap add android'.")
        sys.exit(1)

    # Load source image
    img = Image.open(source_path).convert("RGBA")
    width, height = img.size
    if width != height:
        print(f"Advertencia: La imagen no es cuadrada ({width}x{height}). Se recortará al centro.")
        min_dim = min(width, height)
        left = (width - min_dim) // 2
        top = (height - min_dim) // 2
        img = img.crop((left, top, left + min_dim, top + min_dim))

    print(f"Imagen fuente: {source_path} ({img.size[0]}x{img.size[1]})")
    print(f"Directorio de recursos Android: {android_res_dir}")
    print()

    android_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    print("Generando y copiando íconos al proyecto Android de Capacitor...")
    for folder, size in android_sizes.items():
        res_folder = android_res_dir / folder
        res_folder.mkdir(parents=True, exist_ok=True)

        # Redimensionar
        resized = img.resize((size, size), Image.LANCZOS)
        
        # Guardar ic_launcher.png, ic_launcher_round.png e ic_launcher_foreground.png
        # (Para soportar adaptive icons y launcher regular en dispositivos antiguos)
        for filename in ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]:
            output_file = res_folder / filename
            resized.save(str(output_file), format="PNG")
        
        print(f"  ✓ res/{folder}/ (ic_launcher, ic_launcher_round, ic_launcher_foreground) ({size}x{size})")

    print()
    print("¡Listo! Todos los íconos de Android para Capacitor fueron generados con éxito.")


if __name__ == "__main__":
    main()
