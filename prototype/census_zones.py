import sqlite3
import re
from collections import Counter

con = sqlite3.connect('idealista_properties.db')
cur = con.cursor()

cur.execute("SELECT id, title, location, status, original_price, current_price, first_seen_at, last_seen_at, sold_at FROM property")
rows = cur.fetchall()

def extract_zone(title, location):
    # Title format often: "Piso en [Calle X], [Barrio], Burgos" or "Piso en [Barrio], Burgos"
    # Or "Piso en Briviesca"
    t = (title or "").strip()
    
    # Check for known towns first
    if "briviesca" in t.lower():
        return "Briviesca"
    if "castrillo del val" in t.lower():
        return "Castrillo del Val"
    if "cardeñadijo" in t.lower() or "carde\u00f1adijo" in t.lower():
        return "Cardeñadijo"
    if "aranda de duero" in t.lower():
        return "Aranda de Duero"
    if "lerma" in t.lower():
        return "Lerma"

    # Split by comma or " en "
    if ", Burgos" in t:
        parts = t.split(", Burgos")[0].split(",")
        zone_candidate = parts[-1].strip()
        # Clean up floor or numbers if present
        return zone_candidate
    
    return "Burgos Centro / Otras Zonas"

zones_counter = Counter()
zone_status = {}

for r in rows:
    pid, title, loc, status, orig_p, cur_p, first_s, last_s, sold_s = r
    z = extract_zone(title, loc)
    zones_counter[z] += 1
    if z not in zone_status:
        zone_status[z] = {"active": 0, "sold": 0, "missing": 0}
    if status in zone_status[z]:
        zone_status[z][status] += 1

print(f"Total properties examined: {len(rows)}")
print("\nTop 25 extracted zones and counts:")
for z, c in zones_counter.most_common(25):
    s = zone_status[z]
    print(f"{c:4d} | Activos: {s['active']:3d} | Vendidos: {s['sold']:3d} | Missing: {s['missing']:2d} -> {repr(z)}")
