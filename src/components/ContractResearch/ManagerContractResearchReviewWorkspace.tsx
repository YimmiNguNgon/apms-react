import React from 'react';
import { ContractResearchWorkbench } from './ContractResearchWorkbench';
import type { ProjectTaskSubmissionResponse } from '../../types/domain';

interface Props {
  projectId: number;
  taskId: number;
  submissionId?: number;
  taskTitle?: string | null;
  taskDescription?: string | null;
  taskStatus?: string | null;
  dueDate?: string | null;
  targetCompanyName?: string | null;
  assignedToName?: string | null;
  workbenchSubmissions?: ProjectTaskSubmissionResponse[];
  onClose?: () => void;
  onReviewCompleted?: () => void;
}

export const ManagerContractResearchReviewWorkspace: React.FC<Props> = (props) => {
  return (
    <ContractResearchWorkbench
      {...props}
      canEdit={false}
      isManagerMode={true}
      submissionId={props.submissionId || props.workbenchSubmissions?.[0]?.id || 0}
    />
  );
};

export default ManagerContractResearchReviewWorkspace;