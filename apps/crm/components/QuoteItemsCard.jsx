'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Receipt } from 'lucide-react';
import { Button, Card } from '@webfudge/ui';
import productService from '../lib/api/productService';
import { canWriteCRM } from '../lib/rbac';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

/** Catalogue quote lines with GST breakup + one-click conversion to a draft GST invoice (G13). */
export default function QuoteItemsCard({ proposal, onConverted }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lines = Array.isArray(proposal?.lineItems) ? proposal.lineItems : [];
  if (!lines.length) return null;
  const t = proposal.quoteTotals || {};
  const invoiceId = proposal.convertedInvoice?.id ?? proposal.convertedInvoice ?? null;
  const canConvert = canWriteCRM('client_invoices') && !['pending', 'rejected'].includes(proposal.approval?.state);

  const convert = async () => {
    setBusy(true);
    setError('');
    try {
      const { invoice } = await productService.convertQuoteToInvoice(proposal.id);
      onConverted?.(invoice);
      if (invoice?.id) router.push(`/clients/invoices/${invoice.id}`);
    } catch (e) {
      setError(e?.message || 'Could not create the invoice');
      setBusy(false);
    }
  };

  return (
    <Card variant="elevated" className="space-y-4 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <FileText className="h-5 w-5 text-orange-600" aria-hidden />
          Quote items
        </h3>
        {invoiceId ? (
          <Link href={`/clients/invoices/${invoiceId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            <Receipt className="h-4 w-4" aria-hidden />
            Invoice raised. Open it
          </Link>
        ) : canConvert ? (
          <Button onClick={convert} disabled={busy}>
            <Receipt className="mr-1 h-4 w-4" aria-hidden />
            {busy ? 'Creating invoice…' : 'Convert to invoice'}
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-2 py-2 font-medium">Item</th>
              <th className="px-2 py-2 font-medium">HSN/SAC</th>
              <th className="px-2 py-2 text-right font-medium">Qty</th>
              <th className="px-2 py-2 text-right font-medium">Price</th>
              <th className="px-2 py-2 text-right font-medium">Disc</th>
              <th className="px-2 py-2 text-right font-medium">Taxable</th>
              <th className="px-2 py-2 text-right font-medium">GST</th>
              <th className="px-2 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-2 py-2 text-gray-900">{l.name}</td>
                <td className="px-2 py-2 tabular-nums text-gray-600">{l.hsnSac || '—'}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {l.qty} {l.unit}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{inr.format(l.unitPrice)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{l.discountPct ? `${l.discountPct}%` : '—'}</td>
                <td className="px-2 py-2 text-right tabular-nums">{inr.format(l.taxable)}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {l.gstRate}% · {inr.format(l.tax)}
                </td>
                <td className="px-2 py-2 text-right font-medium tabular-nums">{inr.format(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Taxable value</span>
          <span className="tabular-nums">{inr.format(t.subtotal || 0)}</span>
        </div>
        {t.supply === 'intra' ? (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600">CGST</span>
              <span className="tabular-nums">{inr.format(t.cgst || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">SGST</span>
              <span className="tabular-nums">{inr.format(t.sgst || 0)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span className="text-gray-600">IGST</span>
            <span className="tabular-nums">{inr.format(t.igst || t.taxTotal || 0)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{inr.format(t.total || 0)}</span>
        </div>
      </div>
    </Card>
  );
}
