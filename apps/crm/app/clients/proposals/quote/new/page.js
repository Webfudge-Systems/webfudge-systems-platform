'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '@webfudge/ui';
import CRMPageHeader from '../../../../../components/CRMPageHeader';
import productService, { priceFor } from '../../../../../lib/api/productService';
import proposalService from '../../../../../lib/api/proposalService';
import clientAccountService from '../../../../../lib/api/clientAccountService';
import { GST_RATES, calculateQuote, isValidGstin } from '../../../../../lib/gst';
import { canWriteCRM } from '../../../../../lib/rbac';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';
const cell = 'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none';
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

let lineSeq = 1;
const blankLine = () => ({ key: lineSeq++, productId: null, name: '', hsnSac: '', unit: 'Nos', qty: '1', unitPrice: '', discountPct: '', gstRate: 18 });

export default function NewCatalogueQuotePage() {
  const router = useRouter();
  const canWrite = canWriteCRM('proposals');
  const [products, setProducts] = useState(null);
  const [books, setBooks] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [bookId, setBookId] = useState('');
  const [form, setForm] = useState({
    title: '',
    clientAccount: '',
    clientCompanyName: '',
    clientContactName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    buyerGstin: '',
    preparedByCompany: '',
    preparedByName: '',
    preparedByEmail: '',
    sellerGstin: '',
    date: today(),
    validUntil: plusDays(15),
    paymentTerms: '100% on invoice, due in 15 days',
    notes: '',
  });
  const [lines, setLines] = useState([blankLine()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      productService.list({ activeOnly: true }),
      productService.listPriceBooks(),
      clientAccountService.getAll({ 'pagination[pageSize]': 200 }).catch(() => ({ data: [] })),
    ])
      .then(([p, b, a]) => {
        setProducts(p);
        setBooks(b);
        setBookId(String(b.find((x) => x.isDefault)?.id || ''));
        setAccounts(Array.isArray(a?.data) ? a.data : []);
      })
      .catch((e) => {
        setProducts([]);
        setError(e?.message || 'Could not load the catalogue');
      });
  }, []);

  const book = books.find((b) => String(b.id) === String(bookId)) || null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLine = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pickProduct = (key, productId) => {
    const p = products.find((x) => String(x.id) === String(productId));
    if (!p) return setLine(key, { productId: null });
    setLine(key, { productId: p.id, name: p.name, hsnSac: p.hsnSac, unit: p.unit, unitPrice: String(priceFor(p, book)), gstRate: p.gstRate });
  };

  // re-price catalogue lines when the price book changes
  useEffect(() => {
    if (!products) return;
    setLines((ls) =>
      ls.map((l) => {
        const p = l.productId && products.find((x) => x.id === l.productId);
        return p ? { ...l, unitPrice: String(priceFor(p, book)) } : l;
      })
    );
  }, [book, products]);

  const pickAccount = (id) => {
    const a = accounts.find((x) => String(x.id) === String(id));
    setForm((f) => ({
      ...f,
      clientAccount: id,
      ...(a
        ? {
            clientCompanyName: a.companyName || '',
            clientEmail: a.email || f.clientEmail,
            clientPhone: a.phone || f.clientPhone,
            clientAddress: [a.address, a.city, a.state].filter(Boolean).join(', ') || f.clientAddress,
          }
        : {}),
    }));
  };

  const calc = useMemo(() => calculateQuote(lines.filter((l) => l.name), form.sellerGstin, form.buyerGstin), [lines, form.sellerGstin, form.buyerGstin]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const used = lines.filter((l) => l.name.trim());
    if (!form.clientCompanyName.trim()) return setError('Add the client company');
    if (!used.length) return setError('Add at least one line');
    if (form.sellerGstin && !isValidGstin(form.sellerGstin)) return setError('Your GSTIN looks wrong (15 characters, e.g. 27ABCDE1234F1Z5)');
    if (form.buyerGstin && !isValidGstin(form.buyerGstin)) return setError("Client's GSTIN looks wrong (15 characters)");
    setBusy(true);
    try {
      const res = await proposalService.create({
        ...form,
        sellerGstin: form.sellerGstin.trim().toUpperCase() || null,
        buyerGstin: form.buyerGstin.trim().toUpperCase() || null,
        clientAccount: form.clientAccount || null,
        title: form.title.trim() || `Quote for ${form.clientCompanyName.trim()}`,
        documentType: 'QUOTE',
        creationMode: 'BUILDER',
        status: 'DRAFT',
        currency: 'INR',
        proposalNumber: `QT-${Date.now().toString().slice(-6)}`,
        taxInfo: calc.intra ? 'CGST + SGST' : form.sellerGstin ? 'IGST' : 'GST',
        lineItems: used.map((l) => ({
          productId: l.productId,
          name: l.name,
          hsnSac: l.hsnSac,
          unit: l.unit,
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice) || 0,
          discountPct: Number(l.discountPct) || 0,
          gstRate: Number(l.gstRate),
        })),
        modules: [],
      });
      router.push(res?.id ? `/clients/proposals/${res.id}` : '/clients/proposals');
    } catch (err) {
      setError(err?.message || 'Could not save the quote');
      setBusy(false);
    }
  };

  if (!canWrite) return <p className="p-6 text-sm text-gray-600">You don&apos;t have permission to create quotes.</p>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="New quote from catalogue"
        subtitle="Pick products, set quantities and discounts; GST is worked out per line"
        breadcrumb={[
          { label: 'Clients', href: '/clients' },
          { label: 'Proposals', href: '/clients/proposals' },
          { label: 'New quote', href: '/clients/proposals/quote/new' },
        ]}
      />
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {products === null ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <form onSubmit={save} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-3 border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900">Client</h2>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Client account (optional)</span>
                <select className={inputClass} value={form.clientAccount} onChange={(e) => pickAccount(e.target.value)}>
                  <option value="">Not linked</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.companyName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Company</span>
                  <input className={inputClass} value={form.clientCompanyName} onChange={(e) => set('clientCompanyName', e.target.value)} required />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Contact person</span>
                  <input className={inputClass} value={form.clientContactName} onChange={(e) => set('clientContactName', e.target.value)} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Email</span>
                  <input type="email" className={inputClass} value={form.clientEmail} onChange={(e) => set('clientEmail', e.target.value)} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Client GSTIN</span>
                  <input className={inputClass} value={form.buyerGstin} onChange={(e) => set('buyerGstin', e.target.value.toUpperCase())} placeholder="29ABCDE1234F1Z5" maxLength={15} />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Billing address</span>
                <input className={inputClass} value={form.clientAddress} onChange={(e) => set('clientAddress', e.target.value)} />
              </label>
            </Card>
            <Card className="space-y-3 border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900">Quote</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium text-gray-700">Title</span>
                  <input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Website + hosting, FY 26-27" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Your company</span>
                  <input className={inputClass} value={form.preparedByCompany} onChange={(e) => set('preparedByCompany', e.target.value)} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Your GSTIN</span>
                  <input className={inputClass} value={form.sellerGstin} onChange={(e) => set('sellerGstin', e.target.value.toUpperCase())} placeholder="27ABCDE1234F1Z5" maxLength={15} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Date</span>
                  <input type="date" className={inputClass} value={form.date} onChange={(e) => set('date', e.target.value)} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Valid until</span>
                  <input type="date" className={inputClass} value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium text-gray-700">Price book</span>
                  <select className={inputClass} value={bookId} onChange={(e) => setBookId(e.target.value)}>
                    <option value="">List prices</option>
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {b.isDefault ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </Card>
          </div>

          <Card className="space-y-3 border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Items</h2>
              {!products.length ? (
                <a href="/settings/products" className="text-sm font-medium text-orange-600 hover:text-orange-700">
                  Add products to the catalogue →
                </a>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-1 py-2 font-medium">Product</th>
                    <th className="px-1 py-2 font-medium">Item</th>
                    <th className="px-1 py-2 font-medium">HSN/SAC</th>
                    <th className="px-1 py-2 font-medium">Qty</th>
                    <th className="px-1 py-2 font-medium">Price</th>
                    <th className="px-1 py-2 font-medium">Disc %</th>
                    <th className="px-1 py-2 font-medium">GST</th>
                    <th className="px-1 py-2 text-right font-medium">Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const row = calc.rows.find((r) => r.key === l.key);
                    return (
                      <tr key={l.key} className="border-b border-gray-100 align-top">
                        <td className="w-48 px-1 py-2">
                          <select className={cell} value={l.productId || ''} onChange={(e) => pickProduct(l.key, e.target.value)} aria-label="Product">
                            <option value="">Custom item</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="min-w-[10rem] px-1 py-2">
                          <input className={cell} value={l.name} onChange={(e) => setLine(l.key, { name: e.target.value })} aria-label="Item name" />
                        </td>
                        <td className="w-24 px-1 py-2">
                          <input className={cell} value={l.hsnSac} onChange={(e) => setLine(l.key, { hsnSac: e.target.value.replace(/\D/g, '').slice(0, 8) })} aria-label="HSN/SAC" />
                        </td>
                        <td className="w-20 px-1 py-2">
                          <input className={cell} value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} inputMode="decimal" aria-label="Quantity" />
                        </td>
                        <td className="w-28 px-1 py-2">
                          <input className={cell} value={l.unitPrice} onChange={(e) => setLine(l.key, { unitPrice: e.target.value })} inputMode="decimal" aria-label="Unit price" />
                        </td>
                        <td className="w-20 px-1 py-2">
                          <input className={cell} value={l.discountPct} onChange={(e) => setLine(l.key, { discountPct: e.target.value })} inputMode="decimal" aria-label="Discount percent" />
                        </td>
                        <td className="w-24 px-1 py-2">
                          <select className={cell} value={l.gstRate} onChange={(e) => setLine(l.key, { gstRate: Number(e.target.value) })} aria-label="GST rate">
                            {GST_RATES.map((r) => (
                              <option key={r} value={r}>
                                {r}%
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="w-32 px-1 py-2 text-right tabular-nums text-gray-900">{row ? inr.format(row.amount) : '—'}</td>
                        <td className="px-1 py-2">
                          {lines.length > 1 ? (
                            <button type="button" className="rounded p-1.5 text-red-500 hover:bg-red-50" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove line">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" onClick={() => setLines((ls) => [...ls, blankLine()])}>
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Add line
            </Button>
            <div className="ml-auto w-full max-w-sm space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Taxable value</span>
                <span className="tabular-nums">{inr.format(calc.subtotal)}</span>
              </div>
              {calc.intra ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CGST</span>
                    <span className="tabular-nums">{inr.format(calc.tax / 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SGST</span>
                    <span className="tabular-nums">{inr.format(calc.tax / 2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-gray-600">{form.sellerGstin ? 'IGST' : 'GST'}</span>
                  <span className="tabular-nums">{inr.format(calc.tax)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-1 text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{inr.format(calc.total)}</span>
              </div>
              <p className="text-xs text-gray-500">
                {form.sellerGstin
                  ? calc.intra
                    ? 'Same state as the client: CGST + SGST.'
                    : 'Different state: IGST.'
                  : 'Add your GSTIN to split CGST/SGST vs IGST.'}
              </p>
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/clients/proposals')} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save quote'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
