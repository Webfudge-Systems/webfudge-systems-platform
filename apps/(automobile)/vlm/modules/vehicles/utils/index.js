export function formatVehicleLabel(vehicle) {
  const name = vehicle?.name || 'Vehicle';
  const vin = vehicle?.vin ? ` (${vehicle.vin})` : '';
  return `${name}${vin}`;
}

