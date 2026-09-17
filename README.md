# Villazarcillo

Hub del campamento. Todo el contenido (escenas, elementos del mapa, paneles, recursos) vive en Supabase y se edita desde `/admin` (ruta oculta, sin enlaces visibles — accesible visitándola directamente o dando 10 clics rápidos al botón "−" del zoom del mapa).

## Puesta en marcha (una sola vez)

1. En el proyecto de Supabase, ejecuta `supabase/schema.sql` en el SQL Editor (crea las tablas, RLS y el bucket de assets).
2. En Authentication → Users, crea (o edita) el usuario admin y ponle `role: "admin"` en `raw_app_meta_data`.
3. Migra el contenido actual desde los JSON de `public/data`:
   ```
   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxxx npm run migrate:data
   ```
4. Migra las imágenes de `public/assets` al bucket de Storage:
   ```
   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxxx npm run migrate:assets
   ```

La URL pública de los assets se calcula sola a partir del cliente de Supabase (`src/lib/assets.ts`) — no hay que copiar ni pegar nada en Config, y no puede quedar desincronizada.

La `SUPABASE_SERVICE_ROLE_KEY` solo se usa en estos scripts locales, nunca en el cliente — no la pongas en `.env` ni la commitees.

**Límite de 50 MB del plan gratuito de Supabase:** cualquier archivo por encima de eso lo rechaza el propio Supabase, sin excepción posible desde código. Si `migrate:assets` falla para algún archivo de más de 50 MB (fondo de escena grande, vídeo de escena), súbelo a mano desde `/admin > Assets` en lugar del script: el admin lo reconvierte automáticamente antes de subirlo —
- **Imágenes:** a WebP, misma resolución, bajando calidad solo lo justo para caber.
- **Vídeos:** recomprime el vídeo (h.264/mp4) bajando el bitrate solo lo necesario, y elimina el audio (los vídeos de fondo del hub siempre se reproducen en silencio, así que no hay pérdida real ahí). Tarda más que una imagen — el navegador descarga un códec de vídeo (ffmpeg.wasm) la primera vez y lo ejecuta localmente, verás el progreso en el propio botón de subida.

Si un archivo sigue sin caber tras la recompresión automática (por ejemplo un vídeo muy largo o una imagen ya muy comprimida), el admin te lo dice explícitamente en vez de fallar en silencio; en ese caso reduce la duración/resolución de origen.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
