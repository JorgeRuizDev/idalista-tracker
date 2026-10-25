/**
 * Unit tests for detail_extractor.ts (DOM and JSON-LD parsing)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { extractDetailSnapshot, isListingDelisted } from '../detail_extractor';

describe('detail_extractor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('extracts property detail snapshot from DOM elements', () => {
    document.body.innerHTML = `
      <div class="main-info__title-minor">Barrio Chamberí, Distrito Chamberí, Madrid</div>
      <div class="comment">
        <p>Precioso piso recién reformado con altas calidades.</p>
        <p>Salón muy amplio con ventanales y vistas despejadas.</p>
      </div>
      <ul class="details-property_features">
        <li>85 m² construidos</li>
        <li>2 habitaciones</li>
        <li>1 baño</li>
        <li>Terraza</li>
        <li>Con ascensor</li>
        <li>Aire acondicionado</li>
        <li>Calefacción individual gas natural</li>
        <li>Planta 4ª exterior</li>
      </ul>
      <div class="gallery">
        <img src="https://img3.idealista.com/blur/WEB_DETAIL/0/photo1.jpg?param=1" alt="Salón principal" />
        <img data-ondemand-img="https://img3.idealista.com/blur/WEB_DETAIL/0/photo2.jpg" alt="Dormitorio" />
      </div>
    `;

    const snapshot = extractDetailSnapshot();

    expect(snapshot.delisted).toBe(false);
    expect(snapshot.source_engine).toBe('chrome_extension');
    expect(snapshot.neighborhood).toBe('Chamberí');
    expect(snapshot.district).toBe('Chamberí');
    expect(snapshot.city).toBe('Madrid');
    expect(snapshot.full_description).toContain('Precioso piso recién reformado');
    expect(snapshot.full_description).toContain('Salón muy amplio');

    // Features
    expect(snapshot.features?.built_meters).toBe(85);
    expect(snapshot.features?.rooms).toBe(2);
    expect(snapshot.features?.bathrooms).toBe(1);
    expect(snapshot.features?.terrace).toBe(true);
    expect(snapshot.features?.elevator).toBe(true);
    expect(snapshot.features?.air_conditioning).toBe(true);

    // Photos
    expect(snapshot.photos.length).toBe(2);
    expect(snapshot.photos[0].original_url).toBe('https://img3.idealista.com/blur/WEB_DETAIL/0/photo1.jpg');
    expect(snapshot.photos[0].caption).toBe('Salón principal');
    expect(snapshot.photos[1].original_url).toBe('https://img3.idealista.com/blur/WEB_DETAIL/0/photo2.jpg');
    expect(snapshot.photos[1].caption).toBe('Dormitorio');
  });

  it('extracts coordinates and metadata from JSON-LD script', () => {
    document.head.innerHTML = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Apartment",
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": "40.4350",
            "longitude": "-3.7020"
          },
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Madrid",
            "addressRegion": "Madrid"
          }
        }
      </script>
    `;
    document.body.innerHTML = `
      <div class="description-content">
        <p>Apartamento céntrico con excelente ubicación.</p>
      </div>
    `;

    const snapshot = extractDetailSnapshot();

    expect(snapshot.latitude).toBeCloseTo(40.435, 3);
    expect(snapshot.longitude).toBeCloseTo(-3.702, 3);
    expect(snapshot.city).toBe('Madrid');
    expect(snapshot.full_description).toContain('Apartamento céntrico');
  });

  it('detects delisted listing correctly and returns delisted: true', () => {
    document.body.innerHTML = `
      <div class="message">
        <h1>El anuncio ya no está publicado</h1>
        <p>El inmueble que buscas ya no está en idealista.</p>
      </div>
    `;

    expect(isListingDelisted()).toBe(true);

    const snapshot = extractDetailSnapshot();
    expect(snapshot.delisted).toBe(true);
    expect(snapshot.photos).toEqual([]);
  });
});
