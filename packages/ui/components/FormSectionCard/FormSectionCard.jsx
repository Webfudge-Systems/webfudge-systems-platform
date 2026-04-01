import { clsx } from 'clsx'
import { Card } from '../Card'

export function FormSectionCard({
  icon: Icon,
  title,
  description,
  children,
  className,
  cardClassName,
  iconContainerClassName,
  iconClassName,
  headerClassName,
}) {
  return (
    <Card className={clsx('rounded-2xl p-6', cardClassName, className)}>
      <div className={clsx('mb-6 flex items-center gap-3', headerClassName)}>
        {Icon ? (
          <div
            className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-pink-500',
              iconContainerClassName
            )}
          >
            <Icon className={clsx('h-5 w-5 text-white', iconClassName)} />
          </div>
        ) : null}
        <div>
          {title ? <h3 className="text-lg font-semibold text-gray-900">{title}</h3> : null}
          {description ? <p className="text-sm text-gray-600">{description}</p> : null}
        </div>
      </div>
      {children}
    </Card>
  )
}

export default FormSectionCard
