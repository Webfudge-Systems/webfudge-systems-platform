import strapiClient from '../strapiClient';

const CRM_RELATION_FIELDS = ['leadCompany', 'clientAccount', 'contact', 'deal'];

class TaskService {
  async getAllTasks(options = {}) {
    try {
      const params = {
        'pagination[page]': options.page || 1,
        'pagination[pageSize]': options.pageSize || 25,
        'sort': options.sort || 'createdAt:desc',
        'populate[assignee]': '*',
        'populate[collaborators]': '*',
        'populate[projects][fields][0]': 'id',
        'populate[projects][fields][1]': 'name',
        'populate[projects][fields][2]': 'slug',
        'populate[subtasks][fields][0]': 'id',
        'populate[subtasks][fields][1]': 'title',
        'populate[subtasks][fields][2]': 'status',
      };

      if (options.status) params['filters[status][$eq]'] = options.status;
      if (options.priority) params['filters[priority][$eq]'] = options.priority;
      if (options.projectId) params['filters[projects][id][$eq]'] = options.projectId;

      return await strapiClient.get('/tasks', params);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return { data: [], meta: { pagination: { total: 0 } } };
    }
  }

  async getTaskById(id, populate = true) {
    try {
      const params = populate ? {
        'populate[assignee]': '*',
        'populate[collaborators]': '*',
        'populate[projects]': '*',
        'populate[subtasks][populate][assignee]': '*',
        'populate[comments][populate][author]': '*',
      } : {};
      return await strapiClient.get(`/tasks/${id}`, params);
    } catch (error) {
      console.error(`Error fetching task ${id}:`, error);
      throw error;
    }
  }

  async getTasksByProject(projectId, options = {}) {
    try {
      const params = {
        'pagination[page]': options.page || 1,
        'pagination[pageSize]': options.pageSize || 100,
        'sort': options.sort || 'createdAt:desc',
        'filters[projects][id][$eq]': projectId,
        'populate[assignee]': '*',
        'populate[collaborators]': '*',
        'populate[subtasks][fields][0]': 'id',
        'populate[subtasks][fields][1]': 'title',
        'populate[subtasks][fields][2]': 'status',
      };
      if (options.status) params['filters[status][$eq]'] = options.status;
      return await strapiClient.get('/tasks', params);
    } catch (error) {
      console.error('Error fetching tasks by project:', error);
      return { data: [] };
    }
  }

  async getTasksByAssignee(userId, options = {}) {
    try {
      const params = {
        'pagination[page]': options.page || 1,
        'pagination[pageSize]': options.pageSize || 50,
        'sort': options.sort || 'createdAt:desc',
        'filters[assignee][id][$eq]': userId,
        'populate[assignee]': '*',
        'populate[collaborators]': '*',
        'populate[projects][fields][0]': 'id',
        'populate[projects][fields][1]': 'name',
        'populate[projects][fields][2]': 'slug',
        'populate[subtasks][fields][0]': 'id',
        'populate[subtasks][fields][1]': 'title',
        'populate[subtasks][fields][2]': 'status',
      };
      return await strapiClient.get('/tasks', params);
    } catch (error) {
      console.error('Error fetching tasks by assignee:', error);
      return { data: [] };
    }
  }

  // Gets tasks assigned to user but excludes CRM-specific tasks
  async getPMTasksByAssignee(userId, options = {}) {
    try {
      const response = await this.getTasksByAssignee(userId, { ...options, pageSize: 200 });
      const items = response?.data || response || [];
      const pmTasks = items.filter((task) => {
        const t = task.attributes || task;
        return !CRM_RELATION_FIELDS.some((field) => {
          const rel = t[field];
          if (!rel) return false;
          const relData = rel.data !== undefined ? rel.data : rel;
          return relData !== null && relData !== undefined && (Array.isArray(relData) ? relData.length > 0 : true);
        });
      });
      return { data: pmTasks, meta: response?.meta };
    } catch (error) {
      console.error('Error fetching PM tasks by assignee:', error);
      return { data: [] };
    }
  }

  // Get tasks where user is a collaborator (for dashboard)
  async getCollaboratorTasks(userId, options = {}) {
    try {
      const params = {
        'pagination[page]': 1,
        'pagination[pageSize]': options.pageSize || 50,
        'sort': 'createdAt:desc',
        'filters[collaborators][id][$eq]': userId,
        'populate[assignee]': '*',
        'populate[projects][fields][0]': 'id',
        'populate[projects][fields][1]': 'name',
        'populate[projects][fields][2]': 'slug',
      };
      return await strapiClient.get('/tasks', params);
    } catch (error) {
      console.error('Error fetching collaborator tasks:', error);
      return { data: [] };
    }
  }

  async createTask(taskData) {
    try {
      return await strapiClient.post('/tasks', { data: taskData });
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(id, taskData) {
    try {
      return await strapiClient.put(`/tasks/${id}`, { data: taskData });
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      throw error;
    }
  }

  async updateTaskStatus(id, status) {
    return this.updateTask(id, { status });
  }

  async updateTaskProgress(id, progress) {
    return this.updateTask(id, { progress: Math.min(100, Math.max(0, progress)) });
  }

  async deleteTask(id) {
    try {
      return await strapiClient.delete(`/tasks/${id}`);
    } catch (error) {
      console.error(`Error deleting task ${id}:`, error);
      throw error;
    }
  }

  async searchTasks(query, options = {}) {
    try {
      const params = {
        'pagination[page]': 1,
        'pagination[pageSize]': options.pageSize || 10,
        'filters[$or][0][title][$containsi]': query,
        'filters[$or][1][description][$containsi]': query,
        'populate[projects][fields][0]': 'name',
        'populate[assignee][fields][0]': 'firstName',
        'populate[assignee][fields][1]': 'lastName',
      };
      return await strapiClient.get('/tasks', params);
    } catch (error) {
      console.error('Error searching tasks:', error);
      return { data: [] };
    }
  }

  async getTasksByStatus(status, options = {}) {
    return this.getAllTasks({ ...options, status });
  }

  async getOverdueTasks(options = {}) {
    try {
      const params = {
        'pagination[pageSize]': options.pageSize || 50,
        'filters[scheduledDate][$lt]': new Date().toISOString(),
        'filters[status][$ne]': 'COMPLETED',
        'populate[assignee]': '*',
        'populate[projects][fields][0]': 'name',
      };
      return await strapiClient.get('/tasks', params);
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      return { data: [] };
    }
  }

  async getTaskStats(userId = null) {
    try {
      let response;
      if (userId) {
        response = await this.getAllTasks({ pageSize: 500 });
      } else {
        response = await this.getAllTasks({ pageSize: 500 });
      }
      const tasks = response?.data || [];

      const now = new Date();
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => {
        const tData = t.attributes || t;
        return tData.status === 'COMPLETED';
      }).length;
      const inProgressTasks = tasks.filter((t) => {
        const tData = t.attributes || t;
        return tData.status === 'IN_PROGRESS';
      }).length;
      const scheduledTasks = tasks.filter((t) => {
        const tData = t.attributes || t;
        return tData.status === 'SCHEDULED';
      }).length;
      const overdueTasks = tasks.filter((t) => {
        const tData = t.attributes || t;
        return tData.scheduledDate && new Date(tData.scheduledDate) < now && tData.status !== 'COMPLETED';
      }).length;

      return {
        totalTasks,
        completedTasks,
        inProgressTasks,
        scheduledTasks,
        overdueTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      };
    } catch (error) {
      console.error('Error fetching task stats:', error);
      return { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, scheduledTasks: 0, overdueTasks: 0, completionRate: 0 };
    }
  }
}

export default new TaskService();
