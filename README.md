# Hispania Camp Hub (lite)

Microfrontend React diseñado para gestionar escenas, mapas y tablones interactivos de campañas West Marches. El proyecto se ejecuta con Vite y usa Leaflet en modo `CRS.Simple` para permitir zoom y desplazamiento sobre ilustraciones estáticas.

## Requisitos

- Node.js 20+
- npm 10+

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo en `http://localhost:5173/hub/`. |
| `npm run build` | Compila TypeScript y genera los artefactos estáticos en `dist/`. |
| `npm run preview` | Sirve la build producida en local. |
| `npm run lint` | Ejecuta ESLint sobre todo el código del proyecto. |

## Estructura relevante

```
public/
  assets/           # Mapas, retratos, tablones y sprites.
  data/
    config.json     # Configuración global del hub.
    scenes.json     # Escenas disponibles y sus capas.
    elements.json   # Elementos interactivos sobre cada escena.
    panels.json     # Paneles laterales (markdown, tablas o imágenes).
src/
  components/       # CampHub y componentes auxiliares.
  lib/              # Carga de datos, utilidades de markdown y hooks.
  styles/           # Estilos globales SCSS.
```

## Autoría de contenido

Consulta la [Guía de creación de contenido](docs/content-authoring.md) para añadir escenas, elementos, paneles y recursos sin tocar el código fuente. El hub lee automáticamente los JSON y actualizará la URL con los parámetros `scene`, `focus` y `layer` para que puedas compartir vistas específicas.

## Despliegue

1. Ejecuta `npm run build`.
2. Publica el contenido de `dist/` en tu plataforma estática (por ejemplo, Vercel) bajo la ruta `/hub/`.
3. Embebe el resultado mediante iframe:
   ```html
   <iframe src="https://tudominio/hub/?scene=hispania" width="100%" height="860"></iframe>
   ```
