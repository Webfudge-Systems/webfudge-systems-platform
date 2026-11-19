'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import productService from '../../../lib/api/productService';
import { GST_RATES } from '../../../lib/gst';
import { canManageCRM } from '../../../lib/rbac';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-gray-50';
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const EMPTY = { name: '', kind: 'service', hsnSac: '', unit: 'Nos', unitPrice: '', gstRate: 18, sku: '', description: '' };

function Banner({ tone, children }) {
  const cls = tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <p className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

function ProductForm({ initial, onSave, onCancel, busy }) {
  const [d, setD] = useState({ ...EMPTY, ...initial, unitPrice: initial?.unitPrice ?? '' });
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  return (
    <form
      className="grid gap-3 md:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...d, unitPrice: Number(d.unitPrice) || 0, gstRate: Number(d.gstRate) });
      }}
    >
      <label className="text-sm md:col-span-2">
        <span className="mb-1 block font-medium text-gray-700">Name</span>
        <input className={inputClass} value={d.name} onChange={(e) => set('name', e.target.value)} required placeholder="Website design" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Type</span>
        <select className={inputClass} value={d.kind} onChange={(e) => set('kind', e.target.value)}>
          <option value="service">Service (SAC)</option>
          <option value="product">Product (HSN)</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">{d.kind === 'product' ? 'HSN' : 'SAC'}</span>
        <input className={inputClass} value={d.hsnSac} onChange={(e) => set('hsnSac', e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder={d.kind === 'product' ? '8471' : '998314'} inputMode="numeric" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Price (₹, excl. GST)</span>
        <input className={inputClass} value={d.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} inputMode="decimal" required />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">GST</span>
        <select className={inputClass} value={d.gstRate} onChange={(e) => set('gstRate', e.target.value)}>
          {GST_RATES.map((r) => (
            <option key={r} value={r}>
              {r}%
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Unit</span>
        <input className={inputClass} value={d.unit} onChange={(e) => set('unit', e.target.value)} placeholder="Nos, hrs, month" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">SKU (optional)</span>
        <input className={inputClass} value={d.sku} onChange={(e) => set('sku', e.target.value)} />
      </label>
      <label className="text-sm md:col-span-3">
        <span className="mb-1 block font-medium text-gray-700">Description (optional)</span>
        <input className={inputClass} value={d.description} onChange={(e) => set('description', e.target.value)} />
      </label>
      <div className="flex items-end justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={busy || !d.name.trim()}>
          {initial?.id ? 'Save' : 'Add product'}
        </Button>
      </div>
    </form>
  );
}

export default function ProductsSettingsPage() {
  const canEdit = canManageCRM('settings');
  const [products, setProducts] = useState(null);
  const [books, setBooks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [bookId, setBookId] = useState(null);
  const [bookPrices, setBookPrices] = useState({});
  const [newBook, setNewBook] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, b] = await Promise.all([productService.list(), productService.listPriceBooks()]);
      setProducts(p);
      setBooks(b);
    } catch (e) {
      setProducts([]);
      setMessage({ tone: 'error', text: e?.message || 'Could not load the catalogue' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const book = books.find((b) => b.id === bookId) || null;
  useEffect(() => {
    setBookPrices(Object.fromEntries(Object.entries(book?.prices || {}).map(([k, v]) => [k, String(v)])));
  }, [book]);

  const run = async (fn, okText) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      if (okText) setMessage({ tone: 'ok', text: okText });
      await load();
      return true;
    } catch (e) {
      setMessage({ tone: 'error', text: e?.message || 'Could not save' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Products & price books"
        subtitle="Your catalogue with HSN/SAC and GST, used to build quotes and invoices"
        breadcrumb={[
          { label: 'Settings', href: '/settings' },
          { label: 'Products & price books', href: '/settings/products' },
        ]}
      />
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}
      {!canEdit ? <Banner tone="error">Only CRM admins can change the catalogue. You can view it.</Banner> : null}

      {products === null ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <Card className="space-y-4 border border-gray-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">Catalogue ({products.length})</h2>
              {canEdit && !adding ? (
                <Button onClick={() => setAdding(true)}>
                  <Plus className="mr-1 h-4 w-4" aria-hidden />
                  New product
                </Button>
              ) : null}
            </div>
            {adding ? (
              <div className="rounded-lg border border-orange-200 bg-orange-50/40 p-4">
                <ProductForm
                  busy={busy}
                  onCancel={() => setAdding(false)}
                  onSave={async (d) => {
                    if (await run(() => productService.create(d), `"${d.name}" added.`)) setAdding(false);
                  }}
                />
              </div>
            ) : null}
            {products.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-2 py-2 font-medium">Name</th>
                      <th className="px-2 py-2 font-medium">HSN/SAC</th>
                      <th className="px-2 py-2 text-right font-medium">Price</th>
                      <th className="px-2 py-2 text-right font-medium">GST</th>
                      <th className="px-2 py-2 font-medium">Unit</th>
                      <th className="px-2 py-2 font-medium">Active</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) =>
                      editing === p.id ? (
                        <tr key={p.id}>
                          <td colSpan={7} className="bg-orange-50/40 p-3">
                            <ProductForm
                              initial={p}
                              busy={busy}
                              onCancel={() => setEditing(null)}
                              onSave={async (d) => {
                                if (await run(() => productService.update(p.id, d), 'Saved.')) setEditing(null);
                              }}
                            />
                          </td>
                        </tr>
                      ) : (
                        <tr key={p.id} className="border-b border-gray-100">
                          <td className="px-2 py-2">
                            <p className="font-medium text-gray-900">{p.name}</p>
                            {p.description ? <p className="text-xs text-gray-500">{p.description}</p> : null}
                          </td>
                          <td className="px-2 py-2 tabular-nums text-gray-700">{p.hsnSac || '—'}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{inr.format(p.unitPrice)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{p.gstRate}%</td>
                          <td className="px-2 py-2 text-gray-700">{p.unit}</td>
                          <td className="px-2 py-2">
                            <input
                              type="checkbox"
                              checked={p.active}
                              disabled={!canEdit || busy}
                              onChange={(e) => run(() => productService.update(p.id, { active: e.target.checked }))}
                              aria-label={`${p.name} active`}
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            {canEdit ? (
                              <>
                                <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-gray-100" onClick={() => setEditing(p.id)} aria-label={`Edit ${p.name}`}>
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  className="rounded p-1.5 text-red-500 hover:bg-red-50"
                                  onClick={() => window.confirm(`Delete "${p.name}"? Existing quotes and invoices keep their copy.`) && run(() => productService.remove(p.id), 'Deleted.')}
                                  aria-label={`Delete ${p.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            ) : null}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">No products yet. Add the services and products you quote for.</p>
            )}
          </Card>

          <Card className="space-y-4 border border-gray-200 p-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Price books</h2>
              <p className="mt-1 text-sm text-gray-600">
                Alternate price lists (e.g. Partner, Government, Retail). Quotes pick a price book; products without a price here use the list price.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {books.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBookId(b.id === bookId ? null : b.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${b.id === bookId ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-300 text-gray-700'}`}
                >
                  {b.isDefault ? <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" aria-label="Default" /> : null}
                  {b.name}
                </button>
              ))}
              {canEdit ? (
                <form
                  className="flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newBook.trim()) return;
                    if (await run(() => productService.createPriceBook({ name: newBook.trim() }), 'Price book added.')) setNewBook('');
                  }}
                >
                  <input className={`${inputClass} w-48`} value={newBook} onChange={(e) => setNewBook(e.target.value)} placeholder="New price book" aria-label="New price book name" />
                  <Button type="submit" variant="outline" disabled={!newBook.trim() || busy}>
                    Add
                  </Button>
                </form>
              ) : null}
            </div>
            {book ? (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-2 py-2 font-medium">Product</th>
                        <th className="px-2 py-2 text-right font-medium">List price</th>
                        <th className="px-2 py-2 text-right font-medium">{book.name} price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id} className="border-b border-gray-100">
                          <td className="px-2 py-2 text-gray-900">{p.name}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-500">{inr.format(p.unitPrice)}</td>
                          <td className="px-2 py-2 text-right">
                            <input
                              className={`${inputClass} w-32 text-right`}
                              value={bookPrices[p.id] ?? ''}
                              placeholder="List price"
                              inputMode="decimal"
                              disabled={!canEdit}
                              aria-label={`${p.name} price in ${book.name}`}
                              onChange={(e) => setBookPrices((x) => ({ ...x, [p.id]: e.target.value }))}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={() => run(() => productService.updatePriceBook(book.id, { isDefault: !book.isDefault }), book.isDefault ? 'No longer the default.' : `${book.name} is now the default price book.`)} disabled={busy}>
                      {book.isDefault ? 'Remove default' : 'Make default'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.confirm(`Delete the price book "${book.name}"?`) && run(() => productService.removePriceBook(book.id), 'Price book deleted.').then(() => setBookId(null))}
                      disabled={busy}
                    >
                      Delete
                    </Button>
                    <Button
                      onClick={() =>
                        run(
                          () =>
                            productService.updatePriceBook(book.id, {
                              prices: Object.fromEntries(Object.entries(bookPrices).filter(([, v]) => String(v).trim() !== '').map(([k, v]) => [k, Number(v)])),
                            }),
                          'Prices saved.'
                        )
                      }
                      disabled={busy}
                    >
                      Save prices
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>
        </>
      )}
    </div>
  );
}
