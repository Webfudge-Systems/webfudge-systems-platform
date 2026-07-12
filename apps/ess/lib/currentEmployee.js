import { listSyncedEmployees } from './employeeSyncService'

export async function resolveCurrentEmployee(authUser) {
  if (!authUser?.id && !authUser?.email) {
    return { employee: null, membershipId: null, notOnboarded: true }
  }

  const { employees } = await listSyncedEmployees()
  const employee =
    employees.find((row) => String(row.userId) === String(authUser.id)) ||
    employees.find((row) => row.email?.toLowerCase() === authUser.email?.toLowerCase()) ||
    null

  if (!employee) {
    return { employee: null, membershipId: null, notOnboarded: true }
  }

  const membershipId = employee.membershipId || employee.id
  return {
    employee,
    membershipId: membershipId ? String(membershipId) : null,
    notOnboarded: !membershipId,
  }
}
