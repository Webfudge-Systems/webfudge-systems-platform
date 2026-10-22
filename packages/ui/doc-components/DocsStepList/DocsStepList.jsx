export function DocsStepList({ steps = [] }) {
  return (
    <ol className="my-6 space-y-4">
      {steps.map((step, index) => (
        <li key={step.title || index} className="flex gap-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white">
            {index + 1}
          </span>
          <div className="min-w-0 pt-0.5">
            {step.title ? (
              <p className="text-sm font-semibold text-brand-dark dark:text-white">{step.title}</p>
            ) : null}
            {step.description ? (
              <p className="mt-1 text-sm leading-relaxed text-brand-text-light dark:text-gray-300">{step.description}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
