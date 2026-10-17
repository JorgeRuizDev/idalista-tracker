"""
Script para verificar y ejecutar manualmente la detección de propiedades faltantes.
Este script identifica propiedades que deberían estar marcadas como "missing".
"""
import sqlite3
from datetime import datetime

def check_missing_properties():
    conn = sqlite3.connect(r'D:\codebases\idalista-tracker\idealista_properties.db')
    cursor = conn.cursor()
    
    print("=" * 60)
    print("VERIFICACIÓN DE PROPIEDADES MISSING")
    print("=" * 60)
    
    # 1. Contar propiedades por estado
    cursor.execute("SELECT status, COUNT(*) FROM property GROUP BY status")
    print("\n1. ESTADO ACTUAL DE PROPIEDADES:")
    for row in cursor.fetchall():
        print(f"   {row[0]}: {row[1]}")
    
    # 2. Encontrar propiedades vistas en sesión 14 pero NO en sesión 15
    cursor.execute("""
        SELECT DISTINCT p.id, p.idealista_id, p.title, p.status
        FROM property p
        WHERE p.id IN (
            SELECT DISTINCT property_id 
            FROM property_visibility 
            WHERE crawl_session_id = 14
        )
        AND p.id NOT IN (
            SELECT DISTINCT property_id 
            FROM property_visibility 
            WHERE crawl_session_id = 15
        )
    """)
    
    missing_candidates = cursor.fetchall()
    print(f"\n2. PROPIEDADES VISTAS EN SESIÓN 14 PERO NO EN 15:")
    print(f"   Total: {len(missing_candidates)}")
    
    for prop in missing_candidates[:5]:
        print(f"   - ID {prop[0]}: {prop[1]} - {prop[2][:50]}... [{prop[3]}]")
    
    if len(missing_candidates) > 5:
        print(f"   ... y {len(missing_candidates) - 5} más")
    
    # 3. Verificar si tienen eventos "missing" registrados
    cursor.execute("""
        SELECT COUNT(*) 
        FROM property_visibility 
        WHERE event_type = 'missing'
    """)
    missing_events = cursor.fetchone()[0]
    print(f"\n3. EVENTOS 'MISSING' REGISTRADOS: {missing_events}")
    
    # 4. Verificar sesiones recientes
    cursor.execute("""
        SELECT id, started_at, status, total_properties
        FROM crawl_session
        ORDER BY started_at DESC
        LIMIT 5
    """)
    
    print(f"\n4. ÚLTIMAS 5 SESIONES DE CRAWL:")
    for row in cursor.fetchall():
        print(f"   #{row[0]}: {row[1]} | {row[2]} | {row[3]} props")
    
    # 5. Verificar si search_id es válido
    cursor.execute("SELECT id, external_search_id, name FROM saved_search")
    print(f"\n5. BÚSQUEDAS GUARDADAS:")
    for row in cursor.fetchall():
        print(f"   ID: {row[0]} | External: {row[1]} | {row[2]}")
    
    conn.close()
    print("\n" + "=" * 60)
    
    return len(missing_candidates)

if __name__ == "__main__":
    count = check_missing_properties()
    
    if count > 0:
        print(f"\n⚠️  HAY {count} PROPIEDADES QUE DEBERÍAN ESTAR MARCADAS COMO 'MISSING'")
        print("   El sistema de detección no está funcionando correctamente.")
    else:
        print("\n✅ No hay propiedades faltantes detectadas.")
