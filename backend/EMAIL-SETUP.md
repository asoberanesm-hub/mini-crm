# Configurar correo con Resend y dominio monexaysa.lat

## 1. Cuenta y API Key en Resend

1. Entra en **https://resend.com** y crea una cuenta (o inicia sesión).
2. Ve a **API Keys** → **Create API Key**. Copia la clave (solo se muestra una vez).
3. En tu proyecto, en **backend/.env** añade:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   EMAIL_FROM=Aysa CRM <noreply@monexaysa.lat>
   ```

## 2. Verificar el dominio monexaysa.lat en Resend

1. En Resend: **Domains** → **Add Domain**.
2. Escribe: **monexaysa.lat** → Add.
3. Resend te mostrará **registros DNS** que debes añadir en Namecheap (SPF, DKIM, etc.). Anota cada uno:
   - **Tipo** (TXT, CNAME, etc.)
   - **Nombre/Host** (ej: `@`, `resend._domainkey`, etc.)
   - **Valor** (ej: texto largo para DKIM)

## 3. Añadir los registros en Namecheap

1. Entra en **Namecheap** → **Domain List** → **monexaysa.lat** → **Manage** → **Advanced DNS**.
2. Para cada registro que Resend te indique:
   - **Add New Record**
   - **Type**: el que diga Resend (TXT, CNAME, etc.)
   - **Host**: el que diga Resend (a veces `@` para la raíz, o un subdominio como `resend._domainkey`)
   - **Value**: el valor exacto que dé Resend
   - **TTL**: 1 min o Automatic
3. **Save All Changes**.
4. La verificación en Resend puede tardar unos minutos (hasta 48 h en casos raros). En Resend, **Domains** → tu dominio debería pasar a **Verified**.

## 4. Envío desde el backend

- **Estado del servicio:** `GET /api/v1/email/status` → `{ "configured": true }` si `RESEND_API_KEY` está definida.
- **Enviar correo:** `POST /api/v1/email/send` con body JSON:
  ```json
  {
    "to": "destino@ejemplo.com",
    "subject": "Asunto",
    "html": "<p>Contenido HTML</p>",
    "text": "Versión texto plano (opcional)"
  }
  ```
  Opcional: `"replyTo": "respuesta@monexaysa.lat"`, `"to": ["a@x.com","b@x.com"]`.

## 5. En Render (producción)

En el **backend** en Render → **Environment** añade:

- `RESEND_API_KEY` = tu API Key de Resend
- `EMAIL_FROM` = `Aysa CRM <noreply@monexaysa.lat>`

Tras guardar, redeploy del backend.

## Nodemailer (opcional)

Si más adelante quieres usar Nodemailer como interfaz, se puede crear un transport que use Resend por debajo (p. ej. con un adaptador o llamando a la API de Resend desde Nodemailer). Por ahora el envío se hace con el SDK de Resend en `src/lib/email.js`.
