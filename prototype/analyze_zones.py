import sqlite3

con = sqlite3.connect('idealista_properties.db')
cur = con.cursor()

print("=== SAMPLES OF TITLE ===")
cur.execute("SELECT title FROM property LIMIT 30")
for r in cur.fetchall():
    print(repr(r[0]))

print("\n=== WHERE DOES THE REAL ZONE APPEAR? ===")
# Check if zone appears in title or location or both
cur.execute("SELECT count(*) FROM property WHERE title LIKE '%Burgos%'")
print("Title has 'Burgos':", cur.fetchone()[0])
cur.execute("SELECT count(*) FROM property WHERE title LIKE '%Briviesca%'")
print("Title has 'Briviesca':", cur.fetchone()[0])
cur.execute("SELECT count(*) FROM property WHERE location LIKE '%Burgos%'")
print("Location has 'Burgos':", cur.fetchone()[0])

# Let's see the pattern of title:
cur.execute("""
    SELECT title, location 
    FROM property 
    WHERE title IS NOT NULL 
    LIMIT 20
""")
for t, l in cur.fetchall()[:15]:
    print("T:", t)
    print("L:", (l or "")[:80])
    print("-" * 40)
