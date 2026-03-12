import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { postApi } from '../lib/api'

const publishableKey = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim()
const stripePromise = publishableKey ? loadStripe(publishableKey) : null

function FormPago() {
  const stripe = useStripe()
  const elements = useElements()
  const [amount, setAmount] = useState(100)
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setMensaje(null)
    try {
      const { clientSecret } = await postApi('/stripe/create-payment-intent', { amount })
      const card = elements.getElement(CardElement)
      const { error } = await stripe.confirmCardPayment(clientSecret, { payment_method: { card } })
      if (error) {
        setMensaje(error.message || 'Error en el pago')
      } else {
        setMensaje('Pago completado correctamente.')
      }
    } catch (err) {
      setMensaje(err?.message || 'Error al procesar el pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Monto (MXN)</label>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 1)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tarjeta</label>
        <div className="p-3 border border-slate-300 rounded-lg bg-white">
          <CardElement
            options={{
              style: {
                base: { fontSize: '16px', color: '#1e293b' },
                invalid: { color: '#b91c1c' },
              },
            }}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-2 px-4 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Procesando…' : 'Pagar'}
      </button>
      {mensaje && (
        <p className={`text-sm ${mensaje.includes('completado') ? 'text-green-700' : 'text-red-700'}`}>
          {mensaje}
        </p>
      )}
    </form>
  )
}

export default function Pagar() {
  if (!publishableKey) {
    return (
      <div className="p-6 max-w-md">
        <h1 className="text-xl font-semibold text-slate-800 mb-2">Pagar</h1>
        <p className="text-slate-600 text-sm">
          Añade <code className="bg-slate-100 px-1 rounded">VITE_STRIPE_PUBLISHABLE_KEY</code> en <code className="bg-slate-100 px-1 rounded">frontend/.env</code>.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-slate-800 mb-2">Pagar</h1>
      <p className="text-slate-600 text-sm mb-6">Prueba con tarjeta 4242 4242 4242 4242 (entorno de prueba).</p>
      <Elements stripe={stripePromise}>
        <FormPago />
      </Elements>
    </div>
  )
}
