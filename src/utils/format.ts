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
