"""Unit tests for Idealista detail page HTML and JSON-LD parsing."""

import json
import pytest

from src.crawler.detail_parser import DetailParser

SAMPLE_IDEALISTA_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Piso en venta en calle Goya, Salamanca, Madrid — idealista</title>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Apartment",
        "name": "Piso reformado en Goya",
        "description": "Espectacular piso reformado en pleno barrio de Salamanca con tres dormitorios.",
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": 40.4241,
            "longitude": -3.6765
        },
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Madrid",
            "addressRegion": "Madrid"
        }
    }
    </script>
</head>
<body>
    <div class="main-info__title-minor">Barrio Goya, Distrito Salamanca, Madrid</div>
    <div class="comment">
        <p>Espectacular piso reformado en pleno barrio de Salamanca con tres dormitorios y dos baños completos.</p>
        <p>Dispone de cocina equipada y terraza exterior.</p>
    </div>
    <div class="details-property_features">
        <ul>
            <li>125 m² construidos</li>
            <li>3 habitaciones</li>
            <li>2 baños</li>
            <li>Terraza</li>
            <li>Segunda mano/buen estado</li>
            <li>Calefacción individual: Gas natural</li>
            <li>Planta 3ª exterior con ascensor</li>
            <li>Aire acondicionado</li>
        </ul>
    </div>
    <div class="gallery-fallback">
        <img src="https://img3.idealista.com/blur/WEB_DETAIL_TOP-L-L/0/id/104829104/1.jpg" alt="Salón principal">
        <img src="https://img3.idealista.com/blur/WEB_DETAIL_TOP-L-L/0/id/104829104/2.jpg" alt="Cocina equipada">
        <img src="https://img3.idealista.com/blur/WEB_DETAIL_TOP-L-L/0/id/104829104/3.jpg" alt="Dormitorio principal">
    </div>
</body>
</html>
"""

DELISTED_HTML = """
<!DOCTYPE html>
<html>
<head><title>Inmueble no disponible — idealista</title></head>
<body>
    <div class="message-container">
        <h1>El anuncio ya no está publicado</h1>
        <p>Este inmueble ha sido dado de baja o vendido.</p>
    </div>
</body>
</html>
"""


def test_parse_listing_details_extracts_attributes():
    """Test extracting description, location, features, and photos from HTML."""
    parser = DetailParser()
    result = parser.parse_html(SAMPLE_IDEALISTA_HTML)

    assert result["is_delisted"] is False
    assert "Espectacular piso reformado" in result["full_description"]
    assert result["city"] == "Madrid"
    assert result["province"] == "Madrid"
    assert result["neighborhood"] == "Goya" or "Goya" in (result["neighborhood"] or "")
    assert result["district"] == "Salamanca" or "Salamanca" in (result["district"] or "")
    assert result["latitude"] == pytest.approx(40.4241)
    assert result["longitude"] == pytest.approx(-3.6765)

    # Features
    features = result["features"]
    assert features is not None
    assert isinstance(features, dict)
    assert (
        features.get("rooms") == 3
        or features.get("bedrooms") == 3
        or "3 habitaciones" in str(features)
    )
    assert features.get("air_conditioning") is True or "aire acondicionado" in str(features).lower()

    # Photos
    photos = result["photos"]
    assert len(photos) == 3
    assert photos[0]["sequence_index"] == 0
    assert "https://img3.idealista.com" in photos[0]["original_url"]
    assert photos[0]["caption"] == "Salón principal"


def test_parse_delisted_detection():
    """Test detecting delisted or removed listings."""
    parser = DetailParser()
    result = parser.parse_html(DELISTED_HTML)

    assert result["is_delisted"] is True


def test_parse_full_screen_gallery_pics():
    """Test extracting 22+ high-res pictures from inline fullScreenGalleryPics script."""
    pics_json = ",\n".join(
        f'{{ url: "https://img3.idealista.com/blur/WEB_DETAIL_TOP-L-L/0/id/112893957/{i}.jpg", tag: "Foto {i}" }}'
        for i in range(1, 25)
    )
    html = f"""
    <html>
    <body>
        <div class="main-info__title-main">Piso en venta</div>
        <script>
            var fullScreenGalleryPics = [
                {pics_json}
            ];
        </script>
        <img src="https://st3.idealista.com/static/common/img/icons/logo.svg" />
        <img src="https://st3.idealista.com/static/common/img/flags/es.svg" />
    </body>
    </html>
    """
    parser = DetailParser()
    result = parser.parse_html(html)
    photos = result["photos"]
    assert len(photos) == 24
    assert photos[0]["original_url"] == "https://img3.idealista.com/blur/WEB_DETAIL_TOP-L-L/0/id/112893957/1.jpg"
    assert photos[0]["caption"] == "Foto 1"
    assert photos[23]["original_url"] == "https://img3.idealista.com/blur/WEB_DETAIL_TOP-L-L/0/id/112893957/24.jpg"
    assert photos[23]["caption"] == "Foto 24"
    # Ensure no SVGs or flags were extracted
    assert all(".svg" not in p["original_url"] for p in photos)


def test_parse_ad_multimedias_info():
    """Test extracting gallery pictures from inline adMultimediasInfo script."""
    html = """
    <html>
    <body>
        <div class="main-info__title-main">Piso en venta</div>
        <script>
            var adMultimediasInfo = {
                multimedias: [
                    { url: "https://img4.idealista.com/blur/WEB_DETAIL/0/id.pro.es.image.master/1/2/3/10001.webp", tag: "Fachada" },
                    { url: "https://img4.idealista.com/blur/WEB_DETAIL-XL/0/id.pro.es.image.master/1/2/3/10001.jpg", tag: "Fachada" },
                    { url: "https://img4.idealista.com/blur/WEB_DETAIL/0/id.pro.es.image.master/1/2/3/10002.jpg", tag: "Salón" },
                    { url: "https://img4.idealista.com/blur/WEB_DETAIL/0/id.pro.es.image.master/1/2/3/10003.jpg", tag: "Cocina" }
                ]
            };
        </script>
    </body>
    </html>
    """
    parser = DetailParser()
    result = parser.parse_html(html)
    photos = result["photos"]
    # 10001 was present as .webp and .jpg; deduplication must keep only the .jpg version
    assert len(photos) == 3
    assert photos[0]["original_url"] == "https://img4.idealista.com/blur/WEB_DETAIL-XL/0/id.pro.es.image.master/1/2/3/10001.jpg"
    assert photos[0]["caption"] == "Fachada"
    assert photos[1]["original_url"] == "https://img4.idealista.com/blur/WEB_DETAIL/0/id.pro.es.image.master/1/2/3/10002.jpg"
    assert photos[2]["original_url"] == "https://img4.idealista.com/blur/WEB_DETAIL/0/id.pro.es.image.master/1/2/3/10003.jpg"


