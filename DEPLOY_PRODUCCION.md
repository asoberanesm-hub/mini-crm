# Desplegar en producción (monexaysa.lat / Render)

Para que lo que ves en local (por ejemplo la Agenda en http://localhost:5173/agenda) se vea igual en **monexaysa.lat**, hay que desplegar **los dos** servicios y configurar la SPA.

---

## 1. Desplegar **los dos** servicios en Render

- **Backend (API):** el que termina en `mini-crm-ru98.onrender.com`.  
  - En Render: “Deploy” / “Deploy latest commit” del servicio **backend**.
- **Frontend (la web de monexaysa.lat):** el servicio que tiene el dominio monexaysa.lat.  
  - En Render: “Deploy” / “Deploy latest commit” del servicio **frontend** (static site).

Si solo despliegas el backend, la web de monexaysa.lat sigue siendo la versión anterior y no verás la Agenda ni los cambios nuevos. **Tienes que desplegar también el frontend.**

---

## 2. Evitar 404 al entrar directo a /agenda

En producción la app es una SPA (React Router). Si entras a `https://monexaysa.lat/agenda` y el servidor no devuelve `index.html`, verás 404.

En Render:

1. Entra al **servicio estático** que tiene el dominio monexaysa.lat.
2. Pestaña **Redirects/Rewrites**.
3. Añade una regla:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Action:** **Rewrite** (no Redirect).

Así todas las rutas (`/agenda`, `/ana/prospeccion`, etc.) sirven el mismo `index.html` y React Router muestra la página correcta.

---

## 3. Variables de entorno del frontend en Render

En el **frontend** en Render, en Environment:

- **VITE_API_URL** = `https://mini-crm-ru98.onrender.com`  
  (o la URL real de tu backend en Render, sin barra final).

Así la web en monexaysa.lat usa la API de producción y no la de localhost.

---

## Resumen

| Qué hacer | Dónde |
|-----------|--------|
| Desplegar último commit | Backend **y** Frontend en Render |
| Regla Rewrite `/*` → `/index.html` | Frontend (static site) → Redirects/Rewrites |
| VITE_API_URL = URL del backend | Frontend → Environment |

Después de desplegar el frontend y guardar la regla, espera a que termine el deploy y prueba de nuevo `https://monexaysa.lat/agenda`.
