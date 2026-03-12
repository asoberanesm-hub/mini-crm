import { Router } from 'express'
import Stripe from 'stripe'

const router = Router()
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

/**
 * POST /api/v1/stripe/create-payment-intent
 * Body: { amount: number } (monto en pesos MXN; se convierte a centavos)
 * Devuelve: { clientSecret } para que el frontend confirme el pago con Stripe.js
 */
router.post('/create-payment-intent', async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe no configurado. Añade STRIPE_SECRET_KEY en backend/.env' })
    }
    const amountMxn = Math.max(1, Number(req.body?.amount) || 100)
    const amountCentavos = Math.round(amountMxn * 100)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCentavos,
      currency: 'mxn',
      automatic_payment_methods: { enabled: true },
    })
    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (e) {
    next(e)
  }
})

export default router
