import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  Copy,
  Edit3,
  FileText,
  Info,
  Loader2,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Smile,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { chatApi, type ChatMessageResponse } from '../API/chatApi';
import { api, type PageResponse } from '../services/api';
import { useUser } from '../context/UserContext';
import { useChatNotifications } from '../context/ChatNotificationContext';
import type { ProjectMemberResponse, ProjectResponse } from '../types/domain';
import styles from './SystemChat.module.css';

type ChatFilter = 'all' | 'active' | 'draft' | 'completed';
type ProjectTone = 'blue' | 'green' | 'amber' | 'violet';

interface ConversationMeta {
  unreadCount: number;
  lastMessage?: ChatMessageResponse | null;
  lastMessageAt?: string | null;
  lastMessageSenderId?: number | null;
}

interface ChatToast {
  id: string;
  projectId: number;
  projectName: string;
  senderName: string;
  preview: string;
  createdAt?: string | null;
}

type LastReadMap = Record<string, string>;

const LAST_READ_KEY = 'apms-chat-last-read-at';
const SOUND_ENABLED_KEY = 'apms-chat-sound-enabled';

const formatBadgeCount = (value: number) => (value > 99 ? '99+' : String(value));

const formatMessagePreview = (message?: ChatMessageResponse | null, fallback?: string | null) => {
  if (!message) return fallback || 'Project conversation';
  const sender = message.senderName?.split('@')[0] || `User #${message.senderId}`;
  const content = message.isDeleted ? 'Deleted message' : message.content;
  return `${sender}: ${content}`;
};

const messageTime = (message?: ChatMessageResponse | null) =>
  message?.createdAt ? new Date(message.createdAt).getTime() : 0;

const isProjectNearBottom = (element: HTMLDivElement | null) => {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < 96;
};

const readLastReadMap = (): LastReadMap => {
  try {
    const value = localStorage.getItem(LAST_READ_KEY);
    return value ? JSON.parse(value) as LastReadMap : {};
  } catch {
    return {};
  }
};

const writeLastReadMap = (value: LastReadMap) => {
  localStorage.setItem(LAST_READ_KEY, JSON.stringify(value));
};

const filterOptions: Array<{ value: ChatFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' },
];

const projectStatusFilter = (status?: string | null): ChatFilter => {
  if (status === 'ACTIVE') return 'active';
  if (status === 'DRAFT') return 'draft';
  if (status === 'COMPLETED') return 'completed';
  return 'all';
};

const humanize = (value?: string | null) => {
  if (!value) return 'N/A';
  return value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
};

const relationshipLabel = (value?: string | null) => {
  const normalized = value?.toUpperCase();
  if (normalized?.includes('PARTNER')) return 'Partner';
  if (normalized?.includes('SUPPLIER')) return 'Supplier';
  if (normalized?.includes('COMPETITOR')) return 'Competitor';
  if (normalized?.includes('CUSTOMER')) return 'Customer';
  return humanize(value);
};

const projectTypeLabel = (value?: string | null) => {
  const normalized = value?.toUpperCase();
  if (normalized?.includes('NEW') && normalized?.includes('COMPANY')) return 'Research New Company';
  if (normalized?.includes('UPDATE') && normalized?.includes('EXISTING')) return 'Existing Company';
  return humanize(value);
};

const formatTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: '2-digit' });
};

const formatFullDate = (value?: string | null) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleString([], {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDay = (value?: string | null) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
};

const initials = (value?: string | null) =>
  (value || 'Project')
    .split(/[.\s@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'PR';

const projectTone = (project?: ProjectResponse | null): ProjectTone => {
  if (project?.status === 'ACTIVE') return 'green';
  if (project?.status === 'DRAFT') return 'amber';
  if (project?.status === 'COMPLETED') return 'violet';
  return 'blue';
};

const isMine = (message: ChatMessageResponse, userId?: number | null, userEmail?: string | null) =>
  Boolean((userId && message.senderId === userId) || (userEmail && message.senderName?.toLowerCase() === userEmail.toLowerCase()));

const shouldStartGroup = (messages: ChatMessageResponse[], index: number) => {
  if (index === 0) return true;
  const current = messages[index];
  const previous = messages[index - 1];
  if (!previous || previous.senderId !== current.senderId) return true;
  const currentTime = current.createdAt ? new Date(current.createdAt).getTime() : 0;
  const previousTime = previous.createdAt ? new Date(previous.createdAt).getTime() : 0;
  return Math.abs(currentTime - previousTime) > 5 * 60 * 1000;
};

const shouldShowDayDivider = (messages: ChatMessageResponse[], index: number) => {
  if (index === 0) return true;
  const currentDay = formatDay(messages[index].createdAt);
  const previousDay = formatDay(messages[index - 1].createdAt);
  return currentDay !== previousDay;
};

interface ProjectSidebarProps {
  projects: ProjectResponse[];
  activeProject: ProjectResponse | null;
  filter: ChatFilter;
  query: string;
  loading: boolean;
  messages: ChatMessageResponse[];
  conversationMeta: Record<number, ConversationMeta>;
  totalUnread: number;
  soundEnabled: boolean;
  onFilterChange: (value: ChatFilter) => void;
  onQueryChange: (value: string) => void;
  onSelectProject: (projectId: number) => void;
  onRefresh: () => void;
  onToggleSound: () => void;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  activeProject,
  filter,
  query,
  loading,
  messages,
  conversationMeta,
  totalUnread,
  soundEnabled,
  onFilterChange,
  onQueryChange,
  onSelectProject,
  onRefresh,
  onToggleSound,
}) => {
  const filteredProjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    return projects.filter((project) => {
      const statusFilter = projectStatusFilter(project.status);
      const matchesFilter = filter === 'all' || statusFilter === filter;
      const searchable = [
        project.projectName,
        project.targetCompanyName,
        project.description,
        project.status,
        projectTypeLabel(project.projectType),
        relationshipLabel(project.targetRelationshipType),
      ].join(' ').toLowerCase();
      return matchesFilter && (!term || searchable.includes(term));
    }).sort((a, b) => {
      const left = conversationMeta[a.id]?.lastMessageAt || a.updatedAt || a.createdAt || '';
      const right = conversationMeta[b.id]?.lastMessageAt || b.updatedAt || b.createdAt || '';
      return new Date(right).getTime() - new Date(left).getTime();
    });
  }, [conversationMeta, filter, projects, query]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitle}>
          <div>
            <h1>
              Project chats
              {totalUnread > 0 && <span className={styles.totalUnreadBadge}>{formatBadgeCount(totalUnread)}</span>}
            </h1>
            <span>{projects.length} conversation(s)</span>
          </div>
        </div>

        <ProjectSearch value={query} onChange={onQueryChange} />
        <div className={`${styles.unreadSummary} ${totalUnread > 0 ? styles.unreadSummaryActive : ''}`}>
          <span>{totalUnread > 0 ? `${formatBadgeCount(totalUnread)} unread message${totalUnread > 1 ? 's' : ''}` : 'All caught up'}</span>
          <small>{totalUnread > 0 ? 'New project updates need attention' : 'No unread project messages'}</small>
        </div>
        {/* <ProjectFilter value={filter} onChange={onFilterChange} /> */}
      </div>

      <div className={styles.projectList}>
        {loading && <div className={styles.listState}>Loading project chats...</div>}
        {!loading && filteredProjects.length === 0 && <div className={styles.listState}>No project chats found.</div>}
        {filteredProjects.map((project) => {
          const selected = activeProject?.id === project.id;
          const latest = selected ? messages[messages.length - 1] : conversationMeta[project.id]?.lastMessage ?? null;
          const unreadCount = conversationMeta[project.id]?.unreadCount ?? 0;
          return (
            <ProjectConversationItem
              key={project.id}
              project={project}
              selected={selected}
              latestMessage={latest}
              unreadCount={unreadCount}
              onSelect={() => onSelectProject(project.id)}
            />
          );
        })}
      </div>
    </aside>
  );
};

const ProjectSearch: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation('system-chat');
  return (
    <label className={styles.searchBox}>
      <Search size={16} />
      <input value={value} placeholder={t('ui.searchProjects')} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
};

// const ProjectFilter: React.FC<{ value: ChatFilter; onChange: (value: ChatFilter) => void }> = ({ value, onChange }) => (
//   <div className={styles.filterRow} role="tablist" aria-label="Project chat filter">
//     {filterOptions.map((option) => (
//       <button
//         aria-selected={value === option.value}
//         className={`${styles.filterButton} ${value === option.value ? styles.filterActive : ''}`}
//         key={option.value}
//         type="button"
//         onClick={() => onChange(option.value)}
//       >
//         {option.label}
//       </button>
//     ))}
//   </div>
// );

interface ProjectConversationItemProps {
  project: ProjectResponse;
  selected: boolean;
  latestMessage: ChatMessageResponse | null;
  unreadCount: number;
  onSelect: () => void;
}

const ProjectConversationItem: React.FC<ProjectConversationItemProps> = ({ project, selected, latestMessage, unreadCount, onSelect }) => (
  <button
    className={`${styles.projectItem} ${selected ? styles.projectItemActive : ''} ${unreadCount > 0 ? styles.projectItemUnread : ''}`}
    type="button"
    onClick={onSelect}
  >
    <ProjectAvatar label={project.projectName} tone={projectTone(project)} />
    <div className={styles.projectItemBody}>
      <div className={styles.projectItemTop}>
        <strong>{project.projectName}</strong>
      </div>
      <p>{formatMessagePreview(latestMessage, project.targetCompanyName || project.description)}</p>
      <div className={styles.projectItemMeta}>
        <span className={styles.statusDot} data-status={project.status?.toLowerCase()} />
        <span>{humanize(project.status)}</span>
      </div>
    </div>
    <div className={styles.projectItemSignal}>
      <time>{formatTime(latestMessage?.createdAt || project.updatedAt || project.createdAt)}</time>
      {unreadCount > 0 ? (
        <span className={styles.projectUnreadBadge}>{formatBadgeCount(unreadCount)}</span>
      ) : (
        <span className={styles.readIndicator} />
      )}
    </div>
  </button>
);

const ProjectAvatar: React.FC<{ label?: string | null; tone?: ProjectTone; small?: boolean }> = ({ label, tone = 'blue', small }) => (
  <div className={`${styles.avatar} ${small ? styles.avatarSmall : ''}`} data-tone={tone}>
    {initials(label)}
  </div>
);

interface ChatHeaderProps {
  project: ProjectResponse | null;
  onBack: () => void;
  onDetails: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ project, onBack, onDetails }) => (
  <header className={styles.chatHeader}>
    <button aria-label="Back to project list" className={`${styles.iconButton} ${styles.mobileBack}`} type="button" onClick={onBack}>
      <ChevronLeft size={19} />
    </button>

    <div className={styles.chatTitle}>
      <ProjectAvatar label={project?.projectName} tone={projectTone(project)} />
      <div>
        <h2>{project?.projectName || 'Select a project chat'}</h2>
        {project ? (
          <div className={styles.chatMeta}>
            <span>{relationshipLabel(project.targetRelationshipType)}</span>
            <span>{project.members?.length ?? 0} member(s)</span>
          </div>
        ) : (
          <p>Choose a project on the left to start messaging.</p>
        )}
      </div>
    </div>

    <div className={styles.chatHeaderActions}>
      <button aria-label="Open project details" className={styles.detailsButton} type="button" disabled={!project} onClick={onDetails}>
        <Users size={17} />
        <span>Details</span>
      </button>
    </div>
  </header>
);

interface ChatMessageListProps {
  messages: ChatMessageResponse[];
  loading: boolean;
  activeProject: ProjectResponse | null;
  userId?: number | null;
  userEmail?: string | null;
  editingMessageId: string | null;
  editingContent: string;
  endRef: React.RefObject<HTMLDivElement | null>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  newMessageCount: number;
  onEditStart: (message: ChatMessageResponse) => void;
  onEditContentChange: (value: string) => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onDeleteRequest: (message: ChatMessageResponse) => void;
  onScroll: () => void;
  onJumpToLatest: () => void;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  loading,
  activeProject,
  userId,
  userEmail,
  editingMessageId,
  editingContent,
  endRef,
  viewportRef,
  newMessageCount,
  onEditStart,
  onEditContentChange,
  onEditCancel,
  onEditSave,
  onDeleteRequest,
  onScroll,
  onJumpToLatest,
}) => {
  const [openMenuMessageId, setOpenMenuMessageId] = useState<string | null>(null);

  return (
  <div className={styles.messageViewport} ref={viewportRef} onScroll={onScroll}>
    {!activeProject && <EmptyConversationState title="Select a project chat" description="Choose a project to view team messages." />}
    {activeProject && loading && <EmptyConversationState title="Loading chat history..." description="Fetching the latest project conversation." loading />}
    {activeProject && !loading && messages.length === 0 && (
      <EmptyConversationState title="No messages yet" description="Start the conversation with a short project update." />
    )}

    {activeProject && !loading && messages.map((message, index) => {
      const mine = isMine(message, userId, userEmail);
      const grouped = !shouldStartGroup(messages, index);
      return (
        <React.Fragment key={message.id}>
          {shouldShowDayDivider(messages, index) && <div className={styles.dayDivider}><span>{formatDay(message.createdAt)}</span></div>}
          <MessageBubble
            message={message}
            mine={mine}
            grouped={grouped}
            editing={editingMessageId === message.id}
            editingContent={editingContent}
            menuOpen={openMenuMessageId === message.id}
            onMenuToggle={() => setOpenMenuMessageId((current) => current === message.id ? null : message.id)}
            onEditStart={() => onEditStart(message)}
            onEditContentChange={onEditContentChange}
            onEditCancel={onEditCancel}
            onEditSave={onEditSave}
            onDeleteRequest={() => onDeleteRequest(message)}
          />
        </React.Fragment>
      );
    })}
    <div ref={endRef} />
    {newMessageCount > 0 && (
      <button className={styles.newMessagesButton} type="button" onClick={onJumpToLatest}>
        {formatBadgeCount(newMessageCount)} new message{newMessageCount > 1 ? 's' : ''} ↓
      </button>
    )}
  </div>
  );
};

interface MessageBubbleProps {
  message: ChatMessageResponse;
  mine: boolean;
  grouped: boolean;
  editing: boolean;
  editingContent: string;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onEditStart: () => void;
  onEditContentChange: (value: string) => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onDeleteRequest: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  mine,
  grouped,
  editing,
  editingContent,
  menuOpen,
  onMenuToggle,
  onEditStart,
  onEditContentChange,
  onEditCancel,
  onEditSave,
  onDeleteRequest,
}) => {
  const canModify = mine && !message.isDeleted;
  const copyMessage = () => {
    void navigator.clipboard?.writeText(message.content);
    if (menuOpen) onMenuToggle();
  };

  return (
    <article className={`${styles.messageRow} ${mine ? styles.outgoing : styles.incoming} ${grouped ? styles.groupedMessage : ''}`}>
      {!mine && !grouped ? <ProjectAvatar label={message.senderName} small /> : <div className={styles.avatarSpacer} />}
      <div className={styles.messageStack}>
        {!grouped && (
          <div className={styles.messageAuthor}>
            <strong>{mine ? 'You' : message.senderName || `User #${message.senderId}`}</strong>
            <span>{formatTime(message.createdAt)}</span>
          </div>
        )}
        <div className={styles.bubbleWrap}>
          <div className={styles.messageBubble}>
            {editing ? (
              <div className={styles.editBox}>
                <textarea value={editingContent} onChange={(event) => onEditContentChange(event.target.value)} autoFocus />
                <div className={styles.editActions}>
                  <button className={styles.secondaryButton} type="button" onClick={onEditCancel}>Cancel</button>
                  <button className={styles.primaryMiniButton} type="button" onClick={onEditSave}>Save</button>
                </div>
              </div>
            ) : (
              <>
                <p>{message.content}</p>
                <small>{message.isDeleted ? 'Deleted' : message.isEdited ? `Edited - ${formatFullDate(message.updatedAt)}` : formatFullDate(message.createdAt)}</small>
              </>
            )}
          </div>
          {canModify && !editing && (
            <MessageActions
              open={menuOpen}
              onToggle={onMenuToggle}
              onEdit={() => {
                onMenuToggle();
                onEditStart();
              }}
              onDelete={() => {
                onMenuToggle();
                onDeleteRequest();
              }}
              onCopy={copyMessage}
            />
          )}
        </div>
      </div>
    </article>
  );
};

const MessageActions: React.FC<{ open: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void; onCopy: () => void }> = ({ open, onToggle, onEdit, onDelete, onCopy }) => {
  const { t } = useTranslation('system-chat');
  return (
  <div className={styles.messageActions}>
    <button
      aria-label={t('ui.messageActions')}
      className={styles.messageMenuButton}
      title={t('ui.messageActions')}
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onToggle}
    >
      <MoreHorizontal size={15} />
    </button>
    {open && (
      <div className={styles.messageActionMenu}>
        <button type="button" onClick={onEdit}><Edit3 size={14} />{t('ui.edit')}</button>
        <button type="button" onClick={onCopy}><Copy size={14} />{t('ui.copy')}</button>
        <button type="button" onClick={onDelete}><Trash2 size={14} />{t('ui.delete')}</button>
      </div>
    )}
  </div>
  );
};

const EmptyConversationState: React.FC<{ title: string; description: string; loading?: boolean }> = ({ title, description, loading }) => (
  <div className={styles.emptyConversation}>
    {loading ? <Loader2 className={styles.spin} size={28} /> : <FileText size={30} />}
    <strong>{title}</strong>
    <span>{description}</span>
  </div>
);

interface MessageComposerProps {
  project: ProjectResponse | null;
  value: string;
  sending: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}

const MessageComposer: React.FC<MessageComposerProps> = ({ project, value, sending, onChange, onSend }) => {
  const { t } = useTranslation('system-chat');
  const counterVisible = value.length >= 1700;

  return (
    <footer className={styles.composer}>
      <div className={styles.composerHint}>{t('ui.membersOnly')}</div>
      <div className={styles.composerBox}>
        <button aria-label={t('ui.attachFile')} className={styles.composerIcon} type="button" disabled={!project}>
          <Paperclip size={18} />
        </button>
        <textarea
          value={value}
          placeholder={project ? t('ui.messageProject', { project: project.projectName }) : t('ui.selectProjectFirst')}
          disabled={!project || sending}
          maxLength={2000}
          rows={1}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <button aria-label={t('ui.emoji')} className={styles.composerIcon} type="button" disabled={!project}>
          <Smile size={18} />
        </button>
        {counterVisible && <span className={styles.charCounter}>{value.length}/2000</span>}
        <button
          aria-label={t('ui.sendMessage')}
          className={styles.sendButton}
          type="button"
          disabled={!project || sending || !value.trim()}
          onClick={onSend}
        >
          {sending ? <Loader2 className={styles.spin} size={18} /> : <Send size={18} />}
        </button>
      </div>
    </footer>
  );
};

interface ProjectDetailsDrawerProps {
  project: ProjectResponse | null;
  open: boolean;
  onClose: () => void;
}

const ProjectDetailsDrawer: React.FC<ProjectDetailsDrawerProps> = ({ project, open, onClose }) => (
  <>
    <div className={`${styles.drawerBackdrop} ${open ? styles.drawerBackdropOpen : ''}`} onClick={onClose} />
    <aside className={`${styles.detailsDrawer} ${open ? styles.detailsDrawerOpen : ''}`} aria-hidden={!open}>
      <div className={styles.drawerHeader}>
        <div>
          <span>Project details</span>
          <h3>{project?.projectName || 'No project selected'}</h3>
        </div>
        <button aria-label="Close project details" className={styles.iconButton} type="button" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className={styles.drawerBody}>
        <ProjectOverview project={project} />
        <ProjectMemberList members={project?.members ?? []} />
      </div>
    </aside>
  </>
);

const ProjectOverview: React.FC<{ project: ProjectResponse | null }> = ({ project }) => (
  <section className={styles.drawerSection}>
    <div className={styles.projectOverview}>
      <ProjectAvatar label={project?.projectName} tone={projectTone(project)} />
      <div>
        <strong>{project?.projectName || 'No project selected'}</strong>
        <p>{project?.description || project?.targetCompanyName || 'Project conversation details.'}</p>
      </div>
    </div>
    <dl className={styles.detailList}>
      <div><dt>Status</dt><dd>{humanize(project?.status)}</dd></div>
      <div><dt>Project type</dt><dd>{projectTypeLabel(project?.projectType)}</dd></div>
      <div><dt>Relationship</dt><dd>{relationshipLabel(project?.targetRelationshipType)}</dd></div>
      <div><dt>Last updated</dt><dd>{formatFullDate(project?.updatedAt || project?.createdAt)}</dd></div>
    </dl>
  </section>
);

const ProjectMemberList: React.FC<{ members: ProjectMemberResponse[] }> = ({ members }) => (
  <section className={styles.drawerSection}>
    <div className={styles.sectionTitle}>
      <h4>Members</h4>
      <span>{members.length}</span>
    </div>
    <div className={styles.memberList}>
      {members.length === 0 && <div className={styles.listState}>No members loaded.</div>}
      {members.map((member) => (
        <div className={styles.memberItem} key={member.id}>
          <ProjectAvatar label={member.fullName || member.email} small />
          <div>
            <strong>{member.fullName || member.email || `Account #${member.accountId}`}</strong>
            <span>{humanize(member.memberRole)}</span>
          </div>
          <span className={styles.onlineDot} />
        </div>
      ))}
    </div>
  </section>
);

interface ConfirmDeleteDialogProps {
  open: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({ open, deleting, onCancel, onConfirm }) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <div className={styles.confirmDialog} role="dialog" aria-modal="true" aria-labelledby="delete-message-title">
        <div className={styles.confirmIcon}><Trash2 size={22} /></div>
        <div>
          <h3 id="delete-message-title">Delete message?</h3>
          <p>This message will be hidden from the project conversation.</p>
        </div>
        <div className={styles.confirmActions}>
          <button className={styles.secondaryButton} type="button" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className={styles.dangerButton} type="button" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatToastStack: React.FC<{ toasts: ChatToast[]; onView: (projectId: number) => void; onDismiss: (id: string) => void }> = ({
  toasts,
  onView,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastStack} aria-live="polite">
      {toasts.map((toast) => (
        <div className={styles.chatToast} key={toast.id}>
          <ProjectAvatar label={toast.projectName} small />
          <div>
            <div className={styles.toastTitle}>
              <strong>{toast.projectName}</strong>
              <button aria-label="Dismiss notification" type="button" onClick={() => onDismiss(toast.id)}>
                <X size={14} />
              </button>
            </div>
            <p><span>{toast.senderName}</span>: {toast.preview}</p>
            <div className={styles.toastFooter}>
              <span>{formatTime(toast.createdAt)}</span>
              <button type="button" onClick={() => onView(toast.projectId)}>View message</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const SystemChat: React.FC = () => {
  const { currentUser } = useUser();
  const {
    markProjectRead: markGlobalProjectRead,
    refreshChatNotifications,
    conversationMeta: globalConversationMeta,
    totalUnread: globalTotalUnread,
  } = useChatNotifications();
  const endRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const previousLatestMessageRef = useRef<Record<number, string>>({});
  const lastSoundAtRef = useRef(0);
  const shouldScrollToLatestRef = useRef(false);
  const originalTitleRef = useRef<string>(document.title);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => {
    const stored = localStorage.getItem('apms-chat-project-id') || localStorage.getItem('apms-active-project');
    const id = stored ? Number(stored) : NaN;
    return Number.isFinite(id) && id > 0 ? id : null;
  });
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ChatMessageResponse | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);
  const [conversationMeta, setConversationMeta] = useState<Record<number, ConversationMeta>>({});
  const [lastReadMap, setLastReadMap] = useState<LastReadMap>(() => readLastReadMap());
  const [newMessagesInActive, setNewMessagesInActive] = useState(0);
  const [toasts, setToasts] = useState<ChatToast[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_ENABLED_KEY) === 'true');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null,
    [projects, selectedProjectId]
  );

  const totalUnread = useMemo(
    () => Object.values(conversationMeta).reduce((sum, item) => sum + Math.max(0, item.unreadCount || 0), 0),
    [conversationMeta]
  );

  const effectiveConversationMeta = useMemo(
    () => ({ ...globalConversationMeta, ...conversationMeta }),
    [conversationMeta, globalConversationMeta]
  );

  const effectiveTotalUnread = totalUnread || globalTotalUnread;

  const playNotificationSound = () => {
    if (!soundEnabled) return;
    const now = Date.now();
    if (now - lastSoundAtRef.current < 2500) return;
    lastSoundAtRef.current = now;
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 640;
      gain.gain.value = 0.035;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
      oscillator.onended = () => void context.close();
    } catch {
      // Browsers can block audio until the user interacts. Keep the UI state unchanged.
    }
  };

  const dismissToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const showToast = (project: ProjectResponse, message: ChatMessageResponse) => {
    const toastId = `${project.id}-${message.id}`;
    setToasts((current) => {
      if (current.some((toast) => toast.id === toastId)) return current;
      return [
        {
          id: toastId,
          projectId: project.id,
          projectName: project.projectName,
          senderName: message.senderName || `User #${message.senderId}`,
          preview: message.content,
          createdAt: message.createdAt,
        },
        ...current,
      ].slice(0, 4);
    });
    window.setTimeout(() => dismissToast(toastId), 5500);
  };

  const markProjectRead = (projectId: number, rows = messages) => {
    const latest = rows[rows.length - 1];
    const latestAt = latest?.createdAt;
    if (!latestAt) return;

    setLastReadMap((current) => {
      const next = { ...current, [String(projectId)]: latestAt };
      writeLastReadMap(next);
      return next;
    });
    setConversationMeta((current) => ({
      ...current,
      [projectId]: {
        ...(current[projectId] ?? {}),
        unreadCount: 0,
        lastMessage: latest,
        lastMessageAt: latestAt,
        lastMessageSenderId: latest.senderId,
      },
    }));
    markGlobalProjectRead(projectId, latest);
    if (activeProject?.id === projectId) setNewMessagesInActive(0);
  };

  const updateConversationMetaFromRows = (
    project: ProjectResponse,
    rows: ChatMessageResponse[],
    options: { notify?: boolean; active?: boolean } = {}
  ) => {
    const latest = rows[rows.length - 1] ?? null;
    const latestId = latest?.id;
    const readAt = lastReadMap[String(project.id)] || '';
    const readTime = readAt ? new Date(readAt).getTime() : 0;
    const unreadCount = rows.filter((message) => {
      if (message.isDeleted || isMine(message, currentUser?.id, currentUser?.email)) return false;
      return messageTime(message) > readTime;
    }).length;

    setConversationMeta((current) => ({
      ...current,
      [project.id]: {
        unreadCount: options.active && isProjectNearBottom(viewportRef.current) && document.visibilityState === 'visible' ? 0 : unreadCount,
        lastMessage: latest,
        lastMessageAt: latest?.createdAt ?? project.updatedAt ?? project.createdAt,
        lastMessageSenderId: latest?.senderId ?? null,
      },
    }));

    if (!latestId || previousLatestMessageRef.current[project.id] === latestId) return;

    const previousKnown = previousLatestMessageRef.current[project.id];
    previousLatestMessageRef.current[project.id] = latestId;
    if (!previousKnown) return;
    if (isMine(latest, currentUser?.id, currentUser?.email)) return;

    if (options.active) {
      if (document.visibilityState === 'visible' && isProjectNearBottom(viewportRef.current)) {
        window.setTimeout(() => markProjectRead(project.id, rows), 80);
      } else {
        setNewMessagesInActive((current) => current + 1);
      }
    } else if (options.notify) {
      showToast(project, latest);
      playNotificationSound();
      if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(project.projectName, {
          body: `${latest.senderName || `User #${latest.senderId}`}: ${latest.content}`.slice(0, 120),
        });
      }
    }
  };

  const loadProjects = async () => {
    setLoadingProjects(true);
    setError(null);

    try {
      const payload = await api.get<PageResponse<ProjectResponse>>('/projects', {
        params: { page: 0, size: 100 },
      });
      const rawRows = payload.data?.content ?? [];
      const seenNames = new Set<string>();
      const rows = rawRows.filter((project) => {
        if (!project.projectName) return true;
        const nameKey = project.projectName.trim().toLowerCase();
        if (seenNames.has(nameKey)) return false;
        seenNames.add(nameKey);
        return true;
      });
      setProjects(rows);
      setSelectedProjectId((current) => {
        const next = current && rows.some((project) => project.id === current) ? current : rows[0]?.id ?? null;
        if (next) localStorage.setItem('apms-chat-project-id', String(next));
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load project conversations.');
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadMessages = async (projectId: number, options: { quiet?: boolean } = {}) => {
    if (!options.quiet) setLoadingMessages(true);
    if (!options.quiet) setError(null);

    try {
      const payload = await chatApi.getHistory(projectId, 0, 100);
      const rows = [...(payload.data?.content ?? [])].sort((a, b) => {
        const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return left - right;
      });
      setMessages(rows);
      const project = projects.find((item) => item.id === projectId);
      if (project) {
        updateConversationMetaFromRows(project, rows, { active: activeProject?.id === projectId, notify: false });
      }
    } catch (err) {
      if (!options.quiet) setError(err instanceof Error ? err.message : 'Cannot load chat history.');
    } finally {
      if (!options.quiet) setLoadingMessages(false);
    }
  };

  const refreshConversationSummaries = async (options: { notify?: boolean } = {}) => {
    if (projects.length === 0) return;
    const results = await Promise.allSettled(
      projects.map(async (project) => {
        const payload = await chatApi.getHistory(project.id, 0, 100);
        const rows = [...(payload.data?.content ?? [])].sort((a, b) => messageTime(a) - messageTime(b));
        return { project, rows };
      })
    );

    results.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      const { project, rows } = result.value;
      const active = activeProject?.id === project.id;
      updateConversationMetaFromRows(project, rows, { active, notify: options.notify && !active });
      if (active) setMessages(rows);
    });
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (projects.length === 0) return;
    void refreshConversationSummaries({ notify: false });
  }, [projects.length, lastReadMap]);

  useEffect(() => {
    if (!activeProject) {
      setMessages([]);
      return;
    }
    localStorage.setItem('apms-chat-project-id', String(activeProject.id));
    shouldScrollToLatestRef.current = true;
    void loadMessages(activeProject.id);
  }, [activeProject?.id]);

  useEffect(() => {
    if (projects.length === 0) return;
    // Disabled 5s auto-refresh interval based on user request
    // const interval = window.setInterval(() => void refreshConversationSummaries({ notify: true }), 5000);
    // return () => window.clearInterval(interval);
  }, [projects, activeProject?.id, lastReadMap, currentUser?.id, currentUser?.email]);

  useEffect(() => {
    if (!activeProject || messages.length === 0) return;
    if (shouldScrollToLatestRef.current) {
      shouldScrollToLatestRef.current = false;
      window.requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
        if (document.visibilityState === 'visible') {
          markProjectRead(activeProject.id, messages);
        }
      });
      return;
    }

    if (isProjectNearBottom(viewportRef.current)) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      if (document.visibilityState === 'visible') {
        markProjectRead(activeProject.id, messages);
      }
    }
  }, [messages.length, activeProject?.id]);

  useEffect(() => {
    const label = effectiveTotalUnread > 99 ? '99+' : effectiveTotalUnread;
    document.title = effectiveTotalUnread > 0 ? `(${label}) Project Chat | APMS` : 'Project Chat | APMS';
    return () => {
      document.title = originalTitleRef.current;
    };
  }, [effectiveTotalUnread]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!activeProject || document.visibilityState !== 'visible') return;
      if (isProjectNearBottom(viewportRef.current)) markProjectRead(activeProject.id, messages);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeProject?.id, messages]);

  const selectProject = (projectId: number) => {
    shouldScrollToLatestRef.current = true;
    setSelectedProjectId(projectId);
    setMobileConversationOpen(true);
    localStorage.setItem('apms-chat-project-id', String(projectId));
  };

  const jumpToLatest = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    if (activeProject) {
      window.setTimeout(() => markProjectRead(activeProject.id, messages), 180);
    }
  };

  const handleMessageScroll = () => {
    if (!activeProject || document.visibilityState !== 'visible') return;
    if (isProjectNearBottom(viewportRef.current)) {
      markProjectRead(activeProject.id, messages);
    }
  };

  const viewToastProject = (projectId: number) => {
    selectProject(projectId);
    setToasts((current) => current.filter((toast) => toast.projectId !== projectId));
    window.setTimeout(() => jumpToLatest(), 250);
  };

  const toggleSound = () => {
    setSoundEnabled((current) => {
      const next = !current;
      localStorage.setItem(SOUND_ENABLED_KEY, String(next));
      return next;
    });
  };

  const sendMessage = async () => {
    const content = draft.trim();
    if (!activeProject || !content || sending) return;

    setSending(true);
    setError(null);
    try {
      const payload = await chatApi.sendMessage(activeProject.id, { content });
      setMessages((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== payload.data.id);
        return [...withoutDuplicate, payload.data].sort((a, b) => {
          const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return left - right;
        });
      });
      setDraft('');
      void refreshChatNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot send message.');
    } finally {
      setSending(false);
    }
  };

  const startEditing = (message: ChatMessageResponse) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const saveEditing = async () => {
    if (!activeProject || !editingMessageId) return;
    const content = editingContent.trim();
    if (!content) return;

    setError(null);
    try {
      const payload = await chatApi.editMessage(activeProject.id, editingMessageId, { content });
      setMessages((current) => current.map((item) => item.id === editingMessageId ? payload.data : item));
      setEditingMessageId(null);
      setEditingContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot edit message.');
    }
  };

  const confirmDelete = async () => {
    if (!activeProject || !deleteTarget) return;
    setDeleting(true);
    setError(null);

    try {
      await chatApi.deleteMessage(activeProject.id, deleteTarget.id);
      setMessages((current) => current.map((item) => item.id === deleteTarget.id ? {
        ...item,
        content: '[Deleted]',
        isDeleted: true,
        updatedAt: new Date().toISOString(),
      } : item));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot delete message.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.page}>
      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}

      <section className={`${styles.chatShell} ${mobileConversationOpen ? styles.mobileChatOpen : ''}`}>
        <ProjectSidebar
          projects={projects}
          activeProject={activeProject}
          filter={filter}
          query={query}
          loading={loadingProjects}
          messages={messages}
          conversationMeta={effectiveConversationMeta}
          totalUnread={effectiveTotalUnread}
          soundEnabled={soundEnabled}
          onFilterChange={setFilter}
          onQueryChange={setQuery}
          onSelectProject={selectProject}
          onRefresh={() => void refreshConversationSummaries({ notify: false })}
          onToggleSound={toggleSound}
        />

        <main className={styles.chatPane}>
          <ChatHeader
            project={activeProject}
            onBack={() => setMobileConversationOpen(false)}
            onDetails={() => setDetailsOpen(true)}
          />
          <ChatMessageList
            messages={messages}
            loading={loadingMessages}
            activeProject={activeProject}
            userId={currentUser?.id}
            userEmail={currentUser?.email}
            editingMessageId={editingMessageId}
            editingContent={editingContent}
            endRef={endRef}
            viewportRef={viewportRef}
            newMessageCount={newMessagesInActive}
            onEditStart={startEditing}
            onEditContentChange={setEditingContent}
            onEditCancel={() => setEditingMessageId(null)}
            onEditSave={() => void saveEditing()}
            onDeleteRequest={setDeleteTarget}
            onScroll={handleMessageScroll}
            onJumpToLatest={jumpToLatest}
          />
          <MessageComposer
            project={activeProject}
            value={draft}
            sending={sending}
            onChange={setDraft}
            onSend={() => void sendMessage()}
          />
        </main>
      </section>

      <ProjectDetailsDrawer project={activeProject} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
      <ChatToastStack toasts={toasts} onView={viewToastProject} onDismiss={dismissToast} />
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
};
