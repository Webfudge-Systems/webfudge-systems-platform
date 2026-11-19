'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Printer } from 'lucide-react'
import { Alert, Button, LoadingBlock, PageFrame } from '../../../../components/saas/console'
import { PLAN_LABEL } from '../../../../components/saas/appStatus'
import { api, APP_META, formatDate, formatINR } from '../../../../lib/saas'

export default function InvoicePage() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/api/billing/invoices/${id}`)
      .then((d) => setInvoice(d.invoice))
      .catch((e) => setError(e.message))
  }, [id])

  const header = {
    title: invoice ? `Invoice ${invoice.invoiceNumber}` : 'Invoice',
    subtitle: 'GST tax invoice for your Webfudge subscription',
    breadcrumb: [
      { label: 'Apps & billing', href: '/billing' },
      { label: 'Invoice', href: `/billing/invoices/${id}` },
    ],
  }

  if (error) return <PageFrame {...header}><Alert>{error}</Alert></PageFrame>
  if (!invoice) return <PageFrame {...header}><LoadingBlock /></PageFrame>

  const billTo = invoice.billTo || {}
  const address = [billTo.addressLine1, billTo.addressLine2, [billTo.city, billTo.state, billTo.pincode].filter(Boolean).join(', ')].filter(Boolean)
  const gstPct = invoice.amountSubtotal ? Math.round((invoice.taxAmount / invoice.amountSubtotal) * 100) : 18
  const intraState = Boolean(billTo.state) && billTo.state.toLowerCase() === String(invoice.seller.state || '').toLowerCase()

  return (
    <PageFrame
      {...header}
      actions={
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" /> Print or save as PDF
        </Button>
      }
    >
      {/* Print only the invoice, not the console sidebar and header around it. */}
      <style>{`@media print { body * { visibility: hidden !important; } #wf-invoice, #wf-invoice * { visibility: visible !important; } #wf-invoice { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>

      <article id="wf-invoice" className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 sm:p-10 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-gray-200 pb-6">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/webfudge-horizontal-color.svg" alt="Webfudge Systems" className="h-9 w-auto" />
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              {invoice.seller.name}
              <br />
              {invoice.seller.address}
              {invoice.seller.gstin && (
                <>
                  <br />GSTIN {invoice.seller.gstin}
                </>
              )}
              <br />
              {invoice.seller.email}
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-semibold tracking-tight">Tax invoice</h1>
            <p className="mt-1 text-sm text-gray-500">{invoice.invoiceNumber}</p>
            <p className="text-sm text-gray-500">Paid {formatDate(invoice.paidAt)}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-gray-200 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Billed to</p>
            <p className="mt-2 font-semibold">{billTo.legalName || invoice.organization.name}</p>
            <p className="text-sm leading-relaxed text-gray-500">
              {address.map((line) => (
                <span key={line} className="block">{line}</span>
              ))}
              {billTo.gstin && <span className="block">GSTIN {billTo.gstin}</span>}
              {billTo.email && <span className="block">{billTo.email}</span>}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Service period</p>
            <p className="mt-2 text-sm">
              {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
            </p>
            {invoice.razorpayPaymentId && <p className="mt-2 text-sm text-gray-500">Payment ref. {invoice.razorpayPaymentId}</p>}
          </div>
        </section>

        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="text-[13px] text-gray-500">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="py-3">
                <span className="font-semibold">Webfudge {APP_META[invoice.app]?.name || invoice.appName}</span> — {PLAN_LABEL[invoice.planCode]} plan
                <span className="block text-[13px] text-gray-500">{invoice.description}
                  {invoice.seller.sac ? ` · SAC ${invoice.seller.sac}` : ''}</span>
              </td>
              <td className="py-3 text-right">{formatINR(invoice.amountSubtotal + (invoice.credit || 0), { decimals: 2 })}</td>
            </tr>
            {invoice.credit > 0 && (
              <tr className="border-t border-gray-100">
                <td className="py-3">Credit for unused time on the previous plan</td>
                <td className="py-3 text-right">−{formatINR(invoice.credit, { decimals: 2 })}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200">
              <td className="pt-4 text-gray-500">Taxable value</td>
              <td className="pt-4 text-right">{formatINR(invoice.amountSubtotal, { decimals: 2 })}</td>
            </tr>
            {intraState ? (
              <>
                <tr>
                  <td className="pt-1 text-gray-500">CGST ({gstPct / 2}%)</td>
                  <td className="pt-1 text-right">{formatINR(invoice.taxAmount / 2, { decimals: 2 })}</td>
                </tr>
                <tr>
                  <td className="pt-1 text-gray-500">SGST ({gstPct / 2}%)</td>
                  <td className="pt-1 text-right">{formatINR(invoice.taxAmount / 2, { decimals: 2 })}</td>
                </tr>
              </>
            ) : (
              <tr>
                <td className="pt-1 text-gray-500">IGST ({gstPct}%)</td>
                <td className="pt-1 text-right">{formatINR(invoice.taxAmount, { decimals: 2 })}</td>
              </tr>
            )}
            <tr className="text-lg font-semibold">
              <td className="pt-3">Total paid</td>
              <td className="pt-3 text-right">{formatINR(invoice.amountTotal, { decimals: 2 })}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-10 text-xs leading-relaxed text-[#8A8A8A]">This is a computer-generated invoice and needs no signature.</p>
      </article>
    </PageFrame>
  )
}
