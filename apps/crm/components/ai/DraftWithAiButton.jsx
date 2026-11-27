'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Mail, Copy, MessageCircle } from 'lucide-react';
import { Button, Modal, Select, Textarea, Input, LoadingSpinner, UpgradePrompt, planErrorDetails, IS_SAAS_PLATFORM } from '@webfudge/ui';
import askGrowService from '../../lib/api/askGrowService';

const KINDS = [
  { value: 'followup', label: 'Follow-up' },
  { value: 'email', label: 'Email' },
  { value: 'proposal_intro', label: 'Proposal intro' },
];

/** Opens the user's email composer with the draft filled in (the CRM's existing composer is mailto). */
export function openInEmailComposer({ to, subject, body }) {
  const q = new URLSearchParams();
  if (subject) q.set('subject', subject);
  if (body) q.set('body', body);
  window.location.href = `mailto:${encodeURIComponent(to || '')}?${q.toString().replace(/\+/g, '%20')}`;
}

/**
 * G20 Draft anything: from a lead / deal / contact, Fudge AI drafts an email, follow-up or proposal
 * intro in the org's brand tone. The draft is editable and goes into the email composer; nothing is
 * sent from here. WhatsApp needs Fudge Connect (not available yet). SaaS only; uses AI credits.
 */
export default function DraftWithAiButton({ recordType, recordId, defaultTo = '', className = '' }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('followup');
  const [instructions, setInstructions] = useState('');
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [tone, setTone] = useState(null);
  const [toneMsg, setToneMsg] = useState('');

  useEffect(() => {
    if (!open || tone) return;
    askGrowService.getBrandTone().then(setTone).catch(() => setTone({ tone: '', signature: '' }));
  }, [open, tone]);

  if (!IS_SAAS_PLATFORM || !recordId) return null;

  const generate = async () => {
    setStatus('loading');
    setError(null);
    try {
      const d = await askGrowService.draft({ recordType, recordId, kind, instructions });
      setDraft({ ...d, to: d.to || defaultTo || '' });
      setStatus('done');
    } catch (err) {
      setError({ plan: planErrorDetails(err), message: err?.message || 'Could not draft that.' });
      setStatus('error');
    }
  };

  const saveTone = async () => {
    try {
      setTone(await askGrowService.setBrandTone(tone));
      setToneMsg('Saved for your organization.');
    } catch (err) {
      setToneMsg(err?.message || 'Only CRM settings managers can change the brand tone.');
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className={className} onClick={() => setOpen(true)}>
        <Sparkles className="mr-1.5 h-4 w-4 text-orange-500" aria-hidden />
        Draft with AI
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Draft with Fudge AI" size="lg">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <Select label="Draft" value={kind} onChange={(e) => setKind(e?.target ? e.target.value : e)} options={KINDS} />
            <Input label="Anything to mention? (optional)" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. mention the site visit on Monday" />
          </div>

          <details className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <summary className="cursor-pointer text-gray-700">Brand tone {tone?.tone ? `· ${tone.tone.slice(0, 60)}` : '· not set'}</summary>
            <div className="mt-2 space-y-2">
              <Textarea label="How should drafts sound?" rows={2} value={tone?.tone || ''} onChange={(e) => setTone({ ...(tone || {}), tone: e.target.value })} placeholder="Warm, plain English, no jargon. Short sentences." />
              <Input label="Signature" value={tone?.signature || ''} onChange={(e) => setTone({ ...(tone || {}), signature: e.target.value })} placeholder="— Team Acme" />
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" onClick={saveTone}>Save brand tone</Button>
                {toneMsg && <span className="text-xs text-gray-500">{toneMsg}</span>}
              </div>
            </div>
          </details>

          <Button onClick={generate} disabled={status === 'loading'}>
            {status === 'loading' ? <LoadingSpinner size="sm" /> : <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />}
            {draft ? 'Draft again' : 'Draft'}
          </Button>

          {status === 'error' && (error?.plan ? <UpgradePrompt {...error.plan} /> : <p className="text-sm text-red-600">{error?.message}</p>)}

          {draft && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <Input label="To" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
              <Input label="Subject" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
              <Textarea label="Message" rows={9} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => openInEmailComposer(draft)}>
                  <Mail className="mr-1.5 h-4 w-4" aria-hidden /> Open in email composer
                </Button>
                <Button variant="outline" onClick={() => navigator.clipboard?.writeText(`${draft.subject}\n\n${draft.body}`)}>
                  <Copy className="mr-1.5 h-4 w-4" aria-hidden /> Copy
                </Button>
                <Button variant="outline" disabled title="WhatsApp drafts need Fudge Connect, which isn't available yet.">
                  <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden /> WhatsApp · needs Fudge Connect
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
