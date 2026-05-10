"""Unit tests for email parser using real email samples."""
import pytest

from src.crawler.parser import EmailParser, ParsedProperty


@pytest.fixture
def parser():
    """Create an EmailParser instance."""
    return EmailParser()


class TestSinglePropertyParsing:
    """Test parsing single property emails."""

    def test_parse_new_property_no_price_drop(self, parser):
        """Test parsing a new property email without price drop."""
        body = """Alertas
96
Piso en Calle Procurador, San Pedro de la Fuente, Burgos
96.554 €
74 m² 2 hab. 1ª planta
Ver 3 fotos

[URLS_FOUND]
https://www.idealista.com/inmueble/107255773/

[IMAGES_FOUND]
https://img4.idealista.com/blur/500_375_mq/0/id.pro.es.image.master/a0/c5/cb/1370602033.jpg"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="New property",
            body=body,
        )

        assert len(properties) == 1
        prop = properties[0]

        assert prop.idealista_id == "107255773"
        assert prop.title == "Piso en Calle Procurador, San Pedro de la Fuente, Burgos"
        assert prop.property_type == "Piso"
        assert prop.location == "Calle Procurador, San Pedro de la Fuente, Burgos"
        assert prop.current_price == 96554
        assert prop.original_price == 96554
        assert prop.price_drop_percentage is None
        assert prop.size_m2 == 74
        assert prop.bedrooms == 2
        assert prop.floor == "1ª planta"
        assert prop.property_url == "https://www.idealista.com/inmueble/107255773/"
        assert prop.image_url == "https://img4.idealista.com/blur/500_375_mq/0/id.pro.es.image.master/a0/c5/cb/1370602033.jpg"

    def test_parse_price_drop_property(self, parser):
        """Test parsing a property with price drop."""
        body = """Alertas
96
Piso en Calle Federico Martínez Varea, 15, Los Vadillos, Burgos
El precio de este anuncio ha bajado de 184.900€ a 178.900€
184.900€ ↓3%
178.900 €
52 m² 1 hab. 8ª planta

[URLS_FOUND]
https://www.idealista.com/inmueble/107255780/

[IMAGES_FOUND]
https://img4.idealista.com/blur/500_375_mq/0/id.pro.es.image.master/b1/d6/e2/1370602044.jpg"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="Price drop",
            body=body,
        )

        assert len(properties) == 1
        prop = properties[0]

        assert prop.idealista_id == "107255780"
        assert prop.current_price == 178900
        assert prop.original_price == 184900
        assert prop.price_drop_percentage == 3.0
        assert prop.size_m2 == 52
        assert prop.bedrooms == 1
        assert prop.floor == "8ª planta"
        assert prop.image_url is not None

    def test_parse_large_price_drop(self, parser):
        """Test parsing a property with large price drop (16%)."""
        body = """Alertas
Piso en Avenida de Palencia, Gamonal, Burgos
250.000€ ↓16%
210.000 €
110 m² 4 hab. 5ª planta con ascensor

[URLS_FOUND]
https://www.idealista.com/inmueble/109446280/"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="Big price drop",
            body=body,
        )

        assert len(properties) == 1
        prop = properties[0]

        assert prop.current_price == 210000
        assert prop.original_price == 250000
        assert prop.price_drop_percentage == 16.0
        assert prop.size_m2 == 110
        assert prop.bedrooms == 4
        assert prop.has_elevator is True


class TestDifferentPropertyTypes:
    """Test parsing different property types."""

    def test_parse_atico(self, parser):
        """Test parsing an ático (penthouse)."""
        body = """Alertas
96
Ático en Plaza Nueva de Gamonal, Gamonal - San Bruno - G9, Burgos
155.000 €
111 m² 4 hab. 8ª planta

[URLS_FOUND]
https://www.idealista.com/inmueble/111420317/"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="New ático",
            body=body,
        )

        assert len(properties) == 1
        prop = properties[0]

        assert prop.property_type == "Ático"
        assert prop.floor == "8ª planta"
        assert prop.has_elevator is None  # Ático doesn't need elevator info

    def test_parse_chalet_adosado(self, parser):
        """Test parsing a chalet adosado (townhouse)."""
        body = """Alertas
96
Chalet adosado en Paseo de los Pisones, 100, San Agustín-Parque Europa, Burgos
280.500 €
200 m² 4 hab.

[URLS_FOUND]
https://www.idealista.com/inmueble/111420318/"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="New townhouse",
            body=body,
        )

        assert len(properties) == 1
        prop = properties[0]

        assert prop.property_type == "Chalet"
        assert prop.current_price == 280500
        assert prop.size_m2 == 200
        assert prop.bedrooms == 4

    def test_parse_estudio(self, parser):
        """Test parsing an estudio (studio apartment)."""
        body = """Alertas
96
Estudio en Plaza de España, Burgos
85.000 €
35 m² 1 hab. 2ª planta interior

[URLS_FOUND]
https://www.idealista.com/inmueble/111420321/"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="New studio",
            body=body,
        )

        assert len(properties) == 1
        prop = properties[0]

        assert prop.property_type == "Estudio"
        assert prop.size_m2 == 35
        assert prop.bedrooms == 1
        assert prop.floor == "2ª planta"
        assert prop.has_elevator is False  # Interior indicated


class TestMultipleProperties:
    """Test parsing emails with multiple properties."""

    def test_parse_daily_summary_multiple_properties(self, parser):
        """Test parsing daily summary with multiple properties."""
        body = """Resumen diario de nuevos anuncios
Te enviamos 8 novedades de tus búsquedas guardadas
Hola, Jorge,

Piso en Briviesca, Provincia de Burgos
98.000 €
80 m² 3 hab. 1ª planta

Casa en Villalbilla de Burgos, Provincia de Burgos
175.000 €
120 m² 3 hab. Planta baja

Estudio en Plaza de España, Burgos
85.000 €
35 m² 1 hab. 2ª planta interior

[URLS_FOUND]
https://www.idealista.com/inmueble/111420319/
https://www.idealista.com/inmueble/111420320/
https://www.idealista.com/inmueble/111420321/

[IMAGES_FOUND]
https://img4.idealista.com/blur/500_375_mq/0/id.pro.es.image.master/e4/g9/h5/1370602077.jpg
https://img4.idealista.com/blur/500_375_mq/0/id.pro.es.image.master/f5/h0/i6/1370602088.jpg
https://img4.idealista.com/blur/500_375_mq/0/id.pro.es.image.master/g6/i1/j7/1370602099.jpg"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="Daily summary",
            body=body,
        )

        assert len(properties) == 3

        # First property
        assert properties[0].property_type == "Piso"
        assert properties[0].current_price == 98000
        assert properties[0].image_url is not None

        # Second property
        assert properties[1].property_type == "Casa"
        assert properties[1].current_price == 175000
        assert properties[1].floor == "Planta baja"

        # Third property
        assert properties[2].property_type == "Estudio"
        assert properties[2].current_price == 85000


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_wrong_sender_filtered(self, parser):
        """Test that emails from wrong sender are filtered out."""
        body = """Piso en Calle Mayor, Madrid
200.000 €
200.000 € 80 m² 2 hab. 2ª planta

[URLS_FOUND]
https://www.idealista.com/inmueble/12345678/"""

        properties = parser.parse_email(
            sender="spammer@example.com",
            subject="Spam",
            body=body,
        )

        assert len(properties) == 0

    def test_no_properties_in_email(self, parser):
        """Test handling of email with no property data."""
        body = """Hola, Jorge,

Gracias por usar idealista. Visita nuestra web para más información."""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="Welcome",
            body=body,
        )

        assert len(properties) == 0

    def test_html_entities_decoded(self, parser):
        """Test that HTML entities are properly decoded."""
        body = """Piso en Calle Mayor, Madrid
150.000 &euro;
150.000 &euro; 75 m&sup2; 2 hab. 3&ordf; planta

[URLS_FOUND]
https://www.idealista.com/inmueble/12345678/"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="Property with HTML entities",
            body=body,
        )

        assert len(properties) == 1
        assert properties[0].current_price == 150000
        assert properties[0].size_m2 == 75


class TestElevatorDetection:
    """Test elevator status detection."""

    def test_con_ascensor(self, parser):
        """Test 'con ascensor' (with elevator) detection."""
        body = """Alertas
Piso en Calle Mayor, Madrid
200.000 €
200.000 € 90 m² 3 hab. 4ª planta con ascensor

[URLS_FOUND]
https://www.idealista.com/inmueble/12345678/"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="With elevator",
            body=body,
        )

        assert properties[0].has_elevator is True

    def test_sin_ascensor(self, parser):
        """Test 'sin ascensor' (without elevator) detection."""
        body = """Alertas
Piso en Calle Mayor, Madrid
150.000 €
150.000 € 60 m² 2 hab. 2ª planta sin ascensor

[URLS_FOUND]
https://www.idealista.com/inmueble/12345678/"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="Without elevator",
            body=body,
        )

        assert properties[0].has_elevator is False

    def test_exterior_implies_no_elevator(self, parser):
        """Test that 'exterior' implies no elevator needed."""
        body = """Alertas
Piso en Calle Mayor, Madrid
180.000 €
180.000 € 70 m² 2 hab. 1ª planta exterior

[URLS_FOUND]
https://www.idealista.com/inmueble/12345678/"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="Exterior",
            body=body,
        )

        assert properties[0].has_elevator is False

    def test_atico_no_elevator_info(self, parser):
        """Test that ático returns None for elevator."""
        body = """Alertas
Ático en Calle Mayor, Madrid
300.000 €
300.000 € 100 m² 2 hab. Ático

[URLS_FOUND]
https://www.idealista.com/inmueble/12345678/"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="Ático",
            body=body,
        )

        assert properties[0].has_elevator is None


class TestImageUrlExtraction:
    """Test image URL extraction."""

    def test_single_image_extracted(self, parser):
        """Test that single image URL is extracted."""
        body = """Alertas
Piso en Calle Mayor, Madrid
200.000 €
200.000 € 80 m² 2 hab. 2ª planta

[URLS_FOUND]
https://www.idealista.com/inmueble/12345678/

[IMAGES_FOUND]
https://img4.idealista.com/blur/500_375_mq/0/id.pro.es.image.master/xx/yy/zz/1234567890.jpg"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="Property with image",
            body=body,
        )

        assert len(properties) == 1
        assert properties[0].image_url is not None
        assert "idealista.com" in properties[0].image_url
        assert ".jpg" in properties[0].image_url

    def test_no_image_provided(self, parser):
        """Test parsing when no image URL is provided."""
        body = """Alertas
Piso en Calle Mayor, Madrid
200.000 €
200.000 € 80 m² 2 hab. 2ª planta

[URLS_FOUND]
https://www.idealista.com/inmueble/12345678/"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="Property without image",
            body=body,
        )

        assert len(properties) == 1
        assert properties[0].image_url is None

    def test_multiple_images_first_used(self, parser):
        """Test that when multiple images exist, the first is used."""
        body = """Alertas
Piso en Calle Mayor, Madrid
200.000 €
200.000 € 80 m² 2 hab. 2ª planta

[URLS_FOUND]
https://www.idealista.com/inmueble/12345678/

[IMAGES_FOUND]
https://img4.idealista.com/first.jpg
https://img4.idealista.com/second.jpg
https://img4.idealista.com/third.jpg"""

        properties = parser.parse_email(
            sender="noresponder@idealista.com",
            subject="Property with multiple images",
            body=body,
        )

        assert len(properties) == 1
        assert properties[0].image_url == "https://img4.idealista.com/first.jpg"
