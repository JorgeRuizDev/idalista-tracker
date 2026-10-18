"""Zone service for canonical zone normalization and census statistics."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from src.database.models import Property


CANONICAL_ZONES = [
    "Los Vadillos - Reyes Católicos",
    "Villa Pilar",
    "Gamonal - San Bruno - G9",
    "Casco Antiguo - Centro",
    "San Pedro y San Felices",
    "San Pedro de la Fuente",
    "Villimar - San Cristóbal",
    "Universidad - Las Huelgas",
    "Illera",
    "Briviesca",
    "San Agustín - Pisones",
    "San Julián - Cortes",
    "El Carmen - Barrio Gimeno",
    "Juan XXIII - Las Torres",
    "Villafría - Castañares",
    "Santa Teresa - San Pedro Cardeña",
    "Yagüe - Villalonquejar",
    "Plantío - Alcampo",
    "Fuentecillas - S7 - S8",
    "Cardeñadijo",
    "Castrillo del Val",
    "Aranda de Duero",
    "Burgos Centro / Otras Zonas",
]


def normalize_zone(title: Optional[str], location: Optional[str] = None) -> str:
    """Normalize listing title and location to one of 23 canonical Burgos zones.

    Args:
        title: Listing title.
        location: Listing location string.

    Returns:
        Canonical zone name.
    """
    t = (title or "").strip()
    loc = (location or "").strip()
    combined = f"{t} {loc}".lower()

    # Outlying towns / special locations
    if "briviesca" in combined:
        return "Briviesca"
    if "castrillo del val" in combined:
        return "Castrillo del Val"
    if "cardeñadijo" in combined or "carde\u00f1adijo" in combined:
        return "Cardeñadijo"
    if "aranda de duero" in combined or "aranda" in combined:
        return "Aranda de Duero"

    # Specific neighborhoods
    if "gamonal" in combined or "san bruno" in combined or "inmaculada" in combined:
        return "Gamonal - San Bruno - G9"
    if "vadillos" in combined or "reyes cat" in combined or "pozanos" in combined or "sanitaria" in combined:
        return "Los Vadillos - Reyes Católicos"
    if "villa pilar" in combined:
        return "Villa Pilar"
    if "casco" in combined or "espol" in combined or "catedral" in combined or "antiguo" in combined:
        return "Casco Antiguo - Centro"
    if "san pedro y san felices" in combined:
        return "San Pedro y San Felices"
    if "san pedro de la fuente" in combined:
        return "San Pedro de la Fuente"
    if "fuentecillas" in combined or "s7" in combined or "s8" in combined:
        return "Fuentecillas - S7 - S8"
    if "universidad" in combined or "huelgas" in combined:
        return "Universidad - Las Huelgas"
    if "villimar" in combined or "cristobal" in combined or "cristóbal" in combined:
        return "Villimar - San Cristóbal"
    if "illera" in combined:
        return "Illera"
    if "san agust" in combined or "pisones" in combined:
        return "San Agustín - Pisones"
    if "san juli" in combined or "cortes" in combined:
        return "San Julián - Cortes"
    if "el carmen" in combined or "gimeno" in combined:
        return "El Carmen - Barrio Gimeno"
    if "juan xxiii" in combined or "las torres" in combined:
        return "Juan XXIII - Las Torres"
    if "yagüe" in combined or "yag\u00fce" in combined or "villalonquejar" in combined:
        return "Yagüe - Villalonquejar"
    if "santa teresa" in combined:
        return "Santa Teresa - San Pedro Cardeña"
    if "plantío" in combined or "plant\u00edo" in combined or "alcampo" in combined:
        return "Plantío - Alcampo"
    if "villafria" in combined or "villafr\u00eda" in combined or "castañares" in combined:
        return "Villafría - Castañares"

    return "Burgos Centro / Otras Zonas"


class ZoneService:
    """Service for canonical zone operations and census statistics."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_canonical_zones(self) -> List[str]:
        """Return the list of 23 canonical zones."""
        return CANONICAL_ZONES.copy()

    def get_zones_census(self) -> List[Dict[str, Any]]:
        """Compute census statistics across all 23 canonical zones.

        Returns:
            List of dictionaries with census aggregations sorted by total properties descending.
        """
        properties = (
            self.db.query(
                Property.id,
                Property.title,
                Property.location,
                Property.status,
                Property.original_price,
                Property.current_price,
                Property.size_m2,
                Property.first_seen_at,
                Property.last_seen_at,
                Property.sold_at,
            )
            .all()
        )

        zones_map: Dict[str, Dict[str, Any]] = {
            z: {
                "zone": z,
                "total": 0,
                "active": 0,
                "sold": 0,
                "missing": 0,
                "prices": [],
                "m2_prices": [],
                "days_to_sell": [],
                "discounts": [],
            }
            for z in CANONICAL_ZONES
        }

        for prop in properties:
            zone = normalize_zone(prop.title, prop.location)
            if zone not in zones_map:
                zone = "Burgos Centro / Otras Zonas"

            zd = zones_map[zone]
            zd["total"] += 1
            st = prop.status or "active"
            if st in zd:
                zd[st] += 1

            if prop.current_price and prop.current_price > 0:
                zd["prices"].append(prop.current_price)
                if prop.size_m2 and prop.size_m2 > 0:
                    zd["m2_prices"].append(prop.current_price / prop.size_m2)

            # Days to sell for sold properties
            if st == "sold" and prop.first_seen_at:
                end_time = prop.sold_at or prop.last_seen_at
                if end_time:
                    try:
                        d_diff = (end_time - prop.first_seen_at).days
                        if d_diff >= 0:
                            zd["days_to_sell"].append(d_diff)
                    except Exception:
                        pass

            # Discount percentage
            if (
                prop.original_price
                and prop.current_price
                and prop.original_price > prop.current_price
            ):
                disc_pct = (
                    (prop.original_price - prop.current_price)
                    / prop.original_price
                    * 100.0
                )
                zd["discounts"].append(disc_pct)

        census: List[Dict[str, Any]] = []
        for z in CANONICAL_ZONES:
            zd = zones_map[z]
            avg_price = (
                round(sum(zd["prices"]) / len(zd["prices"]))
                if zd["prices"]
                else 0
            )
            avg_m2 = (
                round(sum(zd["m2_prices"]) / len(zd["m2_prices"]))
                if zd["m2_prices"]
                else 0
            )
            avg_days = (
                round(sum(zd["days_to_sell"]) / len(zd["days_to_sell"]))
                if zd["days_to_sell"]
                else 45
            )
            avg_disc = (
                round(sum(zd["discounts"]) / len(zd["discounts"]), 1)
                if zd["discounts"]
                else 0.0
            )

            census.append(
                {
                    "zone": zd["zone"],
                    "total": zd["total"],
                    "active": zd["active"],
                    "sold": zd["sold"],
                    "missing": zd["missing"],
                    "avg_price": avg_price,
                    "avg_m2": avg_m2,
                    "avg_days_to_sell": avg_days,
                    "avg_discount_pct": avg_disc,
                }
            )

        # Sort by total descending
        census.sort(key=lambda x: x["total"], reverse=True)
        return census
