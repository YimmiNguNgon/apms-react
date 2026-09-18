import type { NotificationItem } from '../components/Topbar';

export type NotificationDestination = {
  type: 'project' | 'company-profile' | 'relationship-assessment';
  page: string;
  projectId?: number;
  tab?: string;
  taskId?: number;
  companyProfileId?: string;
  assessmentId?: string;
  target?: string;
};

export function resolveNotificationDestination(
  notification: NotificationItem,
  _role?: string
): NotificationDestination | null {
  const { actionType, companyProfileId, entityId } = notification;

  if (actionType === 'COMPANY_PROFILE_UPDATED' && companyProfileId) {
    return {
      type: 'company-profile',
      page: 'company-detail',
      companyProfileId,
      tab: 'overview',
      target: `company-detail?companyId=${encodeURIComponent(companyProfileId)}&tab=overview`,
    };
  }

  if (
    (actionType === 'RELATIONSHIP_ASSESSMENT_COMPLETED' ||
      actionType === 'RELATIONSHIP_ASSESSMENT_INITIAL' ||
      actionType === 'RELATIONSHIP_ASSESSMENT_UPDATED') &&
    companyProfileId
  ) {
    return {
      type: 'relationship-assessment',
      page: 'company-detail',
      companyProfileId,
      tab: 'relationship-closeness',
      target: `company-detail?companyId=${encodeURIComponent(companyProfileId)}&tab=relationship-closeness`,
    };
  }

  if (actionType === 'RELATIONSHIP_ASSESSMENT_OWNER_ADJUSTED' && companyProfileId) {
    const assessmentQuery = entityId ? `&assessmentId=${encodeURIComponent(entityId)}` : '';
    return {
      type: 'relationship-assessment',
      page: 'relationship-assessment-detail',
      companyProfileId,
      assessmentId: entityId ?? undefined,
      target: `relationship-assessment-detail?companyProfileId=${encodeURIComponent(companyProfileId)}${assessmentQuery}&readOnly=true`,
    };
  }

  if (!notification.projectId) {
    return null;
  }

  const { projectId, taskId } = notification;

  let tab = 'Kanban Board';
  let focusTaskId: number | undefined = undefined;

  switch (actionType) {
    case 'TASKS_AVAILABLE':
      tab = 'Kanban Board';
      break;

    case 'TASK_SUBMITTED':
      tab = 'Kanban Board';
      focusTaskId = taskId ?? undefined;
      break;

    case 'TASK_APPROVED':
    case 'TASK_CHANGES_REQUESTED':
    case 'TASK_ASSIGNED':
      tab = 'Kanban Board';
      focusTaskId = taskId ?? undefined;
      break;

    case 'PROJECT_MEMBER_ADDED':
    case 'PROJECT_MEMBER_REMOVED':
      tab = 'Members';
      break;

    default:
      break;
  }

  return {
    type: 'project',
    page: 'project-detail',
    projectId,
    tab,
    taskId: focusTaskId,
  };
}
