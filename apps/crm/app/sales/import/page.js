'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Button, Card, PlanLimitNotice, UpgradePrompt, planErrorDetails } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import importService, { IMPORT_FIELDS, guessField } from '../../../lib/api/importService';
import useCustomFields from '../../../lib/useCustomFields';
import { readSpreadsheet, toCsv, downloadText } from '../../../lib/spreadsheet';
import { canWriteCRM } from '../../../lib/rbac';

const ENTITY_LABEL = { lead: 'lead companies', contact: 'contacts' };
const STEPS = ['Upload', 'Map columns', 'Review', 'Import'];
const selectCls =
  'w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';

function Steps({ current }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Import steps">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              i < current ? 'bg-emerald-500 text-white' : i === current ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}
            aria-current={i === current ? 'step' : undefined}
          >
            {i + 1}
          </span>
          <span className={i === current ? 'font-semibold text-gray-900' : 'text-gray-500'}>{s}</span>
          {i < STEPS.length - 1 ? <span className="mx-1 h-px w-6 bg-gray-300" aria-hidden /> : null}
        </li>
      ))}
    </ol>
  );
}

export default function ImportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entity = searchParams.get('entity') === 'contact' ? 'contact' : 'lead';
  const { fields: customFields } = useCustomFields(entity);
  const canImport = canWriteCRM(entity === 'contact' ? 'contacts' : 'leads');

  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [sheet, setSheet] = useState(null); // { headers, rows }
  const [mapping, setMapping] = useState([]); // field key per column
  const [duplicateMode, setDuplicateMode] = useState('skip');
  const [error, setError] = useState('');
  const [planPrompt, setPlanPrompt] = useState(null);
  const [job, setJob] = useState(null);
  const pollRef = useRef(null);

  const fieldOptions = useMemo(
    () => [
      ...IMPORT_FIELDS[entity].map((f) => ({ value: f.key, label: f.label + (f.required ? ' *' : '') })),
      ...customFields.map((f) => ({ value: `cf:${f.key}`, label: `${f.label} (custom)` })),
    ],
    [entity, customFields]
  );

  const onFile = async (f) => {
    setError('');
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) {
      setError('That file is over 15 MB. Split it into smaller files.');
      return;
    }
    try {
      const parsed = await readSpreadsheet(f);
      if (parsed.rows.length > 20000) throw new Error(`The file has ${parsed.rows.length.toLocaleString()} rows; the limit is 20,000 per import.`);
      setFile(f);
      setSheet(parsed);
      setMapping(parsed.headers.map((h) => guessField(entity, h, customFields)));
      setStep(1);
    } catch (e) {
      setError(e?.message || 'Could not read the file');
    }
  };

  const required = IMPORT_FIELDS[entity].filter((f) => f.required).map((f) => f.key);
  const mappedKeys = mapping.filter(Boolean);
  const dupMapped = mappedKeys.filter((k, i) => mappedKeys.indexOf(k) !== i);
  const missingRequired = required.some((k) => !mappedKeys.includes(k));

  const mappedRows = useMemo(() => {
    if (!sheet) return [];
    return sheet.rows.map((r) => {
      const o = {};
      mapping.forEach((key, i) => {
        if (key) o[key] = r[i] ?? '';
      });
      return o;
    });
  }, [sheet, mapping]);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };
  useEffect(() => stopPolling, []);

  const startImport = async () => {
    setError('');
    setPlanPrompt(null);
    try {
      const created = await importService.start({ entity, fileName: file?.name, duplicateMode, rows: mappedRows });
      setJob(created);
      setStep(3);
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const j = await importService.get(created.id);
          setJob(j);
          if (j.status === 'done' || j.status === 'failed') stopPolling();
        } catch {
          /* keep polling */
        }
      }, 1500);
    } catch (e) {
      const prompt = planErrorDetails(e);
      setPlanPrompt(prompt);
      setError(prompt ? '' : e?.message || 'Could not start the import');
    }
  };

  const downloadErrors = useCallback(() => {
    if (!job?.errorRows?.length || !sheet) return;
    const cols = sheet.headers;
    const header = ['Row', 'Problem', ...cols];
    const lines = job.errorRows.map((e) => [e.row, e.reason, ...sheet.rows[e.row - 2].map((v) => v)]);
    downloadText(`import-errors-${job.id}.csv`, toCsv([header, ...lines]));
  }, [job, sheet]);

  const downloadDuplicates = useCallback(() => {
    if (!job?.duplicateRows?.length || !sheet) return;
    const header = ['Row', 'Matches existing', 'Matched on', ...sheet.headers];
    const lines = job.duplicateRows.map((d) => [d.row, d.matchLabel, d.matchedOn, ...sheet.rows[d.row - 2]]);
    downloadText(`import-duplicates-${job.id}.csv`, toCsv([header, ...lines]));
  }, [job, sheet]);

  const back = entity === 'contact' ? '/sales/contacts' : '/sales/lead-companies';
  const pct = job?.total ? Math.round(((job.status === 'done' ? job.total : job.processed || 0) / job.total) * 100) : 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <CRMPageHeader
        title={`Import ${ENTITY_LABEL[entity]}`}
        subtitle="Upload a CSV or Excel file, match its columns, and we flag duplicates for you"
        breadcrumb={[
          { label: entity === 'contact' ? 'Contacts' : 'Lead companies', href: back },
          { label: 'Import', href: `/sales/import?entity=${entity}` },
        ]}
      />

      {!canImport ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">You don&apos;t have permission to add {ENTITY_LABEL[entity]}.</p>
      ) : null}

      <Steps current={step} />

      {/* SaaS: Grow Free plan contact limit (G16). */}
      {entity === 'contact' ? <PlanLimitNotice app="crm" limit="contacts" /> : null}
      {planPrompt ? <UpgradePrompt compact {...planPrompt} /> : null}

      {error ? (
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      {step === 0 ? (
        <Card className="border border-gray-200 p-6">
          <label
            htmlFor="import-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 px-6 py-12 text-center hover:border-orange-400"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files?.[0]);
            }}
          >
            <Upload className="h-8 w-8 text-orange-500" aria-hidden />
            <span className="text-sm font-semibold text-gray-900">Drop a .csv or .xlsx file here, or click to choose</span>
            <span className="text-xs text-gray-500">First row must be column headings · up to 20,000 rows</span>
            <input id="import-file" type="file" accept=".csv,.xlsx,text/csv" className="sr-only" disabled={!canImport} onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        </Card>
      ) : null}

      {step === 1 && sheet ? (
        <Card className="space-y-4 border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <FileSpreadsheet className="h-4 w-4 text-gray-500" aria-hidden />
            <span className="font-medium">{file?.name}</span> · {sheet.rows.length.toLocaleString()} rows · {sheet.headers.length} columns
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Column in your file</th>
                  <th className="py-2 pr-4">Sample</th>
                  <th className="py-2">Import as</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sheet.headers.map((h, i) => (
                  <tr key={`${h}-${i}`}>
                    <td className="py-2 pr-4 font-medium text-gray-900">{h}</td>
                    <td className="max-w-[220px] truncate py-2 pr-4 text-gray-500">{sheet.rows.find((r) => r[i])?.[i] || '—'}</td>
                    <td className="w-64 py-2">
                      <select
                        aria-label={`Import ${h} as`}
                        className={selectCls}
                        value={mapping[i] || ''}
                        onChange={(e) => setMapping((m) => m.map((v, j) => (j === i ? e.target.value : v)))}
                      >
                        <option value="">Don&apos;t import</option>
                        {fieldOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {missingRequired ? (
            <p className="text-sm text-amber-700">
              Map {entity === 'contact' ? 'First name (a full name works; it is split into first and last)' : 'Company name'} to continue.
            </p>
          ) : null}
          {dupMapped.length ? <p className="text-sm text-amber-700">Each field can only be used once.</p> : null}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button variant="primary" disabled={missingRequired || dupMapped.length > 0} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 2 && sheet ? (
        <Card className="space-y-5 border border-gray-200 p-6">
          <div>
            <h2 className="mb-2 text-base font-semibold text-gray-900">Preview (first 5 rows)</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {mapping.map((k, i) =>
                      k ? (
                        <th key={i} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">
                          {fieldOptions.find((o) => o.value === k)?.label}
                        </th>
                      ) : null
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sheet.rows.slice(0, 5).map((r, ri) => (
                    <tr key={ri}>
                      {mapping.map((k, i) => (k ? <td key={i} className="whitespace-nowrap px-3 py-2 text-gray-800">{r[i]}</td> : null))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-900">If a row matches an existing record (same email, phone or company name)</legend>
            <div className="space-y-2 text-sm">
              <label className="flex items-start gap-2">
                <input type="radio" name="dup" className="mt-0.5 accent-orange-500" checked={duplicateMode === 'skip'} onChange={() => setDuplicateMode('skip')} />
                <span>
                  <span className="font-medium">Skip it</span> and list it in the results so you can review or merge (recommended)
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" name="dup" className="mt-0.5 accent-orange-500" checked={duplicateMode === 'create'} onChange={() => setDuplicateMode('create')} />
                <span>
                  <span className="font-medium">Import it anyway</span> and list it as a possible duplicate
                </span>
              </label>
            </div>
          </fieldset>
          <p className="text-xs text-gray-500">
            Emails and phone numbers are checked; phones are saved in +91 format. Rows with problems are skipped and listed in a downloadable error file.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" onClick={startImport} disabled={!canImport}>
              Import {sheet.rows.length.toLocaleString()} rows
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 3 && job ? (
        <Card className="space-y-5 border border-gray-200 p-6">
          {job.status === 'done' ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" aria-hidden />
              <div>
                <h2 className="text-base font-semibold text-gray-900">Import finished</h2>
                <p className="text-sm text-gray-600">{job.message}</p>
              </div>
            </div>
          ) : job.status === 'failed' ? (
            <p className="text-sm text-red-700" role="alert">
              Import failed: {job.message}
            </p>
          ) : (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-800">
                Importing in the background… {(job.processed || 0).toLocaleString()} of {job.total.toLocaleString()}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-xs text-gray-500">You can leave this page; the import keeps running.</p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Rows', job.total],
              ['Imported', job.created],
              ['Possible duplicates', job.duplicates],
              ['Errors', job.failed],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{k}</dt>
                <dd className="mt-1 text-xl font-semibold text-gray-900">{(v || 0).toLocaleString()}</dd>
              </div>
            ))}
          </dl>

          {job.status === 'done' ? (
            <div className="flex flex-wrap gap-2">
              {job.errorRows?.length ? (
                <Button variant="outline" onClick={downloadErrors}>
                  <Download className="mr-1.5 h-4 w-4" aria-hidden />
                  Download error file ({job.errorRows.length})
                </Button>
              ) : null}
              {job.duplicateRows?.length ? (
                <Button variant="outline" onClick={downloadDuplicates}>
                  <Download className="mr-1.5 h-4 w-4" aria-hidden />
                  Download duplicates ({job.duplicateRows.length})
                </Button>
              ) : null}
              <Button variant="primary" onClick={() => router.push(back)}>
                Go to {ENTITY_LABEL[entity]}
              </Button>
            </div>
          ) : null}

          {job.status === 'done' && job.duplicateRows?.length ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Possible duplicates</h3>
              <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100 text-sm">
                {job.duplicateRows.slice(0, 200).map((d) => (
                  <li key={d.row} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span>
                      Row {d.row}: <span className="font-medium">{d.values?.companyName || [d.values?.firstName, d.values?.lastName].filter(Boolean).join(' ') || d.values?.email}</span>{' '}
                      matches{' '}
                      <Link href={entity === 'contact' ? `/sales/contacts/${d.matchId}` : `/sales/lead-companies/${d.matchId}`} className="text-orange-600 hover:underline">
                        {d.matchLabel}
                      </Link>{' '}
                      <span className="text-gray-500">({d.matchedOn})</span>
                    </span>
                  </li>
                ))}
              </ul>
              {job.duplicateRows.length > 200 ? <p className="mt-1 text-xs text-gray-500">Showing 200; download the file for all.</p> : null}
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
