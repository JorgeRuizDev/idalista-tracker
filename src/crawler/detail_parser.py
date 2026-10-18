"""HTML and JSON-LD parser for Idealista property detail pages."""

import html
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class DetailParser:
    """Parser for extracting structured property details, features, and photos."""

    # Patterns for delisting detection
    DELISTED_PATTERNS = [
        re.compile(r"el anuncio ya no está publicado", re.IGNORECASE),
        re.compile(r"anuncio dado de baja", re.IGNORECASE),
        re.compile(r"inmueble no disponible", re.IGNORECASE),
        re.compile(r"este anuncio ha sido desactivado", re.IGNORECASE),
        re.compile(r"anuncio no encontrado", re.IGNORECASE),
        re.compile(r"el inmueble que buscas ya no está en idealista", re.IGNORECASE),
    ]

    # JSON-LD script block pattern
    JSON_LD_PATTERN = re.compile(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        re.DOTALL | re.IGNORECASE,
    )

    # Description DOM container pattern
    DESCRIPTION_PATTERN = re.compile(
        r'<div[^>]*class=["\'][^"\']*(?:comment|description-content|adCommentsLanguage)[^"\']*["\'][^>]*>(.*?)</div>',
        re.DOTALL | re.IGNORECASE,
    )

    # Breadcrumb / Location minor title pattern
    LOCATION_TITLE_PATTERN = re.compile(
        r'<div[^>]*class=["\'][^"\']*(?:main-info__title-minor|header-map-title)[^"\']*["\'][^>]*>(.*?)</div>',
        re.DOTALL | re.IGNORECASE,
    )

    # Feature list item pattern
    FEATURE_ITEM_PATTERN = re.compile(
        r"<li[^>]*>(.*?)</li>",
        re.DOTALL | re.IGNORECASE,
    )

    # Features container pattern
    FEATURES_CONTAINER_PATTERN = re.compile(
        r'<div[^>]*class=["\'][^"\']*(?:details-property_features|details-property-feature)[^"\']*["\'][^>]*>(.*?)</div>',
        re.DOTALL | re.IGNORECASE,
    )

    # Image tag pattern
    IMG_TAG_PATTERN = re.compile(
        r'<img[^>]+(?:src|data-ondemand-img)=["\'](https://img\d*\.idealista\.com/[^"\']+)["\'][^>]*(?:alt=["\']([^"\']*)["\'])?',
        re.IGNORECASE,
    )

    @classmethod
    def clean_text(cls, raw_html: str) -> str:
        """Strip HTML tags, collapse whitespaces, and unescape HTML entities."""
        if not raw_html:
            return ""
        no_tags = re.sub(r"<[^>]+>", " ", raw_html)
        unescaped = html.unescape(no_tags)
        cleaned = re.sub(r"\s+", " ", unescaped).strip()
        return cleaned

    def parse_html(self, html_content: str, http_status: Optional[int] = None) -> Dict[str, Any]:
        """Parse Idealista detail page HTML.

        Args:
            html_content: Raw HTML text of the page.
            http_status: Optional HTTP status code from response.

        Returns:
            Dictionary containing extracted attributes, features, and photo list.
        """
        # 1. Delisted detection
        if http_status in (404, 410):
            return {
                "is_delisted": True,
                "full_description": "",
                "photos": [],
                "features": None,
            }

        for pattern in self.DELISTED_PATTERNS:
            if pattern.search(html_content):
                return {
                    "is_delisted": True,
                    "full_description": "",
                    "photos": [],
                    "features": None,
                }

        # 2. Extract JSON-LD metadata if available
        json_ld_data = self._extract_json_ld(html_content)

        # 3. Extract description
        full_description = self._extract_description(html_content, json_ld_data)

        # 4. Extract location hierarchy
        neighborhood, district, city, province = self._extract_location(html_content, json_ld_data)

        # 5. Extract coordinates
        latitude, longitude = self._extract_coordinates(json_ld_data)

        # 6. Extract features dictionary
        features = self._extract_features(html_content, json_ld_data)

        # 7. Extract gallery photos
        photos = self._extract_photos(html_content, json_ld_data)

        return {
            "is_delisted": False,
            "full_description": full_description,
            "neighborhood": neighborhood,
            "district": district,
            "city": city,
            "province": province,
            "latitude": latitude,
            "longitude": longitude,
            "features": features,
            "photos": photos,
        }

    def _extract_json_ld(self, html_content: str) -> Dict[str, Any]:
        """Extract and merge structured schema.org JSON-LD objects."""
        merged: Dict[str, Any] = {}
        for match in self.JSON_LD_PATTERN.finditer(html_content):
            raw_json = match.group(1).strip()
            if not raw_json:
                continue
            try:
                data = json.loads(raw_json)
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            merged.update(item)
                elif isinstance(data, dict):
                    if "@graph" in data and isinstance(data["@graph"], list):
                        for item in data["@graph"]:
                            if isinstance(item, dict):
                                merged.update(item)
                    else:
                        merged.update(data)
            except Exception as e:
                logger.debug(f"Failed to parse JSON-LD block: {e}")
        return merged

    def _extract_description(self, html_content: str, json_ld_data: Dict[str, Any]) -> str:
        """Extract full description from DOM comments or JSON-LD."""
        # Try DOM comment container first (often more complete than JSON-LD snippet)
        dom_desc_parts = []
        for match in self.DESCRIPTION_PATTERN.finditer(html_content):
            cleaned = self.clean_text(match.group(1))
            if cleaned:
                dom_desc_parts.append(cleaned)

        if dom_desc_parts:
            return "\n\n".join(dom_desc_parts)

        # Fallback to JSON-LD description
        json_desc = json_ld_data.get("description")
        if json_desc and isinstance(json_desc, str):
            return self.clean_text(json_desc)

        return ""

    def _extract_location(
        self, html_content: str, json_ld_data: Dict[str, Any]
    ) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
        """Extract neighborhood, district, city, province."""
        neighborhood = None
        district = None
        city = None
        province = None

        # Try JSON-LD PostalAddress
        address = json_ld_data.get("address")
        if isinstance(address, dict):
            city = address.get("addressLocality")
            province = address.get("addressRegion")

        # Try DOM main-info title
        loc_match = self.LOCATION_TITLE_PATTERN.search(html_content)
        if loc_match:
            loc_text = self.clean_text(loc_match.group(1))
            # Examples: "Barrio Goya, Distrito Salamanca, Madrid" or "Goya, Salamanca, Madrid"
            parts = [p.strip() for p in loc_text.split(",") if p.strip()]
            for part in parts:
                lower_part = part.lower()
                if "barrio" in lower_part:
                    neighborhood = re.sub(r"^barrio\s+", "", part, flags=re.IGNORECASE).strip()
                elif "distrito" in lower_part:
                    district = re.sub(r"^distrito\s+", "", part, flags=re.IGNORECASE).strip()
                elif not city and not any(k in lower_part for k in ["barrio", "distrito"]):
                    city = part

            # If not prefixed with "Barrio" or "Distrito", map by positional segments
            if len(parts) >= 3 and not neighborhood and not district:
                neighborhood = parts[0]
                district = parts[1]
                if not city:
                    city = parts[2]
            elif len(parts) == 2 and not neighborhood:
                neighborhood = parts[0]
                if not city:
                    city = parts[1]

        if city and not province:
            province = city

        return neighborhood, district, city, province

    def _extract_coordinates(
        self, json_ld_data: Dict[str, Any]
    ) -> Tuple[Optional[float], Optional[float]]:
        """Extract latitude and longitude from JSON-LD geo block."""
        geo = json_ld_data.get("geo")
        if isinstance(geo, dict):
            try:
                raw_lat = geo.get("latitude")
                raw_lng = geo.get("longitude")
                if raw_lat is not None and raw_lng is not None:
                    return float(raw_lat), float(raw_lng)
            except (ValueError, TypeError):
                pass
        return None, None

    def _extract_features(self, html_content: str, json_ld_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract structured property features and amenities."""
        features: Dict[str, Any] = {}

        # Scan all feature list items in DOM
        for item_match in self.FEATURE_ITEM_PATTERN.finditer(html_content):
            item_text = self.clean_text(item_match.group(1))
            if not item_text:
                continue

            lower = item_text.lower()

            # Square meters
            m2_match = re.search(r"(\d+)\s*m²(?:\s*construidos)?", lower)
            if m2_match:
                features["built_meters"] = int(m2_match.group(1))

            # Rooms
            rooms_match = re.search(r"(\d+)\s*(?:habitación|habitaciones|hab\.)", lower)
            if rooms_match:
                features["rooms"] = int(rooms_match.group(1))

            # Bathrooms
            bath_match = re.search(r"(\d+)\s*(?:baño|baños)", lower)
            if bath_match:
                features["bathrooms"] = int(bath_match.group(1))

            # Terrace
            if "terraza" in lower:
                features["terrace"] = True

            # Elevator
            if "con ascensor" in lower:
                features["elevator"] = True
            elif "sin ascensor" in lower:
                features["elevator"] = False

            # Air conditioning
            if "aire acondicionado" in lower:
                features["air_conditioning"] = True

            # Heating
            if "calefacción" in lower:
                features["heating"] = item_text

            # Floor
            if "planta" in lower or "bajo" in lower or "ático" in lower:
                features["floor"] = item_text

            # Condition
            if any(k in lower for k in ["segunda mano", "obra nueva", "a reformar", "buen estado"]):
                features["condition"] = item_text

            # Energy rating
            if "certificado energético" in lower or "consumo:" in lower or "emisiones:" in lower:
                features["energy_certificate"] = item_text

        return features

    IMG_BLOCK_PATTERN = re.compile(r"<img\s+[^>]*>", re.IGNORECASE)
    SRC_PATTERN = re.compile(
        r'(?:src|data-ondemand-img)=["\'](https://img\d*\.idealista\.com/[^"\']+)["\']',
        re.IGNORECASE,
    )
    ALT_PATTERN = re.compile(r'alt=["\']([^"\']*)["\']', re.IGNORECASE)

    def _extract_photos(
        self, html_content: str, json_ld_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Extract ordered, deduplicated gallery image URLs."""
        photos: List[Dict[str, Any]] = []
        seen_urls = set()

        def add_photo(url: str, caption: Optional[str] = None) -> None:
            clean_url = url.split("?")[0].strip()
            if not clean_url or clean_url in seen_urls:
                return
            seen_urls.add(clean_url)
            photos.append(
                {
                    "sequence_index": len(photos),
                    "original_url": clean_url,
                    "caption": caption.strip() if caption else None,
                }
            )

        # 1. Look for img tags with idealista CDN URLs
        for img_block_match in self.IMG_BLOCK_PATTERN.finditer(html_content):
            tag_content = img_block_match.group(0)
            src_match = self.SRC_PATTERN.search(tag_content)
            if src_match:
                url = src_match.group(1)
                alt_match = self.ALT_PATTERN.search(tag_content)
                caption = alt_match.group(1) if alt_match else None
                add_photo(url, caption)

        # 2. Check JSON-LD image property
        json_imgs = json_ld_data.get("image")
        if isinstance(json_imgs, list):
            for img in json_imgs:
                if isinstance(img, str):
                    add_photo(img)
                elif isinstance(img, dict) and "url" in img:
                    add_photo(img["url"], img.get("caption"))
        elif isinstance(json_imgs, str):
            add_photo(json_imgs)

        return photos
