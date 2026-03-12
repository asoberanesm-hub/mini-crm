# Stripe — Configuración

Integración mínima: página **Pagar** (`/pagar`) con tarjeta y monto en MXN (entorno de prueba).

## 1. En Stripe (dashboard)

- Estás en **Entorno de prueba** (correcto para desarrollo).
- En **Desarrolladores** → **Claves de API** (o en la tarjeta "Claves de API" del inicio):
  - **Clave publicable:** `pk_test_...`
  - **Clave secreta:** `sk_test_...`

## 2. Backend (`backend/.env`)

Añade:

```env
STRIPE_SECRET_KEY=sk_test_51T9cdtGu4tkDQiRe...
```

(Pega tu **Clave secreta** completa; no la subas a GitHub.)

## 3. Frontend (`frontend/.env`)

Añade:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51T9cdtGu...
```

(Pega tu **Clave publicable** completa.)

Reinicia el servidor del frontend después de cambiar `.env`.

## 4. Probar

1. Arranca backend y frontend (local).
2. Entra en **Pagar** en el menú (o `http://localhost:5173/pagar`).
3. Monto por defecto: 100 MXN. Usa tarjeta de prueba: **4242 4242 4242 4242**, fecha futura, CVC cualquiera (ej. 123).

## Producción (Render)

- **Backend (mini-crm):** en Environment añade `STRIPE_SECRET_KEY` con tu clave **secreta** (para producción usa `sk_live_...` cuando pases a modo live).
- **Frontend (mini-crm-frontend):** en Environment añade `VITE_STRIPE_PUBLISHABLE_KEY` con tu clave **publicable** (`pk_live_...` en producción).
- Haz **Manual Deploy** de ambos después de guardar.

## Rutas API

- `POST /api/v1/stripe/create-payment-intent` — body: `{ "amount": 100 }` (MXN). Respuesta: `{ "clientSecret": "..." }`.
