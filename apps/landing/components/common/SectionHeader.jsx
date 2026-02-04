'use client'

/**
 * Reusable section subheader: tag pill, title, and subtitle.
 * @param {string} tagText - Label in the pill (e.g. "FAQs")
 * @param {string} title - Main heading text
 * @param {string} [subtitle] - Optional description below the title
 * @param {boolean} [showDot=true] - Show white dot inside the tag
 * @param {string} [tagClassName] - Tag pill background (default: bg-brand-primary)
 * @param {string} [className] - Wrapper class
 * @param {string} [titleAs='h2'] - Semantic heading level
 */
export default function SectionHeader({
  tagText,
  title,
  subtitle,
  showDot = true,
  tagClassName = 'bg-brand-primary',
  className = '',
  titleAs: TitleTag = 'h2',
}) {
  return (
    <div className={className}>
      {tagText && (
        <div
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-white mb-4 ${tagClassName}`}
        >
          {showDot && <span className="w-2 h-2 rounded-full bg-white/90" aria-hidden />}
          {tagText}
        </div>
      )}
      <TitleTag className="text-3xl md:text-4xl font-bold text-brand-dark mb-3">{title}</TitleTag>
      {subtitle && <p className="text-gray-600 text-lg">{subtitle}</p>}
    </div>
  )
}
