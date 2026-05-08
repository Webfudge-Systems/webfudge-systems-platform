import strapiClient from '../strapiClient'

class TeamsService {
  async list() {
    return strapiClient.get('/teams', { 'pagination[pageSize]': 100, sort: 'name:asc' })
  }
}

const teamsService = new TeamsService()
export default teamsService
