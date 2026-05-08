import vehicleService from './vehicleService';
import allocationService from './allocationService';
import serviceRecordService from './serviceRecordService';
import warrantyService from './warrantyService';

export default {
  async getDashboardSummary() {
    const [vehicles, allocations, services, warranties] = await Promise.all([
      vehicleService.getAll({ 'pagination[pageSize]': 200 }),
      allocationService.getAll({ 'pagination[pageSize]': 200 }),
      serviceRecordService.getAll({ 'pagination[pageSize]': 200 }),
      warrantyService.getAll({ 'pagination[pageSize]': 200 }),
    ]);

    return {
      totalVehicles: vehicles?.data?.length || 0,
      totalAllocations: allocations?.data?.length || 0,
      totalServiceRecords: services?.data?.length || 0,
      totalWarrantyRecords: warranties?.data?.length || 0,
    };
  },
};

