#!/usr/bin/env python3
"""
============================================================
SportData — Scraper MercadoLibre (Python)
============================================================
Usa requests + BeautifulSoup (sin dependencias exóticas).
Soporta:
  - MercadoLibre Colombia (MCO)  — primary
  - MercadoLibre Argentina (MLA) — fallback
  - MercadoLibre México (MLM)    — fallback

Instalación de dependencias:
  pip install requests beautifulsoup4 lxml

Uso (desde Node.js vía spawn):
  python3 scraper.py "zapatillas running"
============================================================
"""

import sys
import json
import re
import time
import random

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    # Si faltan dependencias, devolvemos lista vacía y avisamos
    print(json.dumps([]))
    sys.stderr.write(
        "ERROR: Instala las dependencias con:\n"
        "  pip install requests beautifulsoup4 lxml\n"
    )
    sys.exit(0)

# ── Configuración ──────────────────────────────────────────
TIMEOUT     = 15      # segundos por petición
MAX_RESULTS = 5       # productos a devolver
# Conversión aproximada de monedas locales a USD
RATES = {
    'MCO': 0.00024,   # COP → USD
    'MLA': 0.0011,    # ARS → USD
    'MLM': 0.055,     # MXN → USD
}

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Referer': 'https://www.google.com/',
}

# ── Helpers ────────────────────────────────────────────────
def limpiar_precio(texto: str) -> float:
    """Extrae un float de un texto de precio."""
    if not texto:
        return 0.0
    limpio = re.sub(r'[^\d,.]', '', texto.strip())
    # Detectar formato: '1.234,56' (europeo) vs '1,234.56' (americano)
    if ',' in limpio and '.' in limpio:
        if limpio.index(',') < limpio.index('.'):
            limpio = limpio.replace(',', '')       # '1,234.56' → '1234.56'
        else:
            limpio = limpio.replace('.', '').replace(',', '.')  # '1.234,56' → '1234.56'
    elif ',' in limpio and '.' not in limpio:
        # Puede ser decimal europeo ('89,99') o miles ('1,234')
        partes = limpio.split(',')
        if len(partes) == 2 and len(partes[1]) <= 2:
            limpio = limpio.replace(',', '.')       # decimal
        else:
            limpio = limpio.replace(',', '')        # miles
    try:
        return float(limpio)
    except ValueError:
        return 0.0


def fetch(url: str, session: requests.Session) -> requests.Response | None:
    """GET con manejo de errores."""
    try:
        resp = session.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        if resp.status_code == 200:
            return resp
        sys.stderr.write(f"[ML Scraper] HTTP {resp.status_code}: {url}\n")
    except requests.exceptions.RequestException as e:
        sys.stderr.write(f"[ML Scraper] Error de red: {e}\n")
    return None


# ── Scraper principal ──────────────────────────────────────
def scrape_mercadolibre(query: str) -> list[dict]:
    """
    Intenta extraer productos de MercadoLibre en varios países.
    Devuelve lista de dicts con: source, title, price, url, thumbnail
    """
    session = requests.Session()
    session.max_redirects = 5

    # Pausa aleatoria para reducir detección como bot
    time.sleep(random.uniform(0.5, 1.2))

    sites = [
        ('MCO', f"https://listado.mercadolibre.com.co/{query.replace(' ', '-')}"),
        ('MLA', f"https://listado.mercadolibre.com.ar/{query.replace(' ', '-')}"),
        ('MLM', f"https://listado.mercadolibre.com.mx/{query.replace(' ', '-')}"),
    ]

    for site_code, url in sites:
        resp = fetch(url, session)
        if resp is None:
            continue

        soup = BeautifulSoup(resp.text, 'lxml')

        # Selectores actualizados para el HTML actual de ML (2024-2025)
        items = (
            soup.select('li.ui-search-layout__item') or
            soup.select('div.ui-search-result__content-wrapper') or
            soup.select('[class*="results-item"]')
        )

        if not items:
            sys.stderr.write(f"[ML Scraper] Sin resultados en {site_code}\n")
            continue

        catalogo = []
        for tarjeta in items[:MAX_RESULTS]:
            # Título
            titulo_el = (
                tarjeta.select_one('.ui-search-item__title') or
                tarjeta.select_one('h2') or
                tarjeta.select_one('[class*="title"]')
            )
            titulo = titulo_el.get_text(strip=True) if titulo_el else ''

            # Precio (parte entera)
            precio_el = (
                tarjeta.select_one('.andes-money-amount__fraction') or
                tarjeta.select_one('[class*="price-tag-fraction"]') or
                tarjeta.select_one('[class*="price"]')
            )
            precio_raw = precio_el.get_text(strip=True) if precio_el else ''
            precio_local = limpiar_precio(precio_raw)

            # Centavos/decimales (opcional)
            centavos_el = tarjeta.select_one('.andes-money-amount__cents')
            if centavos_el and precio_local > 0:
                centavos = limpiar_precio(centavos_el.get_text(strip=True))
                precio_local += centavos / 100

            # Convertir a USD
            precio_usd = round(precio_local * RATES[site_code], 2) if precio_local > 0 else 0.0

            # Imagen
            img_el = (
                tarjeta.select_one('img.ui-search-result-image__element') or
                tarjeta.select_one('[class*="result-image"] img') or
                tarjeta.select_one('img[src*="mlstatic"]') or
                tarjeta.select_one('img')
            )
            imagen = (
                img_el.get('data-src') or
                img_el.get('src') or
                ''
            ) if img_el else ''

            # Enlace
            link_el = tarjeta.select_one('a[href*="mercadolibre"]') or tarjeta.select_one('a')
            enlace = link_el.get('href', '') if link_el else ''

            if titulo and precio_usd > 0:
                catalogo.append({
                    'source':    f'MercadoLibre ({site_code})',
                    'title':     titulo,
                    'price':     precio_usd,
                    'url':       enlace,
                    'thumbnail': imagen,
                })

        if catalogo:
            return catalogo

        sys.stderr.write(f"[ML Scraper] No se pudo extraer precios en {site_code}\n")

    return []


# ── Entry point ────────────────────────────────────────────
if __name__ == '__main__':
    query_param = sys.argv[1] if len(sys.argv) > 1 else 'zapatillas running'
    try:
        productos = scrape_mercadolibre(query_param)
        print(json.dumps(productos, ensure_ascii=False))
    except Exception as exc:
        sys.stderr.write(f"[ML Scraper] Error inesperado: {exc}\n")
        print(json.dumps([]))
