# Lo que tienes que hacer tú (2 pasos)

Ya está hecho el **commit** con el cambio de CITA en el backend y frontend. Solo te falta:

---

## 1. Subir el código a GitHub

En la terminal, desde la carpeta del proyecto:

```bash
cd "/Users/anasoberanes/Desktop/Escritorio - MacBook Air de Ana/mini crm"
git push origin main
```

(Si te pide usuario/contraseña o token de GitHub, úsalo.)

---

## 2. Redesplegar el backend en Render

1. Entra a **https://dashboard.render.com**
2. Abre el servicio del **backend** (el de `mini-crm-ru98.onrender.com`)
3. Arriba a la derecha: **Manual Deploy** → **Deploy latest commit**
4. Espera a que pase a estado **Live** (verde)

Listo. Después de eso podrás cambiar eventos de MONEX a CITA sin error.
