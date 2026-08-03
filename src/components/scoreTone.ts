// Color system for AI evaluation scores (0-100).
// Thresholds: 0-40 danger (red), 41-70 medium (amber), 71-100 good (green).
// Applied consistently across the ecosystem dashboard, score cards, table badges
// and the score detail modal.

export interface ScoreTone {
  color: string;
  bg: string;
  label: string;
}

const GREEN: ScoreTone = { color: '#16A34A', bg: 'rgba(22,163,74,0.12)', label: 'Tốt' };
const AMBER: ScoreTone = { color: '#D97706', bg: 'rgba(217,119,6,0.12)', label: 'Trung bình' };
const RED: ScoreTone = { color: '#DC2626', bg: 'rgba(220,38,38,0.12)', label: 'Cần xem xét' };

/** Higher is better (fit score, overall score, relationship strength). */
export const scoreTone = (score?: number | null): ScoreTone => {
  const s = typeof score === 'number' && Number.isFinite(score) ? score : 0;
  if (s >= 71) return GREEN;
  if (s >= 41) return AMBER;
  return RED;
};

/** Higher is worse (risk level, competition intensity). */
export const riskTone = (risk?: number | null): ScoreTone => {
  const r = typeof risk === 'number' && Number.isFinite(risk) ? risk : 0;
  if (r >= 71) return RED;
  if (r >= 41) return AMBER;
  return GREEN;
};

/** Risk level label from a 0-100 value (higher = worse). */
export const riskLevelText = (risk?: number | null): string => {
  if (risk == null) return '—';
  if (risk >= 71) return 'Cao';
  if (risk >= 41) return 'Trung bình';
  return 'Thấp';
};
