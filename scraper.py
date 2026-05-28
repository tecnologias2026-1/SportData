import json
from scrapling.fetchers import StealthyFetcher
import re # Para limpiar el precio

def extraer_productos(query):
    # Construir la URL de búsqueda para MercadoLibre Argentina
    # Puedes cambiar 'listado.mercadolibre.com.ar' por el dominio de tu país (ej: .cl, .com.mx)
    search_url = f"https://listado.mercadolibre.com.ar/{query.replace(' ', '-')}"
    
    print(f"Iniciando scraping en: {search_url}")
    
    try:
    # network_idle asegura que todo el JavaScript de la página de deportes se haya ejecutado
    # headless=True para que no se abra una ventana del navegador
        pagina = StealthyFetcher.fetch(search_url, headless=True, network_idle=True)
    
    # Selectores CSS para MercadoLibre (pueden variar ligeramente con el tiempo)
        tarjetas = pagina.css('ol.ui-search-layout li.ui-search-layout__item')
        catalogo = []

        for i, tarjeta in enumerate(tarjetas):
            if i >= 10: # Limitar a los primeros 10 resultados para el ejemplo
                break

            titulo_element = tarjeta.css('.ui-search-item__title')
            precio_element = tarjeta.css('.andes-money-amount__fraction')
            imagen_element = tarjeta.css('.ui-search-result-image__element')
            enlace_element = tarjeta.css('.ui-search-item__group__element a')

            titulo = titulo_element.get_text(default='N/A').strip()
            
            raw_price = precio_element.get_text(default='0').strip()
            # Limpiar el precio: eliminar símbolos de moneda, puntos de miles y reemplazar coma decimal por punto
            price = float(re.sub(r'[^\d,]+', '', raw_price).replace(',', '.')) if raw_price else 0.0
            
            imagen = imagen_element.get_attribute('data-src', default='') or imagen_element.get_attribute('src', default='')
            enlace = enlace_element.get_attribute('href', default='')
            
            if titulo != 'N/A' and price > 0 and enlace: # Solo añadir productos válidos
                catalogo.append({
                    "title": titulo,
                    "price": price,
                    "thumbnail": imagen,
                    "permalink": enlace,
                    "source": "MercadoLibre (Scrapling)"
                })
        
    # Exportación al formato JSON esperado por el proyecto
        output_filename = 'productos_scrapling.json'
        with open(output_filename, 'w', encoding='utf-8') as archivo:
            json.dump(catalogo, archivo, ensure_ascii=False, indent=2)
        
        print(f"Extracción completada. {len(catalogo)} productos guardados en {output_filename}.")
        return catalogo

    except Exception as e:
        print(f"Error durante el scraping: {e}")
        return []

# Ejemplo de ejecución de la función con una búsqueda
if __name__ == "__main__":
    # Para ejecutar este script, necesitarás tener un navegador (Chrome/Chromium) instalado
    # y los drivers correspondientes para Scrapling (Playwright).
    # Asegúrate de que Playwright esté instalado: pip install playwright
    # Y los navegadores: playwright install
    
    # Ejemplo de búsqueda: "zapatillas running nike"
    productos_encontrados = extraer_productos("zapatillas running nike")
    # print(json.dumps(productos_encontrados, indent=2, ensure_ascii=False))