# Fechas y horas en el CRM — Estrategia unificada

## Qué estaba causando el error

1. **Frontend enviaba hora “local” sin zona**  
   Se mandaba `"2026-03-15T10:00:00"` (sin `Z`). En el servidor (p. ej. Render en UTC), `new Date("2026-03-15T10:00:00")` se interpreta como **10:00 UTC**, no como 10:00 México. Se guardaba ese instante y al mostrarlo en México salía 4:00 o 5:00.

2. **Prospectos: fecha solo con mediodía UTC**  
   `fechaSeguimiento` se guardaba como `YYYY-MM-DD` → `T12:00:00.000Z`. Los eventos de seguimiento se generaban a las 10:00 en **hora del servidor** (UTC), por eso en el calendario aparecían a las 4:00 o 5:00 en México.

3. **VMTO y Cursos**  
   Se usaba 9:00 en hora del servidor (UTC), no 9:00 en hora local (México).

4. **toInputDate con `toISOString().slice(0,10)`**  
   En el cliente, eso da la fecha en **UTC**. Si el instante era 22:00 del día 15 en México (04:00 del 16 en UTC), el input mostraba el 16 en vez del 15.

## Estrategia adoptada

- **Base de datos y API:** todo se guarda y se transmite en **UTC** (ISO con `Z`).
- **Usuario:** todo se captura y se muestra en **hora local** (navegador = México/Chihuahua).
- **Zona de referencia en backend:** América/Chihuahua (UTC-6) para rangos de día y para “10:00 / 9:00” de seguimientos y VMTO/cursos.

Reglas:

1. **Frontend → Backend**  
   La hora que el usuario elige (fecha + hora local) se convierte a UTC y se envía en ISO:
   - `localStr = "YYYY-MM-DDTHH:mm:00"`
   - `dateTime = new Date(localStr).toISOString()`  
   Así el servidor siempre recibe un instante correcto en UTC.

2. **Backend**  
   - Recibe `dateTime` en ISO (con `Z` o offset) y hace `new Date(...)`. Se guarda tal cual en MongoDB (Date = UTC).
   - Rangos de día (from/to, date) se calculan en “día local” Chihuahua con `backend/src/lib/tz.js` (inicio/fin de día en UTC).
   - Seguimientos de prospectos: `fechaSeguimiento` se guarda como ese día a las **10:00 México** = `YYYY-MM-DDT16:00:00.000Z`, y el evento usa ese mismo `dateTime`.
   - VMTO y Cursos: el evento se arma a las **9:00 hora local** = 15:00 UTC para esa fecha (`dateTo9LocalUTC`).

3. **Backend → Frontend**  
   La API devuelve `dateTime` (y `endTime`) como Date serializados en ISO (con `Z`). El frontend hace `new Date(ev.dateTime)` y usa ese `Date` para el calendario y para formatear; el navegador lo muestra en hora local.

4. **Inputs de fecha en el frontend**  
   Para rellenar `<input type="date">` se usa la fecha **local** (año, mes, día con `getFullYear`, `getMonth`, `getDate`), no `toISOString().slice(0,10)`.

## Archivos modificados

### Backend

- **`backend/src/lib/tz.js`** (nuevo)  
  Constantes y helpers para día local Chihuahua: `startOfDayLocalUTC`, `endOfDayLocalUTC`, `dateTo9LocalUTC`, etc.

- **`backend/src/routes/agenda.js`**  
  - Uso de `tz.js` para rangos (GET por día y por from/to) y para construir eventos VMTO y Cursos con `dateTo9LocalUTC`.
  - Seguimientos de prospectos: `dateTime` del evento = `prospecto.fechaSeguimiento` (ya guardado como 10:00 México en UTC).
  - Logs de depuración en POST/PUT (solo si `NODE_ENV !== 'production'`).

- **`backend/src/routes/prospectos.js`**  
  - `parseDateOnly`: de `T12:00:00.000Z` a `T16:00:00.000Z` para que “ese día” sea a las 10:00 en México.

### Frontend

- **`frontend/src/pages/Agenda.jsx`**  
  - `toInputDate`: usa componentes de fecha local (`getFullYear`, `getMonth()+1`, `getDate()`) en lugar de `toISOString().slice(0,10)`.
  - Al crear evento: se arma `localStr` con fecha y hora local y se envía `dateTime: new Date(localStr).toISOString()` (y lo mismo para `endTime`).
  - Al actualizar: se obtiene un `Date` from `editingEvent.dateTime`, se formatea en local con `toInputDate`/`toInputTime`, se arma `localStr` y se envía `dateTime: new Date(localStr).toISOString()`.
  - Logs en desarrollo: `[Agenda] Crear evento` y `[Agenda] Actualizar evento` con `localStr` y `dateTime` enviado.

- **`frontend/src/components/CrearSeguimientoModal.jsx`**  
  - `toInputDate`: mismo criterio que en Agenda (fecha local).
  - Al crear evento de seguimiento (cliente): `dateTime = new Date(\`${fecha}T${hora}:00\`).toISOString()`.
  - Log en desarrollo: `[CrearSeguimiento] Cliente evento` con `localStr` y `dateTime`.

## Depuración

- **Frontend (solo en desarrollo):**  
  En consola del navegador verás:
  - `[Agenda] Crear evento:` { localStr, dateTime, … }
  - `[Agenda] Actualizar evento:` { localStr, dateTime }
  - `[CrearSeguimiento] Cliente evento:` { localStr, dateTime }

- **Backend (solo si NODE_ENV !== 'production'):**  
  En logs del servidor:
  - `[agenda POST] dateTime recibido:` … `→ guardado como:` ISO
  - `[agenda PUT] dateTime recibido:` … `→ guardado como:` ISO

Comprobación rápida: crear un evento el 15 de marzo a las 10:00; en consola debe verse un `dateTime` en UTC que, en México, corresponda a las 10:00 del 15 (p. ej. `…T16:00:00.000Z` si estás en UTC-6).

## Pruebas recomendadas

1. **Agenda:** Crear evento 15 marzo 10:00 → debe verse ese día a las 10:00 en el calendario.
2. **Prospectos:** Asignar fecha de seguimiento 15 marzo → en calendario debe aparecer ese día a las 10:00.
3. **CrearSeguimiento (cliente):** Fecha 15 marzo, hora 14:00 → evento en calendario el 15 a las 14:00.
4. **VMTO / Cursos:** Fechas en Productos Activos o Cursos → eventos en calendario a las 9:00 de ese día (hora local).
5. **Editar y reprogramar:** Cambiar hora de un evento y guardar → debe mantenerse la nueva hora en el calendario.

Si en algún módulo (Monex, Ana, Cita, Prospectos) se abre un formulario con fecha/hora y se envía a `/agenda`, hay que aplicar la misma regla: construir `Date` en local con la fecha/hora elegida y enviar `dateTime: thatDate.toISOString()`.
