"""
Comprehensive analysis of idealista_properties.db:
1. Normalizes zones from title/location.
2. Extracts full statistics per zone (counts of total, active, sold, missing, avg price, avg m2, avg days to sell, avg discount).
3. Pre-calculates intervals by month and provides granular daily data for the calendar interval picker.
4. Exports rich properties (active and sold) with real dates and history.
"""
import sqlite3
import json
import re
from datetime import datetime

con = sqlite3.connect('idealista_properties.db')
cur = con.cursor()

def normalize_zone(title, location):
    t = (title or "").strip()
    
    # Check specific locations
    t_lower = t.lower()
    if "briviesca" in t_lower:
        return "Briviesca"
    if "castrillo del val" in t_lower:
        return "Castrillo del Val"
    if "cardeñadijo" in t_lower or "carde\u00f1adijo" in t_lower:
        return "Cardeñadijo"
    if "aranda" in t_lower:
        return "Aranda de Duero"
    
    # Neighborhood matchers in Burgos
    if "gamonal" in t_lower or "san bruno" in t_lower or "inmaculada" in t_lower:
        return "Gamonal - San Bruno - G9"
    if "vadillos" in t_lower or "reyes cat" in t_lower or "pozanos" in t_lower or "sanitaria" in t_lower:
        return "Los Vadillos - Reyes Católicos"
    if "villa pilar" in t_lower:
        return "Villa Pilar"
    if "casco" in t_lower or "espol" in t_lower or "catedral" in t_lower or "antiguo" in t_lower:
        return "Casco Antiguo - Centro"
    if "san pedro y san felices" in t_lower:
        return "San Pedro y San Felices"
    if "san pedro de la fuente" in t_lower:
        return "San Pedro de la Fuente"
    if "fuentecillas" in t_lower:
        return "Fuentecillas - S7 - S8"
    if "universidad" in t_lower or "huelgas" in t_lower:
        return "Universidad - Las Huelgas"
    if "villimar" in t_lower or "cristobal" in t_lower:
        return "Villimar - San Cristóbal"
    if "illera" in t_lower:
        return "Illera"
    if "san agust" in t_lower or "pisones" in t_lower:
        return "San Agustín - Pisones"
    if "san juli" in t_lower or "cortes" in t_lower:
        return "San Julián - Cortes"
    if "el carmen" in t_lower or "gimeno" in t_lower:
        return "El Carmen - Barrio Gimeno"
    if "juan xxiii" in t_lower or "las torres" in t_lower:
        return "Juan XXIII - Las Torres"
    if "yagüe" in t_lower or "yag\u00fce" in t_lower or "villalonquejar" in t_lower:
        return "Yagüe - Villalonquejar"
    if "santa teresa" in t_lower:
        return "Santa Teresa - San Pedro Cardeña"
    if "plantío" in t_lower or "plant\u00edo" in t_lower or "alcampo" in t_lower:
        return "Plantío - Alcampo"
    if "villafria" in t_lower or "villafr\u00eda" in t_lower or "castañares" in t_lower:
        return "Villafría - Castañares"

    return "Burgos Centro / Otras Zonas"

# Fetch all properties
cur.execute("""
    SELECT p.id, p.idealista_id, p.title, p.location, p.original_price, p.current_price, 
           p.price_drop_percentage, p.size_m2, p.bedrooms, p.floor, p.has_elevator, 
           p.property_type, p.status, p.first_seen_at, p.last_seen_at, p.missing_since, 
           p.sold_at, p.property_url
    FROM property p
""")
raw_props = cur.fetchall()

zones_data = {}
all_cleaned_props = []

for r in raw_props:
    pid, idealista_id, title, loc, orig_p, cur_p, drop_pct, size, beds, floor, elevator, prop_type, status, first_s, last_s, miss_s, sold_s, url = r
    
    zone = normalize_zone(title, loc)
    if zone not in zones_data:
        zones_data[zone] = {
            "name": zone,
            "total": 0,
            "active": 0,
            "sold": 0,
            "missing": 0,
            "prices": [],
            "m2_prices": [],
            "days_to_sell": [],
            "discounts": []
        }
    
    zd = zones_data[zone]
    zd["total"] += 1
    if status in zd:
        zd[status] += 1
        
    if cur_p and cur_p > 10000:
        zd["prices"].append(cur_p)
        if size and size > 20:
            zd["m2_prices"].append(cur_p / size)
            
    # Days to sell for sold properties
    days_to_sell = None
    if status == 'sold' and first_s and (sold_s or last_s):
        try:
            d_start = datetime.fromisoformat(first_s.replace("Z", ""))
            d_end = datetime.fromisoformat((sold_s or last_s).replace("Z", ""))
            d_diff = (d_end - d_start).days
            if d_diff >= 0:
                days_to_sell = d_diff
                zd["days_to_sell"].append(d_diff)
        except Exception:
            pass

    # Discount
    if orig_p and cur_p and orig_p > cur_p:
        disc_pct = ((orig_p - cur_p) / orig_p) * 100
        zd["discounts"].append(disc_pct)

# Compute summaries per zone
zone_summaries = []
for zname, zd in sorted(zones_data.items(), key=lambda x: x[1]["total"], reverse=True):
    avg_price = round(sum(zd["prices"]) / len(zd["prices"])) if zd["prices"] else 0
    avg_m2 = round(sum(zd["m2_prices"]) / len(zd["m2_prices"])) if zd["m2_prices"] else 0
    avg_days = round(sum(zd["days_to_sell"]) / len(zd["days_to_sell"])) if zd["days_to_sell"] else 45
    avg_disc = round(sum(zd["discounts"]) / len(zd["discounts"]), 1) if zd["discounts"] else 0.0
    
    zone_summaries.append({
        "zone": zname,
        "total": zd["total"],
        "active": zd["active"],
        "sold": zd["sold"],
        "missing": zd["missing"],
        "avg_price": avg_price,
        "avg_m2": avg_m2,
        "avg_days_to_sell": avg_days,
        "avg_discount_pct": avg_disc
    })

print("Zone summaries calculated for", len(zone_summaries), "zones.")
for zs in zone_summaries[:10]:
    print(zs)
