import strapiClient from '../strapiClient'

class DepartmentsService {
  async list() {
    return strapiClient.get('/departments', { 'pagination[pageSize]': 100, sort: 'name:asc' })
  }
}

const departmentsService = new DepartmentsService()
export default departmentsService
