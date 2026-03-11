# Por qué la Agenda no sale en monexaysa.lat

## 1. Comprobar qué pide el frontend en producción

1. Abre **https://monexaysa.lat** en Chrome.
2. Pulsa **F12** (o clic derecho → Inspeccionar) y ve a la pestaña **Network** (Red).
3. Entra a **Agenda** en la web (o escribe en la barra: `https://monexaysa.lat/agenda`).
4. En la lista de peticiones, busca una que contenga **agenda** o **api** en la URL.

**Qué puede pasar:**

- Si la URL es **https://mini-crm-ru98.onrender.com/api/v1/agenda...**  
  → El frontend está bien configurado. El fallo puede ser el backend (ver punto 2).

- Si la URL es **https://monexaysa.lat/api/v1/...** o **http://localhost:3001/...**  
  → El frontend en Render no tiene bien `VITE_API_URL`.  
  → En Render: **mini-crm-frontend** → **Environment** → **VITE_API_URL** = `https://mini-crm-ru98.onrender.com` (sin barra final).  
  → Guardar y hacer **Manual Deploy** del frontend (el build tiene que repetirse para que use la nueva variable).

---

## 2. Comprobar el backend en Render

La API debe estar en **https://mini-crm-ru98.onrender.com** y usar la misma base de datos que en local.

1. En Render, abre el servicio del **backend** (no el de mini-crm-frontend).
2. En **Environment** debe estar **MONGODB_URI** con la misma cadena de Atlas que usas en local (en `backend/.env`).  
   Si falta o es distinta, el backend en producción no verá tus datos y la Agenda saldrá vacía.
3. (Opcional) Abre en el navegador:  
   **https://mini-crm-ru98.onrender.com/health**  
   Deberías ver algo como: `{"ok":true,"mongo":"conectado"}`.  
   Si `mongo` es `"desconectado"`, revisa **MONGODB_URI** en el backend de Render.

---

## 3. Regla Rewrite (evitar 404 en /agenda)

Si al entrar a **https://monexaysa.lat/agenda** sale **404**:

- En Render: **mini-crm-frontend** → **MANAGE** → **Redirects/Rewrites**.
- Añadir: Source `/*`, Destination `/index.html`, Action **Rewrite**.

---

## Resumen

| Problema | Dónde | Solución |
|----------|--------|----------|
| Peticiones a monexaysa.lat o localhost | Frontend (Environment) | VITE_API_URL = `https://mini-crm-ru98.onrender.com` y **volver a desplegar** el frontend |
| Agenda vacía pero página carga | Backend (Environment) | MONGODB_URI = misma que en tu `backend/.env` (Atlas) |
| 404 al abrir /agenda | Redirects/Rewrites | Regla `/*` → `/index.html` (Rewrite) |

Después de cambiar variables, **siempre** hacer **Manual Deploy** del servicio que cambiaste (frontend o backend).
