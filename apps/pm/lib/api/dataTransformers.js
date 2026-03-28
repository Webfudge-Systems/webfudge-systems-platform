// Status mappings
const STATUS_MAP = {
  SCHEDULED: 'To Do',
  IN_PROGRESS: 'In Progress',
  INTERNAL_REVIEW: 'Internal Review',
  COMPLETED: 'Done',
  CANCELLED: 'Cancelled',
  OVERDUE: 'Overdue',
};

const STATUS_REVERSE_MAP = {
  'To Do': 'SCHEDULED',
  'In Progress': 'IN_PROGRESS',
  'Internal Review': 'INTERNAL_REVIEW',
  'Done': 'COMPLETED',
  'Cancelled': 'CANCELLED',
};

const PROJECT_STATUS_MAP = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const PRIORITY_MAP = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

const PRIORITY_REVERSE_MAP = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
};

export function transformStatus(strapiStatus) {
  return STATUS_MAP[strapiStatus] || strapiStatus || 'To Do';
}

export function transformStatusToStrapi(frontendStatus) {
  return STATUS_REVERSE_MAP[frontendStatus] || frontendStatus || 'SCHEDULED';
}

export function transformProjectStatus(strapiStatus) {
  return PROJECT_STATUS_MAP[strapiStatus] || strapiStatus || 'Planning';
}

export function transformProjectStatusToStrapi(frontendStatus) {
  const reverse = Object.entries(PROJECT_STATUS_MAP).find(([, v]) => v === frontendStatus);
  return reverse ? reverse[0] : frontendStatus || 'PLANNING';
}

export function transformPriority(strapiPriority) {
  return PRIORITY_MAP[strapiPriority] || (strapiPriority ? strapiPriority.toLowerCase() : 'medium');
}

export function transformPriorityToStrapi(frontendPriority) {
  return PRIORITY_REVERSE_MAP[frontendPriority] || frontendPriority?.toUpperCase() || 'MEDIUM';
}

export function formatDate(dateString, format = 'short') {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  if (format === 'relative') return formatRelativeDate(date);
  if (format === 'long') {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatRelativeDate(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

  return formatDate(date, 'short');
}

const USER_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
  'bg-orange-500', 'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500',
  'bg-teal-500', 'bg-cyan-500',
];

export function getUserColor(userId) {
  if (!userId) return USER_COLORS[0];
  const id = typeof userId === 'string' ? parseInt(userId, 10) || userId.charCodeAt(0) : userId;
  return USER_COLORS[id % USER_COLORS.length];
}

export function transformUser(strapiUser) {
  if (!strapiUser) return null;
  const u = strapiUser.attributes || strapiUser;
  const id = strapiUser.id || u.id;
  const firstName = u.firstName || u.name?.split(' ')[0] || '';
  const lastName = u.lastName || u.name?.split(' ')[1] || '';
  const name = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : (u.username || u.email || 'Unknown');
  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || name.charAt(0).toUpperCase() || 'U';

  return {
    id,
    name,
    firstName,
    lastName,
    email: u.email || '',
    avatar: u.avatar?.url || u.profilePicture?.url || null,
    initials,
    color: getUserColor(id),
    role: u.primaryRole?.name || u.role?.name || 'User',
    isActive: u.isActive !== false,
  };
}

export function transformProject(strapiProject) {
  if (!strapiProject) return null;
  const p = strapiProject.attributes || strapiProject;
  const id = strapiProject.id || p.id;

  const pm = p.projectManager?.data || p.projectManager;
  const teamMembers = (p.teamMembers?.data || p.teamMembers || []).map(transformUser).filter(Boolean);
  const tasks = p.tasks?.data || p.tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => {
    const tData = t.attributes || t;
    return tData.status === 'COMPLETED';
  }).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    id,
    name: p.name || p.title || 'Untitled Project',
    slug: p.slug || String(id),
    description: p.description || '',
    status: transformProjectStatus(p.status),
    strapiStatus: p.status || 'PLANNING',
    startDate: p.startDate || p.start_date || null,
    endDate: p.endDate || p.end_date || p.dueDate || null,
    budget: p.budget || null,
    progress,
    totalTasks,
    completedTasks,
    projectManager: pm ? transformUser(pm) : null,
    teamMembers,
    icon: p.icon || (p.name ? p.name.charAt(0).toUpperCase() : 'P'),
    createdAt: p.createdAt || null,
    updatedAt: p.updatedAt || null,
  };
}

export function transformTask(strapiTask) {
  if (!strapiTask) return null;
  const t = strapiTask.attributes || strapiTask;
  const id = strapiTask.id || t.id;

  const assignee = t.assignee?.data || t.assignee;
  const projects = (t.projects?.data || t.projects || []).map((proj) => {
    const pData = proj.attributes || proj;
    return { id: proj.id || pData.id, name: pData.name || pData.title || 'Unknown', slug: pData.slug || String(proj.id || pData.id) };
  });
  const collaborators = (t.collaborators?.data || t.collaborators || []).map(transformUser).filter(Boolean);
  const subtasks = (t.subtasks?.data || t.subtasks || []).map(transformSubtask).filter(Boolean);

  const isOverdue = t.scheduledDate && new Date(t.scheduledDate) < new Date() && t.status !== 'COMPLETED';

  return {
    id,
    name: t.title || t.name || 'Untitled Task',
    description: t.description || '',
    status: isOverdue && t.status !== 'COMPLETED' ? (transformStatus(t.status) === 'To Do' || transformStatus(t.status) === 'In Progress' ? transformStatus(t.status) : transformStatus(t.status)) : transformStatus(t.status),
    strapiStatus: t.status || 'SCHEDULED',
    priority: transformPriority(t.priority),
    strapiPriority: t.priority || 'MEDIUM',
    dueDate: t.scheduledDate || t.dueDate || null,
    formattedDueDate: formatDate(t.scheduledDate || t.dueDate, 'short'),
    progress: typeof t.progress === 'number' ? t.progress : 0,
    assignee: assignee ? transformUser(assignee) : null,
    collaborators,
    projects,
    project: projects[0]?.name || null,
    projectSlug: projects[0]?.slug || null,
    subtasks,
    subtaskCount: subtasks.length,
    tags: t.tags || [],
    isOverdue,
    createdAt: t.createdAt || null,
    updatedAt: t.updatedAt || null,
  };
}

export function transformSubtask(strapiSubtask) {
  if (!strapiSubtask) return null;
  const s = strapiSubtask.attributes || strapiSubtask;
  const id = strapiSubtask.id || s.id;
  return {
    id,
    name: s.title || s.name || 'Untitled Subtask',
    status: transformStatus(s.status),
    strapiStatus: s.status || 'SCHEDULED',
    priority: transformPriority(s.priority),
    dueDate: s.scheduledDate || s.dueDate || null,
    progress: typeof s.progress === 'number' ? s.progress : 0,
    assignee: s.assignee ? transformUser(s.assignee.data || s.assignee) : null,
  };
}

export function transformComment(strapiComment) {
  if (!strapiComment) return null;
  const c = strapiComment.attributes || strapiComment;
  const id = strapiComment.id || c.id;
  const author = c.author?.data || c.author || c.user?.data || c.user;
  return {
    id,
    content: c.content || c.text || '',
    author: author ? transformUser(author) : null,
    createdAt: c.createdAt || null,
    formattedDate: formatRelativeDate(c.createdAt),
  };
}

export const PROJECT_BG_COLORS = {
  default: 'bg-orange-500',
  planning: 'bg-blue-500',
  active: 'bg-green-500',
  'on hold': 'bg-yellow-500',
  completed: 'bg-gray-400',
  cancelled: 'bg-red-400',
};

export function getStatusColor(status) {
  const s = status?.toLowerCase();
  const colors = {
    'to do': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    'in progress': { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    'internal review': { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    'done': { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    'cancelled': { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
    'overdue': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  };
  return colors[s] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
}

export function getPriorityColor(priority) {
  const p = priority?.toLowerCase();
  const colors = {
    high: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    low: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  };
  return colors[p] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
}

export function getProjectStatusColor(status) {
  const s = status?.toLowerCase();
  const colors = {
    'planning': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'active': { bg: 'bg-green-100', text: 'text-green-700' },
    'in progress': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    'on hold': { bg: 'bg-orange-100', text: 'text-orange-700' },
    'completed': { bg: 'bg-gray-100', text: 'text-gray-700' },
    'cancelled': { bg: 'bg-red-100', text: 'text-red-700' },
  };
  return colors[s] || { bg: 'bg-gray-100', text: 'text-gray-600' };
}
