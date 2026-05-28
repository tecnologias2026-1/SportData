import sys
import json
import re
from scrapling.fetchers import StealthyFetcher

def extraer_productos(query):
    # Usamos MercadoLibre Argentina como ejemplo de búsqueda
    search_url = f"https://listado.mercadolibre.com.ar/{query.replace(' ', '-')}"
    
    try:
        # StealthyFetcher maneja el bypass de protecciones básicas
        pagina = StealthyFetcher.fetch(search_url, headless=True, network_idle=True)
        
        # Selectores específicos de la estructura actual de ML
        tarjetas = pagina.css('ol.ui-search-layout li.ui-search-layout__item')
        catalogo = []

        for i, tarjeta in enumerate(tarjetas):
            if i >= 5: # Limitamos a 5 resultados para ser consistentes con el backend
                break

            titulo = tarjeta.css('.ui-search-item__title').get_text(default='').strip()
            
            # Extracción y limpieza de precio
            precio_raw = tarjeta.css('.andes-money-amount__fraction').get_text(default='0').strip()
            precio = float(re.sub(r'[^\d.]+', '', precio_raw.replace(',', '.'))) if precio_raw else 0.0
            
            # Conversión aproximada ARS a USD (0.0011) para mantener coherencia con el catálogo
            precio_convertido = round(precio * 0.0011, 2)
            
            imagen_el = tarjeta.css('.ui-search-result-image__element')
            imagen = imagen_el.get_attribute('data-src') or imagen_el.get_attribute('src')
            enlace = tarjeta.css('.ui-search-item__group__element a').get_attribute('href')
            
            if titulo and precio > 0:
                catalogo.append({
                    "source": "MercadoLibre",
                    "title": titulo,
                    "price": precio_convertido,
                    "url": enlace,
                    "thumbnail": imagen
                })
        
        return catalogo
    except Exception as e:
        print(f"Python Error: {str(e)}", file=sys.stderr)
        return []

if __name__ == "__main__":
    # Recibimos la query desde los argumentos de Node.js
    query_param = sys.argv[1] if len(sys.argv) > 1 else "zapatillas running"
    productos = extraer_productos(query_param)
    # Imprimimos el JSON para que Node.js lo capture en el buffer de stdout
    print(json.dumps(productos, ensure_ascii=False))