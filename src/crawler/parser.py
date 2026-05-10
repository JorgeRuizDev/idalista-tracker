"""Email content parser for extracting property data from idealista HTML emails."""
import html
import logging
import re
from dataclasses import dataclass
from typing import List, Optional

from src.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ParsedProperty:
    """Data class for a parsed property from an email."""

    idealista_id: str
    title: str
    property_type: Optional[str]
    location: str
    original_price: Optional[int]
    current_price: int
    price_drop_percentage: Optional[float]
    size_m2: Optional[int]
    bedrooms: Optional[int]
    floor: Optional[str]
    has_elevator: Optional[bool]
    property_url: str
    image_url: Optional[str]


class EmailParser:
    """
    Parser for extracting property data from idealista HTML emails.

    Real email format (HTML converted to text):
    - Single property alert: Contains one property with title, prices, details
    - Price drop alert: Shows original price, drop %, and new price on separate lines
    - Daily summary: Contains multiple properties

    Example patterns found in real emails:

    NEW PROPERTY (no price drop):
    Piso en Calle Procurador, San Pedro de la Fuente, Burgos
    96.554 €
    74 m² 2 hab. 1ª planta

    PRICE DROP:
    Piso en Calle Federico Martínez Varea, 15, Los Vadillos, Burgos
    184.900€ ↓3%
    178.900 €
    52 m² 1 hab. 8ª planta
    """

    # URL pattern - extracts the numeric ID from idealista URLs
    URL_PATTERN = re.compile(r"https://www\.idealista\.com/inmueble/(\d+)/?")

    # Price pattern with thousand separator (dot in Spanish format)
    # Matches: 96.554, 178.900, 1.200.000
    PRICE_PATTERN = re.compile(r"(\d{1,3}(?:\.\d{3})+)(?:\s*€)?")

    # Price drop pattern - extracts percentage after down arrow
    # Matches: ↓3%, ↓15%, ↓ 5%
    PRICE_DROP_PATTERN = re.compile(r"[↓\\]\s*(\d+(?:\.\d+)?)\s*%")

    # Size pattern - square meters
    SIZE_PATTERN = re.compile(r"(\d+)\s*m²")

    # Bedrooms pattern - habitaciones
    BEDROOMS_PATTERN = re.compile(r"(\d+)\s*hab\.")

    # Floor pattern - handles: "1ª planta", "8ª planta", "planta baja", "ático"
    FLOOR_PATTERN = re.compile(
        r"(\d+[ªºa]\s*planta|planta\s*baja|sótano|ático|entresuelo|bajo)",
        re.IGNORECASE,
    )

    # Property types commonly found in Spain
    PROPERTY_TYPES = [
        "Piso",
        "Casa",
        "Ático",
        "Dúplex",
        "Estudio",
        "Loft",
        "Chalet",
        "Adosado",
        "Finca",
        "Rústico",
    ]

    def __init__(self) -> None:
        """Initialize the parser."""
        self.sender_filter = settings.GMAIL_SENDER_FILTER

    def parse_email(
        self, sender: str, subject: str, body: str
    ) -> List[ParsedProperty]:
        """
        Parse an email and extract property data.

        Args:
            sender: Email sender address.
            subject: Email subject line.
            body: Email body content (HTML converted to text).

        Returns:
            List of ParsedProperty objects extracted from the email.
        """
        # Validate sender
        if sender != self.sender_filter:
            logger.debug(f"Skipping email from non-idealista sender: {sender}")
            return []

        # Extract URLs and images from metadata section
        urls, images = self._extract_metadata(body)

        # Get main body content (before metadata)
        main_body = body
        if "[URLS_FOUND]" in body:
            main_body = body.split("[URLS_FOUND]")[0]

        # Decode HTML entities
        main_body = html.unescape(main_body)

        properties = []
        lines = main_body.split("\n")

        i = 0
        while i < len(lines):
            line = self._clean_line(lines[i])

            # Skip empty lines
            if not line:
                i += 1
                continue

            # Look for property title line (contains " en " and starts with property type)
            if self._is_property_title(line):
                # Try to parse a property block starting here
                property_data, lines_consumed = self._parse_property_block(
                    lines, i, urls, images
                )
                if property_data:
                    prop = self._create_property(property_data)
                    if prop:
                        properties.append(prop)
                        i += lines_consumed
                        continue

            i += 1

        logger.info(f"Extracted {len(properties)} properties from email")
        return properties

    def _extract_metadata(self, body: str) -> tuple[List[str], List[str]]:
        """Extract URLs and images from metadata section at end of body."""
        urls = []
        images = []

        if "[URLS_FOUND]" in body:
            parts = body.split("[URLS_FOUND]")
            metadata = parts[1] if len(parts) > 1 else ""

            # Split metadata further if [IMAGES_FOUND] exists
            if "[IMAGES_FOUND]" in metadata:
                url_section, img_section = metadata.split("[IMAGES_FOUND]", 1)
                urls = [u.strip() for u in url_section.strip().split("\n") if u.strip()]
                images = [i.strip() for i in img_section.strip().split("\n") if i.strip()]
            else:
                urls = [u.strip() for u in metadata.strip().split("\n") if u.strip()]

        return urls, images

    def _clean_line(self, line: str) -> str:
        """Clean up a line by decoding HTML entities and stripping whitespace."""
        if not line:
            return ""
        line = html.unescape(line)
        line = line.strip()
        return line

    def _is_property_title(self, line: str) -> bool:
        """
        Check if a line looks like a property title.

        Property titles typically:
        - Start with a property type (Piso, Casa, Ático, etc.)
        - Contain " en " (in)
        - Are not too short
        """
        line_lower = line.lower()

        # Must contain " en "
        if " en " not in line:
            return False

        # Must be long enough to be a real title
        if len(line) < 20:
            return False

        # Must start with a known property type
        for prop_type in self.PROPERTY_TYPES:
            if line.startswith(prop_type) or line_lower.startswith(prop_type.lower()):
                return True

        return False

    def _parse_property_block(
        self, lines: List[str], start_idx: int, urls: List[str], images: List[str]
    ) -> tuple[Optional[dict], int]:
        """
        Try to parse a property block starting at the given index.

        REAL EMAIL STRUCTURE found in actual emails:

        Type A - New Property (3 lines):
        "Piso en Calle Procurador, San Pedro de la Fuente, Burgos"
        "96.554 €"
        "74 m² 2 hab. 1ª planta"

        Type B - Price Drop (4 lines):
        "Piso en Calle Federico Martínez Varea, 15, Los Vadillos, Burgos"
        "184.900€ ↓3%"
        "178.900 €"
        "52 m² 1 hab. 8ª planta"

        Args:
            lines: List of all lines in the email.
            start_idx: Index where the property title is.
            urls: List of URLs extracted from email.
            images: List of image URLs extracted from email.

        Returns:
            Tuple of (property data dict or None, number of lines consumed).
        """
        if start_idx >= len(lines):
            return None, 0

        title_line = self._clean_line(lines[start_idx])

        # Look ahead for price and details lines
        # We need at least a price line and a details line
        lines_to_check = min(10, len(lines) - start_idx - 1)

        price_line_idx = None
        details_line_idx = None
        is_price_drop = False
        old_price = None
        price_drop_pct = None

        for offset in range(1, lines_to_check + 1):
            candidate = self._clean_line(lines[start_idx + offset])

            if not candidate:
                continue

            # Skip non-data lines
            if self._should_skip_line(candidate):
                continue

            # Check if this is a price line (with or without drop indicator)
            if price_line_idx is None:
                # Check for price drop indicator
                drop_match = self.PRICE_DROP_PATTERN.search(candidate)
                if drop_match:
                    is_price_drop = True
                    price_drop_pct = float(drop_match.group(1))
                    # Extract old price from this line (before the drop indicator)
                    prices = self._extract_all_prices(candidate)
                    if prices:
                        old_price = prices[0]
                    price_line_idx = start_idx + offset
                    continue

                # Check for simple price line
                prices = self._extract_all_prices(candidate)
                if prices and not self.SIZE_PATTERN.search(candidate):
                    # This looks like a price line (has price but no size)
                    price_line_idx = start_idx + offset
                    continue

            # Check if this is a details line (has size and bedrooms)
            if details_line_idx is None:
                if self.SIZE_PATTERN.search(candidate) and self.BEDROOMS_PATTERN.search(candidate):
                    details_line_idx = start_idx + offset
                    break

        # Validate we found the required lines
        if price_line_idx is None or details_line_idx is None:
            return None, 0

        # Parse the data
        property_type = self._extract_property_type(title_line)
        location = self._extract_location(title_line)

        # Get current price from price line or next line (for price drops)
        if is_price_drop and price_line_idx:
            # For price drops, current price is on the next line after drop line
            if price_line_idx + 1 < len(lines):
                current_price_line = self._clean_line(lines[price_line_idx + 1])
                current_prices = self._extract_all_prices(current_price_line)
                if current_prices:
                    current_price = current_prices[0]
                else:
                    return None, 0
            else:
                return None, 0
        else:
            prices = self._extract_all_prices(self._clean_line(lines[price_line_idx]))
            if prices:
                current_price = prices[0]
                if old_price is None:
                    old_price = current_price
            else:
                return None, 0

        # Parse details line
        details_line = self._clean_line(lines[details_line_idx])
        size_match = self.SIZE_PATTERN.search(details_line)
        size_m2 = int(size_match.group(1)) if size_match else None

        bedrooms_match = self.BEDROOMS_PATTERN.search(details_line)
        bedrooms = int(bedrooms_match.group(1)) if bedrooms_match else None

        floor_match = self.FLOOR_PATTERN.search(details_line)
        floor = floor_match.group(1) if floor_match else None

        has_elevator = self._extract_elevator_status(details_line)

        # Match URL and image to this property
        # Simple heuristic: assign first available URL/image
        property_url = urls[0] if urls else None
        image_url = images[0] if images else None

        # Extract idealista_id from URL
        idealista_id = None
        if property_url:
            match = self.URL_PATTERN.search(property_url)
            if match:
                idealista_id = match.group(1)

        if not idealista_id:
            # Generate fallback ID
            idealista_id = self._generate_fallback_id(title_line)

        if not property_url:
            property_url = f"https://www.idealista.com/inmueble/{idealista_id}/"

        # Calculate lines consumed
        lines_consumed = details_line_idx - start_idx + 1

        return {
            "idealista_id": idealista_id,
            "title": title_line,
            "property_url": property_url,
            "image_url": image_url,
            "property_type": property_type,
            "location": location,
            "original_price": old_price,
            "current_price": current_price,
            "price_drop_percentage": price_drop_pct,
            "size_m2": size_m2,
            "bedrooms": bedrooms,
            "floor": floor,
            "has_elevator": has_elevator,
        }, lines_consumed

    def _should_skip_line(self, line: str) -> bool:
        """Check if a line should be skipped when looking for property data."""
        if not line:
            return True

        skip_patterns = [
            r"^Ver\s+\d+\s+fotos",
            r"^Hola,",
            r"^Contactar$",
            r"^Ver\s+todos\s+los\s+anuncios",
            r"^Desde\s+Tus\s+búsquedas",
            r"anuncio\s+recién\s+publicado",
            r"^¿Este\s+anuncio",
            r"Con\s+la\s+app\s+de\s+idealista",
            r"^Problemas\?",
            r"^Para\s+conocer",
            r"Política\s+de\s+Privacidad",
            r"^idealista\s+en\s+tu",
            r"^idealista\s+©",
            r"^El\s+precio\s+de\s+este",
            r"^ha\s+bajado\s+de",
            r"^Alertas$",
            r"^\d+$",  # Single numbers (like "96")
        ]

        for pattern in skip_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                return True

        return False

    def _extract_all_prices(self, line: str) -> List[int]:
        """Extract all prices from a line, sorted by appearance."""
        prices = []
        for match in self.PRICE_PATTERN.finditer(line):
            price_str = match.group(1).replace(".", "").replace(",", "")
            try:
                price = int(price_str)
                if price > 1000:  # Sanity check
                    prices.append(price)
            except ValueError:
                continue
        return prices

    def _extract_elevator_status(self, line: str) -> Optional[bool]:
        """
        Extract elevator status from the details line.

        Args:
            line: Details line.

        Returns:
            True if has elevator, False if no elevator, None if unknown.
        """
        line_lower = line.lower()

        # Explicit elevator mentions
        if "con ascensor" in line_lower:
            return True
        elif "sin ascensor" in line_lower:
            return False

        # Exterior/interior indicators
        if "exterior" in line_lower and "interior" not in line_lower:
            return False
        elif "interior" in line_lower and "exterior" not in line_lower:
            return False

        # Special floors where elevator status is less relevant
        if re.search(r"\b(ático|planta baja|bajo|sótano)\b", line_lower):
            return None

        return None

    def _extract_property_type(self, title: str) -> Optional[str]:
        """
        Extract property type from title.

        Args:
            title: Property title.

        Returns:
            Property type (e.g., "Piso", "Casa", "Ático") or None.
        """
        title_lower = title.lower()

        for prop_type in self.PROPERTY_TYPES:
            if title_lower.startswith(prop_type.lower()):
                return prop_type

        return None

    def _extract_location(self, title: str) -> str:
        """
        Extract location from title.

        Args:
            title: Property title.

        Returns:
            Location string (everything after " en ").
        """
        if " en " in title:
            parts = title.split(" en ", 1)
            if len(parts) > 1:
                return parts[1].strip()

        return title.strip()

    def _generate_fallback_id(self, title: str) -> str:
        """Generate a fallback ID from title hash when URL is not available."""
        import hashlib

        hash_obj = hashlib.md5(title.encode("utf-8"))
        return f"FALLBACK_{hash_obj.hexdigest()[:12].upper()}"

    def _create_property(self, data: dict) -> Optional[ParsedProperty]:
        """
        Create a ParsedProperty from extracted data.

        Args:
            data: Dictionary with extracted property data.

        Returns:
            ParsedProperty object or None if required fields are missing.
        """
        # Required fields
        if "idealista_id" not in data or data.get("current_price") is None:
            logger.warning(f"Missing required fields in property data: {data}")
            return None

        # Set defaults
        original_price = data.get("original_price") or data["current_price"]
        current_price = data["current_price"]

        # Calculate price drop percentage if not extracted but prices differ
        price_drop_percentage = data.get("price_drop_percentage")
        if price_drop_percentage is None and original_price > current_price:
            drop = ((original_price - current_price) / original_price) * 100
            price_drop_percentage = round(drop, 2)

        return ParsedProperty(
            idealista_id=data["idealista_id"],
            title=data.get("title", f"Property {data['idealista_id']}"),
            property_type=data.get("property_type"),
            location=data.get("location", "Unknown location"),
            original_price=original_price,
            current_price=current_price,
            price_drop_percentage=price_drop_percentage,
            size_m2=data.get("size_m2"),
            bedrooms=data.get("bedrooms"),
            floor=data.get("floor"),
            has_elevator=data.get("has_elevator"),
            property_url=data["property_url"],
            image_url=data.get("image_url"),
        )
