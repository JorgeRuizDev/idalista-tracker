import sqlite3
from datetime import datetime

con = sqlite3.connect('idealista_properties.db')
cur = con.cursor()

print("=== CHECKING CRAWL SESSIONS ===")
cur.execute("SELECT id, started_at, ended_at, status, total_properties FROM crawl_session ORDER BY started_at ASC")
sessions = cur.fetchall()
print(f"Total crawl sessions: {len(sessions)}")
print("First session:", sessions[0] if sessions else None)
print("Last session:", sessions[-1] if sessions else None)

print("\n=== CHECKING DATES OF INCLUSIONS (first_seen_at) ===")
cur.execute("""
    SELECT substr(first_seen_at, 1, 10) as dt, count(*)
    FROM property
    GROUP BY dt
    ORDER BY dt
""")
inclusions = cur.fetchall()
print(f"Total days with inclusions: {len(inclusions)}")
print("Sample inclusions by day:", inclusions[:10])

print("\n=== CHECKING DATES OF SALES (sold_at) ===")
cur.execute("""
    SELECT substr(sold_at, 1, 10) as dt, count(*)
    FROM property
    WHERE status = 'sold' AND sold_at IS NOT NULL
    GROUP BY dt
    ORDER BY dt
""")
sales = cur.fetchall()
print(f"Total days with sales: {len(sales)}")
print("Sample sales by day:", sales[:10])

print("\n=== CHECKING PRICE DROPS AND INCREASES IN price_history ===")
cur.execute("""
    SELECT 
        substr(change_date, 1, 10) as dt,
        count(CASE WHEN new_price < old_price THEN 1 END) as drops,
        count(CASE WHEN new_price > old_price THEN 1 END) as increases,
        avg(CASE WHEN new_price < old_price THEN (old_price - new_price)*100.0/old_price END) as avg_drop_pct,
        avg(CASE WHEN new_price > old_price THEN (new_price - old_price)*100.0/old_price END) as avg_inc_pct
    FROM price_history
    WHERE old_price IS NOT NULL
    GROUP BY dt
    ORDER BY dt
""")
price_changes = cur.fetchall()
print(f"Days with price changes: {len(price_changes)}")
print("Sample price changes by day:", price_changes[:10])

print("\n=== TIME TO SELL CALCULATION ===")
cur.execute("""
    SELECT 
        p.id, p.title, p.status, p.first_seen_at, p.sold_at, p.last_seen_at,
        round(julianday(COALESCE(p.sold_at, p.last_seen_at)) - julianday(p.first_seen_at)) as days_to_sell
    FROM property p
    WHERE p.status = 'sold' AND p.first_seen_at IS NOT NULL
    LIMIT 10
""")
for r in cur.fetchall():
    print(r)
