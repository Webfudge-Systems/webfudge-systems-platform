export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function daysSinceDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const sod = startOfDay(new Date());
  const created = startOfDay(d);
  return Math.floor((sod - created) / (24 * 60 * 60 * 1000));
}

/** Relative created-date buckets used across CRM/PM list filter modals. */
export function matchesCreatedDateRange(iso, range) {
  if (!range) return true;
  const days = daysSinceDate(iso);
  if (days == null) return false;
  if (range === 'last7') return days <= 7;
  if (range === 'last30') return days <= 30;
  if (range === 'last90') return days <= 90;
  if (range === 'thisYear') return new Date(iso).getFullYear() === new Date().getFullYear();
  return true;
}

/** Due/scheduled date buckets for task list filters. */
export function matchesDueDateRange(iso, range, { terminalStatuses = [] } = {}) {
  if (!range) return true;
  if (range === 'noDate') return !iso;
  const sd = iso ? new Date(iso) : null;
  const now = new Date();
  const sod = startOfDay(now);
  const eod = endOfDay(now);
  if (range === 'overdue') {
    if (!sd || Number.isNaN(sd.getTime())) return false;
    return sd < sod;
  }
  if (range === 'today') return sd != null && !Number.isNaN(sd.getTime()) && sd >= sod && sd <= eod;
  if (range === 'week') {
    const end = new Date(sod);
    end.setDate(end.getDate() + 7);
    return sd != null && !Number.isNaN(sd.getTime()) && sd >= sod && sd <= end;
  }
  if (range === 'next30') {
    const end = new Date(sod);
    end.setDate(end.getDate() + 30);
    return sd != null && !Number.isNaN(sd.getTime()) && sd >= sod && sd <= end;
  }
  return true;
}

export function hasActiveListFilters(filters) {
  return Object.values(filters).some((value) =>
    typeof value === 'string' ? value.trim() !== '' : Boolean(value)
  );
}

export function matchesNumericRange(value, range, rangeMap) {
  if (!range) return true;
  const spec = rangeMap[range];
  if (!spec) return true;
  const n = Number(value);
  if (spec.unset) return value == null || value === '' || Number.isNaN(n) || n === 0;
  if (Number.isNaN(n)) return false;
  if (spec.min != null && spec.max != null) return n >= spec.min && n <= spec.max;
  if (spec.min != null) return n >= spec.min;
  if (spec.max != null) return n <= spec.max;
  return true;
}
