'use client';

import { Check } from 'lucide-react';
import {
  DEV_PIPELINE_STAGES,
  pipelineStageIndex,
  resolvePipelineStage,
} from '../lib/taskDev';

export default function DevPipelineShowcase({
  task,
  canEdit = false,
  saving = false,
  onStageChange,
  className = '',
}) {
  const currentStage = resolvePipelineStage(task);
  const currentIndex = pipelineStageIndex(currentStage);

  return (
    <div className={`rounded-xl border border-gray-200 bg-gradient-to-b from-white to-gray-50/80 p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Delivery pipeline</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {canEdit ? 'Click a stage to update status across the workflow.' : 'Current position in the dev workflow.'}
          </p>
        </div>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
          {DEV_PIPELINE_STAGES.find((s) => s.key === currentStage)?.label || currentStage}
        </span>
      </div>

      <div className="relative hidden sm:block">
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-gray-200" aria-hidden />
        <div
          className="absolute left-0 top-5 h-0.5 bg-gradient-to-r from-violet-500 to-orange-500 transition-all duration-500"
          style={{
            width: currentIndex <= 0 ? '0%' : `${(currentIndex / (DEV_PIPELINE_STAGES.length - 1)) * 100}%`,
          }}
          aria-hidden
        />
        <ol className="relative flex justify-between gap-1">
          {DEV_PIPELINE_STAGES.map((stage, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isUpcoming = index > currentIndex;
            const clickable = canEdit && !saving;

            return (
              <li key={stage.key} className="flex flex-1 flex-col items-center">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onStageChange?.(stage.key)}
                  className={`group relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                    isComplete
                      ? 'border-violet-500 bg-violet-500 text-white shadow-md shadow-violet-200'
                      : isCurrent
                        ? 'border-orange-500 bg-white text-orange-600 shadow-md ring-4 ring-orange-100'
                        : 'border-gray-200 bg-white text-gray-400'
                  } ${clickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                  title={stage.label}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                </button>
                <span
                  className={`mt-2 max-w-[4.5rem] text-center text-[10px] font-semibold uppercase tracking-wide ${
                    isCurrent ? 'text-orange-600' : isComplete ? 'text-violet-700' : isUpcoming ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {stage.shortLabel}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Mobile: vertical stack */}
      <ol className="space-y-2 sm:hidden">
        {DEV_PIPELINE_STAGES.map((stage, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const clickable = canEdit && !saving;
          return (
            <li key={stage.key}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStageChange?.(stage.key)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                  isCurrent
                    ? 'border-orange-200 bg-orange-50'
                    : isComplete
                      ? 'border-violet-100 bg-violet-50/50'
                      : 'border-gray-100 bg-white'
                } ${clickable ? 'active:scale-[0.99]' : ''}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isComplete
                      ? 'bg-violet-500 text-white'
                      : isCurrent
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className={`text-sm font-medium ${isCurrent ? 'text-orange-900' : 'text-gray-800'}`}>
                  {stage.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
