# Configuración del backend en Render

Para que el deploy no falle con "No open ports detected", el servicio **backend** en Render debe tener exactamente esto:

## Configuración obligatoria

| Campo | Valor |
|--------|--------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Environment** | Añade `PORT` (Render lo rellena solo, pero si quieres: `10000`) y el resto (MONGODB_URI, etc.) |

## Cómo comprobarlo

1. En el Dashboard de Render → tu servicio **mini-crm** (backend).
2. **Settings** (Configuración).
3. En **Build & Deploy**:
   - **Root Directory:** debe ser `backend` (así Render entra en la carpeta donde está el `package.json` del API).
   - **Build Command:** `npm install`.
   - **Start Command:** `npm start`.

Si **Root Directory** está vacío, Render usa la raíz del repo (donde no hay `package.json` del backend) y el servidor no arranca bien. Pon **backend** y guarda, luego **Manual Deploy** → **Deploy latest commit**.
