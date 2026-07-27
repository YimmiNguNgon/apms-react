import React, { useMemo, useState } from 'react';
import {
  Archive,
  Bell,
  Bot,
  FileText,
  Image,
  Info,
  Link2,
  MoreHorizontal,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  Smile,
  Users,
  Video,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import styles from './SystemChat.module.css';

type ConversationType = 'all' | 'direct' | 'project' | 'ai';

type Conversation = {
  id: string;
  name: string;
  subtitle: string;
  type: ConversationType;
  avatar: string;
  tone: 'blue' | 'green' | 'amber' | 'violet';
  online?: boolean;
  unread?: number;
  time: string;
  lastMessage: string;
  members: string;
  project: string;
};

type Message = {
  id: string;
  conversationId: string;
  author: string;
  initials: string;
  mine?: boolean;
  content: string;
  time: string;
  attachment?: string;
};

const conversations: Conversation[] = [
  {
    id: 'project-samsung',
    name: 'Samsung Research Team',
    subtitle: 'Project channel',
    type: 'project',
    avatar: 'SR',
    tone: 'blue',
    online: true,
    unread: 3,
    time: '09:42',
    lastMessage: 'I moved the final evidence package to project documents.',
    members: '8 members',
    project: 'Samsung Electronics Review',
  },
  {
    id: 'mai-le',
    name: 'Mai Le',
    subtitle: 'Business Development Manager',
    type: 'direct',
    avatar: 'ML',
    tone: 'amber',
    online: true,
    unread: 1,
    time: '08:18',
    lastMessage: 'Please check the rejected draft before creating a new extraction.',
    members: 'Direct message',
    project: 'Candidate approval',
  },
  {
    id: 'viettel-team',
    name: 'Viettel Construction Task',
    subtitle: 'Document collection',
    type: 'project',
    avatar: 'VC',
    tone: 'green',
    time: 'Yesterday',
    lastMessage: 'Documents are submitted directly to the project now.',
    members: '5 members',
    project: 'Viettel Construction',
  },
  {
    id: 'apms-ai',
    name: 'APMS AI Assistant',
    subtitle: 'AI support',
    type: 'ai',
    avatar: 'AI',
    tone: 'violet',
    online: true,
    time: 'Mon',
    lastMessage: 'I can summarize evidence and suggest next actions.',
    members: 'Assistant',
    project: 'System intelligence',
  },
];

const seedMessages: Message[] = [
  {
    id: 'm1',
    conversationId: 'project-samsung',
    author: 'Mai Le',
    initials: 'ML',
    content: 'Team, please keep the Samsung evidence in one place. The manager review is focused on source quality now.',
    time: '09:14',
  },
  {
    id: 'm2',
    conversationId: 'project-samsung',
    author: 'You',
    initials: 'YN',
    mine: true,
    content: 'I uploaded the annual report and sustainability PDF. The Documents tab can preview both files.',
    time: '09:18',
    attachment: 'Samsung sustainability report.pdf',
  },
  {
    id: 'm3',
    conversationId: 'project-samsung',
    author: 'Huy Tran',
    initials: 'HT',
    content: 'Good. I will run AI extraction from those project documents and create a new candidate draft only if the current one is not usable.',
    time: '09:31',
  },
  {
    id: 'm4',
    conversationId: 'project-samsung',
    author: 'Mai Le',
    initials: 'ML',
    content: 'I moved the final evidence package to project documents.',
    time: '09:42',
  },
  {
    id: 'm5',
    conversationId: 'mai-le',
    author: 'Mai Le',
    initials: 'ML',
    content: 'Please check the rejected draft before creating a new extraction.',
    time: '08:18',
  },
  {
    id: 'm6',
    conversationId: 'viettel-team',
    author: 'Linh Pham',
    initials: 'LP',
    content: 'Documents are submitted directly to the project now. No manager approval needed for document collection.',
    time: 'Yesterday',
  },
  {
    id: 'm7',
    conversationId: 'apms-ai',
    author: 'APMS AI',
    initials: 'AI',
    content: 'I can summarize evidence, identify missing fields, and suggest which document should be extracted next.',
    time: 'Mon',
  },
];

const filterOptions: Array<{ value: ConversationType; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'direct', label: 'Direct' },
  { value: 'project', label: 'Projects' },
  { value: 'ai', label: 'AI' },
];

export const SystemChat: React.FC = () => {
  const { currentUser } = useUser();
  const [activeConversationId, setActiveConversationId] = useState(conversations[0].id);
  const [filter, setFilter] = useState<ConversationType>('all');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>(seedMessages);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0];

  const filteredConversations = useMemo(() => {
    const term = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const matchesFilter = filter === 'all' || conversation.type === filter;
      const matchesSearch = !term || [
        conversation.name,
        conversation.subtitle,
        conversation.project,
        conversation.lastMessage,
      ].join(' ').toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [filter, query]);

  const activeMessages = messages.filter((message) => message.conversationId === activeConversation.id);

  const sendMessage = () => {
    const content = draft.trim();
    if (!content) return;
    const now = new Date();
    setMessages((current) => [
      ...current,
      {
        id: `local-${now.getTime()}`,
        conversationId: activeConversation.id,
        author: 'You',
        initials: currentUser?.avatar || 'ME',
        mine: true,
        content,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setDraft('');
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>Team communication</span>
          <h1>APMS Chat</h1>
          <p>Coordinate project work, evidence review, and candidate decisions in one focused workspace.</p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.iconButton} type="button" title="Notification settings"><Bell size={18} /></button>
          <button className={styles.primaryButton} type="button"><Plus size={17} />New chat</button>
        </div>
      </header>

      <section className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHead}>
            <div className={styles.sidebarTitle}>
              <div>
                <h2>Chats</h2>
                <span>{conversations.length} conversations</span>
              </div>
              <button className={styles.iconButton} type="button" title="Chat settings"><Settings size={17} /></button>
            </div>
            <label className={styles.searchBox}>
              <Search size={16} />
              <input value={query} placeholder="Search conversations" onChange={(event) => setQuery(event.target.value)} />
            </label>
            <div className={styles.filterRow}>
              {filterOptions.map((option) => (
                <button
                  className={`${styles.chipButton} ${filter === option.value ? styles.chipActive : ''}`}
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.conversationList}>
            {filteredConversations.map((conversation) => (
              <button
                className={`${styles.conversationItem} ${activeConversation.id === conversation.id ? styles.conversationActive : ''}`}
                key={conversation.id}
                type="button"
                onClick={() => setActiveConversationId(conversation.id)}
              >
                <div className={styles.avatar} data-tone={conversation.tone}>
                  {conversation.avatar}
                  {conversation.online && <i className={styles.onlineDot} />}
                </div>
                <div className={styles.conversationMain}>
                  <div className={styles.conversationTop}>
                    <strong>{conversation.name}</strong>
                    <small>{conversation.time}</small>
                  </div>
                  <p>{conversation.lastMessage}</p>
                  <div className={styles.conversationMeta}>
                    <span className={styles.tag}>{conversation.subtitle}</span>
                  </div>
                </div>
                {conversation.unread ? <span className={styles.unreadBadge}>{conversation.unread}</span> : null}
              </button>
            ))}
          </div>
        </aside>

        <main className={styles.chatPane}>
          <div className={styles.chatHeader}>
            <div className={styles.chatIdentity}>
              <div className={styles.avatar} data-tone={activeConversation.tone}>
                {activeConversation.avatar}
                {activeConversation.online && <i className={styles.onlineDot} />}
              </div>
              <div>
                <h2>{activeConversation.name}</h2>
                <p>{activeConversation.members} - {activeConversation.project}</p>
              </div>
            </div>
            <div className={styles.chatActions}>
              <button className={styles.iconButton} type="button" title="Voice call"><Phone size={17} /></button>
              <button className={styles.iconButton} type="button" title="Video call"><Video size={17} /></button>
              <button className={styles.iconButton} type="button" title="Conversation info"><Info size={17} /></button>
            </div>
          </div>

          <div className={styles.messageViewport}>
            <div className={styles.dayDivider}>Today</div>
            {activeMessages.map((message) => (
              <article className={`${styles.messageRow} ${message.mine ? styles.outgoing : styles.incoming}`} key={message.id}>
                <div className={styles.messageAvatar}>{message.initials}</div>
                <div className={styles.messageBubble}>
                  <p>{message.content}</p>
                  {message.attachment && (
                    <div className={styles.attachment}>
                      <FileText size={15} />
                      <span>{message.attachment}</span>
                    </div>
                  )}
                  <small>{message.time}</small>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.composer}>
            <div className={styles.composerTools}>
              <button className={styles.iconButton} type="button" title="Attach file"><Paperclip size={17} /></button>
              <button className={styles.iconButton} type="button" title="Attach image"><Image size={17} /></button>
            </div>
            <label className={styles.inputShell}>
              <textarea
                value={draft}
                placeholder={`Message ${activeConversation.name}`}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Smile size={18} />
            </label>
            <button className={styles.sendButton} type="button" onClick={sendMessage} title="Send message">
              <Send size={18} />
            </button>
          </div>
        </main>

        <aside className={styles.details}>
          <div className={styles.detailsHead}>
            <div className={styles.detailsTitle}>
              <div>
                <h3>Details</h3>
                <span>Conversation context</span>
              </div>
              <button className={styles.iconButton} type="button" title="More"><MoreHorizontal size={17} /></button>
            </div>
          </div>
          <div className={styles.detailsBody}>
            <section className={styles.profileCard}>
              <div className={styles.avatar} data-tone={activeConversation.tone}>{activeConversation.avatar}</div>
              <strong>{activeConversation.name}</strong>
              <span>{activeConversation.subtitle}</span>
            </section>

            <section className={styles.infoPanel}>
              <h4>Conversation</h4>
              <div className={styles.infoRow}><span>Project</span><strong>{activeConversation.project}</strong></div>
              <div className={styles.infoRow}><span>Members</span><strong>{activeConversation.members}</strong></div>
              <div className={styles.infoRow}><span>Status</span><strong>{activeConversation.online ? 'Active now' : 'Offline'}</strong></div>
            </section>

            <section className={styles.infoPanel}>
              <h4>Shared files</h4>
              <div className={styles.sharedFiles}>
                <div className={styles.fileItem}>
                  <FileText size={17} />
                  <div><strong>Evidence package.pdf</strong><span>2.4 MB</span></div>
                </div>
                <div className={styles.fileItem}>
                  <Link2 size={17} />
                  <div><strong>Project documents</strong><span>Internal APMS link</span></div>
                </div>
                <div className={styles.fileItem}>
                  <Archive size={17} />
                  <div><strong>Candidate notes.zip</strong><span>860 KB</span></div>
                </div>
              </div>
            </section>

            <section className={styles.infoPanel}>
              <h4>Quick actions</h4>
              <button className={styles.ghostButton} type="button"><Users size={15} />Manage members</button>
              <button className={styles.ghostButton} type="button"><Bot size={15} />Summarize with AI</button>
            </section>
          </div>
        </aside>
      </section>
    </div>
  );
};
