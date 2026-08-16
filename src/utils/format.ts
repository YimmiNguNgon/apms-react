import i18n from '../i18n';

export const currentLocale = (): string => {
  const lang = i18n.language || 'vi';
  return lang.startsWith('en') ? 'en-US' : 'vi-VN';
};

export function formatDate(
  value?: string | Date | null,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(currentLocale(), options).format(date);
}

export function formatDateTime(
  value?: string | Date | null,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(currentLocale(), options).format(date);
}

export function formatNumber(
  value: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return String(value);
  return new Intl.NumberFormat(currentLocale(), options).format(num);
}

export function formatPercent(
  value: number | string | null | undefined,
  fractionDigits = 1,
): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return String(value);
  return `${formatNumber(num, { maximumFractionDigits: fractionDigits })}%`;
}

function resolveAuditDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

// Backend stores Asia/Ho_Chi_Minh wall-clock time without an offset marker.
// Only remap the wall clock to Vietnam time when the value is genuinely
// absolute (UTC/offset), otherwise keep the stored local wall-clock time.
function auditTimeZone(raw: string): string | undefined {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw.trim()) ? 'Asia/Ho_Chi_Minh' : undefined;
}

function auditDateParts(date: Date, timeZone?: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    ...(timeZone ? { timeZone } : {}),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    day: get('day'),
    month: get('month'),
    year: get('year'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

export function formatAuditTimestamp(value?: string | Date | null): string {
  const date = resolveAuditDate(value);
  if (!date) return 'Not available';
  const raw = typeof value === 'string' ? value : date.toISOString();
  const parts = auditDateParts(date, auditTimeZone(raw));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function formatAuditLogTimestamp(value?: string | Date | null): string {
  const date = resolveAuditDate(value);
  if (!date) return 'Not available';
  const raw = typeof value === 'string' ? value : date.toISOString();
  const parts = auditDateParts(date, auditTimeZone(raw));
  return `${parts.hour}:${parts.minute}:${parts.second} ${parts.day}/${parts.month}/${parts.year}`;
}

export function formatAuditActionLabel(action?: string | null): string {
  if (!action) return '—';
  return action
    .split('_')
    .filter(Boolean)
    .map((word) => (word === 'IP' ? 'IP' : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ');
}
