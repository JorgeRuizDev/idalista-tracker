import sqlite3
import json

con = sqlite3.connect('idealista_properties.db')
cur = con.cursor()

print("=== TABLES IN DB ===")
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print(tables)

print("\n=== COLUMNS IN PROPERTY ===")
cur.execute("PRAGMA table_info(property)")
prop_cols = [r[1] for r in cur.fetchall()]
print(prop_cols)

print("\n=== DOES PROPERTY_SNAPSHOT EXIST? ===")
if "property_snapshot" in tables:
    cur.execute("SELECT count(*) FROM property_snapshot")
    print("Snapshot count:", cur.fetchone()[0])
    cur.execute("PRAGMA table_info(property_snapshot)")
    print("Snapshot cols:", [r[1] for r in cur.fetchall()])
    cur.execute("SELECT neighborhood, district, city, count(*) FROM property_snapshot GROUP BY neighborhood, district, city LIMIT 10")
    print("Snapshot sample:", cur.fetchall())
else:
    print("No property_snapshot table")

print("\n=== DOES SAVED_SEARCH EXIST? ===")
if "saved_search" in tables:
    cur.execute("SELECT id, name, url_path, count(*) FROM saved_search GROUP BY id")
    print("Saved searches:", cur.fetchall())

print("\n=== ANALYZING PROPERTY.LOCATION AND TITLE ===")
cur.execute("SELECT location FROM property WHERE location IS NOT NULL LIMIT 20")
sample_locs = cur.fetchall()
for sl in sample_locs[:5]:
    print("Sample loc:", repr(sl[0]))

print("\n=== TOP 20 DISTINCT LOCATION VALUES ===")
cur.execute("SELECT location, count(*) FROM property GROUP BY location ORDER BY count(*) DESC LIMIT 20")
for r in cur.fetchall():
    print(r[1], "->", repr(r[0][:80]))

print("\n=== CHECKING DATES ===")
cur.execute("SELECT min(first_seen_at), max(first_seen_at), min(last_seen_at), max(last_seen_at), min(sold_at), max(sold_at) FROM property")
print("Dates in property:", cur.fetchone())

print("\n=== STATUS BREAKDOWN ===")
cur.execute("SELECT status, count(*) FROM property GROUP BY status")
print("Status counts:", cur.fetchall())

print("\n=== CRAWL_HISTORY ENTRIES / STATS ===")
if "crawl_session" in tables:
    cur.execute("SELECT count(*) FROM crawl_session")
    print("Crawl sessions:", cur.fetchone()[0])
