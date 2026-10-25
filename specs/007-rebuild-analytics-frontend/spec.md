# Feature Specification: Rebuild Property & Market Analytics Frontend

**Feature Branch**: `007-rebuild-analytics-frontend`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Nuevo frontend desde 0 enfocado en listar propiedades, analizar ventas reales con filtro de vendidos (incluir, excluir, solo vendidos), filtrado por fechas, auditoría de intervalos de tiempo con calendario (inclusiones, exclusiones, rebajas %, subidas %, tiempo medio hasta venta y desglose por zona), normalización de zonas desde la BBDD, eliminando mapa y métricas inventadas. La Spec debe reflejar un nuevo frontend hecho desde 0 por completo. No debe utilizar nada del frontend actual, solo del backend como mucho."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exploración y Filtrado de Inmuebles con Enfoque en Ventas (Priority: P1)

Como comprador, analista o tasador inmobiliario, quiero explorar el catálogo completo de inmuebles en una cuadrícula responsiva a pantalla completa, pudiendo alternar fácilmente entre inmuebles activos, viviendas ya vendidas y el catálogo completo, además de filtrar por zona normalizada, precio y fechas de incorporación o venta, para analizar transacciones reales de mercado sin distracciones espaciales innecesarias.

**Why this priority**: Es el núcleo funcional del producto. Sin la capacidad de visualizar y filtrar tanto viviendas activas como viviendas vendidas con sus datos de cierre (tiempo de venta, descuento de salida), no es posible analizar el mercado inmobiliario real.

**Independent Test**: Puede validarse de forma independiente cargando la vista de exploración, alternando el filtro de venta a "Solo Vendidos" y comprobando que cada inmueble muestra claramente su estado de venta, fecha de cierre, días transcurridos hasta la venta y descuento aplicado respecto al precio de salida.

**Acceptance Scenarios**:

1. **Given** el catálogo de inmuebles cargado en pantalla, **When** el usuario selecciona la opción "Solo Vendidos" en el control de estado de venta, **Then** el sistema muestra únicamente las propiedades cuyo estado es vendido, ocultando las activas, y exhibiendo en cada tarjeta la fecha de venta, los días que tardó en venderse y el descuento final obtenido frente al precio de salida inicial.
2. **Given** la vista de exploración, **When** el usuario selecciona la opción "Activos (Excluir Vendidos)", **Then** el sistema oculta todos los inmuebles vendidos y lista únicamente la oferta actualmente disponible.
3. **Given** el catálogo con opciones de filtro, **When** el usuario selecciona una zona geográfica normalizada en el desplegable de zonas, **Then** el listado se acota instantáneamente a los inmuebles de dicha zona y se actualiza el contador visible de resultados coincidentes.
4. **Given** el listado de propiedades, **When** el usuario especifica un rango de fechas (fecha inicial y fecha final), **Then** el sistema restringe los resultados a aquellas viviendas cuya fecha relevante (incorporación o venta) se encuentre comprendida estrictamente dentro de dicho intervalo.
5. **Given** una tarjeta de propiedad en la lista, **When** el usuario pulsa sobre ella, **Then** se despliega una vista en detalle con la galería de fotografías, características físicas completas y el historial cronológico de variaciones de precio detectadas con sus fechas y porcentajes.

---

### User Story 2 - Auditoría de Intervalos de Tiempo y Dinámica de Mercado (Priority: P2)

Como analista inmobiliario, quiero disponer de una sección especializada con selector de calendario e intervalos temporales predefinidos que me desglose las inclusiones de nuevas viviendas, las exclusiones/ventas cerradas, el número y porcentaje medio de rebajas de precio, las subidas de precio y el tiempo medio que tardaron en venderse las casas en dicho intervalo, incluyendo un desglose por zonas.

**Why this priority**: Proporciona la capacidad analítica diferencial requerida por el usuario: auditar exactamente qué ocurrió en el mercado durante un mes, un trimestre o un rango de fechas personalizado.

**Independent Test**: Puede probarse de forma independiente seleccionando un intervalo de tiempo específico (por ejemplo, un mes concreto) y verificando que los 6 indicadores cuantitativos (inclusiones, ventas, rebajas %, aumentos %, días medios hasta venta y precio medio por m²) y la tabla de desglose por zonas se recalculan de forma coherente y determinista.

**Acceptance Scenarios**:

1. **Given** la sección de auditoría por intervalos, **When** el usuario selecciona un mes o define un intervalo de fechas mediante el calendario interactivo, **Then** el sistema calcula y muestra:
   - El número total de nuevas viviendas incorporadas al catálogo en ese intervalo (inclusiones).
   - El número total de viviendas vendidas o retiradas en ese intervalo (exclusiones/ventas).
   - El número de rebajas de precio registradas, su porcentaje medio de reducción y el importe total en euros ahorrado.
   - El número de incrementos de precio registrados y su porcentaje medio de subida.
   - El tiempo medio en días que tardaron en venderse las propiedades cerradas durante ese intervalo.
   - El precio medio por metro cuadrado (€/m²) en las operaciones de venta cerradas durante ese intervalo.
2. **Given** un intervalo temporal seleccionado, **When** el usuario consulta la tabla de desglose por zonas de dicho intervalo, **Then** visualiza para cada zona con actividad el número de inclusiones, ventas concluidas, días medios hasta la venta, porcentaje medio de rebaja negociado, precio medio final de transacción y precio medio por metro cuadrado (€/m²).

---

### User Story 3 - Análisis Global de Evolución de Precios y Censo de Zonas (Priority: P3)

Como usuario que sigue el mercado, quiero consultar la evolución temporal agregada del precio del metro cuadrado (€/m²) en la ciudad, el volumen mensual comparativo de rebajas frente a ventas concluidas y una tabla completa con el censo de todas las zonas de la ciudad con datos limpios de la base de datos, para entender la tendencia global sin métricas ficticias ni especulaciones.

**Why this priority**: Completa la visión macro del mercado y permite auditar la totalidad del censo de zonas normalizadas, sirviendo de referencia de precios generales.

**Independent Test**: Puede validarse de forma independiente accediendo a la pestaña de evolución de precios, comprobando que la gráfica muestra la curva mensual del precio por metro cuadrado y que la tabla de censo lista todas las zonas normalizadas con sus totales reales de viviendas activas y vendidas.

**Acceptance Scenarios**:

1. **Given** la pestaña de evolución de precios, **When** el usuario visualiza la gráfica temporal, **Then** se representa la evolución mes a mes del precio medio por metro cuadrado (€/m²) y la comparativa mensual de rebajas detectadas frente a ventas concluidas.
2. **Given** la tabla de censo general por zonas, **When** el usuario revisa el listado, **Then** visualiza cada zona geográfica normalizada con su número total de viviendas, recuento de activas, recuento de vendidas, precio medio, ratio €/m², días medios de venta y porcentaje medio de rebaja acumulada.

---

### Edge Cases

- **Inmuebles sin fecha de venta explícita pero con estado vendido:** El sistema debe utilizar la fecha del último rastreo registrado como fecha efectiva de venta y calcular la permanencia a partir de la fecha de primera detección.
- **Intervalos de fechas sin actividad de ventas:** Cuando en un intervalo seleccionado no haya ocurrido ninguna venta, el indicador de tiempo medio de venta debe mostrarse como no aplicable o cero, sin provocar errores de división por cero ni romper la tabla de zonas.
- **Propiedades con datos de superficie o habitaciones no informados:** Las tarjetas y cálculos deben admitir valores nulos de superficie o habitaciones, excluyéndolos de los cálculos de ratios por metro cuadrado sin alterar los promedios del resto de la muestra.
- **Rango de fechas invertido o inválido:** Si el usuario selecciona una fecha inicial posterior a la fecha final en los filtros de calendario, el sistema debe alertar al usuario o autoajustar los extremos para preservar la validez del rango.
- **Búsqueda textual sin coincidencias:** Si una combinación de filtros y búsqueda por texto produce cero resultados, la interfaz debe mostrar un estado vacío claro que indique la causa y ofrezca un botón para restablecer los filtros.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La interfaz de usuario DEBE implementarse como una aplicación cliente completamente nueva desde cero, sin reutilizar código, componentes ni estilos del frontend existente.
- **FR-002**: La interfaz NO DEBE incluir ningún componente de mapa geográfico ni dependencias de cartografía. La superficie de pantalla debe destinarse íntegramente a la visualización de datos, métricas y cuadrícula de inmuebles.
- **FR-003**: El sistema DEBE clasificar y filtrar los inmuebles mediante zonas geográficas normalizadas derivadas de la información descriptiva de los anuncios (título y datos territoriales), resolviendo las inconsistencias de los campos de texto sin procesar y ofreciendo un desplegable de zonas con el recuento exacto de viviendas asociadas a cada una.
- **FR-004**: El explorador de inmuebles DEBE incorporar un control de estado de venta con tres opciones mutuamente excluyentes:
  1. *Solo Vendidos*: Muestra exclusivamente los inmuebles que han sido vendidos o retirados de la oferta.
  2. *Activos (Excluir Vendidos)*: Muestra exclusivamente los inmuebles en oferta vigente.
  3. *Incluir Todos*: Muestra tanto la oferta activa como las ventas registradas.
- **FR-005**: Cuando una propiedad se muestra como vendida, su tarjeta y su ficha de detalle DEBEN exhibir de forma destacada: el distintivo de venta, la fecha en que se registró la venta, el número de días transcurridos en el mercado hasta su venta y el porcentaje y monto de descuento entre el precio de salida inicial y el precio final de venta.
- **FR-006**: El explorador DEBE permitir filtrar inmuebles por rango de fechas mediante selectores interactivos de fecha inicial y fecha final.
- **FR-007**: El sistema DEBE ofrecer un filtro rápido para aislar inmuebles que hayan experimentado rebajas de precio respecto a su valor inicial.
- **FR-008**: El explorador DEBE permitir ordenar el catálogo por: mayor porcentaje de rebaja, mayor permanencia en días, precio ascendente/descendente, ratio €/m² ascendente y fecha de incorporación más reciente.
- **FR-009**: El sistema DEBE proporcionar una sección dedicada a la *Auditoría por Intervalos Temporales* que permita seleccionar periodos mensuales preconfigurados o definir un rango personalizado mediante calendario.
- **FR-010**: Para el intervalo temporal seleccionado en la auditoría, el sistema DEBE calcular y presentar:
  1. Cantidad de nuevas propiedades incorporadas (inclusiones).
  2. Cantidad de propiedades vendidas o retiradas (exclusiones).
  3. Cantidad de rebajas de precio, porcentaje medio de descuento e importe total ahorrado.
  4. Cantidad de subidas de precio y porcentaje medio de incremento.
  5. Tiempo medio en días transcurrido hasta la venta para las viviendas cerradas en ese periodo.
- **FR-011**: La sección de auditoría por intervalos DEBE incluir una tabla de desglose territorial que detalle, para cada zona geográfica con transacciones en el periodo: nuevas inclusiones, ventas cerradas, tiempo medio hasta la venta, porcentaje medio de rebaja negociado y precio medio final de transacción.
- **FR-012**: El sistema DEBE proporcionar una sección de *Evolución de Precios & Mercado* que presente la serie temporal del precio medio por metro cuadrado (€/m²) a lo largo de los meses rastreados y la relación mensual entre rebajas detectadas y ventas concluidas.
- **FR-013**: La interfaz DEBE omitir cualquier estimación artificial o indicador especulativo no respaldado por transacciones directas, tales como perfiles subjetivos de inversor o rentabilidades brutas estimadas de alquiler.
- **FR-014**: Al interactuar con cualquier inmueble, el sistema DEBE abrir una vista modal detallada que presente las fotografías del inmueble, características completas, enlace al anuncio de origen y la cronología completa de modificaciones de precio detectadas con fecha, importe previo, importe nuevo y variación porcentual.
- **FR-015**: La interfaz DEBE ofrecer un conmutador de tema visual (modo oscuro y modo claro) con persistencia de la preferencia del usuario en el navegador.

---

### Key Entities *(include if feature involves data)*

- **Inmueble (Property)**: Representa una unidad inmobiliaria rastreada. Atributos clave: identificador único de anuncio, título limpio, dirección normalizada, zona geográfica asignada, tipología (piso, ático, chalet, dúplex), precio inicial de salida, precio actual/final, porcentaje de descuento acumulado, superficie útil/construida en m², habitaciones, planta, disponibilidad de ascensor, estado (activo, vendido, missing), fecha de primera detección (`first_seen_at`), fecha de último rastreo (`last_seen_at`), fecha de venta (`sold_at`), días de permanencia en mercado (`days_to_sell` o `days_on_market`), fotografías y enlace de origen.
- **Zona Geográfica (Zone)**: Representa un barrio o distrito normalizado de la ciudad. Atributos: nombre normalizado, recuento total de inmuebles históricos, recuento de inmuebles activos, recuento de inmuebles vendidos, precio medio de catálogo, precio medio por metro cuadrado (€/m²), tiempo medio en días hasta la venta y descuento medio acumulado en transacciones cerradas.
- **Evento de Cambio de Precio (PriceChangeEvent)**: Representa una modificación detectada en el precio publicado de un inmueble. Atributos: identificador de inmueble, fecha del cambio, precio anterior, precio posterior, tipo de evento (salida inicial, rebaja, incremento) y porcentaje relativo de variación.
- **Auditoría de Intervalo (IntervalAudit)**: Representa el balance estadístico consolidado de un periodo de fechas delimitado. Atributos: fecha inicial, fecha final, total de inclusiones, total de ventas/exclusiones, total y promedio de rebajas de precio, total y promedio de incrementos de precio, tiempo medio de venta en días y desglose tabular por zonas para dicho periodo.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los usuarios pueden alternar entre la vista de inmuebles activos y la vista exclusiva de inmuebles vendidos en un solo clic, actualizándose la lista en menos de 300 milisegundos.
- **SC-002**: El 100% de las viviendas vendidas listadas muestran de forma explícita su fecha de venta, el número de días transcurridos hasta su venta y el descuento porcentual y monetario aplicado respecto a su precio inicial de salida.
- **SC-003**: El desplegable de zonas normalizadas cubre la totalidad del catálogo existente (2.190 inmuebles en el censo actual) sin mostrar campos corruptos ni fragmentos de texto ilegibles.
- **SC-004**: Al seleccionar cualquier mes o intervalo en el calendario de auditoría, las 5 métricas agregadas y la tabla de desglose territorial se recalculan y presentan al usuario en menos de 500 milisegundos.
- **SC-005**: La totalidad de la interfaz de usuario se renderiza en una cuadrícula a pantalla completa sin dependencia de ningún mapa ni bibliotecas de teselas cartográficas.
- **SC-006**: La aplicación de un filtro combinado (zona + rango de fechas + estado vendido) reduce y presenta los resultados con exactitud matemática verificable frente a los registros del almacén de datos.
- **SC-007**: El nuevo cliente frontend funciona como una base de código autónoma e independiente, sin importar ni ejecutar ningún archivo de la aplicación frontend previa.

---

## Assumptions

- **A-001**: El nuevo frontend se construirá como una aplicación web autónoma que consumirá los datos del backend existente (o servicios de datos estructurados correspondientes), sin reutilizar ningún componente o página del directorio `frontend/` anterior.
- **A-002**: La normalización de zonas geográficas toma como fuente de verdad la información geográfica consolidada en el título y atributos descriptivos de las propiedades, resolviendo el problema de captura del campo de localización original.
- **A-003**: Cuando un inmueble pase a estado vendido (`sold`), la fecha de venta registrada y la fecha de primera detección permiten computar de forma exacta y determinista los días de permanencia en mercado (`days_to_sell = sold_at - first_seen_at`).
- **A-004**: Los datos históricos existentes abarcan transacciones y rastreos desde Mayo 2026 hasta Octubre 2026, sirviendo de base representativa para las pruebas de intervalos mensuales y cálculos de tendencia del €/m².
- **A-005**: Las métricas de inversión especulativa (tales como rentabilidad bruta de alquiler estimada o perfiles cualitativos de inversor) quedan explícitamente fuera del alcance de este desarrollo a favor de métricas empíricas de mercado.
