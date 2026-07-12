export function vehicleLabel(vehicle) {
  if (!vehicle) return '—';
  if (typeof vehicle === 'object') {
    return vehicle.name || vehicle.attributes?.name || (vehicle.id != null ? `Vehicle #${vehicle.id}` : '—');
  }
  return `Vehicle #${vehicle}`;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function computeVehicleStats(vehicles = []) {
  const rows = Array.isArray(vehicles) ? vehicles : [];
  const total = rows.length;
  const active = rows.filter((v) => String(v?.derivedStatus || '').toUpperCase() === 'ACTIVE').length;
  const allocated = rows.filter((v) => String(v?.derivedStatus || '').toUpperCase() === 'ALLOCATED').length;
  const inTransit = rows.filter((v) => String(v?.derivedStatus || '').toUpperCase() === 'IN_TRANSIT').length;
  return { total, active, allocated, inTransit };
}
