# Desplegar el frontend en Render (paso a paso)

Sigue estos pasos para que los cambios del frontend (timeout 90 s y reintentos al backend) se vean en **monexaysa.lat**.

---

## 0. Configurar la URL del backend en Render (obligatorio)

El archivo `.env` del frontend **no se sube a GitHub**. En Render el build se hace sin esa variable, así que la app no sabe a qué URL llamar y **siempre falla** la conexión al backend.

**Hazlo una sola vez** (o si cambias la URL del backend):

1. Entra a **https://dashboard.render.com** → abre **mini-crm-frontend**.
2. En el menú izquierdo entra a **Environment**.
3. Pulsa **Add Environment Variable**.
4. **Key:** `VITE_API_URL`  
   **Value:** `https://mini-crm-ru98.onrender.com`  
   (usa la URL real de tu backend en Render si es distinta; la ves en el servicio del backend en Render).
5. Guarda (Save Changes).
6. Después **hay que volver a desplegar** para que el build use la variable: **Manual Deploy** → **Deploy latest commit**, y espera a que termine.

Sin este paso, el error de “no se pudo conectar con el backend” seguirá saliendo aunque el código esté bien.

---

## 1. Guardar todo

- En Cursor/VS Code: guarda todos los archivos (Ctrl+S / Cmd+S).

---

## 2. Abrir la terminal en la carpeta del proyecto

- Ruta de la carpeta del proyecto:
  ```
  /Users/anasoberanes/Desktop/Escritorio - MacBook Air de Ana/mini crm
  ```
- En Cursor: menú **Terminal → New Terminal** (o `` Ctrl+` ``).
- Si no estás en esa carpeta, escribe:
  ```bash
  cd "/Users/anasoberanes/Desktop/Escritorio - MacBook Air de Ana/mini crm"
  ```

---

## 3. Ver qué archivos cambiaron

En la terminal ejecuta:

```bash
git status
```

Deberías ver archivos como `frontend/src/lib/api.js` y `frontend/src/components/ErrorApi.jsx` en “Changes not staged” o “to be committed”.

---

## 4. Subir los cambios a GitHub

Ejecuta estos comandos **uno por uno**:

```bash
git add frontend/src/lib/api.js frontend/src/components/ErrorApi.jsx
```

```bash
git commit -m "Arreglo conexión backend: timeout 90s y reintentos en producción"
```

```bash
git push origin main
```

- Si tu rama se llama `master` en lugar de `main`, usa:
  ```bash
  git push origin master
  ```
- Si te pide usuario/contraseña: usa tu usuario de GitHub y un **Personal Access Token** (no la contraseña de la cuenta). Si no tienes token: GitHub → Settings → Developer settings → Personal access tokens → Generate new token.

---

## 5. En Render: comprobar el deploy del frontend

1. Entra a **https://dashboard.render.com** e inicia sesión.
2. En la lista de servicios, abre el que es el **frontend** (por ejemplo “mini-crm-frontend” o el que tenga **Static Site**).
3. Comprueba que aparece un **deploy nuevo** (se suele disparar solo al hacer `git push`). Si no:
   - Pulsa **Manual Deploy** → **Deploy latest commit**.
4. Espera a que el estado pase a **Live** (verde). Puede tardar 1–2 minutos.

---

## 6. Probar en el navegador

1. Abre **https://monexaysa.lat** (o la URL que uses).
2. Si quieres evitar caché: **Ctrl+Shift+R** (o Cmd+Shift+R en Mac) para recarga forzada.
3. Entra a **Prospección** (o la sección que antes daba error).
4. La primera vez puede tardar hasta ~1 minuto en cargar (backend despertando). Luego debería ir bien.

---

## Si algo falla

- **“git no es un comando”**  
  Instala Git: https://git-scm.com/downloads

- **“not a git repository”**  
  La carpeta no es un repo. Crea uno:
  ```bash
  git init
  git remote add origin https://github.com/asoberanesm-hub/mini-crm.git
  ```
  Luego añade los archivos, commit y push (y en Render conecta el repo si no lo has hecho).

- **El deploy en Render no se inicia**  
  En Render → tu servicio frontend → **Settings** → revisa que esté conectado al repo correcto y a la rama `main` (o `master`). Luego **Manual Deploy** → **Deploy latest commit**.

- **Sigue saliendo el error**  
  1. **Comprueba la variable de entorno:** En Render → **mini-crm-frontend** → **Environment**. Tiene que existir `VITE_API_URL` = `https://mini-crm-ru98.onrender.com` (o la URL de tu backend). Si no está, añádela y haz **Manual Deploy** otra vez (ver sección 0 arriba).  
  2. Espera 2–3 minutos tras el deploy y haz recarga forzada (Ctrl+Shift+R). Si el backend en Render está “dormido”, la primera carga puede tardar hasta ~90 segundos; no cierres la pestaña hasta que cargue o salga el mensaje de error nuevo (“tras varios intentos”).
