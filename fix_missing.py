"""
Script para ejecutar manualmente la detección de propiedades missing.
Este script simula lo que debería hacer la extensión al finalizar un crawl.
"""
import sqlite3
from datetime import datetime, timedelta

def detect_and_mark_missing():
    conn = sqlite3.connect(r'D:\codebases\idalista-tracker\idealista_properties.db')
    cursor = conn.cursor()
    
    print("DETECCION MANUAL DE PROPIEDADES FALTANTES")
    print("=" * 60)
    
    # Obtener propiedades vistas en sesión 14 pero NO en 15
    cursor.execute("""
        SELECT DISTINCT p.id, p.idealista_id
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
    print(f"\nEncontradas {len(missing_candidates)} propiedades faltantes:")
    
    session_id = 15  # Usar sesión 15
    search_id = 1    # Usar búsqueda 1
    
    missing_count = 0
    marked_count = 0
    
    for prop in missing_candidates:
        prop_id = prop[0]
        idealista_id = prop[1]
        
        print(f"\n  Procesando: ID={prop_id}, IdealistaID={idealista_id}")
        
        # 1. Crear evento 'missing' en property_visibility
        cursor.execute("""
            INSERT INTO property_visibility 
                (event_type, timestamp, property_id, crawl_session_id, saved_search_id)
            VALUES 
                (?, ?, ?, ?, ?)
        """, ('missing', datetime.utcnow(), prop_id, session_id, search_id))
        
        missing_count += 1
        print(f"    + Evento 'missing' creado")
        
        # 2. Verificar si aparece en otras búsquedas recientes
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        cursor.execute("""
            SELECT COUNT(*) 
            FROM property_visibility 
            WHERE property_id = ? 
            AND saved_search_id != ?
            AND event_type = 'seen'
            AND timestamp > ?
        """, (prop_id, search_id, thirty_days_ago))
        
        other_searches = cursor.fetchone()[0]
        
        if other_searches == 0:
            # No aparece en otras búsquedas - marcar como missing
            cursor.execute("""
                UPDATE property 
                SET status = 'missing', missing_since = ?
                WHERE id = ? AND status = 'active'
            """, (datetime.utcnow(), prop_id))
            
            if cursor.rowcount > 0:
                marked_count += 1
                print(f"    + Propiedad marcada como 'missing'")
        else:
            print(f"    ~ Aparece en {other_searches} otras búsquedas, no se marca")
    
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 60)
    print(f"RESULTADO:")
    print(f"  - Eventos 'missing' creados: {missing_count}")
    print(f"  - Propiedades marcadas: {marked_count}")
    print("=" * 60)

if __name__ == "__main__":
    detect_and_mark_missing()
    print("\nVerificando estado actual...")
    import subprocess
    subprocess.run(['python', 'check_missing.py'])
