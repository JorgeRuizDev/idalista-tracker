# Research: Gmail Property Crawler

**Feature**: Gmail Property Crawler  
**Generated**: 2026-05-10  
**Status**: Complete - Based on REAL email analysis

## Email Format Analysis (From Real Emails)

After analyzing actual emails from Gmail IMAP, the format is:

### Email Structure

Idealista emails are **HTML format** (not plain text). When converted to text:

**Single New Property Alert:**
```
Alertas
96
Piso en Calle Procurador, San Pedro de la Fuente, Burgos
96.554 €
74 m² 2 hab. 1ª planta
Contactar
Ver todos los anuncios de Burgos
```

**Price Drop Alert:**
```
Alertas
96
Piso en Calle Federico Martínez Varea, 15, Los Vadillos, Burgos
El precio de este anuncio ha bajado de 184.900€ a 178.900€
184.900€ ↓3%
178.900 €
52 m² 1 hab. 8ª planta
```

**Daily Summary (Resumen diario):**
```
Resumen diario de nuevos anuncios
Te enviamos 8 novedades de tus búsquedas guardadas
Hola, Jorge,

Piso en Briviesca
98.000 €
80 m² 3 hab. 1ª planta

Casa en Villalbilla de Burgos
175.000 €
120 m² 3 hab. Planta baja
```

### Key Findings

1. **HTML Format**: All emails are HTML with inline CSS
2. **Property Images**: Available at `img4.idealista.com` CDN
3. **URLs**: Property links have UTM tracking parameters
4. **Spanish Encoding**: Uses UTF-8 with HTML entities for special chars
5. **Price Format**: Uses dots as thousand separators (Spanish format)
6. **Price Drop Indicator**: Uses `↓` (unicode down arrow) + percentage

### Image URL Pattern

Property images are stored at:
```
https://img4.idealista.com/blur/500_375_mq/0/id.pro.es.image.master/{hash}.jpg
```

Example:
```
https://img4.idealista.com/blur/500_375_mq/0/id.pro.es.image.master/a0/c5/cb/1370602033.jpg
```

### Property URL Pattern

```
https://www.idealista.com/inmueble/{ID}/?utm_medium=email&utm_campaign=...
```

The numeric ID is extracted from the path.

## Decisions Made

### 1. Email Parsing Strategy

**Decision**: Parse HTML-converted text with metadata extraction

**Rationale**: 
- HTML emails are the reality
- Extract URLs and images from HTML before converting to text
- Append metadata sections (`[URLS_FOUND]`, `[IMAGES_FOUND]`) to body
- Use regex patterns on the text representation

**Implementation**:
- IMAP client extracts property URLs from `<a href>` tags
- IMAP client extracts image URLs from `<img src>` tags with idealista CDN pattern
- Parser reads metadata sections to match URLs/images with properties

### 2. Price Parsing

**Decision**: Handle Spanish number format (dots as thousand separators)

**Pattern**: `96.554 €`, `184.900€ ↓3%`, `1.250.000 €`

**Price Drop Format**: `OLD_PRICE€ ↓X%` on one line, then `NEW_PRICE €` on next line

### 3. Database Schema

**Added field**: `image_url` (string, nullable) to Property model

**Rationale**: Store property images for future dashboard display

### 4. Property Type Detection

**Types supported**: Piso, Casa, Ático, Dúplex, Estudio, Loft, Chalet, Adosado, Finca, Rústico

**Detection**: Check if title starts with property type (case-insensitive)

### 5. Location Extraction

**Pattern**: Everything after " en " (in) in the title

Example: `Piso en Calle Mayor, Centro, Madrid` → `Calle Mayor, Centro, Madrid`

### 6. Elevator Detection

**Logic**:
- `con ascensor` → True
- `sin ascensor` → False
- `exterior` (without interior) → False (street access)
- `interior` (without exterior) → False (inner courtyard)
- `ático`, `planta baja`, `bajo`, `sótano` → None (not applicable)

## Email Types Detected

1. **Welcome Email** (`Bienvenido a idealista`): No properties
2. **New Property Alert** (`¡Nuevo piso en tu búsqueda!`): Single property
3. **Price Drop Alert** (`¡Bajada de precio en tu búsqueda!`): Single property with price history
4. **Daily Summary** (`Resumen diario de nuevos anuncios`): Multiple properties

## Test Results

From 8 real emails:
- Welcome: 0 properties
- Single alerts: 1 property each (4 emails)
- Price drop: 1 property with 3% drop (1 email)
- Daily summaries: 10 + 7 = 17 properties (2 emails)
- **Total: 22 properties parsed**

All properties successfully extracted with:
- Title, type, location
- Current price, original price (for drops)
- Size, bedrooms, floor
- Elevator status (when detectable)
- Property URL (from metadata)

## Open Questions (Resolved)

All critical decisions have been resolved based on real email analysis.
