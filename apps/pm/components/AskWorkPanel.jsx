'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Send, Sparkles } from 'lucide-react';
import { UpgradePrompt, planErrorDetails } from '@webfudge/ui';
import myDayService from '../lib/api/myDayService';

const EXAMPLES = ["What's overdue on my projects?", 'What did I finish this week?', 'Which high-priority tasks are open?'];

/** W21 Ask Work: plain-language questions about the user's work (answers only from what they can see). */
export default function AskWorkPanel() {
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);

  async function ask(q) {
    const text = String(q || '').trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setPlan(null);
    try {
      const history = turns.map((t) => ({ q: t.q, a: t.a }));
      const data = await myDayService.ask(text, history);
      setTurns((prev) => [...prev, { q: text, a: data?.answer || '', tasks: data?.tasks || [] }]);
      setQuestion('');
    } catch (err) {
      const p = planErrorDetails(err);
      if (p) setPlan(p);
      else if (err?.details?.code === 'AI_DISABLED' || err?.details?.code === 'AI_NOT_CONFIGURED') setError('Fudge AI is not switched on for this workspace yet.');
      else setError(err?.message || 'Could not answer that right now.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col rounded-xl border border-gray-200 bg-white p-4" aria-label="Ask Work">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-orange-500" aria-hidden />
        <h2 className="text-sm font-semibold text-gray-900">Ask Work</h2>
      </div>
      <p className="mb-3 text-xs text-gray-500">Ask about tasks and projects in plain language. Answers use only work you can see.</p>

      <div className="mb-3 max-h-[420px] space-y-4 overflow-y-auto">
        {turns.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => ask(ex)} className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:border-orange-300 hover:text-orange-700">
                {ex}
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-start gap-2 text-sm text-gray-900">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <span className="font-medium">{t.q}</span>
            </div>
            <p className="whitespace-pre-line text-sm text-gray-700">{t.a}</p>
            {t.tasks.length > 0 && (
              <ul className="space-y-1">
                {t.tasks.map((task) => (
                  <li key={task.id}>
                    <Link href={`/tasks/${task.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm hover:bg-gray-50">
                      <span className="truncate text-gray-900">{task.name}</span>
                      <span className="shrink-0 text-xs text-gray-500">
                        {[task.project, task.assignee, task.due ? `due ${task.due}` : null].filter(Boolean).join(' · ')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {plan && <UpgradePrompt {...plan} />}
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <form
        className="mt-auto flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          placeholder="What's overdue on Acme?"
          aria-label="Your question"
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
        />
        <button type="submit" disabled={busy || !question.trim()} className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          <Send className="h-4 w-4" aria-hidden />
          {busy ? 'Asking…' : 'Ask'}
        </button>
      </form>
    </section>
  );
}
