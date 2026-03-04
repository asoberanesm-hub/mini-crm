# Aysa

CRM + Asistente Gerencial para seguimiento de promotores y desempeño comercial.

## Requisitos

- Node.js 18+
- MongoDB (local o Atlas)

## Instalación

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tu MONGODB_URI
npm run dev
```

El backend corre en `http://localhost:3001`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

El frontend corre en `http://localhost:5173`.

## Variables de entorno

### Backend (.env)

| Variable      | Descripción                    | Default                    |
|---------------|--------------------------------|----------------------------|
| PORT          | Puerto del servidor            | 3001                       |
| MONGODB_URI   | URI de MongoDB/Atlas           | mongodb://localhost:27017/mini-crm |
| FRONTEND_URL  | Origen permitido por CORS      | http://localhost:5173      |

### Frontend (.env)

| Variable      | Descripción                    | Default                    |
|---------------|--------------------------------|----------------------------|
| VITE_API_URL  | URL base de la API             | http://localhost:3001      |

## Datos demo (seed)

Con MongoDB conectado:

```bash
cd backend
npm run seed
```

## Scripts

| Comando    | Backend | Frontend |
|------------|---------|----------|
| `npm run dev`   | Inicia servidor            | Dev server Vite        |
| `npm run build` | -                         | Build producción       |
| `npm start`     | Inicia servidor            | Preview del build      |
| `npm run seed`  | Carga datos demo (backend) | -                     |

**Nota:** Sin MongoDB, el frontend mostrará listas vacías. Para datos reales, usa MongoDB local o [Atlas](https://www.mongodb.com/atlas) (plan gratuito).

## Estructura

```
mini-crm/
├── backend/     # Node.js + Express + Mongoose
├── frontend/    # Vite + React + Tailwind
└── README.md
```
