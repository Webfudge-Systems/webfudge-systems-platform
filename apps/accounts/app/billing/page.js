'use client'

import { CreditCard } from 'lucide-react'
import AccountsModuleShell from '../../components/AccountsModuleShell'

export default function BillingPage() {
  return (
    <AccountsModuleShell
      title="Billing & Subscriptions"
      subtitle="Plan management, seat utilization, invoices, and payment methods."
      breadcrumb={[{ label: 'Billing', href: '/billing' }]}
      icon={CreditCard}
      description="Billing UI shell is ready for Razorpay/Stripe adapters through billing service abstraction."
    />
  )
}
