

🌐 SportData

SportData es una plataforma web de precios de ropa deportiva en múltiples tiendas online. El sistema utiliza técnicas de Web Scraping para extraer, procesar y visualizar información actualizada de productos, facilitando decisiones de compra rápidas, objetivas y optimizadas.

👥 Integrantes

Santiago Ballesteros Moreno-1202644
Daniela Rojas Ortiz-1202773
Jose Miguel Bernal Muñoz-1202803

🎯 1. Objetivo General

Desarrollar un sistema web de comparación de precios enfocado en ropa deportiva que a travez de técnicas de Web Scraping, permita extraer información de múltiples tiendas online, procesarla y presentarla de forma clara y estructurada al usuario. El sistema busca solucionar la dificultad de encontrar el mejor precio y comparar múltiples proveedores de manera eficiente, evitando la consulta manual en diferentes sitios web.

🌍 2. Contexto de Uso

¿Quién lo usará?
Deportistas, compradores digitales, analistas de mercado y usuarios interesados en encontrar el mejor precio de ropa deportiva.

¿Cómo se utilizará?
El usuario ingresará un producto en la barra de búsqueda.El sistema actuará en consecuencia extrayendo la información y presentando los resultados comparados en una interfaz optimizada.

📋 3. Requerimientos del Sistema
3.1 Requerimientos Funcionales

RF01: El sistema debe permitir buscar productos de ropa deportiva mediante una barra de búsqueda inteligente.

RF02: El sistema debe extraer información de múltiples tiendas online utilizando Web Scraping.

RF03: El sistema debe mostrar una lista comparativa de precios entre diferentes proveedores.

RF04: El sistema debe permitir filtrar productos por precio, marca, categoría y valoración.

RF05: El sistema debe mostrar el historial de variación de precios.

RF06: El sistema debe redirigir al usuario al comercio original para finalizar la compra.

RF07: El sistema debe permitir marcar productos para compararlos posteriormente.


3.2 Requerimientos No Funcionales

RNF01: El sistema debe tener alta velocidad de carga.

RNF02: La página debe ser responsive (adaptable a dispositivos móviles).

RNF03: El sistema debe actualizar periódicamente los precios.

RNF04: Debe implementar buenas prácticas SEO.

RNF05: La interfaz debe ser clara, minimalista y centrada en objetos.

🧠 4. Diagramas UML

https://docs.google.com/document/d/1PKiI14StUhimst7y1OY1sUwMewMR5jcuXPa4BZmgoGc/edit?usp=sharing

Diagrama de Casos de Uso

Representa la interacción entre el usuario y el sistema SportData.
Muestra funcionalidades como:

-Buscar producto

-Filtrar resultados

-Comparar precios

-Visualizar historial

-Redirigir a tienda

El actor principal es el Usuario, quien interactúa con el sistema web.


Diagrama de Secuencia

Representa el proceso de consulta de precios:

-Usuario ingresa búsqueda.

-Interfaz envía solicitud al sistema.

-El sistema realiza petición HTTP a tiendas externas.

-Se recibe respuesta (HTML).

-Se analiza y se extraen datos.

-Se almacenan en base de datos.

-Se muestran resultados al usuario.

🎨 5. URL del Prototipo

Colocar aquí el enlace público de Figma:

[https://figma.com/xxxxx](https://www.figma.com/design/cL5fGoQNHjwQOYGSwge8U1/SportData---Pagina-web?node-id=0-1&t=VHg2Y5dkpcwVI4nt-1)


🗄️ 6. Diseño de Base de Datos

Agregar imagen del modelo.
https://docs.google.com/document/d/1PKiI14StUhimst7y1OY1sUwMewMR5jcuXPa4BZmgoGc/edit?usp=sharing

El modelo relacional incluye las siguientes tablas principales:

-Usuarios (id, nombre, correo, contraseña)

-Productos (id_producto, nombre, marca, categoría)

-Tiendas (id_tienda, nombre, url)

-Precios (id_precio, id_producto, id_tienda, precio_actual, fecha)

-Historial_Precios (id_historial, id_producto, precio, fecha_registro)

El diseño permite mantener trazabilidad histórica de variaciones de precio y relaciones entre productos y tiendas.

🧩 7. Documentación del Sistema
Estructura de Carpetas
/css
/js
/assets

Explicar brevemente qué contiene cada carpeta.

🚀 8. Instalación y Ejecución

Explicar cómo correr el proyecto.
