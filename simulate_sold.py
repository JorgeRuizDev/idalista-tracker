"""
Script para simular una propiedad vendida.
Crea manualmente una propiedad que ha estado missing por 31 dias.
"""
import sqlite3
from datetime import datetime, timedelta

def simulate_sold_property():
    conn = sqlite3.connect(r'D:\codebases\idalista-tracker\idealista_properties.db')
    cursor = conn.cursor()
    
    print("SIMULACION: Propiedad vendida")
    print("=" * 60)
    
    # Usar una propiedad existente para la simulacion
    cursor.execute("""
        SELECT id, idealista_id, title, status 
        FROM property 
        WHERE id = 252
    """)
    prop = cursor.fetchone()
    
    if not prop:
        print("Error: Propiedad no encontrada")
        return
    
    print(f"\nPropiedad seleccionada: ID={prop[0]}, IdealistaID={prop[1]}")
    print(f"Titulo: {prop[2][:60]}...")
    print(f"Estado actual: {prop[3]}")
    
    # Simular que fue marcada como missing hace 31 dias
    thirty_one_days_ago = datetime.utcnow() - timedelta(days=31)
    
    print(f"\nSimulando...")
    print(f"  - Fecha actual: {datetime.utcnow()}")
    print(f"  - Fecha simulated missing: {thirty_one_days_ago}")
    
    # Actualizar la propiedad
    cursor.execute("""
        UPDATE property 
        SET status = 'missing', missing_since = ?
        WHERE id = ?
    """, (thirty_one_days_ago, prop[0]))
    
    print(f"  - Propiedad marcada como 'missing' con fecha de hace 31 dias")
    
    # Ahora ejecutar la logica de deteccion de sold
    cursor.execute("""
        SELECT id, status, missing_since 
        FROM property 
        WHERE status = 'missing' AND missing_since IS NOT NULL
    """)
    
    missing_props = cursor.fetchall()
    print(f"\nPropiedades en estado 'missing': {len(missing_props)}")
    
    sold_count = 0
    for mprop in missing_props:
        prop_id = mprop[0]
        missing_since = datetime.fromisoformat(mprop[2].replace('Z', '+00:00').replace('+00:00', ''))
        days_missing = (datetime.utcnow() - missing_since).days
        
        print(f"  Propiedad {prop_id}: missing desde hace {days_missing} dias")
        
        if days_missing > 30:
            cursor.execute("""
                UPDATE property 
                SET status = 'sold'
                WHERE id = ?
            """, (prop_id,))
            sold_count += 1
            print(f"    >>> MARCADA COMO 'SOLD' <<<")
    
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 60)
    print(f"RESULTADO DE SIMULACION:")
    print(f"  - Propiedades marcadas como 'sold': {sold_count}")
    print("=" * 60)

if __name__ == "__main__":
    simulate_sold_property()
    
    # Verificar estado final
    print("\nEstado final de la base de datos:")
    conn = sqlite3.connect(r'D:\codebases\idalista-tracker\idealista_properties.db')
    cursor = conn.cursor()
    cursor.execute("SELECT status, COUNT(*) FROM property GROUP BY status")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]}")
    conn.close()
