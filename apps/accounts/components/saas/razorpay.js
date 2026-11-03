'use client'

const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js'
let loading = null

/** Loads Razorpay Checkout once. */
export function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Not in a browser'))
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT
      script.async = true
      script.onload = () => resolve(window.Razorpay)
      script.onerror = () => {
        loading = null
        reject(new Error('Could not load the payment window. Check your connection and try again.'))
      }
      document.body.appendChild(script)
    })
  }
  return loading
}

/**
 * Opens Checkout for an order created by POST /api/billing/checkout.
 * Resolves with Razorpay's response on success, or null if the person closes the window.
 */
export async function payWithRazorpay(order) {
  const Razorpay = await loadRazorpay()
  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      order_id: order.orderId,
      prefill: order.prefill,
      notes: order.notes,
      theme: { color: '#F5630F' },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => resolve(null), confirm_close: true },
    })
    checkout.on('payment.failed', (response) => {
      reject(new Error(response?.error?.description || 'The payment did not go through. You have not been charged.'))
    })
    checkout.open()
  })
}
