import strapiClient from '../strapiClient';

class NotificationService {
  async getNotifications(userId, options = {}) {
    try {
      const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      const params = {
        'pagination[pageSize]': options.pageSize || 100,
        sort: 'createdAt:desc',
        populate: 'user',
      };

      if (!Number.isNaN(userIdNum) && userIdNum > 0) {
        params['filters[user][id][$eq]'] = userIdNum;
      } else {
        params['filters[user][documentId][$eq]'] = String(userId);
      }

      const response = await strapiClient.get('/notifications', params);
      if (Array.isArray(response?.data)) return response.data;
      if (Array.isArray(response?.data?.data)) return response.data.data;
      if (Array.isArray(response)) return response;
      return [];
    } catch {
      return [];
    }
  }
}

export default new NotificationService();

