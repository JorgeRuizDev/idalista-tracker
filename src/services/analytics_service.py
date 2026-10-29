"""Analytics service for time interval audit and monthly market trends."""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from src.database.models import PriceHistory, Property
from src.services.zone_service import CANONICAL_ZONES, normalize_zone

MONTH_NAMES_ES = {
    1: "Enero",
    2: "Febrero",
    3: "Marzo",
    4: "Abril",
    5: "Mayo",
    6: "Junio",
    7: "Julio",
    8: "Agosto",
    9: "Septiembre",
    10: "Octubre",
    11: "Noviembre",
    12: "Diciembre",
}


class AnalyticsService:
    """Service providing interval aggregations, KPI audits, and market trends."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_interval_audit(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Aggregate market indicators and territorial breakdown for a date interval.

        Args:
            start_date: Start date string YYYY-MM-DD.
            end_date: End date string YYYY-MM-DD.

        Returns:
            Dictionary matching IntervalAudit schema.
        """
        dt_start = datetime.fromisoformat(start_date)
        dt_end = datetime.fromisoformat(end_date) + timedelta(days=1)

        # Generate human label
        if start_date[:7] == end_date[:7] and start_date.endswith("-01"):
            m = int(start_date[5:7])
            y = start_date[:4]
            interval_label = f"{MONTH_NAMES_ES.get(m, m)} {y}"
        else:
            interval_label = f"{start_date} a {end_date}"

        # 1. Inclusions: properties with first_seen_at in [dt_start, dt_end)
        inclusion_props = (
            self.db.query(
                Property.id,
                Property.title,
                Property.location,
                Property.first_seen_at,
            )
            .filter(
                Property.first_seen_at >= dt_start,
                Property.first_seen_at < dt_end,
            )
            .all()
        )
        inclusions_count = len(inclusion_props)

        # 2. Sales: properties with status == 'sold' and sold_at in [dt_start, dt_end)
        sold_props = (
            self.db.query(
                Property.id,
                Property.title,
                Property.location,
                Property.original_price,
                Property.current_price,
                Property.size_m2,
                Property.first_seen_at,
                Property.sold_at,
                Property.last_seen_at,
            )
            .filter(
                Property.status == "sold",
                Property.sold_at >= dt_start,
                Property.sold_at < dt_end,
            )
            .all()
        )
        sales_count = len(sold_props)

        # Days to sell and m2 prices for sales in interval
        days_to_sell_list: List[int] = []
        m2_prices: List[float] = []
        for sp in sold_props:
            if sp.first_seen_at and sp.sold_at:
                d = (sp.sold_at - sp.first_seen_at).days
                if d >= 0:
                    days_to_sell_list.append(d)
            if sp.current_price and sp.size_m2 and sp.size_m2 > 10:
                m2_prices.append(sp.current_price / sp.size_m2)

        avg_days_to_sell = (
            round(sum(days_to_sell_list) / len(days_to_sell_list))
            if days_to_sell_list
            else 0
        )
        avg_m2 = round(sum(m2_prices) / len(m2_prices)) if m2_prices else 0

        # 3. Price drops & increases in interval from price_history
        change_rows = (
            self.db.query(
                PriceHistory.property_id,
                PriceHistory.old_price,
                PriceHistory.new_price,
                PriceHistory.change_type,
            )
            .filter(
                PriceHistory.change_date >= dt_start,
                PriceHistory.change_date < dt_end,
                PriceHistory.old_price.isnot(None),
                PriceHistory.new_price.isnot(None),
            )
            .all()
        )

        drop_amounts: List[int] = []
        drop_pcts: List[float] = []
        inc_amounts: List[int] = []
        inc_pcts: List[float] = []

        for row in change_rows:
            old_p = row.old_price
            new_p = row.new_price
            if old_p and new_p and old_p > 0:
                if new_p < old_p:
                    diff = old_p - new_p
                    pct = (diff / old_p) * 100.0
                    drop_amounts.append(diff)
                    drop_pcts.append(pct)
                elif new_p > old_p:
                    diff = new_p - old_p
                    pct = (diff / old_p) * 100.0
                    inc_amounts.append(diff)
                    inc_pcts.append(pct)

        drops_count = len(drop_amounts)
        avg_drop_pct = round(sum(drop_pcts) / len(drop_pcts), 1) if drop_pcts else 0.0
        total_drop_amount = sum(drop_amounts) if drop_amounts else 0

        increases_count = len(inc_amounts)
        avg_inc_pct = round(sum(inc_pcts) / len(inc_pcts), 1) if inc_pcts else 0.0

        # 4. Zone Breakdown
        zone_metrics_map: Dict[str, Dict[str, Any]] = {
            z: {
                "zone": z,
                "inclusions": 0,
                "sales": 0,
                "days_to_sell": [],
                "discounts": [],
                "sale_prices": [],
                "sale_m2_prices": [],
            }
            for z in CANONICAL_ZONES
        }

        for ip in inclusion_props:
            z = normalize_zone(ip.title, ip.location)
            if z in zone_metrics_map:
                zone_metrics_map[z]["inclusions"] += 1

        for sp in sold_props:
            z = normalize_zone(sp.title, sp.location)
            if z in zone_metrics_map:
                zd = zone_metrics_map[z]
                zd["sales"] += 1
                if sp.current_price and sp.current_price > 0:
                    zd["sale_prices"].append(sp.current_price)
                if sp.current_price and sp.size_m2 and sp.size_m2 > 10:
                    zd["sale_m2_prices"].append(sp.current_price / sp.size_m2)
                if sp.first_seen_at and sp.sold_at:
                    d = (sp.sold_at - sp.first_seen_at).days
                    if d >= 0:
                        zd["days_to_sell"].append(d)
                if (
                    sp.original_price
                    and sp.current_price
                    and sp.original_price > sp.current_price
                ):
                    disc = (
                        (sp.original_price - sp.current_price)
                        / sp.original_price
                        * 100.0
                    )
                    zd["discounts"].append(disc)

        zone_breakdown: List[Dict[str, Any]] = []
        for z in CANONICAL_ZONES:
            zd = zone_metrics_map[z]
            # Only include zones that have activity or include all top zones
            avg_z_days = (
                round(sum(zd["days_to_sell"]) / len(zd["days_to_sell"]))
                if zd["days_to_sell"]
                else 0
            )
            avg_z_disc = (
                round(sum(zd["discounts"]) / len(zd["discounts"]), 1)
                if zd["discounts"]
                else 0.0
            )
            avg_z_price = (
                round(sum(zd["sale_prices"]) / len(zd["sale_prices"]))
                if zd["sale_prices"]
                else 0
            )
            avg_z_m2 = (
                round(sum(zd["sale_m2_prices"]) / len(zd["sale_m2_prices"]))
                if zd["sale_m2_prices"]
                else 0
            )

            if zd["inclusions"] > 0 or zd["sales"] > 0:
                zone_breakdown.append(
                    {
                        "zone": z,
                        "inclusions": zd["inclusions"],
                        "sales": zd["sales"],
                        "avg_days_to_sell": avg_z_days,
                        "avg_discount_pct": avg_z_disc,
                        "avg_sale_price": avg_z_price,
                        "avg_m2": avg_z_m2,
                    }
                )

        # Sort zone breakdown by sales descending, then inclusions descending
        zone_breakdown.sort(key=lambda x: (x["sales"], x["inclusions"]), reverse=True)

        return {
            "start_date": start_date,
            "end_date": end_date,
            "interval_label": interval_label,
            "inclusions": inclusions_count,
            "sales": sales_count,
            "drops_count": drops_count,
            "avg_drop_pct": avg_drop_pct,
            "total_drop_amount": total_drop_amount,
            "increases_count": increases_count,
            "avg_inc_pct": avg_inc_pct,
            "avg_days_to_sell": avg_days_to_sell,
            "avg_m2": avg_m2,
            "zone_breakdown": zone_breakdown,
        }

    def get_monthly_trends(self) -> Dict[str, Any]:
        """Calculate monthly macro trends (€/m², active, sold, price drops) from May to Oct 2026.

        Returns:
            Dictionary matching MarketTrendsResponse.
        """
        months = [
            ("2026-05-01", "2026-05-31", "2026-05", "Mayo 2026"),
            ("2026-06-01", "2026-06-30", "2026-06", "Junio 2026"),
            ("2026-07-01", "2026-07-31", "2026-07", "Julio 2026"),
            ("2026-08-01", "2026-08-31", "2026-08", "Agosto 2026"),
            ("2026-09-01", "2026-09-30", "2026-09", "Septiembre 2026"),
            ("2026-10-01", "2026-10-31", "2026-10", "Octubre 2026"),
        ]

        monthly_items = []
        for start_d, end_d, m_code, label in months:
            dt_start = datetime.fromisoformat(start_d)
            dt_end = datetime.fromisoformat(end_d) + timedelta(days=1)

            # Active listings in month: first_seen_at < dt_end and (sold_at is null or sold_at >= dt_start)
            active_props = (
                self.db.query(Property.current_price, Property.size_m2)
                .filter(
                    Property.first_seen_at < dt_end,
                    (Property.sold_at.is_(None) | (Property.sold_at >= dt_start)),
                )
                .all()
            )
            active_count = len(active_props)

            # Sold in month
            sold_count = (
                self.db.query(Property.id)
                .filter(
                    Property.status == "sold",
                    Property.sold_at >= dt_start,
                    Property.sold_at < dt_end,
                )
                .count()
            )

            # Price drops in month
            drop_rows = (
                self.db.query(PriceHistory.old_price, PriceHistory.new_price)
                .filter(
                    PriceHistory.change_date >= dt_start,
                    PriceHistory.change_date < dt_end,
                    PriceHistory.new_price < PriceHistory.old_price,
                    PriceHistory.old_price.isnot(None),
                )
                .all()
            )
            price_drops = len(drop_rows)
            drop_pcts = [
                ((r.old_price - r.new_price) / r.old_price) * 100.0
                for r in drop_rows
                if r.old_price and r.old_price > 0
            ]
            avg_drop_pct = round(sum(drop_pcts) / len(drop_pcts), 1) if drop_pcts else 0.0

            # Avg price & €/m2
            prices = [p.current_price for p in active_props if p.current_price and p.current_price > 0]
            m2_prices = [
                p.current_price / p.size_m2
                for p in active_props
                if p.current_price and p.size_m2 and p.size_m2 > 20
            ]
            avg_price = round(sum(prices) / len(prices)) if prices else 0
            avg_m2 = round(sum(m2_prices) / len(m2_prices)) if m2_prices else 0

            monthly_items.append(
                {
                    "month": m_code,
                    "label": label,
                    "avg_price": avg_price,
                    "avg_m2": avg_m2,
                    "properties_active": active_count,
                    "properties_sold": sold_count,
                    "price_drops": price_drops,
                    "avg_drop_pct": avg_drop_pct,
                }
            )

        return {"monthly": monthly_items}
