import { Router } from 'express'
import { z } from 'zod'
import { sendEmail, isEmailConfigured } from '../lib/email.js'

const router = Router()

const sendSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
  replyTo: z.string().email().optional(),
})

const TEST_EMAIL_TO = 'asoberanesm@gmail.com'

router.get('/status', (_, res) => {
  res.json({ configured: isEmailConfigured() })
})

router.post('/test', async (_, res) => {
  const result = await sendEmail({
    to: TEST_EMAIL_TO,
    subject: 'Prueba Aysa CRM – monexaysa.lat',
    html: '<p>Hola,</p><p>Este es un correo de prueba desde el backend de Aysa CRM (Resend + monexaysa.lat).</p><p>Si lo recibes, el envío está configurado correctamente.</p>',
    text: 'Prueba desde Aysa CRM (monexaysa.lat). Si lo recibes, el envío está bien configurado.',
  })
  if (result.error) {
    return res.status(500).json({ ok: false, error: result.error })
  }
  res.json({ ok: true, message: 'Correo de prueba enviado a ' + TEST_EMAIL_TO, id: result.id })
})

router.post('/send', async (req, res) => {
  const parsed = sendSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const { to, subject, html, text, replyTo } = parsed.data
  const result = await sendEmail({ to, subject, html, text, replyTo })
  if (result.error) {
    return res.status(500).json({ error: result.error })
  }
  res.json({ ok: true, id: result.id })
})

export default router
