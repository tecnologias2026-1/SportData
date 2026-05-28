#!/usr/bin/env bash
# ============================================================
# SportData — Setup de dependencias
# ============================================================
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   SportData — Instalación de deps        ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# 1. Dependencias Node.js
echo "→ Instalando dependencias Node.js..."
npm install

# 2. Dependencias Python
echo ""
echo "→ Instalando dependencias Python..."
if command -v python3 &>/dev/null; then
  python3 -m pip install requests beautifulsoup4 lxml --break-system-packages 2>/dev/null \
    || python3 -m pip install requests beautifulsoup4 lxml
  echo "   ✓ Dependencias Python instaladas"
else
  echo "   ⚠ Python3 no encontrado. Instálalo para activar el scraper de MercadoLibre."
  echo "     (El sistema funciona sin él usando precios estimados)"
fi

echo ""
echo "  ✅  Setup completo. Ejecuta: npm run dev"
echo ""
