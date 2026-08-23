import type { NotificationItem } from '../components/Topbar';

export type NotificationDestination = {
  projectId: number;
  tab: string;
  taskId?: number;
};

export function resolveNotificationDestination(
  notification: NotificationItem,
  role: string
): NotificationDestination | null {
  if (!notification.projectId) {
    return null;
  }

  const { projectId, taskId, actionType } = notification;

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
    projectId,
    tab,
    taskId: focusTaskId,
  };
}
