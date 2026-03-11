# Respaldo y arranque rápido — Aysa CRM

## Qué guardar como respaldo

1. **Toda la carpeta del proyecto**  
   `mini crm` (backend + frontend + este archivo). Puedes comprimirla o usar Git.

2. **Archivos `.env` (importante)**  
   No se suben a Git. Guarda una **copia en lugar seguro** (carpeta privada, USB, gestor de contraseñas):
   - `backend/.env` — contiene PORT, MONGODB_URI, claves de Clerk, etc.
   - `frontend/.env` — contiene VITE_API_URL y VITE_CLERK_PUBLISHABLE_KEY.

   Sin estos archivos tendrás que volver a crear las variables (sobre todo MONGODB_URI de Atlas).

3. **MongoDB Atlas**  
   Tus datos están en la nube (Atlas). Mientras no borres el cluster ni la base `minicrm`, los datos siguen ahí. El respaldo del código + `.env` basta para volver a conectar.

---

## Cómo arrancar desde aquí

### 1. Backend

```bash
cd backend
npm install          # solo la primera vez o si cambias dependencias
```

Si el puerto 3001 ya está en uso (error "EADDRINUSE"):

```bash
kill -9 $(lsof -t -i:3001)
```

Luego:

```bash
npm run dev
```

Debe aparecer: **Server en http://localhost:3001** y **MongoDB conectado**.

### 2. Frontend

En **otra terminal**:

```bash
cd frontend
npm install          # solo la primera vez o si cambias dependencias
npm run dev
```

### 3. Abrir la app

- **Frontend:** http://localhost:5173 (o 5174 si el 5173 está ocupado)
- **Backend/API:** http://localhost:3001
- **Estado del backend:** http://localhost:3001/health

Para uso local, en `frontend/.env` debe estar:

```env
VITE_API_URL=http://localhost:3001
```

---

## Resumen en una línea (backend + puerto libre)

```bash
kill -9 $(lsof -t -i:3001) 2>/dev/null; cd backend && npm run dev
```

Luego en otra terminal: `cd frontend && npm run dev`.
