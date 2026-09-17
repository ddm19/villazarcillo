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
5. Copia la "Public base URL" que imprime el script anterior y pégala en `/admin > Config > Avanzado > Assets base URL`.

La `SUPABASE_SERVICE_ROLE_KEY` solo se usa en estos scripts locales, nunca en el cliente — no la pongas en `.env` ni la commitees.

**Límite de 50 MB del plan gratuito de Supabase:** cualquier archivo por encima de eso lo rechaza el propio Supabase, sin excepción posible desde código. Si `migrate:assets` falla para algún PNG/JPG de más de 50 MB (p. ej. un fondo de escena grande), sube esa imagen concreta a mano desde `/admin > Assets` en lugar del script: el admin la reconvierte automáticamente a WebP a la misma resolución antes de subirla, así que normalmente cabe sin pérdida de calidad perceptible. Para vídeos de más de 50 MB no hay recompresión automática — reduce el vídeo con otra herramienta (HandBrake, ffmpeg) antes de subirlo.

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
