# Guía de creación de contenido para Hispania Camp Hub (lite)

Esta guía resume cómo extender el microfrontend sin tocar el código fuente. Todo el contenido visible en el hub se define en archivos JSON dentro de `public/data` y en los recursos gráficos alojados en `public/assets`.

## 1. Configuración general (`public/data/config.json`)

```jsonc
{
  "title": "Campamento West Marches",
  "defaultScene": "hispania",
  "assetsBaseUrl": "/assets/",
  "featureFlags": { "miniMap": false }
}
```

* **title**: encabezado que se muestra en la barra superior.
* **defaultScene**: escena que se carga cuando no se especifica `?scene=` en la URL.
* **assetsBaseUrl**: prefijo común para localizar imágenes (mapas, retratos, tablones, etc.).
* **featureFlags**: interruptores para funciones opcionales (reservado para futuras ampliaciones).

## 2. Escenas (`public/data/scenes.json`)

Cada escena describe un lienzo de Leaflet con su imagen base y capas disponibles.

Campos principales:

| Campo | Descripción |
|-------|-------------|
| `id` | Identificador único (se usa en URL y referencias cruzadas). |
| `name` | Nombre legible que aparece en el selector de escenas. |
| `background` | Ruta relativa dentro de `public/assets/` (se concatena con `assetsBaseUrl`). |
| `size` | Tamaño original de la imagen `{ "width": 8192, "height": 6144 }`. |
| `initialView` | Posición inicial `{ "center": [x, y], "zoom": 0 }` usando CRS.Simple. |
| `minZoom`/`maxZoom` | Límites de zoom permitidos. |
| `layers` | Lista de capas con `id`, `name` y `visible` (si `visible: true`, la capa aparece activa por defecto). |

> **Validación**: si falta `size`, la escena se ignora y se registra un error en consola.

## 3. Elementos (`public/data/elements.json`)

Los elementos son los pines o sprites interactivos que se colocan sobre cada escena.

Campos importantes:

* `id`: identificador único (`npc:marco`).
* `sceneId`: debe coincidir con una escena existente. Si no, el elemento se omite.
* `layerId`: corresponde a una de las capas de la escena para que pueda ocultarse/mostrarse.
* `type`: etiqueta libre para ayudarte a clasificar (`npc`, `shop`, `quest`, `image`, etc.).
* `name`: texto usado en tooltips y accesibilidad.
* `position`: coordenadas `[x, y]` relativas al tamaño definido en la escena.
* `icon` o `sprite`:
  * **Pin**: `{ "kind": "pin", "colorVar": "--pin-npc" }` utiliza los estilos del tema (variables CSS en `:root`).
  * **Sprite**: `{ "src": "boards/notes/bandits.png", "width": 360, "height": 240, "rotation": -6 }` dibuja imágenes personalizadas.
* `panelId`: enlaza con el contenido del panel (ver apartado siguiente). Si el panel no existe, el elemento queda sin interacción y se marca en consola.
* `badge`: (opcional) etiqueta de estado que aparece sobre el panel cuando existe (`"badge": "Completada"`).

Para marcar un elemento como “tachado” o completado puedes sustituir su `sprite.src` por una versión alternativa o añadir un `badge` en el panel correspondiente.

## 4. Paneles (`public/data/panels.json`)

Los paneles definen el contenido del cajón lateral que se abre al hacer clic. Tres tipos soportados:

1. **Markdown** (`type: "markdown"`)
   ```jsonc
   {
     "id": "panel:npc_marco",
     "type": "markdown",
     "title": "Marco el Mensajero",
     "portrait": "portraits/marco.png",
     "badge": "Disponible",
     "content": "Corre entre villas con rumores. **Contacto fiable.**"
   }
   ```
   * Usa sintaxis Markdown básica (negritas, listas, enlaces `[texto](url)`, tablas simples). Se renderiza con `react-markdown`, por lo que no es necesario escapar HTML.
   * `portrait` (opcional) carga una imagen junto al título.

2. **Tabla** (`type: "table"`)
   ```jsonc
   {
     "id": "panel:shop_bristleback",
     "type": "table",
     "title": "Almacén Bristleback",
     "subtitle": "Inventario básico",
     "columns": ["Objeto", "Precio", "Notas"],
     "rows": [
       [{ "text": "Raciones (1 día)", "href": "/items/rations" }, "0.5 gp", ""],
       ["Cuerda 50 ft", "1 gp", ""]
     ]
   }
   ```
   * Cada fila acepta strings simples o celdas enriquecidas `{ "text": "", "href": "" }` para generar enlaces.
   * Puedes mezclar texto plano y objetos en una misma fila.

3. **Imagen** (`type: "image"`)
   ```jsonc
   {
     "id": "panel:quest_bandits",
     "type": "image",
     "title": "Campamento bandido",
     "image": "boards/notes/bandits_fullcard.png",
     "cta": { "label": "Ver detalle", "href": "/quests/bandit-camp" }
   }
   ```
   * Muestra una imagen completa (ideal para tablones pre-maquetados) y un botón opcional (`cta`).

## 5. Organización de recursos (`public/assets`)

Coloca mapas, retratos y tablones dentro de subcarpetas libres bajo `public/assets/`. El campo `assetsBaseUrl` de `config.json` se antepone automáticamente, así que basta con referenciar rutas relativas como `"maps/hispania.jpg"` o `"portraits/marco.png"`.

Recomendaciones:

* Mantén las dimensiones reales de la imagen en la escena (`size.width` / `size.height`).
* Para sprites con transparencia, usa PNG o SVG.
* Si necesitas variantes “completadas”, crea archivos separados y actualiza `elements.json` cuando quieras cambiar el estado.

## 6. Control mediante URL

El hub lee los siguientes parámetros de consulta:

* `scene=<id>`: abre una escena concreta. Si se omite, usa `defaultScene`.
* `focus=<elementId>`: centra el mapa y abre el panel del elemento indicado (también cambia automáticamente a la escena correcta si pertenece a otra).
* `layer=<id1,id2>`: fuerza las capas activas. Usa `layer=_` para indicar que ninguna capa visible por defecto debería mostrarse.

Ejemplo:

```
/hub/?scene=hispania&focus=npc:marco&layer=poi,routes
```

Los cambios que hagas desde la interfaz actualizan la URL, por lo que puedes copiarla para compartir estados concretos con tus jugadores.

## 7. Flujo de trabajo recomendado

1. **Añade assets** en `public/assets/` (mapas, retratos, sprites de misiones, etc.).
2. **Edita los JSON** de `public/data/` para registrar escenas, elementos y paneles nuevos.
3. **Revisa en local** ejecutando `npm run dev` y cargando `http://localhost:5173/hub/`.
4. **Construye y despliega** con `npm run build` antes de subir a Vercel.

Con estos pasos podrás ampliar el campamento sin modificar componentes React ni estilos.
