export type ProjectStatus = 'Active' | 'Planning' | 'Blocked' | 'Completed';
export type ProjectType = 'Partner Research' | 'Company Update';
export type TaskStatus = 'todo' | 'progress' | 'review' | 'done';
export type TaskPriority = 'Highest' | 'High' | 'Medium' | 'Low';

export type ProjectMember = {
  id: number;
  name: string;
  role: string;
  avatar: string;
  color: string;
  workload: number;
};

export type ProjectComment = {
  id: number;
  author: ProjectMember;
  message: string;
  createdAt: string;
};

export type ProjectAttachment = {
  id: number;
  name: string;
  type: 'document' | 'image';
  size: string;
  preview?: string;
};

export type ProjectActivity = {
  id: number;
  actor: string;
  action: string;
  time: string;
};

export type ProjectTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: ProjectMember;
  reporter: ProjectMember;
  dueDate: string;
  labels: string[];
  attachments: ProjectAttachment[];
  comments: ProjectComment[];
  activity: ProjectActivity[];
  aiGenerated?: boolean;
  aiSummary: string;
  aiSuggestions: string[];
  aiRiskAnalysis: string;
  aiNextSteps: string[];
};

export const columns: Array<{ id: TaskStatus; title: string; hint: string }> = [
  { id: 'todo', title: 'To Do', hint: 'Ready for discovery' },
  { id: 'progress', title: 'In Progress', hint: 'Currently being worked on' },
  { id: 'review', title: 'In Review', hint: 'Waiting for validation' },
  { id: 'done', title: 'Done', hint: 'Completed and accepted' },
];

export const members: ProjectMember[] = [
  { id: 1, name: 'Nguyen An', role: 'Project Owner', avatar: 'NA', color: '#2563EB', workload: 78 },
  { id: 2, name: 'Linh Tran', role: 'Research Lead', avatar: 'LT', color: '#22C55E', workload: 62 },
  { id: 3, name: 'Minh Pham', role: 'Analyst', avatar: 'MP', color: '#F59E0B', workload: 48 },
  { id: 4, name: 'Huy Do', role: 'Reviewer', avatar: 'HD', color: '#8B5CF6', workload: 55 },
  { id: 5, name: 'Mai Le', role: 'AI QA', avatar: 'ML', color: '#EF4444', workload: 35 },
];

export const projectDetail = {
  name: 'APMS Partner Intelligence Rollout',
  key: 'APMS-01',
  status: 'Active' as ProjectStatus,
  type: 'Partner Research' as ProjectType,
  priority: 'High' as TaskPriority,
  owner: members[0],
  startDate: '2026-07-12',
  dueDate: '2026-08-30',
  progress: 64,
};

const sampleAttachments: ProjectAttachment[] = [
  { id: 1, name: 'company-profile.pdf', type: 'document', size: '2.4 MB' },
  {
    id: 2,
    name: 'market-map.png',
    type: 'image',
    size: '920 KB',
    preview: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
  },
];

export const initialTasks: ProjectTask[] = [
  {
    id: 'APMS-101',
    title: 'Validate target company identity and ownership data',
    description: 'Review legal name, trade name, registration details, and ownership signals before moving the company profile into active assessment.',
    status: 'todo',
    priority: 'High',
    assignee: members[2],
    reporter: members[0],
    dueDate: '2026-07-27',
    labels: ['Research', 'Company profile'],
    attachments: [sampleAttachments[0]],
    comments: [
      { id: 1, author: members[1], message: 'Please double-check the registration source before review.', createdAt: 'Today 09:14' },
    ],
    activity: [
      { id: 1, actor: 'Nguyen An', action: 'created this task', time: 'Today 08:42' },
      { id: 2, actor: 'Linh Tran', action: 'added identity checklist', time: 'Today 09:02' },
    ],
    aiGenerated: true,
    aiSummary: 'The task is focused on reducing duplicate or incorrect company records before partner analysis starts.',
    aiSuggestions: ['Compare legal name with at least two trusted sources.', 'Flag profile if ownership structure is unclear.'],
    aiRiskAnalysis: 'Medium risk: incorrect entity matching could affect relationship recommendations.',
    aiNextSteps: ['Confirm registration number.', 'Attach source evidence.', 'Move to In Progress when sources are ready.'],
  },
  {
    id: 'APMS-102',
    title: 'Prepare partner fit scorecard',
    description: 'Build a scoring view for market fit, strategic value, operating risk, and data confidence.',
    status: 'progress',
    priority: 'Highest',
    assignee: members[1],
    reporter: members[0],
    dueDate: '2026-07-29',
    labels: ['Scoring', 'Strategy'],
    attachments: sampleAttachments,
    comments: [
      { id: 2, author: members[0], message: '@Linh please include a risk column for data freshness.', createdAt: 'Yesterday 16:35' },
      { id: 3, author: members[1], message: 'Added draft score weights for review.', createdAt: 'Today 10:20' },
    ],
    activity: [
      { id: 3, actor: 'Linh Tran', action: 'moved task to In Progress', time: 'Yesterday 15:10' },
      { id: 4, actor: 'Nguyen An', action: 'changed priority to Highest', time: 'Yesterday 16:30' },
    ],
    aiGenerated: false,
    aiSummary: 'Scorecard should help compare target companies consistently across strategic and operational criteria.',
    aiSuggestions: ['Keep scoring criteria visible in the task description.', 'Use confidence level to separate assumptions from verified data.'],
    aiRiskAnalysis: 'High risk if scoring is treated as final before reviewer approval.',
    aiNextSteps: ['Complete first scorecard draft.', 'Request manager review.', 'Document scoring assumptions.'],
  },
  {
    id: 'APMS-103',
    title: 'Review AI extracted relationship candidates',
    description: 'Inspect AI-generated relationship suggestions and decide which candidates should be promoted to the project board.',
    status: 'review',
    priority: 'Medium',
    assignee: members[4],
    reporter: members[1],
    dueDate: '2026-07-31',
    labels: ['AI', 'Validation'],
    attachments: [],
    comments: [
      { id: 4, author: members[4], message: 'Two candidates need manual source confirmation.', createdAt: 'Today 11:05' },
    ],
    activity: [
      { id: 5, actor: 'Mai Le', action: 'added review notes', time: 'Today 11:06' },
    ],
    aiGenerated: true,
    aiSummary: 'AI found potential relationships from uploaded documents, but some evidence is weak.',
    aiSuggestions: ['Prioritize candidates with direct contract mentions.', 'Reject suggestions based only on generic news references.'],
    aiRiskAnalysis: 'Medium risk due to ambiguous source wording in two recommendations.',
    aiNextSteps: ['Verify source snippets.', 'Approve strong candidates.', 'Return unclear items to backlog.'],
  },
  {
    id: 'APMS-104',
    title: 'Publish approved partner brief',
    description: 'Package final insights for director review with summary, relationship context, and recommended next action.',
    status: 'done',
    priority: 'Low',
    assignee: members[3],
    reporter: members[0],
    dueDate: '2026-07-24',
    labels: ['Report', 'Director'],
    attachments: [sampleAttachments[0]],
    comments: [
      { id: 5, author: members[3], message: 'Brief uploaded and ready for director review.', createdAt: 'Today 13:20' },
    ],
    activity: [
      { id: 6, actor: 'Huy Do', action: 'moved task to Done', time: 'Today 13:21' },
    ],
    aiGenerated: false,
    aiSummary: 'Final partner brief is complete and ready for executive consumption.',
    aiSuggestions: ['Use the brief as baseline for next stakeholder sync.'],
    aiRiskAnalysis: 'Low risk after reviewer approval.',
    aiNextSteps: ['Share with director.', 'Archive supporting notes.', 'Track follow-up decisions.'],
  },
  {
    id: 'APMS-105',
    title: 'Collect missing financial signals',
    description: 'Find recent revenue, funding, and operating scale signals for the target company.',
    status: 'progress',
    priority: 'High',
    assignee: members[2],
    reporter: members[1],
    dueDate: '2026-08-02',
    labels: ['Finance', 'Research'],
    attachments: [],
    comments: [],
    activity: [
      { id: 7, actor: 'Minh Pham', action: 'accepted assignment', time: 'Today 14:02' },
    ],
    aiGenerated: true,
    aiSummary: 'The company profile is missing current scale indicators needed for partner scoring.',
    aiSuggestions: ['Use public filings first.', 'Mark unverified estimates clearly.'],
    aiRiskAnalysis: 'Medium risk because stale financial data can distort partner priority.',
    aiNextSteps: ['Collect latest public figures.', 'Add confidence notes.', 'Request reviewer check.'],
  },
];

export const recentActivity: ProjectActivity[] = [
  { id: 1, actor: 'Linh Tran', action: 'updated partner fit scorecard', time: '10 minutes ago' },
  { id: 2, actor: 'Mai Le', action: 'flagged AI relationship evidence', time: '48 minutes ago' },
  { id: 3, actor: 'Huy Do', action: 'completed partner brief', time: '2 hours ago' },
];
