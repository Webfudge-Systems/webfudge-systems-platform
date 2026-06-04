/** Native HTML table wrapper — @webfudge/ui Table uses columns/data API. */
export default function HRDataTable({ children, className = '' }) {
  return <table className={`min-w-full divide-y divide-gray-100 ${className}`.trim()}>{children}</table>
}
