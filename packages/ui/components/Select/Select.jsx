import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'

export function Select({
  label,
  error,
  options = [],
  placeholder = 'Select an option',
  required = false,
  className,
  containerClassName,
  icon: Icon,
  onChange,
  ...props
}) {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value)
    }
  }

  return (
    <div className={clsx('w-full', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <select
          className={clsx(
            'block w-full rounded-lg border border-gray-300 bg-white',
            'px-3 py-2.5 pr-10 text-sm text-gray-900 shadow-none appearance-none',
            Icon ? 'pl-10' : '',
            'focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500',
            'transition-colors duration-200',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            error ? 'border-red-300' : 'border-gray-300',
            className
          )}
          onChange={handleChange}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className="h-5 w-5 text-gray-400" />
        </div>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export default Select
