import React from 'react';
import type { ProjectTaskSubmissionResponse, TaskStatus } from '../../types/domain';
import FinancialResearchWorkbench from './FinancialResearchWorkbench';

interface ManagerFinancialResearchReviewWorkspaceProps {
  projectId: number;
  taskId: number;
  taskTitle?: string | null;
  taskDescription?: string | null;
  taskStatus?: TaskStatus | string | null;
  dueDate?: string | null;
  targetCompanyName?: string | null;
  assignedToName?: string | null;
  workbenchSubmissions?: ProjectTaskSubmissionResponse[];
  onClose: () => void;
  onReviewed?: (message: string, isSuccess: boolean) => void;
}

export default function ManagerFinancialResearchReviewWorkspace(
  props: ManagerFinancialResearchReviewWorkspaceProps,
) {
  return (
    <FinancialResearchWorkbench
      {...props}
      canEdit={false}
      isManagerMode={true}
    />
  );
}

