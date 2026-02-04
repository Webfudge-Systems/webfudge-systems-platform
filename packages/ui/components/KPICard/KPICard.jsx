import React from 'react'
import { Card } from '../Card'

/**
 * KPICard Component
 *
 * A reusable card component for displaying key performance indicators with an icon,
 * title, value, and optional subtitle.
 *
 * @param {string} title - The title/label for the KPI
 * @param {number|string} value - The main value to display
 * @param {string} subtitle - Optional subtitle text (e.g., "5 deals", "No items")
 * @param {string} change - Optional change/trend indicator (e.g., "+12%", "-5%")
 * @param {string} changeType - Type of change: 'increase' or 'decrease'
 * @param {React.Component} icon - Icon component to display (from lucide-react or similar)
 * @param {string} colorScheme - Color scheme: 'orange', 'yellow', 'green', 'red', 'blue', 'purple', 'emerald', 'indigo'
 * @param {function} onClick - Optional click handler for the card
 * @param {string} className - Optional additional CSS classes
 */
const KPICard = ({
  title,
  value,
  subtitle,
  change,
  changeType = 'increase',
  icon: Icon,
  colorScheme = 'blue',
  onClick,
  className = '',
}) => {
  const colorClasses = {
    orange: {
      iconBg: 'bg-brand-primary/10',
      iconColor: 'text-brand-primary',
      dotColor: 'bg-orange-500',
    },
    yellow: {
      iconBg: 'bg-yellow-50',
      iconColor: 'text-yellow-500',
      dotColor: 'bg-yellow-500',
    },
    green: {
      iconBg: 'bg-green-50',
      iconColor: 'text-green-500',
      dotColor: 'bg-green-500',
    },
    red: {
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      dotColor: 'bg-red-500',
    },
    blue: {
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      dotColor: 'bg-blue-500',
    },
    purple: {
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-500',
      dotColor: 'bg-purple-500',
    },
    emerald: {
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      dotColor: 'bg-emerald-500',
    },
    indigo: {
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-500',
      dotColor: 'bg-indigo-500',
    },
  }

  const colors = colorClasses[colorScheme] || colorClasses.blue

  return (
    <Card
      variant="elevated"
      className={`p-6 pb-0 pr-0 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-4xl font-bold text-gray-900 mb-2">{value}</p>
          {change && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span className={`w-2 h-2 rounded-full ${colors.dotColor}`}></span>
              <span
                className={
                  changeType === 'increase'
                    ? 'text-green-600 font-medium'
                    : 'text-red-600 font-medium'
                }
              >
                {change}
              </span>
              {change !== '0' && <span className="ml-1">this period</span>}
            </div>
          )}
          {!change && subtitle && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span className={`w-2 h-2 rounded-full ${colors.dotColor}`}></span>
              <span>{subtitle}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={`overflow-hidden ${colors.iconBg} relative w-32 h-32 rounded-2xl rounded-tr-[0] rounded-bl-[0] flex items-center justify-center flex-shrink-0`}
          >
            <Icon className={`w-full h-full absolute -bottom-7 -right-7 ${colors.iconColor}`} />
          </div>
        )}
      </div>
    </Card>
  )
}

export default KPICard
