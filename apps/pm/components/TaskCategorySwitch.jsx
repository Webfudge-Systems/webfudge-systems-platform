'use client';

import { Code2, ListTodo } from 'lucide-react';
import { TASK_CATEGORIES } from '../lib/taskDev';

const OPTIONS = [
  { value: TASK_CATEGORIES.GENERAL, label: 'General', Icon: ListTodo },
  { value: TASK_CATEGORIES.DEVELOPMENT, label: 'Development', Icon: Code2 },
];

export default function TaskCategorySwitch({ value = TASK_CATEGORIES.GENERAL, onChange, disabled = false }) {
  return (
    <div>
      <p className="mb-2 block text-sm font-medium leading-none text-black">Task type</p>
      <div
        role="radiogroup"
        aria-label="Task type"
        className="inline-flex w-full max-w-md rounded-xl border border-gray-200 bg-gray-50/90 p-1"
      >
        {OPTIONS.map(({ value: optionValue, label, Icon }) => {
          const active = value === optionValue;
          return (
            <button
              key={optionValue}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange?.(optionValue)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                active
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-orange-600' : ''}`} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      {value === TASK_CATEGORIES.DEVELOPMENT ? (
        <p className="mt-2 text-xs text-gray-500">
          Adds dev fields — work type, branch, PR, acceptance criteria, and review status.
        </p>
      ) : null}
    </div>
  );
}
