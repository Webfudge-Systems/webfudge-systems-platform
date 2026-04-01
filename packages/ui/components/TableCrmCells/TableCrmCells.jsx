import { clsx } from 'clsx';
import { User } from 'lucide-react';
import { Avatar } from '../Avatar';
import { Badge } from '../Badge';
import { formatRelativeTime, formatTableDate, ownerDisplayFromUser } from '../../utils/crmTableFormat';

const cell = {
  created: {
    wrap: 'min-w-[130px]',
    wrapCenter: 'text-center',
    date: 'whitespace-nowrap text-sm font-semibold text-gray-900',
    relative: 'text-sm font-normal text-gray-500',
  },
  owner: {
    row: 'flex min-w-[180px] items-center gap-2',
    label: 'min-w-0 flex-1 truncate font-semibold text-gray-900',
    icon: 'h-4 w-4 flex-shrink-0 text-gray-400',
  },
  status: {
    pill: (active) =>
      clsx(
        'inline-flex rounded-lg border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        active
          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
          : 'border-gray-300 bg-gray-50 text-gray-700'
      ),
  },
  role: {
    secondary:
      'inline-flex rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-gray-700',
  },
};

/**
 * Created column: absolute date (bold) + relative time (muted), matching CRM contacts table.
 */
export function TableCellCreated({
  dateString,
  align = 'start',
  showRelative = true,
  className,
}) {
  const date = formatTableDate(dateString);
  const relative = showRelative ? formatRelativeTime(dateString) : '';
  return (
    <div
      className={clsx(
        cell.created.wrap,
        align === 'center' && cell.created.wrapCenter,
        className
      )}
    >
      <div className={cell.created.date}>{date}</div>
      {showRelative ? <div className={cell.created.relative}>{relative || '—'}</div> : null}
    </div>
  );
}

/**
 * Single-line date (e.g. Updated column).
 */
export function TableCellDateOnly({ dateString, className }) {
  return (
    <div className={clsx('min-w-[120px] whitespace-nowrap text-sm text-gray-600', className)}>
      {formatTableDate(dateString)}
    </div>
  );
}

/**
 * Owner / Account manager / Assigned to: avatar + label + person icon (contacts table pattern).
 */
export function TableCellOwner({
  user,
  label: labelProp,
  avatarFallback: fallbackProp,
  avatarClassName,
  showIcon = true,
  className,
}) {
  const derived = ownerDisplayFromUser(user);
  const label = labelProp ?? derived.label;
  const avatarFallback = fallbackProp ?? derived.avatarFallback;
  return (
    <div className={clsx(cell.owner.row, className)}>
      <Avatar
        fallback={avatarFallback}
        alt={label}
        size="sm"
        className={clsx('flex-shrink-0 bg-gray-600 text-white', avatarClassName)}
      />
      <span className={cell.owner.label}>{label}</span>
      {showIcon ? <User className={cell.owner.icon} aria-hidden /> : null}
    </div>
  );
}

/**
 * Active / inactive status pill (contacts + client accounts).
 */
export function TableCellStatusPill({ status, className }) {
  const s = (status || 'ACTIVE').toString().toUpperCase();
  const isActive = s === 'ACTIVE';
  return <span className={clsx(cell.status.pill(isActive), className)}>{s}</span>;
}

/**
 * Role column: primary contact badge, custom role chip, or em dash.
 */
export function TableCellRole({ isPrimaryContact, roleLabel, className }) {
  if (isPrimaryContact) {
    return (
      <div className={className}>
        <Badge variant="success" className="whitespace-nowrap font-medium">
          PRIMARY CONTACT
        </Badge>
      </div>
    );
  }
  if (roleLabel?.trim()) {
    return (
      <span className={clsx(cell.role.secondary, className)}>{roleLabel.trim()}</span>
    );
  }
  return <span className={clsx('text-sm text-gray-400', className)}>—</span>;
}

const leadStatusConfig = {
  new: { variant: 'primary', label: 'New' },
  contacted: { variant: 'warning', label: 'Contacted' },
  qualified: { variant: 'success', label: 'Qualified' },
  lost: { variant: 'danger', label: 'Lost' },
};

/**
 * Lead company row status (pipeline + converted/client).
 */
export function TableCellLeadStatus({ company, className }) {
  const isConverted =
    company?.status?.toUpperCase() === 'CONVERTED' ||
    company?.status?.toUpperCase() === 'CLIENT' ||
    Boolean(company?.convertedAccount);
  if (isConverted) {
    const statusUpper = (company?.status || '').toString().toUpperCase();
    const label =
      statusUpper === 'CLIENT' || company?.convertedAccount ? 'CLIENT' : 'CONVERTED';
    return (
      <div className={className}>
        <Badge variant="success" className="font-semibold">
          {label}
        </Badge>
      </div>
    );
  }
  const status = company?.status?.toLowerCase() || 'new';
  const config = leadStatusConfig[status] || leadStatusConfig.new;
  return (
    <div className={className}>
      <Badge variant={config.variant} className="font-semibold">
        {config.label.toUpperCase()}
      </Badge>
    </div>
  );
}

export { formatRelativeTime, formatTableDate, ownerDisplayFromUser };
