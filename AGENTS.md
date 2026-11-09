<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at [specs/005-frontend-filters-insights/plan.md](specs/005-frontend-filters-insights/plan.md)
<!-- SPECKIT END -->

# Guía Operativa del Proyecto para Agentes

## 1. Arquitectura de Despliegue y Ejecución del Servidor

La aplicación se ejecuta en producción como un contenedor integrado que empaqueta:
- **Frontend SPA**: React 19 + TypeScript + Vite + Tailwind CSS + Chart.js, compilado en Stage 1 (`node:20-alpine`) hacia `frontend/dist`.
- **Backend API & Servidor SPA**: FastAPI + Python 3.11 + UV + Playwright en Stage 2, que sirve tanto los endpoints `/api/*` como los archivos estáticos compilados de la SPA (`frontend/dist`) y la carpeta de medios `/media`.
- **Base de Datos y Almacenamiento**: SQLite persistido mediante volumen (`idealista_properties.db`) y directorio de fotos/imágenes (`data/media`).

### Puertos y Endpoints del Servicio
- **URL Principal (Web & API)**: `http://localhost:8050`
- **Healthcheck**: `http://localhost:8050/health` (retorna JSON `{"status": "healthy", ...}`)
- **Documentación OpenAPI**: `http://localhost:8050/docs`

---

## 2. Cómo Relanzar el Servidor con Cambios

Cada vez que se modifique código del backend (`src/`), dependencias de Python (`pyproject.toml`, `uv.lock`) o componentes/vistas del frontend (`frontend/src/`), se debe reconstruir la imagen de Docker para que el builder compile la versión actualizada:

### Comando de Reconstrucción y Despliegue
```bash
docker compose up -d --build
```

> [!NOTE]
> **Permisos de Ejecución en Sandbox**:
> Si se ejecuta desde un asistente o agente en un entorno sandbox cerrado, este comando requiere acceso al socket del demonio de Docker del host (`/var/run/docker.sock`), por lo que debe ejecutarse con `BypassSandbox: true` (o fuera del sandbox).

### Pasos de Comprobación Inmediata
1. **Comprobar estado del contenedor**:
   ```bash
   docker ps --filter "name=idalista-tracker"
   ```
   El contenedor `idalista-tracker` debe figurar como `Up` y `(healthy)`.
2. **Validar respuesta del endpoint de salud**:
   ```bash
   curl -s http://localhost:8050/health
   ```
3. **Revisar logs si se produce algún fallo**:
   ```bash
   docker logs --tail 50 idalista-tracker
   ```

---

## 3. Protocolo Obligatorio ante Cada Cambio Importante

Cada vez que se realice un cambio significativo (nuevas funcionalidades, modificaciones de contratos API, nuevos componentes visuales, cambios de base de datos o lógica de scraping), el agente DEBE seguir rigurosamente este protocolo:

1. **Alineación con Especificación (Spec Kit)**:
   - Verificar y actualizar la especificación en `specs/<feature>/spec.md` (historias de usuario, requisitos funcionales y criterios de aceptación medibles).
   - Mantener intacto el bloque `<!-- SPECKIT START --> ... <!-- SPECKIT END -->`.
2. **Validación de Código y Calidad**:
   - Asegurarse de que no existan errores de sintaxis ni de tipos TypeScript (`tsc -b`).
   - Añadir y ejecutar las pruebas unitarias pertinentes en `frontend/` o `tests/`.
3. **Reconstrucción del Servidor en Docker**:
   - Ejecutar `docker compose up -d --build` para asegurar que los cambios se compilan e impactan en la imagen en ejecución.
4. **Verificación Post-Despliegue**:
   - Comprobar que el endpoint `/health` responde positivamente (`healthy`).
   - Verificar que los nuevos componentes o endpoints no generan errores en tiempo de ejecución.
5. **Registro y Documentación**:
   - Si el cambio altera comandos de arranque, variables de entorno o estructura general, actualizar este archivo `AGENTS.md`.

