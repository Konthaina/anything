# Anything Starter (Laravel + Inertia React)

<div align="center">

<div align="center">

<h3>Using</h3>

<div style="display:flex; justify-content:center; gap:24px; align-items:center;">
  <img alt="Laravel" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/laravel/laravel-original.svg" width="56" height="56" />
  <img alt="React" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="56" height="56" />
  <img alt="TypeScript" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="56" height="56" />
  <img alt="Tailwind CSS" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" width="56" height="56" />
  <img alt="PHP" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg" width="56" height="56" />
</div>

</div>

</div>

Laravel 12 + Inertia React + TypeScript + Tailwind/shadcn/ui with built-in English/Khmer i18n and Kantumruy Pro font.

## Prerequisites
- PHP 8.2+ & Composer
- Node 18+ & npm
- DB configured in `.env` (SQLite/MySQL/PostgreSQL)

## Setup
```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate   # add --seed if needed
```
Set `APP_NAME`, `APP_URL`, and DB creds in `.env`.

## Run / Build
- Dev (serve + queue + Vite)  
  `composer run dev`
- Dev with SSR  
  `composer run dev:ssr`
- Production build  
  `npm run build`

## Lint / Test
```bash
npm run lint
php artisan test
```

## Internationalization
- Locales: `resources/js/locales/en.json`, `resources/js/locales/km.json`
- Provider/hook: `resources/js/contexts/language-context.tsx` (`useI18n`, `t`, `tList`)
- Switcher: `resources/js/components/language-switcher.tsx` (used in auth layouts, welcome, header/sidebar)
- Add text by adding keys to both locale files, then call `t('section.key')`

## Fonts & Styling
- Kantumruy Pro loaded in `resources/views/app.blade.php`
- Tailwind config/theme in `resources/css/app.css`
- UI components in `resources/js/components/ui`

## App Name
- Set `APP_NAME` in `.env`; meta tag in `resources/views/app.blade.php` and dynamic titles in `resources/js/app.tsx` keep it in sync with Appearance settings.

## Key Paths
- Pages: `resources/js/pages`
- Layouts: `resources/js/layouts`
- Components: `resources/js/components`
- Styles: `resources/css/app.css`
- Routes (TS helpers): `resources/js/routes`

## Notes / Troubleshooting
- Hard refresh if fonts don’t update.
- If the app name or language doesn’t change, reload; titles derive from shared props and the meta tag.
- Keep locale keys mirrored in `en.json` and `km.json`.
