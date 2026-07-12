/** PM development-task category, metadata shape, and form helpers. */

export const TASK_CATEGORIES = {
  GENERAL: 'general',
  DEVELOPMENT: 'development',
};

export const DEV_WORK_TYPE_OPTIONS = [
  { value: 'feature', label: 'Feature' },
  { value: 'bug', label: 'Bug' },
  { value: 'hotfix', label: 'Hotfix' },
  { value: 'spike', label: 'Spike' },
  { value: 'chore', label: 'Chore' },
  { value: 'refactor', label: 'Refactor' },
];

export const DEV_AREA_OPTIONS = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'api', label: 'API' },
  { value: 'database', label: 'Database' },
  { value: 'devops', label: 'DevOps' },
  { value: 'design', label: 'Design' },
  { value: 'mobile', label: 'Mobile' },
];

export const DEV_ENVIRONMENT_OPTIONS = [
  { value: 'local', label: 'Local' },
  { value: 'dev', label: 'Dev' },
  { value: 'staging', label: 'Staging' },
  { value: 'production', label: 'Production' },
];

export const DEV_REVIEW_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_review', label: 'In review' },
  { value: 'changes_requested', label: 'Changes requested' },
  { value: 'approved', label: 'Approved' },
];

export const DEV_QA_STATUS_OPTIONS = [
  { value: 'untested', label: 'Untested' },
  { value: 'in_qa', label: 'In QA' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
];

export const DEV_SEVERITY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'critical', label: 'Critical' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'trivial', label: 'Trivial' },
];

/** Team roles on a major development task */
export const DEV_ROLE_DEFINITIONS = [
  { key: 'developer', label: 'Developer', color: 'bg-violet-600' },
  { key: 'ba', label: 'Business Analyst', color: 'bg-sky-600' },
  { key: 'qa', label: 'QA Engineer', color: 'bg-amber-600' },
  { key: 'tester', label: 'Tester', color: 'bg-emerald-600' },
  { key: 'techLead', label: 'Tech Lead', color: 'bg-slate-700' },
];

export const DEV_PIPELINE_STAGES = [
  { key: 'backlog', label: 'Backlog', shortLabel: 'Backlog' },
  { key: 'development', label: 'Development', shortLabel: 'Dev' },
  { key: 'code_review', label: 'Code Review', shortLabel: 'Review' },
  { key: 'qa', label: 'QA', shortLabel: 'QA' },
  { key: 'ready', label: 'Ready', shortLabel: 'Ready' },
  { key: 'done', label: 'Done', shortLabel: 'Done' },
];

export const DEV_TICKET_TYPE_OPTIONS = [
  { value: 'implementation', label: 'Implementation' },
  { value: 'bugfix', label: 'Bug fix' },
  { value: 'test', label: 'Testing' },
  { value: 'code_review', label: 'Code review' },
  { value: 'deployment', label: 'Deployment' },
  { value: 'spike', label: 'Spike' },
];

export const EMPTY_DEV_ROLES = {
  developer: '',
  ba: '',
  qa: '',
  tester: '',
  techLead: '',
};

export const EMPTY_DEV_METADATA = {
  workType: 'feature',
  area: 'frontend',
  storyPoints: '',
  estimateHours: '',
  branch: '',
  prUrl: '',
  repo: '',
  environment: 'dev',
  reviewStatus: 'not_started',
  qaStatus: 'untested',
  releaseVersion: '',
  severity: '',
  acceptanceCriteria: [],
  pipelineStage: 'backlog',
  roles: { ...EMPTY_DEV_ROLES },
  isDevTicket: false,
  ticketType: 'implementation',
  ticketKey: '',
};

export function isDevelopmentTask(task) {
  return (task?.taskCategory || TASK_CATEGORIES.GENERAL) === TASK_CATEGORIES.DEVELOPMENT;
}

export function isDevelopmentMajorTask(task) {
  return isDevelopmentTask(task) && !task?.parentId;
}

export function isDevTicket(task) {
  if (!isDevelopmentTask(task)) return false;
  const meta = task?.devMetadata;
  return Boolean(meta?.isDevTicket) || Boolean(task?.parentId);
}

export function normalizeDevRoles(raw) {
  const base = { ...EMPTY_DEV_ROLES };
  if (!raw || typeof raw !== 'object') return base;
  for (const { key } of DEV_ROLE_DEFINITIONS) {
    const v = raw[key];
    base[key] = v != null && String(v).trim() !== '' ? String(v) : '';
  }
  return base;
}

export function normalizeDevMetadata(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_DEV_METADATA, acceptanceCriteria: [], roles: { ...EMPTY_DEV_ROLES } };
  }
  const criteria = Array.isArray(raw.acceptanceCriteria)
    ? raw.acceptanceCriteria.map((item, index) => ({
        id: item?.id || `ac-${index + 1}`,
        text: String(item?.text || '').trim(),
        done: Boolean(item.done),
      }))
    : [];
  return {
    ...EMPTY_DEV_METADATA,
    workType: raw.workType || EMPTY_DEV_METADATA.workType,
    area: raw.area || EMPTY_DEV_METADATA.area,
    storyPoints: raw.storyPoints != null && raw.storyPoints !== '' ? String(raw.storyPoints) : '',
    estimateHours: raw.estimateHours != null && raw.estimateHours !== '' ? String(raw.estimateHours) : '',
    branch: raw.branch || '',
    prUrl: raw.prUrl || '',
    repo: raw.repo || '',
    environment: raw.environment || EMPTY_DEV_METADATA.environment,
    reviewStatus: raw.reviewStatus || EMPTY_DEV_METADATA.reviewStatus,
    qaStatus: raw.qaStatus || EMPTY_DEV_METADATA.qaStatus,
    releaseVersion: raw.releaseVersion || '',
    severity: raw.severity || '',
    pipelineStage: raw.pipelineStage || EMPTY_DEV_METADATA.pipelineStage,
    roles: normalizeDevRoles(raw.roles),
    isDevTicket: Boolean(raw.isDevTicket),
    ticketType: raw.ticketType || EMPTY_DEV_METADATA.ticketType,
    ticketKey: raw.ticketKey || '',
    acceptanceCriteria: criteria,
  };
}

/** Infer pipeline stage from task status + dev metadata when not explicitly set */
export function resolvePipelineStage(task) {
  const meta = normalizeDevMetadata(task?.devMetadata);
  if (meta.pipelineStage && DEV_PIPELINE_STAGES.some((s) => s.key === meta.pipelineStage)) {
    return meta.pipelineStage;
  }
  const status = task?.strapiStatus || 'SCHEDULED';
  if (status === 'COMPLETED') return 'done';
  if (status === 'CANCELLED') return 'backlog';
  if (meta.qaStatus === 'passed') return 'ready';
  if (meta.qaStatus === 'in_qa' || meta.qaStatus === 'failed') return 'qa';
  if (meta.reviewStatus === 'in_review' || meta.reviewStatus === 'changes_requested') return 'code_review';
  if (meta.reviewStatus === 'approved' && meta.qaStatus === 'untested') return 'qa';
  if (status === 'INTERNAL_REVIEW') return 'code_review';
  if (status === 'IN_PROGRESS' || status === 'ACTIVE') return 'development';
  return 'backlog';
}

export function pipelineStageIndex(stage) {
  const idx = DEV_PIPELINE_STAGES.findIndex((s) => s.key === stage);
  return idx >= 0 ? idx : 0;
}

/** Map pipeline click → task status + dev metadata patches */
export function pipelineStageToTaskPatch(stage) {
  const base = { pipelineStage: stage };
  switch (stage) {
    case 'backlog':
      return { ...base, status: 'SCHEDULED', reviewStatus: 'not_started', qaStatus: 'untested' };
    case 'development':
      return { ...base, status: 'IN_PROGRESS', reviewStatus: 'not_started', qaStatus: 'untested' };
    case 'code_review':
      return { ...base, status: 'INTERNAL_REVIEW', reviewStatus: 'in_review', qaStatus: 'untested' };
    case 'qa':
      return { ...base, status: 'IN_PROGRESS', reviewStatus: 'approved', qaStatus: 'in_qa' };
    case 'ready':
      return { ...base, status: 'INTERNAL_REVIEW', reviewStatus: 'approved', qaStatus: 'passed' };
    case 'done':
      return { ...base, status: 'COMPLETED', reviewStatus: 'approved', qaStatus: 'passed' };
    default:
      return base;
  }
}

export function devMetadataToPayload(formMeta) {
  const meta = normalizeDevMetadata(formMeta);
  const storyPoints = meta.storyPoints !== '' ? Number(meta.storyPoints) : null;
  const estimateHours = meta.estimateHours !== '' ? Number(meta.estimateHours) : null;
  const roles = {};
  for (const { key } of DEV_ROLE_DEFINITIONS) {
    const id = meta.roles[key];
    roles[key] = id && String(id).trim() !== '' ? String(id) : null;
  }
  return {
    workType: meta.workType,
    area: meta.area,
    storyPoints: Number.isFinite(storyPoints) ? storyPoints : null,
    estimateHours: Number.isFinite(estimateHours) ? estimateHours : null,
    branch: meta.branch.trim() || null,
    prUrl: meta.prUrl.trim() || null,
    repo: meta.repo.trim() || null,
    environment: meta.environment,
    reviewStatus: meta.reviewStatus,
    qaStatus: meta.qaStatus,
    releaseVersion: meta.releaseVersion.trim() || null,
    severity: meta.severity || null,
    pipelineStage: meta.pipelineStage,
    roles,
    isDevTicket: Boolean(meta.isDevTicket),
    ticketType: meta.ticketType,
    ticketKey: meta.ticketKey.trim() || null,
    acceptanceCriteria: meta.acceptanceCriteria
      .filter((item) => item.text)
      .map((item) => ({
        id: item.id,
        text: item.text,
        done: Boolean(item.done),
      })),
  };
}

export function buildDevTicketKey(parentId, ticketIndex) {
  return `DEV-${parentId}-${String(ticketIndex).padStart(2, '0')}`;
}

export function devTicketsFromSubtasks(subtasks = []) {
  return (subtasks || []).filter((st) => isDevelopmentTask(st) || st?.devMetadata?.isDevTicket !== false);
}

export function optionLabel(options, value) {
  return options.find((o) => o.value === value)?.label || value || '—';
}

export function newAcceptanceCriterion(text = '') {
  return {
    id: `ac-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    done: false,
  };
}

export function resolveRoleUser(roles, roleKey, users = []) {
  const userId = roles?.[roleKey];
  if (!userId) return null;
  return users.find((u) => String(u.id) === String(userId)) || null;
}
