# Salsas Calypso — Sitio Web + Club de Lealtad

Proyecto completo para la tienda en línea de **Salsas Calypso**: sitio web (React + Vite),
autenticación de clientes, carrito de compras y el programa de fidelización **Club Calypso**
(tarjeta de sellos digital) con base de datos en **Supabase**.

## Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | React 18 + Vite | Rápido de levantar, sin configuración pesada |
| Backend / Auth / DB | Supabase (Postgres) | Login, base de datos y lógica de negocio sin montar servidor propio |
| Pagos (a integrar) | Stripe o Yappy | Se conecta en el paso de checkout (ver `docs/ARQUITECTURA.md`) |
| Email marketing (a integrar) | Mailchimp / Klaviyo | Se alimenta de la tabla `profiles` |

## Requisitos previos

- Node.js 18 o superior
- Una cuenta gratuita en [supabase.com](https://supabase.com)
- VS Code (o el editor de tu preferencia)

## Instalación paso a paso

1. **Crear el proyecto en Supabase**
   - Entra a supabase.com → "New project".
   - Cuando esté listo, ve a *SQL Editor* y pega el contenido completo de `docs/database-schema.sql`. Ejecútalo (esto crea las tablas, funciones y seguridad).
   - Ve a *Project Settings → API* y copia la `Project URL` y la `anon public key`.

2. **Configurar el proyecto local**
   ```bash
   cd salsas-calypso-web
   npm install
   cp .env.example .env
   ```
   Abre `.env` y pega tus valores:
   ```
   VITE_SUPABASE_URL=https://tuproyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```

3. **Correr en desarrollo**
   ```bash
   npm run dev
   ```
   Abre el link que te da la terminal (normalmente `http://localhost:5173`).

4. **Construir para producción**
   ```bash
   npm run build
   ```
   Esto genera la carpeta `dist/`, lista para subir a **Vercel**, **Netlify** o cualquier hosting estático.

## Estructura del proyecto

```
salsas-calypso-web/
├── docs/
│   ├── ARQUITECTURA.md        ← diagrama y explicación técnica completa
│   └── database-schema.sql    ← todo el backend: tablas, funciones, seguridad
├── src/
│   ├── components/            ← Navbar, Hero, Flavors, Story, Club, AuthModal, CartModal
│   ├── data/flavors.js        ← catálogo de sabores y copy de cada uno
│   ├── supabaseClient.js      ← conexión a Supabase
│   ├── App.jsx                ← ensambla todo y maneja el estado global
│   └── styles.css             ← identidad visual de la marca
├── .env.example
└── package.json
```

## Qué falta para lanzar en producción

- [ ] Conectar una pasarela de pago real (Stripe/Yappy) en `checkout()` dentro de `App.jsx`.
- [ ] Configurar dominio propio y desplegar en Vercel/Netlify.
- [ ] Conectar `profiles` a tu herramienta de email marketing (webhook o exportación periódica).
- [ ] Subir fotografías reales de producto (reemplazar los círculos de color en `Flavors.jsx`).
- [ ] Revisar los correos transaccionales de Supabase Auth (confirmación de cuenta) con tu marca.

Ver `docs/ARQUITECTURA.md` para el detalle técnico completo y el diagrama de flujo.
