import sqlite3

con = sqlite3.connect('idealista_properties.db')
cur = con.cursor()

months = [
    ('2026-05-01', '2026-05-31', 'Mayo 2026'),
    ('2026-06-01', '2026-06-30', 'Junio 2026'),
    ('2026-07-01', '2026-07-31', 'Julio 2026'),
    ('2026-08-01', '2026-08-31', 'Agosto 2026'),
    ('2026-09-01', '2026-09-30', 'Septiembre 2026'),
    ('2026-10-01', '2026-10-31', 'Octubre 2026')
]

print("=== MONTHLY INTERVAL AUDIT ===")
for start_d, end_d, label in months:
    # Inclusions
    cur.execute("SELECT count(*) FROM property WHERE substr(first_seen_at, 1, 10) BETWEEN ? AND ?", (start_d, end_d))
    inclusions = cur.fetchone()[0]
    
    # Sales
    cur.execute("SELECT count(*) FROM property WHERE status = 'sold' AND substr(sold_at, 1, 10) BETWEEN ? AND ?", (start_d, end_d))
    sales = cur.fetchone()[0]

    # Drops
    cur.execute("""
        SELECT count(*), avg((old_price - new_price)*100.0/old_price), sum(old_price - new_price) 
        FROM price_history 
        WHERE new_price < old_price AND substr(change_date, 1, 10) BETWEEN ? AND ?
    """, (start_d, end_d))
    drops_count, avg_drop_pct, sum_drop = cur.fetchone()
    
    # Increases
    cur.execute("""
        SELECT count(*), avg((new_price - old_price)*100.0/old_price), sum(new_price - old_price) 
        FROM price_history 
        WHERE new_price > old_price AND substr(change_date, 1, 10) BETWEEN ? AND ?
    """, (start_d, end_d))
    inc_count, avg_inc_pct, sum_inc = cur.fetchone()
    
    # Avg days to sell
    cur.execute("""
        SELECT avg(round(julianday(sold_at) - julianday(first_seen_at)))
        FROM property
        WHERE status = 'sold' AND substr(sold_at, 1, 10) BETWEEN ? AND ? AND first_seen_at IS NOT NULL AND sold_at IS NOT NULL
    """, (start_d, end_d))
    avg_days_to_sell = cur.fetchone()[0]
    
    print(f"\n--- {label} ({start_d} a {end_d}) ---")
    print(f"Inclusiones (nuevas viviendas): {inclusions}")
    print(f"Ventas concluidas: {sales}")
    print(f"Rebajas de precio: {drops_count} (media: {round(avg_drop_pct or 0, 1)}%, total ahorro: {round(sum_drop or 0):,} €)")
    print(f"Aumentos de precio: {inc_count} (media: {round(avg_inc_pct or 0, 1)}%)")
    print(f"Tiempo medio hasta venta: {round(avg_days_to_sell or 0)} días")
