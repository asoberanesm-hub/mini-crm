import { Resend } from 'resend'

function getConfig() {
  const apiKey = process.env.RESEND_API_KEY || ''
  const fromAddress = process.env.EMAIL_FROM || process.env.MAIL_FROM || 'Aysa CRM <noreply@monexaysa.lat>'
  return { apiKey, fromAddress, resend: apiKey ? new Resend(apiKey) : null }
}

/**
 * Envía un correo con Resend usando el dominio monexaysa.lat.
 * @param {Object} opts - { to: string | string[], subject: string, html?: string, text?: string, replyTo?: string }
 * @returns {Promise<{ id?: string, error?: string }>}
 */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  const { resend, fromAddress } = getConfig()
  if (!resend) {
    return { error: 'RESEND_API_KEY no configurada. Añádela en backend/.env' }
  }
  const toList = Array.isArray(to) ? to : [to]
  if (!toList.length || !subject) {
    return { error: 'Faltan "to" o "subject"' }
  }
  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: toList,
      subject,
      html: html || (text ? `<pre>${text.replace(/</g, '&lt;')}</pre>` : undefined),
      text: text || undefined,
      replyTo: replyTo || undefined,
    })
    if (error) return { error: error.message }
    return { id: data?.id }
  } catch (e) {
    return { error: e?.message || String(e) }
  }
}

export function isEmailConfigured() {
  return Boolean(getConfig().apiKey)
}
