# 🏢 URBANA PULSE — Analítica de Ventas & Mercado Inmobiliario Real

> **Documento de Auditoría y Especificación de Prototipo v2.1**  
> **Proyecto:** Modernización Integral de `idalista-tracker`  
> **Enfoque:** Análisis de Ventas, Diagnóstico de Zonas en BBDD, Auditoría por Intervalos y Seguimiento de Rebajas.

---

## 1. 🔍 Diagnóstico Técnico: El Diferenciador de Zona en la Base de Datos

### ¿Por qué fallaba el diferenciador de zona en el proyecto anterior?
Al inspeccionar directamente la base de datos SQLite `idealista_properties.db` (que cuenta con **2.190 propiedades registradas**), descubrimos la causa raíz:
- La columna `property.location` estaba **corrupta por el scraping previo**. En lugar de almacenar el barrio o la dirección, se guardaron fragmentos del cuerpo del anuncio como *"3 hab.\n70 m²"* o *"Garaje incluido\n4 hab."*. De las 2.190 filas, **solo 65 contenían la palabra "Burgos" en `property.location`**. Por eso los filtros de zona anteriores no funcionaban o mostraban apenas un puñado de resultados erróneos.
- Sin embargo, **la zona real sí quedó almacenada de forma limpia en la columna `property.title`** (ejemplos reales: *"Piso en Calle Procurador, San Pedro de la Fuente, Burgos"*, *"Ático en Plaza Nueva de Gamonal, Gamonal - San Bruno - G9, Burgos"*, *"Piso en Avenida Reyes Católicos, Los Vadillos - R. Sanitaria - Pozanos, Burgos"*).

### Censo Real de Zonas en la BBDD (2.190 viviendas clasificadas):
Normalizando y limpiando las cadenas desde `property.title`, el censo exacto de la base de datos se distribuye así:

| Zona / Distrito | Total Inmuebles | Activos | Vendidos | Missing | €/m² Medio | Tiempo Medio de Venta | Descuento Medio |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Los Vadillos - Reyes Católicos** | **243** | 99 | 104 | 40 | 2.409 €/m² | 79 días | -7.7% |
| **Villa Pilar** | **235** | 182 | 38 | 15 | 2.560 €/m² | 84 días | -4.7% |
| **Gamonal - San Bruno - G9** | **230** | 87 | 106 | 37 | 2.006 €/m² | 76 días | -5.7% |
| **Burgos Centro / Otras Zonas** | **157** | 86 | 54 | 17 | 1.462 €/m² | 87 días | -9.1% |
| **Casco Antiguo - Centro** | **155** | 81 | 56 | 18 | 2.588 €/m² | 89 días | -6.4% |
| **San Pedro y San Felices** | **150** | 64 | 67 | 19 | 2.381 €/m² | 82 días | -7.2% |
| **Villimar - San Cristóbal** | **116** | 39 | 59 | 18 | 2.335 €/m² | 87 días | -4.4% |
| **Universidad - Las Huelgas** | **98** | 35 | 49 | 14 | 2.682 €/m² | 82 días | -3.4% |
| **Illera** | **98** | 44 | 37 | 17 | 2.776 €/m² | 77 días | -4.7% |
| **Briviesca** | **90** | 85 | 4 | 1 | 1.106 €/m² | 112 días | -31.1% |
| **San Agustín - Pisones** | **89** | 38 | 38 | 13 | 2.114 €/m² | 80 días | -8.0% |
| **Fuentecillas - S7 - S8** | **65** | 14 | 42 | 9 | 2.402 €/m² | 85 días | -5.2% |
| **San Julián - Cortes** | **58** | 31 | 24 | 3 | 2.190 €/m² | 88 días | -6.8% |
| **El Carmen - Barrio Gimeno** | **55** | 30 | 23 | 2 | 2.310 €/m² | 79 días | -7.1% |
| **Juan XXIII - Las Torres** | **48** | 14 | 28 | 6 | 2.050 €/m² | 81 días | -6.5% |
| **Santa Teresa - San Pedro Cardeña** | **42** | 26 | 10 | 6 | 2.450 €/m² | 86 días | -5.9% |
| **Yagüe - Villalonquejar** | **42** | 22 | 9 | 11 | 1.980 €/m² | 90 días | -6.2% |

---

## 2. 🚀 Novedades Aplicadas en el Prototipo v2.1

### 1. Eliminación del Mapa
- Se ha retirado completamente el contenedor Leaflet.
- El explorador de inmuebles aprovecha el **100% del ancho de la pantalla** en una cuadrícula responsiva limpia de 3-4 columnas, dando total visibilidad a las fichas, fotos, métricas de venta y variaciones de precio.

### 2. Filtro Tripartito de Ventas (Activos, Vendidos, Todos)
Un selector segmentado destacado en la cabecera del explorador:
- 🔴 **"Solo Vendidos"**: Vista exclusiva para analizar las ventas cerradas. Cada tarjeta resalta:
  - Etiqueta destacada `VENDIDO`.
  - Fecha exacta de venta (`sold_at`).
  - Días reales que tardó en venderse (`Tardó 78 días en mercado`).
  - Descuento de salida vs precio de venta final (`-12.4% (-24.000 €)`).
- 🟢 **"Activos (Excluir Vendidos)"**: Solo oferta disponible actualmente en Idealista.
- ⚪ **"Incluir Todos"**: Muestra el catálogo completo.

### 3. Filtro por Fechas
- Controles de fecha `Desde` y `Hasta` en la barra de herramientas del explorador para acotar qué viviendas entraron al mercado o se vendieron en un periodo concreto.

### 4. 📅 Nueva Pestaña: Auditoría por Intervalos & Calendario
Un módulo completo para analizar la evolución en cualquier intervalo temporal:
- **Selector de Intervalos:**
  - Botones de acceso rápido para cada mes: Mayo 2026, Junio 2026, Julio 2026 (pico histórico de 286 ventas), Agosto 2026, Septiembre 2026, Octubre 2026.
  - Selector de rango de fechas personalizado con calendario (`Desde` y `Hasta`).
- **5 Tarjetas de Métricas del Intervalo:**
  1. 📥 **Nuevas Inclusiones:** Cuántos inmuebles entraron al catálogo en esas fechas.
  2. 📤 **Ventas Concluidas:** Cuántas viviendas se vendieron o retiraron.
  3. 📉 **Rebajas de Precio:** Número de caídas detectadas, % medio de bajada y euros totales ahorrados.
  4. 📈 **Aumentos de Precio:** Número de subidas y % medio de incremento.
  5. ⏱️ **Permanencia Media:** Promedio de días que tardaron en venderse las casas cerradas en ese intervalo.
- **Tabla Desglose por Zonas en el Intervalo:**
  - Permite ver barrio a barrio cuántas viviendas se vendieron, cuánto tardaron de media y qué descuento de negociación se aplicó durante esas semanas.

### 5. Supresión de Métricas Inventadas
- Se ha eliminado cualquier mención a *"perfiles de inversor"*, *"rentabilidades brutas"* o estimaciones artificiales.
- El 100% de los datos se enfoca en **comportamiento real de mercado**: precios de salida vs venta, días de permanencia y porcentaje de rebaja.

---

## 3. 📂 Archivos del Prototipo Actualizados

*   **[prototype/index.html](file:///d:/codebases/idalista-tracker/prototype/index.html)**: Prototipo interactivo rediseñado con filtros de venta, fechas, auditoría de intervalos y sin mapa.
*   **[prototype/data.js](file:///d:/codebases/idalista-tracker/prototype/data.js)**: Dataset con las 23 zonas normalizadas, desglose mensual y propiedades activas/vendidas.
*   **[prototype/export_full_market_data.py](file:///d:/codebases/idalista-tracker/prototype/export_full_market_data.py)**: Script que extrajo y procesó los datos desde SQLite.
*   **[prototype/open_prototype.bat](file:///d:/codebases/idalista-tracker/prototype/open_prototype.bat)**: Lanzador directo para abrir en el navegador.
