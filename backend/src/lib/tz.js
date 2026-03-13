/**
 * Zona horaria del CRM: América/Chihuahua (UTC-6).
 * Todas las fechas se guardan en UTC en BD; las "horas locales" (ej. 10:00 seguimiento)
 * se convierten a UTC con este offset para que el calendario muestre la hora correcta.
 */
const TZ_OFFSET_HOURS = 6

/** Inicio del día en hora local (00:00 Chihuahua) en UTC. */
function startOfDayLocalUTC(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d, TZ_OFFSET_HOURS, 0, 0, 0))
}

/** Fin del día en hora local (23:59:59 Chihuahua) en UTC. */
function endOfDayLocalUTC(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d + 1, TZ_OFFSET_HOURS - 1, 59, 59, 999))
}

/** Hora local 10:00 (seguimiento prospectos) en UTC para la fecha dada. */
function seguimiento10LocalUTC(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d, 10 + TZ_OFFSET_HOURS, 0, 0, 0))
}

/** Hora local 9:00 (VMTO/cursos) en UTC para la fecha dada. (m = 1-12) */
function nueveLocalUTC(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d, 9 + TZ_OFFSET_HOURS, 0, 0, 0))
}

/** Dado un Date (ej. fecha límite), devuelve ese día a las 9:00 hora local en UTC. */
function dateTo9LocalUTC(date) {
  const d = new Date(date)
  return nueveLocalUTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

export {
  TZ_OFFSET_HOURS,
  startOfDayLocalUTC,
  endOfDayLocalUTC,
  seguimiento10LocalUTC,
  nueveLocalUTC,
  dateTo9LocalUTC,
}
