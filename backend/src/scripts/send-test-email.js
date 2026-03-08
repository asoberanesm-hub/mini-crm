import dotenv from 'dotenv'
import { join } from 'path'
import { sendEmail } from '../lib/email.js'

dotenv.config({ path: join(process.cwd(), '.env') })

const to = 'asoberanesm@gmail.com'
const result = await sendEmail({
  to,
  subject: 'Prueba Aysa CRM – monexaysa.lat',
  html: '<p>Hola,</p><p>Este es un correo de prueba desde el backend de Aysa CRM (Resend + monexaysa.lat).</p><p>Si lo recibes, el envío está configurado correctamente.</p>',
  text: 'Prueba desde Aysa CRM (monexaysa.lat). Si lo recibes, el envío está bien configurado.',
})
if (result.error) {
  console.error('Error:', result.error)
  process.exit(1)
}
console.log('Correo enviado a', to, '| id:', result.id)
