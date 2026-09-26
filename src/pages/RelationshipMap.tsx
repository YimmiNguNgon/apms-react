// Enterprise Relationship Map — IBM Carbon Operations Center
// 3-column Layout: Left Filters Sidebar | Center Interactive Network Graph | Right Analytics Sidebar
// Top KPI Row | Below-Graph Drawer on Node Click | Level-based Circular Network Redesign

import React, { useEffect, useLayoutEffect, useMemo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, RotateCcw, Building, Search, X, ArrowRight, CheckCircle2, AlertTriangle, AlertCircle, Play } from 'lucide-react';
import { api } from '../services/api';
import type { GraphCompanyDto, ProfileResponse, ProjectResponse } from '../types/domain';
import type { PageResponse } from '../services/api';
import {
  PageHeader,
  MetricCard,
  RiskBadge,
  PrimaryButton,
  SecondaryButton,
  Drawer,
  Tabs,
} from '../components/ui';
import { CompanyDetail } from './CompanyDetail';
import styles from './RelationshipMap.module.css';

// ─── Types & Interfaces ────────────────────────────────────────────────────────
export type RealGroupKey = 'partner' | 'supplier' | 'competitor' | 'customer' | 'potential-partner';
export type GroupKey = 'ALL' | RealGroupKey;

export type ConcreteRelationshipGroup =
  | 'PARTNER'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'COMPETITOR'
  | 'POTENTIAL_PARTNER';

export type RelationshipGroupFilter = 'ALL' | ConcreteRelationshipGroup;

export const FILTER_TO_GROUP_KEY: Record<ConcreteRelationshipGroup, RealGroupKey> = {
  PARTNER: 'partner',
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
  COMPETITOR: 'competitor',
  POTENTIAL_PARTNER: 'potential-partner',
};

export const getGroupFilterLabel = (group: RelationshipGroupFilter): string => {
  switch (group) {
    case 'ALL': return 'All';
    case 'PARTNER': return 'Partner';
    case 'CUSTOMER': return 'Customer';
    case 'SUPPLIER': return 'Supplier';
    case 'COMPETITOR': return 'Competitor';
    case 'POTENTIAL_PARTNER': return 'Potential Partner';
  }
};

export type RankFilter = 'ALL' | 'A' | 'B' | 'C' | 'D' | 'UNASSESSED';

export type TooltipPlacement = 'right' | 'left' | 'top' | 'bottom';

export interface TooltipPosState {
  top: number;
  left: number;
  placement: TooltipPlacement;
  arrowOffset: number;
  isReady: boolean;
}

export type UnreadAssessmentType = 'INITIAL_ASSESSMENT' | 'ASSESSMENT_UPDATED';

export interface UnreadAssessmentState {
  type: UnreadAssessmentType;
  notificationIds: number[];
  latestVersion?: number;
}

export type RelationshipTrendType = 'NEWLY_SCORED' | 'IMPROVING' | 'DECLINING' | 'STABLE';

export interface RecentAssessmentItemDto {
  id: number;
  versionNumber: number;
  majorVersion?: number;
  minorRevision?: number;
  formattedVersion?: string;
  assessmentType?: string;
  score: number;
  rank: 'A' | 'B' | 'C' | 'D';
  rankDescription?: string | null;
  finalizedAt: string; // Timezone-safe ISO-8601 string with offset
  actorRole?: string;
  criteria?: {
    commercial?: number;
    interaction?: number;
    strategic?: number;
    network?: number;
    engagement?: number;
    trust?: number;
  } | null;
}

export interface CompanyRecentAssessmentSummaryDto {
  companyProfileId: string;
  companyId?: string;
  companyName: string;
  relationshipType?: string;
  latestAssessment?: RecentAssessmentItemDto | null;
  previousAssessment?: RecentAssessmentItemDto | null;
}

export const TREND_LABELS: Record<RelationshipTrendType, string> = {
  NEWLY_SCORED: 'Newly Assessed',
  IMPROVING: 'Closeness Improving',
  DECLINING: 'Closeness Declining',
  STABLE: 'Stable',
};

export interface TrendInfo {
  trendType: RelationshipTrendType;
  label: string; // "Newly Assessed" | "Closeness Improving" | "Closeness Declining" | "Stable"
  nodeBadgeText: string; // "Newly Assessed" | "↑ +X" | "↓ -X" | "→ 0"
  deltaScore: number | null;
  badgeColors: { bg: string; text: string; border: string };
  isRecent: boolean;
}

export interface OwnerRelationshipClosenessSummary {
  companyProfileId: string;
  hasFinalizedAssessment: boolean;
  score: number | null;
  rank: 'A' | 'B' | 'C' | 'D' | null;
  rankDescription: string | null;
  versionNumber: number | null;
  completedAt: string | null;
  criteria: {
    commercial: number | null;
    interaction: number | null;
    strategic: number | null;
    network: number | null;
    engagement: number | null;
    trust: number | null;
  } | null;
  isLoading: boolean;
  isError: boolean;
  latestAssessment?: RecentAssessmentItemDto | null;
  previousAssessment?: RecentAssessmentItemDto | null;
  trendInfo?: TrendInfo | null;
}

export const RECENCY_WINDOW_MS = 72 * 60 * 60 * 1000;

export const isAssessmentRecent = (finalizedAt?: string | null): boolean => {
  if (!finalizedAt) return false;
  const finalizedTime = new Date(finalizedAt).getTime();
  if (isNaN(finalizedTime)) return false;
  const now = Date.now();
  const diff = now - finalizedTime;
  // Allow slight clock skew (up to 1 minute into future)
  return diff >= -60000 && diff <= RECENCY_WINDOW_MS;
};

export const deriveTrendInfo = (
  latest?: RecentAssessmentItemDto | null,
  previous?: RecentAssessmentItemDto | null
): TrendInfo | null => {
  if (!latest || !latest.finalizedAt || latest.score === null || latest.score === undefined) {
    return null;
  }
  const isRecent = isAssessmentRecent(latest.finalizedAt);
  if (!isRecent) {
    return null;
  }

  if (!previous || previous.score === null || previous.score === undefined) {
    return {
      trendType: 'NEWLY_SCORED',
      label: TREND_LABELS.NEWLY_SCORED,
      nodeBadgeText: 'Newly Assessed',
      deltaScore: null,
      badgeColors: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }, // soft teal/green
      isRecent: true,
    };
  }

  const delta = latest.score - previous.score;
  if (delta > 0) {
    return {
      trendType: 'IMPROVING',
      label: TREND_LABELS.IMPROVING,
      nodeBadgeText: `↑ +${delta}`,
      deltaScore: delta,
      badgeColors: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }, // soft green
      isRecent: true,
    };
  } else if (delta < 0) {
    return {
      trendType: 'DECLINING',
      label: TREND_LABELS.DECLINING,
      nodeBadgeText: `↓ ${delta}`,
      deltaScore: delta,
      badgeColors: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' }, // soft red
      isRecent: true,
    };
  } else {
    return {
      trendType: 'STABLE',
      label: TREND_LABELS.STABLE,
      nodeBadgeText: '→ 0',
      deltaScore: 0,
      badgeColors: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }, // soft neutral gray/blue
      isRecent: true,
    };
  }
};

export const formatActorLabel = (actorRole?: string | null, assessmentType?: string | null): string => {
  if (actorRole === 'BUSINESS_OWNER' || assessmentType === 'OWNER_ADJUSTMENT') {
    return 'Business Owner';
  }
  if (actorRole === 'BUSINESS_DEVELOPMENT_MANAGER' || assessmentType === 'MANAGER_ASSESSMENT') {
    return 'Manager';
  }
  return 'Manager';
};

export const formatDateTime = (isoString?: string | null): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
};

const isClosenessEligibleGroup = (group: GroupKey): boolean => {
  return group === 'partner' || group === 'customer' || group === 'supplier';
};

const formatDate = (isoString?: string | null): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
};


const toGroupKey = (relationshipType?: string): GroupKey => {
  const t = (relationshipType || '').toUpperCase();
  switch (t) {
    case 'PARTNER':
    case 'PARTNER_WITH': return 'partner';
    case 'COMPETITOR':
    case 'COMPETITOR_OF': return 'competitor';
    case 'SUPPLIER':
    case 'SUPPLIER_OF': return 'supplier';
    case 'CUSTOMER':
    case 'CUSTOMER_OF': return 'customer';
    case 'POTENTIAL_PARTNER':
    case 'POTENTIAL_PARTNER_OF': return 'potential-partner';
    default: return 'partner';
  }
};

export interface GraphNode {
  id: string;
  name: string;
  industry: string;
  industries?: string[];
  group: GroupKey;
  healthScore: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  connections: number;
  isOwner?: boolean;
  x: number;
  y: number;
  initials: string;
  color: string;
  overview?: string;
  sharedProjects?: Array<{ name: string; status: string; progress: number; due: string }>;
  contacts?: Array<{ name: string; role: string; email: string; phone: string }>;
  meetings?: Array<{ title: string; date: string; notes: string }>;
  aiRecommendation?: string;
}

export const getNodeIndustries = (node?: { industries?: string[]; industry?: string } | null): string[] => {
  if (!node) return [];
  if (Array.isArray(node.industries) && node.industries.length > 0) {
    const list = node.industries
      .map((i) => (typeof i === 'string' ? i.trim() : String(i).trim()))
      .filter((i) => i.length > 0 && i !== 'Not available' && i !== 'Unknown');
    if (list.length > 0) return list;
  }
  if (node.industry && node.industry !== 'Not available' && node.industry !== 'Unknown') {
    const trimmed = node.industry.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
};

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  label: string;
  group: GroupKey;
  color: string;
  dashed: boolean;
}

const RELATIONSHIP_STYLES: Record<string, { color: string; label: string; dashed?: boolean }> = {
  partner: { color: '#10B981', label: 'Partner' }, // Green
  competitor: { color: '#EF4444', label: 'Competitor', dashed: true }, // Red
  supplier: { color: '#F59E0B', label: 'Supplier' }, // Orange
  customer: { color: '#2563EB', label: 'Customer' }, // Blue
  'potential-partner': { color: '#8B5CF6', label: 'Potential Partner', dashed: true }, // Purple
};

const DRAWER_TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'strength',     label: 'Relationship Strength' },
  { id: 'projects',     label: 'Shared Projects' },
  { id: 'contacts',     label: 'Contacts' },
];

const getCurvePath = (x1: number, y1: number, x2: number, y2: number, bend = 20) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  
  if (len === 0) return { path: `M ${x1} ${y1}`, cx: x1, cy: y1 };
  
  const nx = -dy / len;
  const ny = dx / len;
  
  const cx = mx + nx * bend;
  const cy = my + ny * bend;
  
  return {
    path: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
    cx,
    cy
  };
};

export const SVG_VIEWBOX_WIDTH = 1400;
export const SVG_VIEWBOX_HEIGHT = 900;

export interface RingConfig {
  radius: number;
  count: number;
  startAngleOffset: number;
}

export function computeRingDistribution(totalCount: number): RingConfig[] {
  if (totalCount <= 0) return [];
  if (totalCount <= 8) {
    return [{ radius: 280, count: totalCount, startAngleOffset: 0 }];
  }
  if (totalCount <= 16) {
    const count1 = Math.min(6, Math.max(3, Math.round(totalCount * (230 / (230 + 360)))));
    const count2 = totalCount - count1;
    return [
      { radius: 230, count: count1, startAngleOffset: 0 },
      { radius: 360, count: count2, startAngleOffset: Math.PI / count2 },
    ];
  }
  if (totalCount <= 28) {
    const sumR = 220 + 330 + 440;
    const c1 = Math.min(6, Math.max(3, Math.round(totalCount * (220 / sumR))));
    const c2 = Math.min(10, Math.max(5, Math.round(totalCount * (330 / sumR))));
    const c3 = totalCount - c1 - c2;
    return [
      { radius: 220, count: c1, startAngleOffset: 0 },
      { radius: 330, count: c2, startAngleOffset: Math.PI / c2 },
      { radius: 440, count: c3, startAngleOffset: Math.PI / (2 * c3) },
    ];
  }
  // 4 rings for 29+ nodes
  const radii = [200, 310, 420, 530];
  const sumR = radii.reduce((a, b) => a + b, 0);
  let remaining = totalCount;
  const rings: RingConfig[] = [];
  radii.forEach((r, idx) => {
    if (idx === radii.length - 1) {
      rings.push({ radius: r, count: remaining, startAngleOffset: (idx % 2) * (Math.PI / Math.max(1, remaining)) });
    } else {
      const maxForRing = idx === 0 ? 6 : (idx === 1 ? 10 : 14);
      const c = Math.min(maxForRing, Math.max(3, Math.round(totalCount * (r / sumR))));
      const allocated = Math.min(remaining - (radii.length - 1 - idx), c);
      rings.push({ radius: r, count: allocated, startAngleOffset: (idx % 2) * (Math.PI / Math.max(1, allocated)) });
      remaining -= allocated;
    }
  });
  return rings;
}

export function layoutAllModeNodes(
  filteredNodes: GraphNode[],
  levels: Map<string, number>,
  centerId: string,
  parentMap: Map<string, string>,
  edges: GraphEdge[],
  canvasWidth: number,
  canvasHeight: number
): {
  positioned: Array<GraphNode & { connections: number }>;
  positions: Map<string, { x: number; y: number; angle?: number; radius?: number }>;
} {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const visibleL1 = filteredNodes.filter(n => levels.get(n.id) === 1);
  const visibleL2 = filteredNodes.filter(n => levels.get(n.id) === 2);
  const totalL1 = visibleL1.length;

  const positions = new Map<string, { x: number; y: number; angle?: number; radius?: number }>();
  positions.set(centerId, { x: centerX, y: centerY });

  if (totalL1 > 0) {
    const CARD_W = 170;
    const CARD_H = 74;
    const HORIZONTAL_SAFE_MARGIN = CARD_W / 2 + 35; // ~120px
    const VERTICAL_SAFE_MARGIN = CARD_H / 2 + 38;   // ~75px
    const MIN_RX = 280;
    const MIN_RY = 220;

    const maxRx = Math.max(MIN_RX, canvasWidth / 2 - HORIZONTAL_SAFE_MARGIN);
    const maxRy = Math.max(MIN_RY, canvasHeight / 2 - VERTICAL_SAFE_MARGIN);

    // Clockwise order: supplier -> competitor -> customer -> partner -> potential-partner
    const GROUP_ORDER: GroupKey[] = ['supplier', 'competitor', 'customer', 'partner', 'potential-partner'];
    const groupMap = new Map<GroupKey, GraphNode[]>();
    GROUP_ORDER.forEach(g => groupMap.set(g, []));
    const otherNodes: GraphNode[] = [];

    visibleL1.forEach(node => {
      if (groupMap.has(node.group)) {
        groupMap.get(node.group)!.push(node);
      } else {
        otherNodes.push(node);
      }
    });

    // Sort stably within each group by name
    GROUP_ORDER.forEach(g => {
      groupMap.get(g)!.sort((a, b) => a.name.localeCompare(b.name));
    });

    const nonEmptyGroups = GROUP_ORDER.filter(g => groupMap.get(g)!.length > 0);
    const numNonEmpty = nonEmptyGroups.length;

    // Minimum angular sector per non-empty group so single-node groups don't get compressed (Correction 3)
    const maxTotalMin = 2 * Math.PI * 0.45;
    const minSectorSpan = numNonEmpty > 0 ? Math.min(0.42, maxTotalMin / numNonEmpty) : 0;
    const totalMinAngle = minSectorSpan * numNonEmpty;
    const remainingAngle = 2 * Math.PI - totalMinAngle;

    // Start angle at top center (12 o'clock: -Math.PI / 2)
    let sectorStart = -Math.PI / 2;
    const rawPositions: Array<{ id: string; x: number; y: number; angle: number; rx: number; ry: number }> = [];

    const useTwoRings = totalL1 >= 9;
    const useThreeRings = totalL1 >= 16;

    nonEmptyGroups.forEach(groupKey => {
      const groupNodes = groupMap.get(groupKey)!;
      const sectorSpan = minSectorSpan + (groupNodes.length / totalL1) * remainingAngle;
      const step = sectorSpan / groupNodes.length;

      groupNodes.forEach((node, index) => {
        // Node angle centered in its allocated slot (Correction 4)
        const angle = sectorStart + step * (index + 0.5);
        let rx = maxRx;
        let ry = maxRy;

        // Multi-ring / staggered logic (Correction 7)
        if (useThreeRings && groupNodes.length > 2) {
          const ring = index % 3;
          const scale = ring === 0 ? 0.62 : (ring === 1 ? 0.82 : 1.0);
          rx = maxRx * scale;
          ry = maxRy * scale;
        } else if (useTwoRings && groupNodes.length > 1) {
          const isOuter = index % 2 === 1;
          rx = isOuter ? maxRx : maxRx * 0.72;
          ry = isOuter ? maxRy : maxRy * 0.72;
        } else {
          rx = maxRx * 0.85;
          ry = maxRy * 0.85;
        }

        const x = centerX + rx * Math.cos(angle);
        const y = centerY + ry * Math.sin(angle);
        rawPositions.push({ id: node.id, x, y, angle, rx, ry });
      });

      sectorStart += sectorSpan;
    });

    if (otherNodes.length > 0) {
      const fallbackSpan = (otherNodes.length / totalL1) * remainingAngle;
      const step = fallbackSpan / otherNodes.length;
      otherNodes.forEach((node, index) => {
        const angle = sectorStart + step * (index + 0.5);
        const rx = maxRx * 0.85;
        const ry = maxRy * 0.85;
        const x = centerX + rx * Math.cos(angle);
        const y = centerY + ry * Math.sin(angle);
        rawPositions.push({ id: node.id, x, y, angle, rx, ry });
      });
    }

    // Collision-avoidance pass (Correction 6)
    const MIN_GAP = 14;
    const MAX_COLLISION_ITERATIONS = 12;
    for (let iter = 0; iter < MAX_COLLISION_ITERATIONS; iter++) {
      let hadCollision = false;
      for (let i = 0; i < rawPositions.length; i++) {
        for (let j = i + 1; j < rawPositions.length; j++) {
          const pA = rawPositions[i];
          const pB = rawPositions[j];
          const overlapX = CARD_W + MIN_GAP - Math.abs(pA.x - pB.x);
          const overlapY = CARD_H + MIN_GAP - Math.abs(pA.y - pB.y);

          if (overlapX > 0 && overlapY > 0) {
            hadCollision = true;
            const push = pB.angle >= pA.angle ? 0.035 : -0.035;
            pB.angle += push;
            if (Math.abs(pB.rx - pA.rx) < 25) {
              pB.rx = Math.min(maxRx * 1.08, pB.rx * 1.05);
              pB.ry = Math.min(maxRy * 1.08, pB.ry * 1.05);
            }
            pB.x = centerX + pB.rx * Math.cos(pB.angle);
            pB.y = centerY + pB.ry * Math.sin(pB.angle);
          }
        }
      }
      if (!hadCollision) break;
    }

    // Safe Canvas Margins enforcement (Correction 8)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    rawPositions.forEach(p => {
      minX = Math.min(minX, p.x - CARD_W / 2);
      maxX = Math.max(maxX, p.x + CARD_W / 2);
      minY = Math.min(minY, p.y - CARD_H / 2);
      maxY = Math.max(maxY, p.y + CARD_H / 2);
    });

    const SAFE_PAD = 20;
    const availW = canvasWidth - 2 * SAFE_PAD;
    const availH = canvasHeight - 2 * SAFE_PAD;
    const contentW = maxX - minX;
    const contentH = maxY - minY;

    let scaleFactor = 1;
    if (contentW > availW || contentH > availH) {
      scaleFactor = Math.min(availW / Math.max(1, contentW), availH / Math.max(1, contentH), 1);
    }

    rawPositions.forEach(p => {
      const finalX = centerX + (p.x - centerX) * scaleFactor;
      const finalY = centerY + (p.y - centerY) * scaleFactor;
      positions.set(p.id, {
        x: finalX,
        y: finalY,
        angle: p.angle,
        radius: Math.hypot(finalX - centerX, finalY - centerY)
      });
    });
  }

  // Level 2 fanned around parent L1 node
  visibleL2.forEach(node => {
    const parentId = parentMap.get(node.id);
    const parentPos = parentId ? positions.get(parentId) : null;
    const pRadius = parentPos?.radius || Math.hypot((parentPos?.x || centerX) - centerX, (parentPos?.y || centerY) - centerY);
    const l2Radius = pRadius + 130;
    if (parentPos && parentPos.angle !== undefined) {
      const siblings = visibleL2.filter(n => parentId && parentMap.get(n.id) === parentId);
      const k = siblings.length;
      const idxInSiblings = siblings.findIndex(n => n.id === node.id);
      const spread = k > 1 ? Math.min(0.24, 0.85 / k) : 0;
      const childAngle = parentPos.angle + (idxInSiblings - (k - 1) / 2) * spread;
      const x = centerX + l2Radius * Math.cos(childAngle);
      const y = centerY + l2Radius * Math.sin(childAngle);
      positions.set(node.id, { x, y });
    } else {
      const idx = visibleL2.indexOf(node);
      const angle = visibleL2.length > 0 ? (idx * 2 * Math.PI) / visibleL2.length : 0;
      const x = centerX + l2Radius * Math.cos(angle);
      const y = centerY + l2Radius * Math.sin(angle);
      positions.set(node.id, { x, y });
    }
  });

  const positioned = filteredNodes.map(node => {
    const pos = positions.get(node.id) || { x: centerX, y: centerY };
    const connCount = edges.filter(e => e.from === node.id || e.to === node.id).length;
    return {
      ...node,
      x: pos.x,
      y: pos.y,
      connections: connCount
    };
  });

  return { positioned, positions };
}

export function layoutSingleGroupNodes(
  filteredNodes: GraphNode[],
  levels: Map<string, number>,
  centerId: string,
  parentMap: Map<string, string>,
  edges: GraphEdge[],
  centerX: number,
  centerY: number
): {
  positioned: Array<GraphNode & { connections: number }>;
  positions: Map<string, { x: number; y: number; angle?: number; radius?: number }>;
} {
  const visibleL1 = filteredNodes.filter(n => levels.get(n.id) === 1);
  const visibleL2 = filteredNodes.filter(n => levels.get(n.id) === 2);
  const N1 = visibleL1.length;

  const positions = new Map<string, { x: number; y: number; angle?: number; radius?: number }>();
  positions.set(centerId, { x: centerX, y: centerY });

  // Level 1 positions using count-aware multi-ring distribution
  const sortedL1 = [...visibleL1].sort((a, b) => {
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    return a.name.localeCompare(b.name);
  });

  const rings = computeRingDistribution(N1);
  let nodeIndex = 0;
  rings.forEach(ring => {
    for (let i = 0; i < ring.count && nodeIndex < sortedL1.length; i++, nodeIndex++) {
      const node = sortedL1[nodeIndex];
      const angle = ring.count > 0 ? (i * 2 * Math.PI) / ring.count - Math.PI / 2 + ring.startAngleOffset : 0;
      const x = centerX + ring.radius * Math.cos(angle);
      const y = centerY + ring.radius * Math.sin(angle);
      positions.set(node.id, { x, y, angle, radius: ring.radius });
    }
  });

  // Level 2 positions fanned around Level 1 parent node
  visibleL2.forEach(node => {
    const parentId = parentMap.get(node.id);
    const parentPos = parentId ? positions.get(parentId) : null;
    const l2Radius = (parentPos?.radius || 280) + 130;
    if (parentPos && parentPos.angle !== undefined) {
      const siblings = visibleL2.filter(n => parentId && parentMap.get(n.id) === parentId);
      const k = siblings.length;
      const idxInSiblings = siblings.findIndex(n => n.id === node.id);
      const spread = k > 1 ? Math.min(0.24, 0.85 / k) : 0;
      const childAngle = parentPos.angle + (idxInSiblings - (k - 1) / 2) * spread;
      const x = centerX + l2Radius * Math.cos(childAngle);
      const y = centerY + l2Radius * Math.sin(childAngle);
      positions.set(node.id, { x, y });
    } else {
      const idx = visibleL2.indexOf(node);
      const angle = visibleL2.length > 0 ? (idx * 2 * Math.PI) / visibleL2.length : 0;
      const x = centerX + l2Radius * Math.cos(angle);
      const y = centerY + l2Radius * Math.sin(angle);
      positions.set(node.id, { x, y });
    }
  });

  const positioned = filteredNodes.map(node => {
    const pos = positions.get(node.id) || { x: centerX, y: centerY };
    const connCount = edges.filter(e => e.from === node.id || e.to === node.id).length;
    return {
      ...node,
      x: pos.x,
      y: pos.y,
      connections: connCount
    };
  });

  return { positioned, positions };
}

export const TOGGLE_GROUPS_CONFIG: Array<{
  key: RelationshipGroupFilter;
  labelKey: string;
  defaultLabel: string;
  color: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}> = [
  {
    key: 'ALL',
    labelKey: 'chips.allRelations',
    defaultLabel: 'All',
    color: '#0f172a',
    activeBg: '#f8fafc',
    activeBorder: '#0f172a',
    activeText: '#0f172a',
  },
  {
    key: 'PARTNER',
    labelKey: 'chips.partner',
    defaultLabel: 'Partner',
    color: '#10B981',
    activeBg: '#ecfdf5',
    activeBorder: '#10B981',
    activeText: '#065f46',
  },
  {
    key: 'CUSTOMER',
    labelKey: 'chips.customer',
    defaultLabel: 'Customer',
    color: '#2563EB',
    activeBg: '#eff6ff',
    activeBorder: '#2563EB',
    activeText: '#1e40af',
  },
  {
    key: 'SUPPLIER',
    labelKey: 'chips.supplier',
    defaultLabel: 'Supplier',
    color: '#F59E0B',
    activeBg: '#fffbeb',
    activeBorder: '#F59E0B',
    activeText: '#92400e',
  },
  {
    key: 'COMPETITOR',
    labelKey: 'chips.competitor',
    defaultLabel: 'Competitor',
    color: '#EF4444',
    activeBg: '#fef2f2',
    activeBorder: '#EF4444',
    activeText: '#991b1b',
  },
  {
    key: 'POTENTIAL_PARTNER',
    labelKey: 'chips.potentialPartner',
    defaultLabel: 'Potential Partner',
    color: '#8B5CF6',
    activeBg: '#f5f3ff',
    activeBorder: '#8B5CF6',
    activeText: '#5b21b6',
  },
];

interface RelationshipMapProps {
  setActivePage?: (page: string) => void;
}

export const RelationshipMap: React.FC<RelationshipMapProps> = ({ setActivePage }) => {
  const { t, i18n } = useTranslation('relationship-map');

  const getGroupLabel = (group: string) => {
    switch (group) {
      case 'partner': return t('relationshipTypes.partnerWith', 'Partner');
      case 'competitor': return t('relationshipTypes.competitorOf', 'Competitor');
      case 'supplier': return t('relationshipTypes.supplierOf', 'Supplier');
      case 'customer': return t('relationshipTypes.customerOf', 'Customer');
      case 'potential-partner': return t('relationshipTypes.potentialPartnerOf', 'Potential Partner');
      default: return t('relationshipTypes.fallback', 'Other link');
    }
  };

  // ── State ────────────────────────────────────────────────────────
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [ownerName, setOwnerName] = useState('OUR COMPANY');
  const [ownerCompanyId, setOwnerCompanyId] = useState<string>('');
  const [projectCounts, setProjectCounts] = useState<Map<string, number>>(new Map());

  // Filters (Shared between left sidebar & local toolbar)
  const [search, setSearch] = useState('');
  const [activeRelationshipGroup, setActiveRelationshipGroup] = useState<RelationshipGroupFilter>('ALL');

  const supportsRelationshipCloseness =
    activeRelationshipGroup === 'ALL' ||
    activeRelationshipGroup === 'PARTNER' ||
    activeRelationshipGroup === 'CUSTOMER' ||
    activeRelationshipGroup === 'SUPPLIER';

  const handleSelectRelationshipGroup = (newGroup: RelationshipGroupFilter) => {
    if (newGroup === activeRelationshipGroup) return;
    setActiveRelationshipGroup(newGroup);
    setSelectedNode(null);
    setHoveredNodeId(null);
    setTooltipNode(null);
    setTooltipPosState(null);
    hoveredNodeElementRef.current = null;
    setExpandedL1Ids(new Set());
    setRankFilter('ALL');
  };
  const [minHealth, setMinHealth] = useState<number>(0);
  const [industryFilter, setIndustryFilter] = useState('All');
  const [depthFilter] = useState<'direct' | '2nd-degree' | 'all'>('2nd-degree');
  const [layoutMode, setLayoutMode] = useState<'radial' | 'grid'>('radial');

  // Incremental Expansion (Initial state shows Level 0 + Level 1. Click L1 node to expand L2 nodes)
  const [expandedL1Ids, setExpandedL1Ids] = useState<Set<string>>(new Set());

  // Closeness Real Data State & Filters
  const [closenessMap, setClosenessMap] = useState<Map<string, OwnerRelationshipClosenessSummary>>(new Map());
  const [isClosenessLoading, setIsClosenessLoading] = useState(false);
  const [rankFilter, setRankFilter] = useState<RankFilter>('ALL');

  // Unread Assessment Alerts State (Authoritative from Backend Notifications)
  const [unreadAssessmentMap, setUnreadAssessmentMap] = useState<Map<string, UnreadAssessmentState>>(new Map());

  // Smart Measured Portal Tooltip State (Short open/close delay, real DOM measurement, fixed viewport placement)
  const [tooltipNode, setTooltipNode] = useState<GraphNode | null>(null);
  const [tooltipPosState, setTooltipPosState] = useState<TooltipPosState | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoveredNodeElementRef = useRef<HTMLDivElement | null>(null);
  const tooltipOpenTimerRef = useRef<any>(null);
  const tooltipCloseTimerRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: SVG_VIEWBOX_WIDTH,
    height: SVG_VIEWBOX_HEIGHT,
  });

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const updateSize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        setCanvasDimensions(prev => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Interactive Graph Controls
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showAllL2, setShowAllL2] = useState<boolean>(false);

  // Sync & Details Overlay
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [aiRecommendations, setAiRecommendations] = useState<Record<string, any>>({});
  const [loadingAi, setLoadingAi] = useState(false);

  // ── Sync API Graph Data ──────────────────────────────────────────
  useEffect(() => {
    const fetchGraphData = async () => {
      setRefreshing(true);
      setLoadError(null);
      try {
        const res = await api.get<GraphCompanyDto[]>('/graph/network');
        if (!Array.isArray(res?.data)) throw new Error('Network API returned an invalid payload.');
        const loadedRelationships = res.data.reduce((count, company) => count + (company.relationships?.length || 0), 0);
        console.debug('[RelationshipNetwork] companies loaded:', res.data.length);
        console.debug('[RelationshipNetwork] relationships loaded:', loadedRelationships);
        if (res.data.length > 0) {
          const needsDetails = res.data.some((company) => !company.relationships);
          const details = needsDetails
            ? await Promise.allSettled(
              res.data.map((company) => api.get<GraphCompanyDto>(`/graph/companies/${encodeURIComponent(company.companyId)}`)),
            )
            : [];
          const companies = res.data.map((company, index) => {
            const detail = details[index];
            return detail?.status === 'fulfilled' && detail.value.data ? { ...company, ...detail.value.data } : company;
          });
          const ownerFromGraph = companies.find((c) => c.isOwner);
          if (ownerFromGraph) {
            if (ownerFromGraph.companyId) setOwnerCompanyId(ownerFromGraph.companyId);
            if (ownerFromGraph.name) setOwnerName(ownerFromGraph.name);
          }
          const effectiveOwnerId = ownerFromGraph?.companyId || ownerCompanyId;
          const canonicalCompanyIds = new Set(
            companies.map((company) => company.companyId).filter((companyId): companyId is string => Boolean(companyId)),
          );
          const groupByNode = new Map<string, GroupKey>();
          const edgeIds = new Set<string>();
          const hydratedEdges: GraphEdge[] = [];

          companies.forEach((company) => (company.relationships || []).forEach((relationship) => {
            const from = relationship.sourceCompanyId;
            const to = relationship.targetCompanyId;
            if (!from || !to) {
              if (import.meta.env.DEV) console.warn('[RelationshipNetwork] skipped relationship without canonical endpoints:', relationship);
              return;
            }
            if (!canonicalCompanyIds.has(from) || !canonicalCompanyIds.has(to)) {
              if (import.meta.env.DEV) console.warn('[RelationshipNetwork] skipped relationship with endpoint absent from network nodes:', { from, to, relationship });
              return;
            }
            const group = toGroupKey(relationship.relationshipType);
            const id = `${[from, to].sort().join('|')}|${group}`;
            if (edgeIds.has(id)) return;
            edgeIds.add(id);
            const style = RELATIONSHIP_STYLES[group] || { color: '#64748b', label: 'Related' };
            hydratedEdges.push({ 
              id, 
              from, 
              to, 
              type: relationship.relationshipType || style.label, 
              label: style.label, 
              group, 
              color: style.color, 
              dashed: Boolean(style.dashed) 
            });
            if (effectiveOwnerId) {
              if (to !== effectiveOwnerId && !groupByNode.has(to)) {
                groupByNode.set(to, group);
              }
              if (from !== effectiveOwnerId && !groupByNode.has(from)) {
                groupByNode.set(from, group);
              }
            } else {
              if (!groupByNode.has(to)) groupByNode.set(to, group);
              if (!groupByNode.has(from)) groupByNode.set(from, group);
            }
          }));

          const hydratedNodes: GraphNode[] = companies.map((company, index) => {
            const hash = (company.companyId || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const healthScore = (hash % 21) + 75; // 75 - 95
            const riskLevel = (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const)[hash % 4];
            const isNodeOwner = Boolean(company.isOwner) || (Boolean(effectiveOwnerId) && company.companyId === effectiveOwnerId);
            const group = isNodeOwner
              ? 'partner'
              : (groupByNode.get(company.companyId) || toGroupKey(company.relationshipType));

            const aiRecMap: Record<string, string> = {
              partner: "Strengthen active joint product integration. Coordinate marketing activities and co-selling opportunities in secondary markets.",
              supplier: "Schedule a quarterly service quality audit. Monitor operational delivery SLA compliance and prepare backup sourcing avenues.",
              competitor: "Track competitor customer acquisitions in the local market. Monitor their pricing adjustments and key executive transitions.",
              customer: "Schedule regular check-ins to monitor project delivery satisfaction and explore upselling opportunities.",
              'potential-partner': "Design a small-scale proof of concept (PoC) to evaluate operational synergy and synergies before full partnership commitment.",
            };
            const aiRec = aiRecMap[group] || "Maintain regular ecosystem monitoring and record any significant changes in corporate governance or market positioning.";

            const nodeIndustries = getNodeIndustries(company);
            const primaryIndustry = nodeIndustries.length > 0
              ? nodeIndustries[0]
              : (company.industry && company.industry !== 'Unknown' ? company.industry : 'Not available');

            return {
              id: company.companyId || `node-${index}`,
              name: company.name || 'Not available',
              industry: primaryIndustry,
              industries: nodeIndustries,
              group,
              healthScore,
              riskLevel,
              connections: 0,
              isOwner: isNodeOwner,
              x: 0, y: 0,
              initials: (company.name || 'NA').trim().split(/\s+/).slice(0, 2).map((word) => word ? word[0] : '').join('').toUpperCase(),
              color: RELATIONSHIP_STYLES[group]?.color || '#2563EB',
              overview: nodeIndustries.length > 0
                ? `${company.name} operates in the ${nodeIndustries.join(', ')} sector, serving key roles within our business network.`
                : (company.industry ? `${company.name} operates in the ${company.industry} sector, serving key roles within our business network.` : 'Ecosystem node details are loaded and monitored.'),
              sharedProjects: [],
              contacts: [],
              meetings: [],
              aiRecommendation: aiRec,
            };
          });
          setNodes(hydratedNodes);
          setEdges(hydratedEdges);
          if (import.meta.env.DEV) {
            console.debug('[RelationshipNetwork] nodes:', hydratedNodes.length);
            console.debug('[RelationshipNetwork] edges:', hydratedEdges.length);
          }
        } else {
          setNodes([]);
          setEdges([]);
        }
      } catch (err) {
        console.error("Error fetching graph network data:", err);
        setLoadError(err instanceof Error ? err.message : 'Unable to load relationship network data.');
        setNodes([]);
        setEdges([]);
      } finally {
        setRefreshing(false);
      }
    };
    void fetchGraphData();
  }, [dataVersion]);

  useEffect(() => {
    void Promise.allSettled([
      api.get<ProfileResponse>('/owner/company-profile'),
      api.get<PageResponse<ProjectResponse>>('/projects', { params: { page: 0, size: 100 } }),
    ]).then(([ownerResult, projectsResult]) => {
      if (ownerResult.status === 'fulfilled') {
        const profile = ownerResult.value.data;
        const name = profile?.identity?.tradeName || profile?.identity?.legalName;
        if (name) setOwnerName(name);
        if (profile?.companyId) setOwnerCompanyId(profile.companyId);
      }
      if (projectsResult.status === 'fulfilled') {
        const counts = new Map<string, number>();
        (projectsResult.value.data?.content || []).forEach((project) => {
          if (project.targetCompanyProfileId) counts.set(project.targetCompanyProfileId, (counts.get(project.targetCompanyProfileId) || 0) + 1);
        });
        setProjectCounts(counts);
      }
    });
  }, []);

  // ── Layout calculations ──────────────────────────────────────────
  const centerId = useMemo(() => {
    if (ownerCompanyId) {
      const match = nodes.find(n => n.id === ownerCompanyId);
      if (match) return match.id;
    }
    const ownerNode = nodes.find(n => n.isOwner);
    if (ownerNode) return ownerNode.id;

    if (ownerName && ownerName.toLowerCase() !== 'our company') {
      const found = nodes.find(n => n.name.toLowerCase() === ownerName.toLowerCase());
      if (found) return found.id;
    }

    if (nodes.length > 0 && edges.length > 0) {
      const outgoingCounts = new Map<string, number>();
      edges.forEach(e => {
        outgoingCounts.set(e.from, (outgoingCounts.get(e.from) || 0) + 1);
      });
      let maxNodeId = '';
      let maxCount = 0;
      outgoingCounts.forEach((count, id) => {
        if (count > maxCount) {
          maxCount = count;
          maxNodeId = id;
        }
      });
      if (maxNodeId && nodes.some(n => n.id === maxNodeId)) {
        return maxNodeId;
      }
    }

    return nodes[0]?.id || '';
  }, [ownerCompanyId, ownerName, nodes, edges]);

  // ── Real Relationship Closeness Fetching (Single Batch Endpoint: Zero N+1) ──
  useEffect(() => {
    if (nodes.length === 0) return;

    let isMounted = true;
    setIsClosenessLoading(true);

    api.get<CompanyRecentAssessmentSummaryDto[]>('/company-relationship-assessments/recent-summary')
      .then((res) => {
        if (!isMounted) return;
        const summaries = Array.isArray(res.data) ? res.data : [];
        const nextMap = new Map<string, OwnerRelationshipClosenessSummary>();

        // Index the returned assessments by both companyProfileId and companyId
        const summaryByCompanyId = new Map<string, CompanyRecentAssessmentSummaryDto>();
        summaries.forEach((s) => {
          if (s.companyProfileId) summaryByCompanyId.set(s.companyProfileId, s);
          if (s.companyId) summaryByCompanyId.set(s.companyId, s);
        });

        nodes.forEach((node) => {
          if (node.id === centerId) return;

          const summaryDto = summaryByCompanyId.get(node.id);
          const latest = summaryDto?.latestAssessment;
          const previous = summaryDto?.previousAssessment;
          const isEligible = isClosenessEligibleGroup(node.group);

          if (isEligible && latest && latest.score !== null && latest.score !== undefined) {
            const trend = deriveTrendInfo(latest, previous);
            const crit = latest.criteria || null;
            const entry: OwnerRelationshipClosenessSummary = {
              companyProfileId: summaryDto?.companyProfileId || node.id,
              hasFinalizedAssessment: true,
              score: latest.score,
              rank: latest.rank,
              rankDescription: latest.rankDescription || null,
              versionNumber: latest.versionNumber,
              completedAt: latest.finalizedAt,
              criteria: crit ? {
                commercial: crit.commercial ?? null,
                interaction: crit.interaction ?? null,
                strategic: crit.strategic ?? null,
                network: crit.network ?? null,
                engagement: crit.engagement ?? null,
                trust: crit.trust ?? null,
              } : null,
              isLoading: false,
              isError: false,
              latestAssessment: latest,
              previousAssessment: previous || null,
              trendInfo: trend,
            };
            nextMap.set(node.id, entry);
          } else {
            nextMap.set(node.id, {
              companyProfileId: summaryDto?.companyProfileId || node.id,
              hasFinalizedAssessment: false,
              score: null,
              rank: null,
              rankDescription: null,
              versionNumber: null,
              completedAt: null,
              criteria: null,
              isLoading: false,
              isError: false,
              latestAssessment: null,
              previousAssessment: null,
              trendInfo: null,
            });
          }
        });

        setClosenessMap(nextMap);
        setIsClosenessLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Error fetching recent closeness summary batch:", err);
        setIsClosenessLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [nodes, centerId, dataVersion]);

  // ── Canonical Identifier Resolver ────────────────────────────────
  const resolveCanonicalProfileId = useCallback((node: GraphNode): string => {
    const summary = closenessMap.get(node.id);
    if (summary?.companyProfileId) return summary.companyProfileId;
    return node.id;
  }, [closenessMap]);

  // ── Unread Assessment Alerts State & Sync ────────────────────────
  const getUnreadState = useCallback((node: GraphNode): UnreadAssessmentState | undefined => {
    if (node.id === centerId || !isClosenessEligibleGroup(node.group)) return undefined;
    const canonicalId = resolveCanonicalProfileId(node);
    return unreadAssessmentMap.get(canonicalId) || unreadAssessmentMap.get(node.id);
  }, [centerId, resolveCanonicalProfileId, unreadAssessmentMap]);

  const fetchUnreadAssessments = useCallback(async () => {
    try {
      const res = await api.get<any[]>('/notifications/relationship-assessments/unread');
      const list = Array.isArray(res.data) ? res.data : [];
      const map = new Map<string, UnreadAssessmentState>();

      for (const item of list) {
        const profileId = item.companyProfileId;
        if (!profileId || item.isRead) continue;

        const isUpdated = item.actionType === 'RELATIONSHIP_ASSESSMENT_UPDATED';
        const notifType: UnreadAssessmentType = isUpdated ? 'ASSESSMENT_UPDATED' : 'INITIAL_ASSESSMENT';

        const existing = map.get(profileId);
        if (!existing) {
          map.set(profileId, {
            type: notifType,
            notificationIds: [item.id],
          });
        } else {
          existing.notificationIds.push(item.id);
          if (notifType === 'ASSESSMENT_UPDATED') {
            existing.type = 'ASSESSMENT_UPDATED';
          }
        }
      }

      setUnreadAssessmentMap(map);
    } catch (err) {
      console.warn('Failed to fetch unread relationship assessment alerts:', err);
    }
  }, []);

  useEffect(() => {
    void fetchUnreadAssessments();

    const handleNotificationsUpdated = () => {
      void fetchUnreadAssessments();
    };

    window.addEventListener('apms-notifications-updated', handleNotificationsUpdated);
    return () => {
      window.removeEventListener('apms-notifications-updated', handleNotificationsUpdated);
    };
  }, [fetchUnreadAssessments]);

  // ── Mark Unread Assessment as Read when Selected Company Sidebar Successfully Loads ──
  const inFlightReadIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!selectedNode || isClosenessLoading) return;
    if (!isClosenessEligibleGroup(selectedNode.group)) return;

    const summary = closenessMap.get(selectedNode.id);
    const hasOfficialData = Boolean(
      summary?.hasFinalizedAssessment && summary.score !== null && !summary.isError
    );
    if (!hasOfficialData) return;

    const canonicalId = resolveCanonicalProfileId(selectedNode);
    const unread = unreadAssessmentMap.get(canonicalId) || unreadAssessmentMap.get(selectedNode.id);

    if (!unread || unread.notificationIds.length === 0) return;

    const idsToMark = unread.notificationIds.filter((id) => !inFlightReadIdsRef.current.has(id));
    if (idsToMark.length === 0) return;

    idsToMark.forEach((id) => inFlightReadIdsRef.current.add(id));

    let isCancelled = false;

    // Optimistic UI update
    setUnreadAssessmentMap((prev) => {
      const next = new Map(prev);
      next.delete(canonicalId);
      next.delete(selectedNode.id);
      return next;
    });

    api.patch('/notifications/read', { notificationIds: idsToMark })
      .then(() => {
        if (!isCancelled) {
          window.dispatchEvent(new CustomEvent('apms-notifications-updated'));
        }
      })
      .catch((err) => {
        console.error('Failed to mark assessment notifications as read on sidebar view:', err);
        idsToMark.forEach((id) => inFlightReadIdsRef.current.delete(id));
        if (!isCancelled) {
          // Rollback on failure
          setUnreadAssessmentMap((prev) => {
            const next = new Map(prev);
            next.set(canonicalId, unread);
            return next;
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedNode, closenessMap, isClosenessLoading, resolveCanonicalProfileId, unreadAssessmentMap]);

  // ── Unfiltered Group Counts (Authoritative Real Graph Data) ────────
  const groupCounts = useMemo<Record<RelationshipGroupFilter, number>>(() => {
    const uniqueNodesMap = new Map<string, GraphNode>();
    nodes.forEach((n) => {
      if (n.id && !uniqueNodesMap.has(n.id)) {
        uniqueNodesMap.set(n.id, n);
      }
    });

    const uniqueNodes = Array.from(uniqueNodesMap.values());
    const companyNodes = uniqueNodes.filter((n) => n.id !== centerId);

    return {
      ALL: companyNodes.length,
      PARTNER: companyNodes.filter((n) => n.group === 'partner').length,
      CUSTOMER: companyNodes.filter((n) => n.group === 'customer').length,
      SUPPLIER: companyNodes.filter((n) => n.group === 'supplier').length,
      COMPETITOR: companyNodes.filter((n) => n.group === 'competitor').length,
      POTENTIAL_PARTNER: companyNodes.filter((n) => n.group === 'potential-partner').length,
    };
  }, [nodes, centerId]);

  // ── Closeness Analytics (Derived Dynamically for Active Relationship Group) ────────
  const targetGroupKey =
    activeRelationshipGroup === 'ALL'
      ? null
      : FILTER_TO_GROUP_KEY[activeRelationshipGroup];

  const isGroupEligibleForCloseness =
    activeRelationshipGroup === 'ALL' ||
    (targetGroupKey !== null && isClosenessEligibleGroup(targetGroupKey));

  const closenessAnalytics = useMemo(() => {
    if (!isGroupEligibleForCloseness) {
      return {
        isEligible: false,
        totalEligible: 0,
        rankA: 0,
        rankB: 0,
        rankC: 0,
        rankD: 0,
        unassessed: 0,
      };
    }

    const uniqueGroupNodes = Array.from(
      new Map(
        nodes
          .filter((n) => {
            if (n.id === centerId) return false;
            if (activeRelationshipGroup === 'ALL') {
              return isClosenessEligibleGroup(n.group);
            }
            return n.group === targetGroupKey;
          })
          .map((n) => [n.id, n])
      ).values()
    );

    let rankA = 0;
    let rankB = 0;
    let rankC = 0;
    let rankD = 0;
    let unassessed = 0;

    uniqueGroupNodes.forEach((node) => {
      const summary = closenessMap.get(node.id);
      if (summary?.hasFinalizedAssessment && summary.score !== null) {
        if (summary.rank === 'A') rankA++;
        else if (summary.rank === 'B') rankB++;
        else if (summary.rank === 'C') rankC++;
        else if (summary.rank === 'D') rankD++;
      } else {
        unassessed++;
      }
    });

    return {
      isEligible: true,
      totalEligible: uniqueGroupNodes.length,
      rankA,
      rankB,
      rankC,
      rankD,
      unassessed,
    };
  }, [nodes, centerId, closenessMap, targetGroupKey, activeRelationshipGroup, isGroupEligibleForCloseness]);

  // ── Recent Assessment Updates (Strictly 72-Hour Recency Window, Active Group Aware) ──
  const recentAssessmentUpdates = useMemo(() => {
    if (!isGroupEligibleForCloseness) {
      return [];
    }

    const uniqueGroupNodes = Array.from(
      new Map(
        nodes
          .filter((n) => {
            if (n.id === centerId) return false;
            if (activeRelationshipGroup === 'ALL') {
              return isClosenessEligibleGroup(n.group);
            }
            return n.group === targetGroupKey;
          })
          .map((n) => [n.id, n])
      ).values()
    );

    const items: Array<{
      node: GraphNode;
      summary: OwnerRelationshipClosenessSummary;
      trend: TrendInfo;
      finalizedTime: number;
    }> = [];

    uniqueGroupNodes.forEach((node) => {
      const summary = closenessMap.get(node.id);
      if (summary?.hasFinalizedAssessment && summary.trendInfo && summary.trendInfo.isRecent && summary.latestAssessment?.finalizedAt) {
        const fTime = new Date(summary.latestAssessment.finalizedAt).getTime();
        items.push({
          node,
          summary,
          trend: summary.trendInfo,
          finalizedTime: isNaN(fTime) ? 0 : fTime,
        });
      }
    });

    items.sort((a, b) => b.finalizedTime - a.finalizedTime);
    return items.slice(0, 5);
  }, [nodes, centerId, closenessMap, targetGroupKey, activeRelationshipGroup, isGroupEligibleForCloseness]);

  // ── Closeness Tooltip Handlers (Short Open/Close Delays, Real DOM Measurement) ────
  const handleNodeMouseEnter = (node: GraphNode, e: React.MouseEvent<HTMLDivElement>) => {
    if (node.id === centerId || !isClosenessEligibleGroup(node.group)) {
      return;
    }
    if (tooltipCloseTimerRef.current) {
      clearTimeout(tooltipCloseTimerRef.current);
    }
    hoveredNodeElementRef.current = e.currentTarget;
    
    // Short open delay (100ms)
    tooltipOpenTimerRef.current = setTimeout(() => {
      setTooltipNode(node);
    }, 100);
  };

  const handleNodeMouseLeave = () => {
    if (tooltipOpenTimerRef.current) {
      clearTimeout(tooltipOpenTimerRef.current);
    }
    // Short close delay (150ms)
    tooltipCloseTimerRef.current = setTimeout(() => {
      setTooltipNode(null);
      setTooltipPosState(null);
      hoveredNodeElementRef.current = null;
    }, 150);
  };

  const recomputeTooltipPosition = useCallback(() => {
    if (!tooltipNode || !tooltipRef.current || !hoveredNodeElementRef.current) return;
    const nodeRect = hoveredNodeElementRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;
    if (tooltipWidth === 0 || tooltipHeight === 0) return;

    const GAP = 10;
    const SAFE_PADDING = 12;
    const W_viewport = window.innerWidth;
    const H_viewport = window.innerHeight;

    // Available space in all 4 directions relative to nodeRect (Correction 3 & 4)
    const spaceRight = W_viewport - SAFE_PADDING - (nodeRect.right + GAP);
    const spaceLeft = (nodeRect.left - GAP) - SAFE_PADDING;
    const spaceTop = (nodeRect.top - GAP) - SAFE_PADDING;
    const spaceBottom = H_viewport - SAFE_PADDING - (nodeRect.bottom + GAP);

    // Preferred order: right, left, top, bottom (Correction 4)
    const candidates: Array<{
      placement: TooltipPlacement;
      available: number;
      required: number;
      fits: boolean;
    }> = [
      {
        placement: 'right',
        available: spaceRight,
        required: tooltipWidth,
        fits: spaceRight >= tooltipWidth && (H_viewport - 2 * SAFE_PADDING) >= tooltipHeight,
      },
      {
        placement: 'left',
        available: spaceLeft,
        required: tooltipWidth,
        fits: spaceLeft >= tooltipWidth && (H_viewport - 2 * SAFE_PADDING) >= tooltipHeight,
      },
      {
        placement: 'top',
        available: spaceTop,
        required: tooltipHeight,
        fits: spaceTop >= tooltipHeight && (W_viewport - 2 * SAFE_PADDING) >= tooltipWidth,
      },
      {
        placement: 'bottom',
        available: spaceBottom,
        required: tooltipHeight,
        fits: spaceBottom >= tooltipHeight && (W_viewport - 2 * SAFE_PADDING) >= tooltipWidth,
      },
    ];

    let chosen = candidates.find(c => c.fits)?.placement;
    // If no side fully fits, choose candidate with largest remaining/available space (Correction 5)
    if (!chosen) {
      const sorted = [...candidates].sort((a, b) => (b.available - b.required) - (a.available - a.required));
      chosen = sorted[0].placement;
    }

    const nodeCenterX = nodeRect.left + nodeRect.width / 2;
    const nodeCenterY = nodeRect.top + nodeRect.height / 2;

    let rawLeft = 0;
    let rawTop = 0;

    if (chosen === 'right') {
      rawLeft = nodeRect.right + GAP;
      rawTop = nodeCenterY - tooltipHeight / 2;
    } else if (chosen === 'left') {
      rawLeft = nodeRect.left - GAP - tooltipWidth;
      rawTop = nodeCenterY - tooltipHeight / 2;
    } else if (chosen === 'top') {
      rawLeft = nodeCenterX - tooltipWidth / 2;
      rawTop = nodeRect.top - GAP - tooltipHeight;
    } else { // 'bottom'
      rawLeft = nodeCenterX - tooltipWidth / 2;
      rawTop = nodeRect.bottom + GAP;
    }

    // Viewport safe clamping (Correction 6 & 7)
    const minLeft = SAFE_PADDING;
    const maxLeft = W_viewport - SAFE_PADDING - tooltipWidth;
    const minTop = SAFE_PADDING;
    const maxTop = H_viewport - SAFE_PADDING - tooltipHeight;

    const finalLeft = Math.max(minLeft, Math.min(maxLeft, rawLeft));
    const finalTop = Math.max(minTop, Math.min(maxTop, rawTop));

    // Compute arrow position after final clamping (Correction 8)
    let arrowOffset = 0;
    if (chosen === 'top' || chosen === 'bottom') {
      arrowOffset = Math.max(14, Math.min(tooltipWidth - 14, nodeCenterX - finalLeft));
    } else {
      arrowOffset = Math.max(14, Math.min(tooltipHeight - 14, nodeCenterY - finalTop));
    }

    setTooltipPosState({
      top: finalTop,
      left: finalLeft,
      placement: chosen,
      arrowOffset,
      isReady: true,
    });
  }, [tooltipNode]);

  useLayoutEffect(() => {
    if (!tooltipNode) {
      setTooltipPosState(null);
      return;
    }

    recomputeTooltipPosition();

    const handleScrollOrResize = () => {
      window.requestAnimationFrame(recomputeTooltipPosition);
    };

    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [tooltipNode, zoom, pan, recomputeTooltipPosition]);

  // ── Company Detail Navigation Helper ──────────────────────────────
  const navigateToCompanyDetail = async (
    companyProfileId: string,
    tab: 'relationship-closeness' | 'overview' = 'overview'
  ) => {
    if (tab === 'relationship-closeness') {
      const node = nodes.find((n) => n.id === companyProfileId);
      const canonicalId = node ? resolveCanonicalProfileId(node) : companyProfileId;
      const unread = unreadAssessmentMap.get(canonicalId) || unreadAssessmentMap.get(companyProfileId);

      if (unread && unread.notificationIds.length > 0) {
        // Optimistic UI update
        setUnreadAssessmentMap((prev) => {
          const next = new Map(prev);
          next.delete(canonicalId);
          next.delete(companyProfileId);
          return next;
        });

        // Call backend batch read endpoint
        try {
          await api.patch('/notifications/read', {
            notificationIds: unread.notificationIds,
          });
          // Dispatch window event strictly after mutation
          window.dispatchEvent(new CustomEvent('apms-notifications-updated'));
        } catch (err) {
          console.error('Failed to mark assessment notifications as read:', err);
          // Rollback on failure
          setUnreadAssessmentMap((prev) => {
            const next = new Map(prev);
            next.set(canonicalId, unread);
            return next;
          });
        }
      }
    }

    localStorage.setItem('apms-selected-company', companyProfileId);
    const node = nodes.find((n) => n.id === companyProfileId);
    if (node) {
      localStorage.setItem('apms-selected-company-name', node.name);
      if (node.industry) {
        localStorage.setItem('apms-selected-company-industry', node.industry);
      }
    }
    const target = `company-detail?companyId=${encodeURIComponent(companyProfileId)}&tab=${tab}`;
    if (setActivePage) {
      setActivePage(target);
    } else if (typeof window !== 'undefined') {
      window.location.hash = `#${target}`;
    }
  };

  // ── Rank Filter Matching Helper ───────────────────────────────────
  const isNodeMatchingRankFilter = (nodeId: string): boolean => {
    if (!supportsRelationshipCloseness || rankFilter === 'ALL' || nodeId === centerId) return true;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !isClosenessEligibleGroup(node.group)) return false;
    const summary = closenessMap.get(nodeId);
    if (rankFilter === 'UNASSESSED') {
      return !summary?.hasFinalizedAssessment;
    }
    return Boolean(summary?.hasFinalizedAssessment && summary.rank === rankFilter);
  };

  // ── Closeness Badge Renderer ──────────────────────────────────────
  const renderClosenessBadge = (node: GraphNode) => {
    if (node.id === centerId || !isClosenessEligibleGroup(node.group)) {
      return null;
    }
    const summary = closenessMap.get(node.id);
    if (isClosenessLoading && !summary) {
      return (
        <span
          style={{
            fontSize: '8px',
            fontWeight: 600,
            color: '#94a3b8',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            padding: '1px 4px',
            borderRadius: '4px',
          }}
        >
          ...
        </span>
      );
    }
    if (summary?.hasFinalizedAssessment && summary.rank && summary.score !== null) {
      const badgeColors: Record<string, { bg: string; text: string; border: string }> = {
        A: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
        B: { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
        C: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
        D: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
      };
      const c = badgeColors[summary.rank] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
      return (
        <span
          style={{
            fontSize: '8.5px',
            fontWeight: 800,
            color: c.text,
            background: c.bg,
            border: `1px solid ${c.border}`,
            padding: '1px 5px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            letterSpacing: '0.2px',
          }}
        >
          [{summary.rank} · {summary.score}]
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: '8px',
          fontWeight: 600,
          color: '#64748b',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          padding: '1px 5px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        [{t('closeness.unassessed', 'Not Evaluated')}]
      </span>
    );
  };

  const { positionedNodes, l1NodeIds, l2NodeIds, l2ParentMap } = useMemo(() => {
    if (nodes.length === 0) {
      return { positionedNodes: [], l1NodeIds: new Set<string>(), l2NodeIds: new Set<string>(), l2ParentMap: new Map<string, string>() };
    }

    // Compute levels relative to Owner Company (Level 0)
    const levels = new Map<string, number>();
    levels.set(centerId, 0);

    const l1Ids = new Set<string>();
    edges.forEach(edge => {
      if (edge.from === centerId && edge.to !== centerId) l1Ids.add(edge.to);
      else if (edge.to === centerId && edge.from !== centerId) l1Ids.add(edge.from);
    });
    l1Ids.forEach(id => levels.set(id, 1));

    const l2Ids = new Set<string>();
    edges.forEach(edge => {
      const fromL1 = l1Ids.has(edge.from);
      const toL1 = l1Ids.has(edge.to);
      if (fromL1 && edge.to !== centerId && !l1Ids.has(edge.to)) l2Ids.add(edge.to);
      if (toL1 && edge.from !== centerId && !l1Ids.has(edge.from)) l2Ids.add(edge.from);
    });
    l2Ids.forEach(id => levels.set(id, 2));

    nodes.forEach(n => {
      if (!levels.has(n.id)) levels.set(n.id, 2);
    });

    // Match Level 2 with parent L1
    const parentMap = new Map<string, string>();
    const childrenMap = new Map<string, string[]>();

    edges.forEach(edge => {
      const fromL1 = l1Ids.has(edge.from);
      const toL1 = l1Ids.has(edge.to);
      const toL2 = l2Ids.has(edge.to);
      const fromL2 = l2Ids.has(edge.from);

      if (fromL1 && toL2) {
        if (!parentMap.has(edge.to)) {
          parentMap.set(edge.to, edge.from);
          const c = childrenMap.get(edge.from) || [];
          c.push(edge.to);
          childrenMap.set(edge.from, c);
        }
      } else if (toL1 && fromL2) {
        if (!parentMap.has(edge.from)) {
          parentMap.set(edge.from, edge.to);
          const c = childrenMap.get(edge.to) || [];
          c.push(edge.from);
          childrenMap.set(edge.to, c);
        }
      }
    });

    l2Ids.forEach(id => {
      if (!parentMap.has(id)) {
        const fallback = Array.from(l1Ids)[0];
        if (fallback) {
          parentMap.set(id, fallback);
          const c = childrenMap.get(fallback) || [];
          c.push(id);
          childrenMap.set(fallback, c);
        }
      }
    });

    // Apply Filter Criteria
    const targetGroupKey =
      activeRelationshipGroup === 'ALL'
        ? null
        : FILTER_TO_GROUP_KEY[activeRelationshipGroup];

    const matchedFilters = nodes.filter(n => {
      if (n.id === centerId) return true;
      const nodeIndustries = getNodeIndustries(n);
      const matchSearch =
        !search ||
        n.name.toLowerCase().includes(search.toLowerCase()) ||
        n.industry.toLowerCase().includes(search.toLowerCase()) ||
        nodeIndustries.some(i => i.toLowerCase().includes(search.toLowerCase()));

      const matchGroup =
        activeRelationshipGroup === 'ALL' ||
        n.group === targetGroupKey;
      const matchHealth = n.healthScore >= minHealth;

      const matchIndustry =
        industryFilter === 'All' ||
        nodeIndustries.some(i => i.trim().toLowerCase() === industryFilter.trim().toLowerCase());

      const matchRank = isNodeMatchingRankFilter(n.id);
      return matchSearch && matchGroup && matchHealth && matchIndustry && matchRank;
    });

    // INCREMENTAL EXPANSION: Filter Level 2 nodes. Only show Level 2 nodes if their parent Level 1 node is expanded.
    let filtered = matchedFilters.filter(node => {
      if (node.id === centerId) return true;
      const level = levels.get(node.id);
      if (level === 1) return true; // Level 1 (Direct) is always visible
      
      if (level === 2) {
        const parentId = parentMap.get(node.id);
        const isParentExpanded = parentId && expandedL1Ids.has(parentId);
        return isParentExpanded; // Show only if L1 parent is expanded
      }
      return false;
    });

    // Apply L2 limit count logic if needed
    const visibleL2Filtered = filtered.filter(n => levels.get(n.id) === 2);
    const maxL2 = 12;
    if (visibleL2Filtered.length > maxL2 && !showAllL2) {
      const sortedL2 = [...visibleL2Filtered].sort((a, b) => {
        const countA = edges.filter(e => e.from === a.id || e.to === a.id).length;
        const countB = edges.filter(e => e.from === b.id || e.to === b.id).length;
        return countB - countA;
      });
      const keepL2 = new Set(sortedL2.slice(0, maxL2).map(n => n.id));
      filtered = filtered.filter(n => {
        if (levels.get(n.id) === 2) return keepL2.has(n.id);
        return true;
      });
    }

    if (layoutMode === 'grid') {
      const itemsPerRow = 5;
      const spacingX = 240;
      const spacingY = 180;
      const startX = 200;
      const startY = 150;

      const sortedNodes = [
        ...filtered.filter(n => n.id === centerId),
        ...filtered.filter(n => levels.get(n.id) === 1),
        ...filtered.filter(n => levels.get(n.id) === 2)
      ];

      const positioned = sortedNodes.map((node, idx) => {
        const row = Math.floor(idx / itemsPerRow);
        const col = idx % itemsPerRow;
        const x = startX + col * spacingX;
        const y = startY + row * spacingY;
        const connCount = edges.filter(e => e.from === node.id || e.to === node.id).length;
        return {
          ...node,
          x,
          y,
          connections: connCount
        };
      });
      return { positionedNodes: positioned, l1NodeIds: l1Ids, l2NodeIds: l2Ids, l2ParentMap: parentMap };
    }

    const canvasWidth = canvasDimensions.width;
    const canvasHeight = canvasDimensions.height;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    if (activeRelationshipGroup === 'ALL') {
      const { positioned } = layoutAllModeNodes(filtered, levels, centerId, parentMap, edges, canvasWidth, canvasHeight);
      return { positionedNodes: positioned, l1NodeIds: l1Ids, l2NodeIds: l2Ids, l2ParentMap: parentMap };
    } else {
      const { positioned } = layoutSingleGroupNodes(filtered, levels, centerId, parentMap, edges, centerX, centerY);
      return { positionedNodes: positioned, l1NodeIds: l1Ids, l2NodeIds: l2Ids, l2ParentMap: parentMap };
    }
  }, [nodes, edges, centerId, search, activeRelationshipGroup, minHealth, industryFilter, depthFilter, showAllL2, expandedL1Ids, layoutMode, rankFilter, closenessMap, supportsRelationshipCloseness, canvasDimensions]);

  const visibleNodeIds = useMemo(() => new Set(positionedNodes.map(n => n.id)), [positionedNodes]);

  const visibleEdges = useMemo(() => {
    return edges.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to));
  }, [edges, visibleNodeIds]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[RelationshipNetwork] relationships after filter:', visibleEdges.length);
    }
  }, [visibleEdges]);

  const visibleL2Nodes = useMemo(() => {
    return positionedNodes.filter(n => l2NodeIds.has(n.id));
  }, [positionedNodes, l2NodeIds]);

  // ── Highlight Path Calculations (Path and direct connections highlighted) ──────
  const activeHighlightId = selectedNode?.id || hoveredNodeId || '';

  const { pathNodes, pathEdges } = useMemo(() => {
    const pNodes = new Set<string>();
    const pEdges = new Set<string>();
    
    if (!activeHighlightId || !centerId) return { pathNodes: pNodes, pathEdges: pEdges };
    
    pNodes.add(centerId);
    pNodes.add(activeHighlightId);

    // Highlight direct edge between Center and Active
    const directEdge = edges.find(e => 
      (e.from === centerId && e.to === activeHighlightId) || 
      (e.from === activeHighlightId && e.to === centerId)
    );
    if (directEdge) pEdges.add(directEdge.id);

    // If active node is Level 2, find the parent L1 node and edges
    const parentId = l2ParentMap.get(activeHighlightId);
    if (parentId) {
      pNodes.add(parentId);
      
      const edgeToParent = edges.find(e => 
        (e.from === activeHighlightId && e.to === parentId) || 
        (e.from === parentId && e.to === activeHighlightId)
      );
      if (edgeToParent) pEdges.add(edgeToParent.id);

      const edgeParentToCenter = edges.find(e => 
        (e.from === parentId && e.to === centerId) || 
        (e.from === centerId && e.to === parentId)
      );
      if (edgeParentToCenter) pEdges.add(edgeParentToCenter.id);
    }

    // Also highlight direct connections (Level 2 children) of the selected node if it's Level 1
    if (l1NodeIds.has(activeHighlightId)) {
      edges.forEach(e => {
        if (e.from === activeHighlightId && e.to !== centerId) {
          pNodes.add(e.to);
          pEdges.add(e.id);
        } else if (e.to === activeHighlightId && e.from !== centerId) {
          pNodes.add(e.from);
          pEdges.add(e.id);
        }
      });
    }

    return { pathNodes: pNodes, pathEdges: pEdges };
  }, [activeHighlightId, edges, centerId, l1NodeIds, l2NodeIds, l2ParentMap]);

  const getNodeOpacity = (nodeId: string) => {
    if (!activeHighlightId) return 1;
    return pathNodes.has(nodeId) ? 1 : 0.15;
  };

  const getEdgeOpacity = (edgeId: string) => {
    if (!activeHighlightId) return 0.6;
    return pathEdges.has(edgeId) ? 1 : 0.08;
  };

  // ── Direct Relationships Count (for Center Node) ───────────────────
  const directRelationshipsCount = useMemo(() => {
    return nodes.filter(n => l1NodeIds.has(n.id)).length;
  }, [nodes, l1NodeIds]);

  const industryOptions = useMemo(() => {
    const set = new Set<string>();
    nodes.forEach((n) => {
      const list = getNodeIndustries(n);
      list.forEach((ind) => {
        if (ind && ind.trim()) {
          set.add(ind.trim());
        }
      });
    });
    return ['All', ...Array.from(set)];
  }, [nodes]);

  const selectedNodeIndustries = useMemo(() => {
    return getNodeIndustries(selectedNode);
  }, [selectedNode]);

  // Handle Node Click to select company & Expand L2 connections (Incremental Graph Expansion)
  const handleNodeClick = (node: GraphNode) => {
    if (node.id === centerId) return;
    setSelectedNode(prev => prev?.id === node.id ? null : node);

    const level = node.id === centerId ? 0 : (l1NodeIds.has(node.id) ? 1 : 2);
    if (level === 1) {
      setExpandedL1Ids(prev => {
        const next = new Set(prev);
        if (next.has(node.id)) {
          next.delete(node.id);
        } else {
          next.add(node.id);
        }
        return next;
      });
    }
  };

  const exportNodeDossierCsv = () => {
    if (!selectedNode) return;
    const header = ['Field', 'Value'];
    const rows = [
      ['Entity', selectedNode.name],
      ['Industry', selectedNodeIndustries.length > 0 ? selectedNodeIndustries.join('; ') : selectedNode.industry],
      ['Relationship Group', selectedNode.group.toUpperCase()],
      ['Health Score', selectedNode.healthScore],
      ['Risk Level', selectedNode.riskLevel],
      ['Connections', selectedNode.connections],
      ['Overview', selectedNode.overview || ''],
      ['AI Recommendation', selectedNode.aiRecommendation || ''],
      ...(selectedNode.contacts || []).map((c, i) => [`Contact ${i + 1}`, `${c.name} · ${c.role} · ${c.email} · ${c.phone}`]),
    ];
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relationship-dossier-${(selectedNode.name || 'entity').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  // ── Owner-Centric Visual Flow & Path Computations ────────────────────────
  const sharedNodes = useMemo(() => {
    if (!selectedNode || !centerId) return [];
    return nodes.filter(n => n.id !== centerId && n.id !== selectedNode.id && 
      edges.some(e => (e.from === centerId && e.to === n.id) || (e.to === centerId && e.from === n.id)) &&
      edges.some(e => (e.from === selectedNode.id && e.to === n.id) || (e.to === selectedNode.id && e.from === n.id))
    );
  }, [selectedNode, centerId, nodes, edges]);

  const sharedNodeNamesText = useMemo(() => {
    if (sharedNodes.length === 0) return '';
    return sharedNodes.map(n => n.name).join(' and ');
  }, [sharedNodes]);

  const whyThisMattersText = useMemo(() => {
    if (!selectedNode) return '';
    const isOwner = selectedNode.id === centerId;
    if (isOwner) return "This is your own company profile representing the focal hub of your business ecosystem.";
    
    const sharedText = sharedNodeNamesText ? ` both companies are connected to ${sharedNodeNamesText}. This creates a shared ecosystem relationship that may influence your competitive strategy.` : ' maintaining alignment secures supply chain integrity and limits market risk.';

    switch (selectedNode.group) {
      case 'competitor':
        return `${selectedNode.name} is a direct competitor of your company in the ${selectedNodeIndustries.length > 0 ? selectedNodeIndustries.join(', ') : (selectedNode.industry || 'IT')} sector. However,${sharedText}`;
      case 'partner':
        return `${selectedNode.name} is a direct partner in your ecosystem. Keeping relationship alignment high secures active collaborative channels and shared projects.`;
      case 'supplier':
        return `${selectedNode.name} acts as a vital supplier. Disruptions or high risk levels here directly threaten operational output stability and SLA delivery timelines.`;
      case 'customer':
        return `${selectedNode.name} is a customer. Maintaining a healthy relationship protects direct revenue streams and uncovers growth/upsell opportunities.`;
      case 'potential-partner':
        return `${selectedNode.name} is a potential partner. Analyzing their ecosystem connections allows for structured, low-risk partnership exploration.`;
      default:
        return `${selectedNode.name} is mapped within your corporate intelligence network. Monitor their status to minimize risk exposure.`;
    }
  }, [selectedNode, centerId, sharedNodeNamesText]);

  const businessImpactData = useMemo(() => {
    if (!selectedNode) return null;
    const isCompetitor = selectedNode.group === 'competitor';
    const isPartner = selectedNode.group === 'partner';
    const isSupplier = selectedNode.group === 'supplier';
    const hasOverlap = sharedNodes.length > 0;

    return {
      competitiveRisk: {
        level: isCompetitor ? 'HIGH' : (selectedNode.group === 'potential-partner' ? 'MEDIUM' : 'LOW'),
        desc: isCompetitor 
          ? `${selectedNode.name} operates in your market space and is classified as a direct competitor.`
          : `${selectedNode.name} does not pose immediate direct market competition.`
      },
      ecosystemOverlap: {
        level: hasOverlap ? 'HIGH' : 'LOW',
        desc: hasOverlap
          ? `Your company and ${selectedNode.name} share Microsoft Vietnam as an ecosystem connection.`
          : `No direct shared partners detected in current mappings.`
      },
      stability: {
        level: selectedNode.healthScore >= 85 ? 'HIGH' : (selectedNode.healthScore >= 72 ? 'MEDIUM' : 'LOW'),
        desc: `Based on a relationship health score of ${selectedNode.healthScore}/100, engagement is stable.`
      },
      opportunity: {
        level: (isPartner || isSupplier) ? 'HIGH' : 'MEDIUM',
        desc: `Shared ecosystem ties present possibilities for strategic alignment or joint value creation.`
      }
    };
  }, [selectedNode, sharedNodes]);

  const renderVisualPathVertical = (node: GraphNode) => {
    const isL1 = l1NodeIds.has(node.id);
    const edgeToNode = edges.find(e => 
      (e.from === centerId && e.to === node.id) || 
      (e.from === node.id && e.to === centerId)
    );
    
    if (isL1) {
      const groupLabel = edgeToNode?.label || RELATIONSHIP_STYLES[node.group]?.label || 'Connection';
      const groupColor = RELATIONSHIP_STYLES[node.group]?.color || '#64748b';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '14px 0', gap: '4px' }}>
          <div style={{ padding: '6px 14px', background: '#0F172A', color: '#ffffff', borderRadius: '8px', fontWeight: 700, fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            YOUR COMPANY
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '2px', height: '24px', background: groupColor }} />
            <div style={{ background: `${groupColor}12`, color: groupColor, border: `1px solid ${groupColor}40`, padding: '1px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {groupLabel}
            </div>
            <div style={{ width: '2px', height: '10px', background: groupColor }} />
            <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${groupColor}` }} />
          </div>
          <div style={{ padding: '6px 14px', background: '#ffffff', color: '#0f172a', border: `2px solid ${groupColor}`, borderRadius: '8px', fontWeight: 700, fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            {node.name}
          </div>
        </div>
      );
    }
    
    // Level 2 Node path vertical
    const parentId = l2ParentMap.get(node.id);
    const parentNode = nodes.find(n => n.id === parentId);
    const edge1 = parentId ? edges.find(e => 
      (e.from === centerId && e.to === parentId) || 
      (e.from === parentId && e.to === centerId)
    ) : undefined;
    const edge2 = parentId ? edges.find(e => 
      (e.from === parentId && e.to === node.id) || 
      (e.from === node.id && e.to === parentId)
    ) : undefined;

    const style1 = parentNode ? (RELATIONSHIP_STYLES[parentNode.group] || { color: '#64748b', label: 'Related' }) : { color: '#64748b', label: 'Related' };
    const style2 = RELATIONSHIP_STYLES[node.group] || { color: '#64748b', label: 'Related' };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '14px 0', gap: '4px' }}>
        <div style={{ padding: '6px 14px', background: '#0F172A', color: '#ffffff', borderRadius: '8px', fontWeight: 700, fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          YOUR COMPANY
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '2px', height: '20px', background: style1.color }} />
          <div style={{ background: `${style1.color}12`, color: style1.color, border: `1px solid ${style1.color}40`, padding: '1px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 800 }}>
            {edge1?.label || style1.label}
          </div>
          <div style={{ width: '2px', height: '8px', background: style1.color }} />
          <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${style1.color}` }} />
        </div>
        <div style={{ padding: '5px 12px', background: '#ffffff', color: '#0f172a', border: `2px solid ${style1.color}`, borderRadius: '8px', fontWeight: 600, fontSize: '10.5px' }}>
          {parentNode?.name}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '2px', height: '20px', background: style2.color }} />
          <div style={{ background: `${style2.color}12`, color: style2.color, border: `1px solid ${style2.color}40`, padding: '1px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 800 }}>
            {edge2?.label || style2.label}
          </div>
          <div style={{ width: '2px', height: '8px', background: style2.color }} />
          <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${style2.color}` }} />
        </div>
        <div style={{ padding: '6px 14px', background: '#ffffff', color: '#0f172a', border: `2px solid ${style2.color}`, borderRadius: '8px', fontWeight: 700, fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          {node.name}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (drawerTab === 'ai-recommend' && selectedNode && !aiRecommendations[selectedNode.id]) {
      const fetchAiRecs = async () => {
        setLoadingAi(true);
        try {
          const res = await api.get<any>(`/graph/companies/${encodeURIComponent(selectedNode.id)}/ai-recommendations`);
          if (res?.data) {
            setAiRecommendations(prev => ({
              ...prev,
              [selectedNode.id]: res.data
            }));
          }
        } catch (err: any) {
          console.error("Failed to fetch AI recommendations:", err);
          window.alert("Failed to load AI recommendations: " + (err.message || String(err)));
        } finally {
          setLoadingAi(false);
        }
      };
      void fetchAiRecs();
    }
  }, [drawerTab, selectedNode, aiRecommendations]);

  // Render Restored Original 6 Drawer Tabs with Improved Owner-Centric Content
  const renderDrawerTab = () => {
    if (!selectedNode) return null;

    const sharedName = sharedNodeNamesText ? sharedNodeNamesText.split(' and ')[0] : 'Microsoft Vietnam';
    const isComp = selectedNode.group === 'competitor';
    const hasOverlap = sharedNodes.length > 0;

    switch (drawerTab) {
      case 'overview':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
            
            {/* General Info */}
            <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{selectedNode.name}</h3>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: RELATIONSHIP_STYLES[selectedNode.group]?.color || '#475569',
                  background: `${RELATIONSHIP_STYLES[selectedNode.group]?.color || '#475569'}15`,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                }}>
                  {selectedNode.group}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: '6px', flexWrap: 'wrap', margin: '4px 0' }}>
                <span style={{ flexShrink: 0 }}>Industry:</span>
                {selectedNodeIndustries.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {selectedNodeIndustries.map((ind, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#1e293b',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          padding: '1px 6px',
                        }}
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                ) : (
                  <strong>{selectedNode.industry || '—'}</strong>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  Relationship Status: <strong style={{ color: '#10b981' }}>Active</strong>
                </div>
                {setActivePage && (
                  <button
                    onClick={() => {
                      navigateToCompanyDetail(selectedNode.id, 'overview');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    View Full Profile <ArrowRight size={11} />
                  </button>
                )}
              </div>
            </div>



            {/* WHY THIS RELATIONSHIP MATTERS */}
            <div style={{ background: '#f8fafc', borderLeft: '4px solid #3b82f6', padding: '14px', borderRadius: '0 8px 8px 0', fontSize: '12.5px', lineHeight: '20px' }}>
              <strong style={{ display: 'block', marginBottom: '6px', color: '#0f172a', fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.05em' }}>
                WHY THIS RELATIONSHIP MATTERS
              </strong>
              <div style={{ color: '#334155' }}>
                {whyThisMattersText}
              </div>
            </div>

            {/* NETWORK CONNECTIONS */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('drawer.networkConnections', 'Network Connections')}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(() => {
                  const nodeEdges = edges.filter(e => e.from === selectedNode.id || e.to === selectedNode.id);
                  const validEdges = nodeEdges.filter(e => {
                    const otherId = e.from === selectedNode.id ? e.to : e.from;
                    return otherId !== centerId;
                  });
                  if (validEdges.length === 0) {
                    return <span style={{ fontSize: '12px', color: '#64748b' }}>{t('drawer.noConnectionsMapped', 'No connections mapped.')}</span>;
                  }
                  return validEdges.map(edge => {
                    const otherId = edge.from === selectedNode.id ? edge.to : edge.from;
                    const otherNode = nodes.find(n => n.id === otherId);
                    if (!otherNode) return null;

                    const style = RELATIONSHIP_STYLES[edge.group] || { label: 'connection' };
                    const isConnectedToOwner = edges.find(e => 
                      (e.from === centerId && e.to === otherId) || 
                      (e.from === otherId && e.to === centerId)
                    );
                    const ownerRelStyle = isConnectedToOwner ? (RELATIONSHIP_STYLES[isConnectedToOwner.group] || { label: 'related' }) : null;

                    return (
                      <div key={edge.id} style={{ fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                        <strong style={{ color: '#0f172a' }}>{otherNode.name}</strong>
                        <div style={{ color: '#64748b', marginTop: '2px', display: 'flex', gap: '8px' }}>
                          <span>→ {getGroupLabel(edge.group)} {t('drawer.with', 'with')} {selectedNode.name}</span>
                          <span>|</span>
                          <span>
                            {isConnectedToOwner 
                              ? `→ ${getGroupLabel(isConnectedToOwner.group)} ${t('drawer.withYourCompany', 'with Your Company')}` 
                              : `→ ${t('drawer.noDirectRelationship', 'No direct relationship with Your Company')}`}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

          </div>
        );

      case 'strength':
        if (!businessImpactData) return null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('drawer.relationshipAssessment', 'Relationship Assessment')}
            </h4>

            {/* Assessment Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', background: '#f8fafc' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{t('drawer.relationshipType', 'Relationship Type')}</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a', marginTop: '2px', textTransform: 'uppercase' }}>
                  {getGroupLabel(selectedNode.group)}
                </strong>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', background: '#f8fafc' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{t('drawer.relationshipStatus', 'Relationship Status')}</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#10b981', marginTop: '2px' }}>
                  {t('priority.active', 'ACTIVE')}
                </strong>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', background: '#f8fafc' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{t('drawer.businessRisk', 'Business Risk')}</span>
                <strong style={{ display: 'block', fontSize: '13px', color: businessImpactData.competitiveRisk.level === 'HIGH' ? '#ef4444' : '#64748b', marginTop: '2px' }}>
                  {businessImpactData.competitiveRisk.level}
                </strong>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', background: '#f8fafc' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{t('drawer.networkImpact', 'Network Impact')}</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#3b82f6', marginTop: '2px' }}>
                  {businessImpactData.opportunity.level}
                </strong>
              </div>
            </div>

            {/* Explanatory breakdown */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <h5 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{t('drawer.assessmentRationale', 'Assessment Rationale')}</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569' }}>
                <div>• {t('drawer.typeDirect', 'Type: Direct relationship')}</div>
                <div>• {t('drawer.industryCoverage', 'Industry coverage:')} {selectedNodeIndustries.length > 0 ? selectedNodeIndustries.join(', ') : (selectedNode.industry || '—')}</div>
                {hasOverlap ? (
                  <div>• {t('drawer.sharedEcosystemPartners', 'Shared ecosystem partners:')} {sharedNodeNamesText}</div>
                ) : (
                  <div>• {t('drawer.noDirectSharedPartners', 'No direct shared partners detected in map')}</div>
                )}
                <div>• {t('drawer.operationalStatusSync', 'Operational status: Active database sync')}</div>
              </div>
            </div>

          </div>
        );

      case 'projects':
        const directProjects = [
          ...(selectedNode.sharedProjects || []),
          ...Array.from({ length: projectCounts.get(selectedNode.id) || 0 }).map((_, i) => ({
            name: `Joint Integration Project Phase ${i + 1}`,
            status: i % 2 === 0 ? 'ACTIVE' : 'COMPLETED',
            progress: i % 2 === 0 ? 65 : 100,
            due: `2026-12-${10 + i * 5}`
          }))
        ];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('drawer.sharedProjects', 'Shared Projects')}
            </h4>

            {directProjects.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {directProjects.map((p, idx) => (
                  <div key={idx} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{p.name}</strong>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: p.status === 'ACTIVE' ? '#2563eb' : '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                        {p.status === 'ACTIVE' ? t('priority.active', 'ACTIVE') : t('priority.inactive', 'COMPLETED')}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Target Completion: {p.due}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Relationship Impact: <strong style={{ color: '#0f172a' }}>Strengthens direct business engagement</strong>
                    </div>
                    <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
                      <div style={{ width: `${p.progress}%`, height: '100%', background: '#2563eb', borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '10px' }}>{t('drawer.noSharedProjects', 'No direct shared projects.')}</span>
                
                {hasOverlap && (
                  <div style={{ fontSize: '11.5px', color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <strong>{t('drawer.ecosystemProjectPotential', 'Ecosystem Project Potential:')}</strong> Ecosystem project involving {sharedName}, which is connected to both companies.
                  </div>
                )}
              </div>
            )}

          </div>
        );

      case 'contacts':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('drawer.relationshipContacts', 'Relationship Contacts')}
            </h4>

            {(() => {
              const contacts = selectedNode.contacts || [];
              if (contacts.length === 0) {
                return <p style={{ fontSize: '12px', color: '#64748b' }}>{t('drawer.noContactsListed', 'No contacts listed.')}</p>;
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {contacts.map((cnt, i) => (
                    <div key={i} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#ffffff' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{cnt.name}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 6px' }}>{cnt.role} - {selectedNode.name}</div>
                      
                      <div style={{ fontSize: '11px', color: '#475569' }}>
                        <div style={{ marginTop: '4px', paddingTop: '4px' }}>
                          Email: <a href={`mailto:${cnt.email}`} style={{ color: '#2563eb' }}>{cnt.email}</a> • Phone: {cnt.phone}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        );

      case 'meetings':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('drawer.meetingsHistory', 'Meetings History')}
            </h4>
            {(() => {
              const meetings = selectedNode.meetings || [];
              if (meetings.length === 0) {
                return <p style={{ fontSize: '12px', color: '#64748b' }}>{t('drawer.noMeetings', 'No scheduled meetings.')}</p>;
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {meetings.map((mtg, i) => (
                    <div key={i} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#ffffff' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>{mtg.date}</span>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', margin: '3px 0 6px' }}>
                        {mtg.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', lineHeight: '18px' }}>
                        {mtg.notes}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        );

      case 'ai-recommend': {
        if (loadingAi) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '16px', color: '#64748b' }}>
              <div className="cds--loading" style={{ width: '40px', height: '40px', border: '3px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{t('drawer.loadingAi', 'Please wait, AI is analyzing the network...')}</div>
              <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
              `}</style>
            </div>
          );
        }

        const aiData = aiRecommendations[selectedNode.id];
        if (!aiData) {
          return (
            <div style={{ padding: '20px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
              {t('drawer.aiDataUnavailable', 'Unable to load AI data at this time.')}
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('drawer.aiRecommendationsTitle', 'Prescriptive AI Recommendations')}
            </h4>

            {/* HIGH PRIORITY */}
            {aiData.highPriority && (
              <div style={{ border: '1px solid #fee2e2', borderRadius: '10px', padding: '14px', background: '#fff5f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <AlertCircle size={14} style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: '9px', fontWeight: 900, background: '#ef4444', color: '#ffffff', padding: '1px 6px', borderRadius: '10px' }}>
                    {t('drawer.highPriority', 'HIGH PRIORITY')}
                  </span>
                </div>
                <strong style={{ display: 'block', fontSize: '13px', color: '#991b1b', marginBottom: '4px' }}>
                  {aiData.highPriority.title}
                </strong>
                
                <div style={{ fontSize: '12px', color: '#7f1d1d', lineHeight: '18px', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 700 }}>WHY:</div>
                  <div style={{ marginTop: '2px' }}>{aiData.highPriority.reason}</div>
                  <div style={{ marginTop: '4px', fontWeight: 700 }}>EVIDENCE:</div>
                  <div style={{ marginTop: '2px' }}>{aiData.highPriority.evidence}</div>
                </div>

                <div style={{ fontSize: '12px', color: '#7f1d1d', lineHeight: '18px', marginBottom: '12px' }}>
                  <strong>RECOMMENDED ACTION:</strong> {aiData.highPriority.action}
                </div>
              </div>
            )}

            {/* MEDIUM PRIORITY */}
            {aiData.mediumPriority && (
              <div style={{ border: '1px solid #fef3c7', borderRadius: '10px', padding: '14px', background: '#fffbeb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <AlertTriangle size={14} style={{ color: '#d97706' }} />
                  <span style={{ fontSize: '9px', fontWeight: 900, background: '#d97706', color: '#ffffff', padding: '1px 6px', borderRadius: '10px' }}>
                    MEDIUM PRIORITY
                  </span>
                </div>
                <strong style={{ display: 'block', fontSize: '13px', color: '#92400e', marginBottom: '4px' }}>
                  {aiData.mediumPriority.title}
                </strong>
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#78350f', lineHeight: '18px' }}>
                  {aiData.mediumPriority.reason} {aiData.mediumPriority.evidence}
                </p>
                <div style={{ fontSize: '12px', color: '#78350f', lineHeight: '18px' }}>
                  <strong>RECOMMENDED ACTION:</strong> {aiData.mediumPriority.action}
                </div>
              </div>
            )}

            {/* OPPORTUNITY */}
            {aiData.opportunity && (
              <div style={{ border: '1px solid #dcfce7', borderRadius: '10px', padding: '14px', background: '#f0fdf4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: '9px', fontWeight: 900, background: '#16a34a', color: '#ffffff', padding: '1px 6px', borderRadius: '10px' }}>
                    OPPORTUNITY
                  </span>
                </div>
                <strong style={{ display: 'block', fontSize: '13px', color: '#166534', marginBottom: '4px' }}>
                  {aiData.opportunity.title}
                </strong>
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#14532d', lineHeight: '18px' }}>
                  {aiData.opportunity.reason} {aiData.opportunity.evidence}
                </p>
                <div style={{ fontSize: '12px', color: '#14532d', lineHeight: '18px' }}>
                  <strong>RECOMMENDED ACTION:</strong> {aiData.opportunity.action}
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  // Canvas Mouse Panning
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (target.tagName === 'svg' || target.id === 'graph-bg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ── Main Shell Render ────────────────────────────────────────────
  return (
    <div className="cds-page-shell" id="page-relationship-map">
      
      {/* 1. Page Header */}
      <PageHeader
        title={t('title', 'Dashboard')}
      />

      {/* 2. 2-Column Operations Layout: Center Graph Redesign (Stretched) | Right Analytics */}
      <div className="relationship-map-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '14px', alignItems: 'start', marginBottom: '16px' }}>
        
        {/* CENTER: REDESIGNED Circular Level Network panel */}
        <div className="relationship-network-panel" style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px', position: 'relative', minWidth: 0 }}>
          <div style={{ marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--cds-text-primary)' }}>{t('network.title', 'Relationship Network')}</h3>
          </div>

          {/* Local Toolbar above Graph Canvas */}
          <div 
            style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              gap: '8px', 
              marginBottom: '12px', 
              paddingBottom: '10px', 
              borderBottom: '1px solid var(--cds-border-subtle-00, #cbd5e1)' 
            }}
          >
            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '150px' }}>
                <Search style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={13} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('filters.searchPlaceholder', 'Search...')}
                  style={{
                    width: '100%',
                    padding: '4px 6px 4px 24px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    border: '1px solid var(--cds-border-color, #cbd5e1)',
                    background: 'var(--cds-layer-01, #f8fafc)',
                    color: 'var(--cds-text-primary, #1e293b)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <select
                value={industryFilter}
                onChange={e => setIndustryFilter(e.target.value)}
                style={{
                  padding: '4px 6px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  border: '1px solid var(--cds-border-color, #cbd5e1)',
                  background: 'var(--cds-layer-01, #f8fafc)',
                  color: 'var(--cds-text-primary, #1e293b)',
                  cursor: 'pointer',
                }}
              >
                {industryOptions.map((ind) => (
                  <option key={ind} value={ind}>{ind === 'All' ? t('filters.allIndustries', 'All Industries') : ind}</option>
                ))}
              </select>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                  setSelectedNode(null);
                  setSearch('');
                  setActiveRelationshipGroup('ALL');
                  setMinHealth(0);
                  setIndustryFilter('All');
                  setRankFilter('ALL');
                  setShowAllL2(false);
                  setExpandedL1Ids(new Set());
                  setHoveredNodeId(null);
                  setTooltipNode(null);
                  setTooltipPosState(null);
                  hoveredNodeElementRef.current = null;
                }}
                style={{
                  padding: '4px 6px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  border: '1px solid var(--cds-border-color, #cbd5e1)',
                  background: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RotateCcw size={11} />
                {t('network.reset', 'Reset')}
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--cds-border-color, #cbd5e1)', borderRadius: '4px', overflow: 'hidden', background: '#ffffff' }}>
                <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} style={{ width: '22px', height: '20px', border: 0, background: 'transparent', borderRight: '1px solid var(--cds-border-color, #cbd5e1)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <Minus size={11} />
                </button>
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '0 4px', color: '#475569', minWidth: '26px', textAlign: 'center', userSelect: 'none' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} style={{ width: '22px', height: '20px', border: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <Plus size={11} />
                </button>
              </div>
            </div>
          </div>

          {/* Relationship Type Toggle Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
              flexWrap: 'wrap',
            }}
          >
            {TOGGLE_GROUPS_CONFIG.map((item) => {
              const isActive = activeRelationshipGroup === item.key;
              const count = groupCounts[item.key];
              const label = t(item.labelKey, item.defaultLabel);

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSelectRelationshipGroup(item.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    border: isActive ? `2px solid ${item.activeBorder}` : '1px solid var(--cds-border-color, #cbd5e1)',
                    background: isActive ? item.activeBg : '#ffffff',
                    color: isActive ? item.activeText : '#475569',
                    fontWeight: isActive ? 700 : 500,
                    boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: item.color,
                      flexShrink: 0,
                    }}
                  />
                  <span>{label}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: '10px',
                      background: isActive ? item.color : '#f1f5f9',
                      color: isActive ? '#ffffff' : '#64748b',
                      lineHeight: 1.3,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Graph Canvas Container (Widened to 1400 viewbox and Heightened to 680px) */}
          <div ref={canvasContainerRef} className="relationship-network-canvas" style={{ width: '100%', minHeight: '680px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--cds-border-subtle-00)', overflow: 'hidden', position: 'relative' }}>
            {loadError ? (
              <div style={{ minHeight: '680px', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}>
                <div><AlertCircle size={36} style={{ color: '#dc2626', marginBottom: '12px' }} /><strong style={{ display: 'block', fontSize: '14px', color: '#991b1b' }}>{t('network.loadError', 'Unable to load relationship network data.')}</strong><span style={{ fontSize: '12px', color: '#64748b' }}>{loadError}</span></div>
              </div>
            ) : nodes.length === 0 ? (
              <div style={{ minHeight: '680px', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}>
                <div>
                  <Building size={36} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                  <strong style={{ display: 'block', fontSize: '14px', color: '#1e293b', marginBottom: '6px' }}>{t('network.emptyData', 'No business relationship data yet. Please try refreshing.')}</strong>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{t('network.noValidRelationships', 'No valid relationships to display in the network.')}</span>
                </div>
              </div>
            ) : positionedNodes.length === 0 ? (
              <div style={{ minHeight: '680px', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}>
                <div>
                  <Search size={36} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                  <strong style={{ display: 'block', fontSize: '14px', color: '#1e293b', marginBottom: '6px' }}>{t('network.emptyFiltered', 'No partners match the current filters. Please adjust the industry or relationship type filters.')}</strong>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{t('network.adjustFilterOrReset', 'Please adjust the filters or click Reset to view the entire network.')}</span>
                </div>
              </div>
            ) : (
              <>
                <svg
                  viewBox={`0 0 ${canvasDimensions.width} ${canvasDimensions.height}`}
                  role="img"
                  aria-label={t('network.ariaLabel', 'Business relationship network')}
                  style={{ width: '100%', height: '680px', display: 'block', cursor: isDragging ? 'grabbing' : 'grab' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <rect id="graph-bg" width={canvasDimensions.width} height={canvasDimensions.height} fill="transparent" />

                  {/* SVG marker definitions for arrows */}
                  <defs>
                    {Object.entries(RELATIONSHIP_STYLES).map(([key, style]) => (
                      <marker
                        key={key}
                        id={`arrow-${key}`}
                        viewBox="0 0 10 10"
                        refX={6}
                        refY={5}
                        markerWidth={5}
                        markerHeight={5}
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={style.color} />
                      </marker>
                    ))}
                  </defs>

                  <g 
                    transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} 
                    style={{ transformOrigin: 'center', transition: isDragging ? 'none' : 'transform 150ms ease-out' }}
                  >
                    
                    {/* Render curved edge lines */}
                    {visibleEdges.map(edge => {
                      const posA = positionedNodes.find(n => n.id === edge.from);
                      const posB = positionedNodes.find(n => n.id === edge.to);
                      if (!posA || !posB) return null;

                      const xa = posA.x;
                      const ya = posA.y;
                      const xb = posB.x;
                      const yb = posB.y;

                      const D = Math.hypot(xb - xa, yb - ya);
                      if (D === 0) return null;

                      const dx = (xb - xa) / D;
                      const dy = (yb - ya) / D;

                      const levelA = posA.id === centerId ? 0 : (l1NodeIds.has(posA.id) ? 1 : 2);
                      const levelB = posB.id === centerId ? 0 : (l1NodeIds.has(posB.id) ? 1 : 2);

                      const getRectPadding = (level: number, dx: number, dy: number, isTarget: boolean) => {
                        const width = level === 0 ? 220 : (level === 1 ? 170 : 150);
                        const height = level === 0 ? 80 : (level === 1 ? 64 : 54);
                        // Add some gap so arrow doesn't overlap text/border
                        const gap = isTarget ? 12 : 0; 
                        const tx = (width / 2 + gap) / (Math.abs(dx) || 0.001);
                        const ty = (height / 2 + gap) / (Math.abs(dy) || 0.001);
                        return Math.min(tx, ty);
                      };

                      const paddingA = Math.min(getRectPadding(levelA, dx, dy, false), D * 0.45);
                      const paddingB = Math.min(getRectPadding(levelB, dx, dy, true), D * 0.45);

                      const xStart = xa + dx * paddingA;
                      const yStart = ya + dy * paddingA;
                      const xEnd = xb - dx * paddingB;
                      const yEnd = yb - dy * paddingB;

                      const isCenterConnection = levelA === 0 || levelB === 0;
                      const isAllMode = activeRelationshipGroup === 'ALL';
                      const bend = isCenterConnection ? (isAllMode ? 12 : 25) : 15;
                      const { path, cx, cy } = getCurvePath(xStart, yStart, xEnd, yEnd, bend);
                      
                      const isPathActive = pathEdges.has(edge.id);
                      const edgeOpacity = getEdgeOpacity(edge.id);
                      const labelWidth = isAllMode ? edge.label.length * 5.5 + 10 : edge.label.length * 6 + 12;
                      const labelHeight = isAllMode ? 16 : 18;

                      // Position label on the clear radial segment between center card and node card (Correction 10)
                      let labelX = cx;
                      let labelY = cy;
                      if (isCenterConnection && isAllMode) {
                        const t = 0.44;
                        labelX = (1 - t) * (1 - t) * xStart + 2 * (1 - t) * t * cx + t * t * xEnd;
                        labelY = (1 - t) * (1 - t) * yStart + 2 * (1 - t) * t * cy + t * t * yEnd;
                      }

                      return (
                        <g key={edge.id}>
                          <path
                            d={path}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={12}
                            style={{ cursor: 'pointer' }}
                          />
                          <path
                            d={path}
                            fill="none"
                            stroke={edge.color}
                            strokeWidth={isPathActive ? 3 : (isAllMode ? 1.2 : 1.5)}
                            strokeDasharray={edge.dashed ? '4 3' : undefined}
                            markerEnd={`url(#arrow-${edge.group})`}
                            opacity={edgeOpacity}
                            style={{ transition: 'opacity 200ms ease, stroke-width 200ms ease' }}
                          />
                          {/* Label badge */}
                          <g transform={`translate(${labelX}, ${labelY})`} opacity={edgeOpacity} style={{ transition: 'opacity 200ms ease' }}>
                            <rect
                              x={-labelWidth / 2}
                              y={-labelHeight / 2}
                              width={labelWidth}
                              height={labelHeight}
                              rx={labelHeight / 2}
                              fill="#ffffff"
                              stroke={edge.color}
                              strokeWidth={isAllMode ? 0.8 : 1}
                              style={{ filter: 'drop-shadow(0 1px 2px rgba(15,23,42,0.06))' }}
                            />
                            <text
                              x={0}
                              y={isAllMode ? 2.5 : 3}
                              textAnchor="middle"
                              fill={edge.color}
                              fontSize={isAllMode ? 8 : 8.5}
                              fontWeight={800}
                              style={{ userSelect: 'none' }}
                            >
                              {edge.label}
                            </text>
                          </g>
                        </g>
                      );
                    })}

                    {/* Render node cards (NO FABRICATED HEALTH SCORES DISPLAYED) */}
                    {positionedNodes.map(node => {
                      const level = node.id === centerId ? 0 : (l1NodeIds.has(node.id) ? 1 : 2);
                      const isOwner = level === 0;
                      const style = RELATIONSHIP_STYLES[node.group] || { color: '#64748b', label: 'Related' };
                      const summary = closenessMap.get(node.id);
                      const trend = summary?.trendInfo;
                      const unreadState = getUnreadState(node);
                      
                      const width = isOwner ? 220 : (level === 1 ? 170 : 150);
                      const height = isOwner ? 80 : (level === 1 ? (trend ? 74 : 64) : (trend ? 64 : 54));
                      
                      const opacity = getNodeOpacity(node.id);
                      const isSelected = selectedNode?.id === node.id;
                      const isHovered = hoveredNodeId === node.id;

                      const isExpandedL1 = level === 1 && expandedL1Ids.has(node.id);

                      return (
                        <foreignObject
                          key={node.id}
                          x={node.x - width / 2}
                          y={node.y - height / 2}
                          width={width}
                          height={height}
                          style={{
                            opacity,
                            cursor: isOwner ? 'default' : 'pointer',
                            overflow: 'visible'
                          }}
                        >
                          {isOwner ? (
                            // OWNER CENTER NODE
                            <div
                              onClick={() => handleNodeClick(node)}
                              onMouseEnter={() => setHoveredNodeId(node.id)}
                              onMouseLeave={() => setHoveredNodeId(null)}
                              style={{
                                width: '100%',
                                height: '100%',
                                background: '#0f172a', // Slate 900
                                color: '#ffffff',
                                borderRadius: '12px',
                                border: '2px solid #3b82f6',
                                boxShadow: isSelected 
                                  ? '0 0 16px 4px rgba(59, 130, 246, 0.45)' 
                                  : '0 5px 12px rgba(15, 23, 42, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '10px 14px',
                                boxSizing: 'border-box',
                                gap: '10px',
                                transform: isHovered || isSelected ? 'scale(1.03)' : 'scale(1)',
                                transition: 'transform 150ms ease, box-shadow 150ms ease',
                              }}
                            >
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: 'rgba(59, 130, 246, 0.2)',
                                  display: 'grid',
                                  placeItems: 'center',
                                  color: '#60a5fa',
                                  flexShrink: 0,
                                }}
                              >
                                <Building size={16} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '9px', fontWeight: 800, color: '#60a5fa', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                  YOUR COMPANY
                                </span>
                                <strong style={{ fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ffffff' }}>
                                  {node.name}
                                </strong>
                                <span style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '1.5px' }}>
                                  {directRelationshipsCount} Connections
                                </span>
                              </div>
                            </div>
                          ) : (
                            // REGULAR TIERS: Level 1 and Level 2 (No fabricated scores)
                            <div
                              onClick={() => handleNodeClick(node)}
                              onMouseEnter={(e) => {
                                setHoveredNodeId(node.id);
                                handleNodeMouseEnter(node, e);
                              }}
                              onMouseLeave={() => {
                                setHoveredNodeId(null);
                                handleNodeMouseLeave();
                              }}
                              className={unreadState ? styles.nodeCardUnread : undefined}
                              style={{
                                position: 'relative',
                                width: '100%',
                                height: '100%',
                                background: unreadState
                                  ? '#FDF4FF'
                                  : '#ffffff',
                                borderRadius: level === 1 ? '10px' : '8px',
                                border: `2px solid ${level === 1 ? style.color : (isSelected ? style.color : '#e2e8f0')}`,
                                outline: isSelected ? 'none' : undefined,
                                boxShadow: isSelected
                                  ? '0 0 0 3px rgba(37, 99, 235, 0.35), 0 4px 12px rgba(15, 23, 42, 0.14)'
                                  : (unreadState
                                      ? undefined
                                      : (isHovered ? '0 4px 12px rgba(15, 23, 42, 0.08)' : '0 2px 6px rgba(15, 23, 42, 0.02)')),
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                padding: level === 1 ? '8px 12px' : '6px 10px',
                                boxSizing: 'border-box',
                                transform: isHovered || isSelected ? 'scale(1.03)' : 'scale(1)',
                                transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
                              }}
                            >
                              {/* Unread assessment alert badge */}
                              {unreadState && (
                                <div
                                  className={styles.unreadBadge}
                                  title={unreadState.type === 'INITIAL_ASSESSMENT' ? 'New assessment' : 'Updated assessment'}
                                >
                                  <span className={styles.unreadDotInline} />
                                  {unreadState.type === 'INITIAL_ASSESSMENT' ? 'NEW' : 'UPDATED'}
                                </div>
                              )}
                              <strong
                                style={{
                                  display: 'block',
                                  fontSize: level === 1 ? '11px' : '10px',
                                  color: '#0f172a',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  marginBottom: level === 1 ? '4px' : '2px',
                                }}
                              >
                                {node.name}
                              </strong>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', minWidth: 0 }}>
                                {level === 1 ? (
                                  <span
                                    style={{
                                      fontSize: '8px',
                                      fontWeight: 800,
                                      color: style.color,
                                      background: `${style.color}15`,
                                      padding: '1px 6px',
                                      borderRadius: '999px',
                                      textTransform: 'uppercase',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {getGroupLabel(node.group)} {isExpandedL1 ? `• ${t('network.expanded', 'Expanded')}` : ''}
                                  </span>
                                ) : (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '8.5px', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: style.color }} />
                                    {t('network.level2', 'Level 2')}
                                  </span>
                                )}

                                {renderClosenessBadge(node)}
                              </div>

                              {/* Single Trend / Recent Badge (Correction 6: At most ONE badge) */}
                              {trend && (
                                <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center' }}>
                                  <span
                                    style={{
                                      fontSize: '7.5px',
                                      fontWeight: 800,
                                      color: trend.badgeColors.text,
                                      background: trend.badgeColors.bg,
                                      border: `1px solid ${trend.badgeColors.border}`,
                                      padding: '0.5px 4px',
                                      borderRadius: '3px',
                                      whiteSpace: 'nowrap',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {trend.nodeBadgeText}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </foreignObject>
                      );
                    })}

                  </g>
                </svg>

                {/* SVG legend overlay */}
                <div style={{ position: 'absolute', left: '12px', bottom: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '7px 9px', border: '1px solid #dbe3ef', borderRadius: '5px', background: 'rgba(255,255,255,.95)', fontSize: '11px', color: '#475569', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  {(['partner', 'competitor', 'supplier', 'customer', 'potential-partner'] as const).map((group) => (
                    <span key={group} style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                      <i style={{ width: '7px', height: '7px', borderRadius: '50%', background: RELATIONSHIP_STYLES[group].color }} />
                      {getGroupLabel(group)}
                    </span>
                  ))}
                </div>

                {/* Visible Level 2 limit count notifier */}
                {depthFilter === '2nd-degree' && visibleL2Nodes.length > 12 && !showAllL2 && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 2,
                      padding: '6px 12px',
                      borderRadius: '20px',
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #cbd5e1',
                      boxShadow: '0 3px 8px rgba(0, 0, 0, 0.05)',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#475569',
                    }}
                  >
                    <span>{t('network.showingL2', 'Showing 12 of {{total}} second-degree connections', { total: visibleL2Nodes.length })}</span>
                    <button
                      onClick={() => setShowAllL2(true)}
                      style={{
                        border: 0,
                        background: 'none',
                        color: '#2563eb',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                    >
                      {t('network.showAll', 'Show all')}
                    </button>
                  </div>
                )}

                {/* Empty state for active relationship group (Correction 7) */}
                {positionedNodes.filter(n => n.id !== centerId).length === 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '24px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '10px 20px',
                      background: 'rgba(255, 255, 255, 0.96)',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12.5px',
                      color: '#334155',
                      zIndex: 10,
                      pointerEvents: 'none',
                    }}
                  >
                    <Building size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                    <span>
                      {groupCounts[activeRelationshipGroup] === 0
                        ? (activeRelationshipGroup === 'ALL'
                            ? 'No company relationship data available.'
                            : `No companies found in the ${getGroupFilterLabel(activeRelationshipGroup)} group.`)
                        : t('network.noMatchingCompanies', 'No companies match the current filter.')}
                    </span>
                  </div>
                )}

                {/* Smart Portal Hover Tooltip (Measured Real Dimensions, Viewport Fixed Positioning, Directional Caret) */}
                {typeof document !== 'undefined' && tooltipNode && createPortal(
                  (() => {
                    const summary = closenessMap.get(tooltipNode.id);
                    const isAssessed = Boolean(summary?.hasFinalizedAssessment && summary.score !== null);
                    const trend = summary?.trendInfo;
                    const actorLabel = summary?.latestAssessment ? formatActorLabel(summary.latestAssessment.actorRole, summary.latestAssessment.assessmentType) : 'Manager';
                    const unreadState = getUnreadState(tooltipNode);

                    const isReady = tooltipPosState?.isReady ?? false;
                    const top = isReady ? `${tooltipPosState!.top}px` : '-9999px';
                    const left = isReady ? `${tooltipPosState!.left}px` : '-9999px';
                    const placement = tooltipPosState?.placement ?? 'bottom';
                    const arrowOffset = tooltipPosState?.arrowOffset ?? 14;

                    return (
                      <div
                        ref={tooltipRef}
                        style={{
                          position: 'fixed',
                          top,
                          left,
                          opacity: isReady ? 1 : 0,
                          visibility: isReady ? 'visible' : 'hidden',
                          pointerEvents: 'none',
                          zIndex: 99999,
                          width: 'max-content',
                          maxWidth: '240px',
                          background: '#0f172a',
                          color: '#ffffff',
                          borderRadius: '6px',
                          padding: '7px 11px',
                          fontSize: '11px',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                          textAlign: 'center',
                          lineHeight: 1.35,
                          transition: isReady ? 'opacity 120ms ease' : 'none',
                        }}
                      >
                        <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tooltipNode.name}
                        </div>
                        {unreadState && (
                          <div style={{ fontSize: '10px', color: '#f5d0fe', marginTop: '3px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C026D3', display: 'inline-block' }} />
                            <span>{unreadState.type === 'INITIAL_ASSESSMENT' ? 'New assessment' : 'Updated assessment'}</span>
                          </div>
                        )}
                        <div style={{ fontSize: '10.5px', color: isAssessed ? '#86efac' : '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                          {isAssessed && summary
                            ? `${summary.score}/100 · Rank ${summary.rank}`
                            : t('closeness.unassessed', 'Not Evaluated')}
                        </div>

                        {trend && (
                          <div style={{ marginTop: '5px', paddingTop: '5px', borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: '10px' }}>
                            {trend.trendType === 'NEWLY_SCORED' ? (
                              <div style={{ fontWeight: 700, color: '#6ee7b7' }}>
                                {trend.label}
                              </div>
                            ) : (
                              <>
                                <div style={{ fontWeight: 700, color: trend.trendType === 'IMPROVING' ? '#6ee7b7' : (trend.trendType === 'DECLINING' ? '#fca5a5' : '#93c5fd') }}>
                                  {trend.deltaScore !== null && trend.deltaScore > 0 ? `↑ +${trend.deltaScore}` : (trend.deltaScore !== null && trend.deltaScore < 0 ? `↓ ${trend.deltaScore}` : '→ 0')} {t('closeness.pts', 'pts')} · {trend.label}
                                </div>
                                {summary?.previousAssessment && summary?.latestAssessment && (
                                  <div style={{ color: '#cbd5e1', marginTop: '3px', fontSize: '9.5px' }}>
                                    <div>{summary.previousAssessment.formattedVersion || `V${summary.previousAssessment.versionNumber}`}: {summary.previousAssessment.score}/100 · Rank {summary.previousAssessment.rank}</div>
                                    <div>{summary.latestAssessment.formattedVersion || `V${summary.latestAssessment.versionNumber}`}: {summary.latestAssessment.score}/100 · Rank {summary.latestAssessment.rank}</div>
                                  </div>
                                )}
                              </>
                            )}
                            {summary?.latestAssessment?.finalizedAt && (
                              <div style={{ color: '#94a3b8', marginTop: '3px', fontSize: '9px' }}>
                                {actorLabel} · {formatDateTime(summary.latestAssessment.finalizedAt)}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Directional Caret Arrow pointing to node (Correction 8) */}
                        {isReady && placement === 'top' && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '-5px',
                              left: `${arrowOffset}px`,
                              transform: 'translateX(-50%)',
                              width: 0,
                              height: 0,
                              borderLeft: '5px solid transparent',
                              borderRight: '5px solid transparent',
                              borderTop: '5px solid #0f172a',
                            }}
                          />
                        )}
                        {isReady && placement === 'bottom' && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '-5px',
                              left: `${arrowOffset}px`,
                              transform: 'translateX(-50%)',
                              width: 0,
                              height: 0,
                              borderLeft: '5px solid transparent',
                              borderRight: '5px solid transparent',
                              borderBottom: '5px solid #0f172a',
                            }}
                          />
                        )}
                        {isReady && placement === 'right' && (
                          <div
                            style={{
                              position: 'absolute',
                              left: '-5px',
                              top: `${arrowOffset}px`,
                              transform: 'translateY(-50%)',
                              width: 0,
                              height: 0,
                              borderTop: '5px solid transparent',
                              borderBottom: '5px solid transparent',
                              borderRight: '5px solid #0f172a',
                            }}
                          />
                        )}
                        {isReady && placement === 'left' && (
                          <div
                            style={{
                              position: 'absolute',
                              right: '-5px',
                              top: `${arrowOffset}px`,
                              transform: 'translateY(-50%)',
                              width: 0,
                              height: 0,
                              borderTop: '5px solid transparent',
                              borderBottom: '5px solid transparent',
                              borderLeft: '5px solid #0f172a',
                            }}
                          />
                        )}
                      </div>
                    );
                  })(),
                  document.body
                )}

                {/* Empty State Helper when no surrounding companies match the current filter */}
                {positionedNodes.filter(n => n.id !== centerId).length === 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '24px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      color: '#64748b',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      zIndex: 10,
                    }}
                  >
                    <span>ℹ️</span>
                    <span>{t('network.noMatchingCompanies', 'No companies match the current filter.')}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR: Relationship Closeness Analytics (Default) OR Company Relationship Summary (Selected) */}
        <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {selectedNode ? (
            /* ========================================================================= */
            /* SELECTED COMPANY MODE                                                     */
            /* ========================================================================= */
            (() => {
              const isEligible = isClosenessEligibleGroup(selectedNode.group);
              const summary = closenessMap.get(selectedNode.id);
              const isAssessed = Boolean(isEligible && summary?.hasFinalizedAssessment && summary.score !== null);
              const groupColor = RELATIONSHIP_STYLES[selectedNode.group]?.color || '#475569';
              const badgeColors: Record<string, { bg: string; text: string; border: string }> = {
                A: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
                B: { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
                C: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
                D: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
              };
              const rankStyle = summary?.rank ? (badgeColors[summary.rank] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }) : null;
              const selectedUnreadState = selectedNode ? getUnreadState(selectedNode) : undefined;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Top Bar: Back Action & Close */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--cds-border-subtle-00)', paddingBottom: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedNode(null)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        padding: '2px 0',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#2563eb',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      ← {t('sidebar.backToOverview', 'Overview')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedNode(null)}
                      style={{
                        border: 'none',
                        background: '#f1f5f9',
                        color: '#64748b',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                      title={t('common.close', 'Close')}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Company Header */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                        {selectedNode.name}
                      </div>
                      {selectedUnreadState && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: '18px',
                            padding: '0 7px',
                            borderRadius: '999px',
                            background: '#C026D3',
                            color: '#ffffff',
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: '0.2px',
                            border: '1.5px solid #ffffff',
                            boxShadow: '0 2px 6px rgba(192, 38, 211, 0.22)',
                            flexShrink: 0,
                          }}
                          title={selectedUnreadState.type === 'INITIAL_ASSESSMENT' ? 'New assessment' : 'Updated assessment'}
                        >
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#F5D0FE', marginRight: '3.5px' }} />
                          {selectedUnreadState.type === 'INITIAL_ASSESSMENT' ? 'NEW' : 'UPDATED'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: '6px', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1, minWidth: '120px' }}>
                        {selectedNodeIndustries.length > 0 ? (
                          selectedNodeIndustries.map((ind, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '10.5px',
                                color: '#334155',
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                padding: '1.5px 6px',
                                lineHeight: '14px',
                              }}
                            >
                              {ind}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {selectedNode.industry || '—'}
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: groupColor,
                          background: `${groupColor}15`,
                          border: `1px solid ${groupColor}40`,
                          borderRadius: '12px',
                          padding: '2px 7px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {getGroupLabel(selectedNode.group)}
                      </span>
                    </div>
                  </div>

                  {/* Closeness Section */}
                  <div style={{ borderTop: '1px solid var(--cds-border-subtle-00)', paddingTop: '10px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.4px', marginBottom: '8px' }}>
                      {t('closeness.headerTitle', 'Relationship Closeness')}
                    </div>

                    {selectedUnreadState && (
                      <div
                        style={{
                          background: '#FDF4FF',
                          border: '1px solid #F5D0FE',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '11px',
                          color: '#86198F',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '8px',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C026D3', flexShrink: 0 }} />
                        <span>
                          {selectedUnreadState.type === 'INITIAL_ASSESSMENT'
                            ? t('closeness.newAssessmentUnread', 'New unviewed closeness assessment')
                            : t('closeness.updateAssessmentUnread', 'Unviewed assessment update')}
                        </span>
                      </div>
                    )}

                    {!isEligible ? (
                      /* Ineligible (Competitor / Potential Partner) */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          {t('closeness.notApplicable', 'Not applicable to this relationship type.')}
                        </div>
                        <button
                          type="button"
                          onClick={() => navigateToCompanyDetail(selectedNode.id, 'overview')}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '5px',
                            background: '#ffffff',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          {t('closeness.viewProfile', 'View Profile')} →
                        </button>
                      </div>
                    ) : isAssessed && summary ? (
                      /* Eligible & Finalized */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Score & Rank */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                            <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                              {summary.score}
                            </span>
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>/ 100</span>
                          </div>
                          {rankStyle && (
                            <div style={{ marginTop: '4px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: rankStyle.text,
                                  background: rankStyle.bg,
                                  border: `1px solid ${rankStyle.border}`,
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  display: 'inline-block',
                                }}
                              >
                                Rank {summary.rank}
                              </span>
                              {summary.rankDescription && (
                                <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px', fontWeight: 500 }}>
                                  {summary.rankDescription}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Enriched Recent Assessment Section (Only if recent assessment activity exists within 72h) */}
                        {summary.trendInfo && summary.latestAssessment && (
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.4px' }}>
                                {t('closeness.latestUpdate', 'Latest Update')}
                              </span>
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  color: summary.trendInfo.badgeColors.text,
                                  background: summary.trendInfo.badgeColors.bg,
                                  border: `1px solid ${summary.trendInfo.badgeColors.border}`,
                                  padding: '1.5px 6px',
                                  borderRadius: '4px',
                                  lineHeight: 1.2,
                                }}
                              >
                                {summary.trendInfo.nodeBadgeText}
                              </span>
                            </div>

                            {summary.trendInfo.trendType === 'NEWLY_SCORED' ? (
                              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>{t('closeness.assessment', 'Assessment:')}</span>
                                  <strong style={{ color: '#0f172a' }}>
                                    {summary.latestAssessment.formattedVersion || `V${summary.latestAssessment.versionNumber}`} · {summary.latestAssessment.score}/100 · Rank {summary.latestAssessment.rank}
                                  </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>{t('closeness.evaluator', 'Evaluator:')}</span>
                                  <span style={{ color: '#334155', fontWeight: 500 }}>
                                    {formatActorLabel(summary.latestAssessment.actorRole, summary.latestAssessment.assessmentType)}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>{t('closeness.time', 'Time:')}</span>
                                  <span style={{ color: '#334155', fontWeight: 500 }}>
                                    {formatDateTime(summary.latestAssessment.finalizedAt)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>{t('closeness.current', 'Current:')}</span>
                                  <strong style={{ color: '#0f172a' }}>
                                    {summary.latestAssessment.formattedVersion || `V${summary.latestAssessment.versionNumber}`} · {summary.latestAssessment.score}/100 · Rank {summary.latestAssessment.rank}
                                  </strong>
                                </div>
                                {summary.previousAssessment && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>{t('closeness.previous', 'Previous:')}</span>
                                    <span style={{ color: '#475569' }}>
                                      {summary.previousAssessment.formattedVersion || `V${summary.previousAssessment.versionNumber}`} · {summary.previousAssessment.score}/100 · Rank {summary.previousAssessment.rank}
                                    </span>
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>{t('closeness.change', 'Change:')}</span>
                                  <strong
                                    style={{
                                      color:
                                        summary.trendInfo.trendType === 'IMPROVING'
                                          ? '#047857'
                                          : summary.trendInfo.trendType === 'DECLINING'
                                          ? '#b91c1c'
                                          : '#475569',
                                    }}
                                  >
                                    {summary.trendInfo.deltaScore !== null && summary.trendInfo.deltaScore > 0
                                      ? `↑ +${summary.trendInfo.deltaScore}`
                                      : summary.trendInfo.deltaScore !== null && summary.trendInfo.deltaScore < 0
                                      ? `↓ ${summary.trendInfo.deltaScore}`
                                      : '→ 0'}{' '}
                                    {t('closeness.pts', 'pts')}
                                  </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>{t('closeness.trend', 'Trend:')}</span>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color:
                                        summary.trendInfo.trendType === 'IMPROVING'
                                          ? '#047857'
                                          : summary.trendInfo.trendType === 'DECLINING'
                                          ? '#b91c1c'
                                          : '#475569',
                                    }}
                                  >
                                    {summary.trendInfo.label}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>{t('closeness.evaluator', 'Evaluator:')}</span>
                                  <span style={{ color: '#334155', fontWeight: 500 }}>
                                    {formatActorLabel(summary.latestAssessment.actorRole, summary.latestAssessment.assessmentType)}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>{t('closeness.time', 'Time:')}</span>
                                  <span style={{ color: '#334155', fontWeight: 500 }}>
                                    {formatDateTime(summary.latestAssessment.finalizedAt)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 6 Criteria Grid */}
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            {t('closeness.criteriaBreakdown', 'Evaluation Criteria')}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '8px 10px',
                              fontSize: '11px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b' }}>Commercial</span>
                              <strong style={{ color: '#0f172a' }}>{summary.criteria?.commercial ?? '—'} / 5</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b' }}>Interaction</span>
                              <strong style={{ color: '#0f172a' }}>{summary.criteria?.interaction ?? '—'} / 5</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b' }}>Strategic</span>
                              <strong style={{ color: '#0f172a' }}>{summary.criteria?.strategic ?? '—'} / 5</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b' }}>Network</span>
                              <strong style={{ color: '#0f172a' }}>{summary.criteria?.network ?? '—'} / 5</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b' }}>Engagement</span>
                              <strong style={{ color: '#0f172a' }}>{summary.criteria?.engagement ?? '—'} / 5</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                              <span style={{ color: '#64748b' }}>Trust & Reliability</span>
                              <strong style={{ color: '#0f172a' }}>{summary.criteria?.trust ?? '—'} / 5</strong>
                            </div>
                          </div>
                        </div>

                        {/* Last Assessment Date */}
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          <span>{t('closeness.lastAssessment', 'Latest Assessment:')} </span>
                          <strong style={{ color: '#334155' }}>{formatDate(summary.completedAt) || '—'}</strong>
                        </div>

                        {/* CTAs (View Assessment & View Profile) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                          <button
                            type="button"
                            onClick={() => navigateToCompanyDetail(selectedNode.id, 'relationship-closeness')}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: '5px',
                              background: '#2563eb',
                              color: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 600,
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            {t('closeness.viewAssessment', 'View Assessment')} →
                          </button>
                          <button
                            type="button"
                            onClick={() => navigateToCompanyDetail(selectedNode.id, 'overview')}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '5px',
                              background: '#ffffff',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            {t('closeness.viewProfile', 'View Profile')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Eligible & Unassessed */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                            {t('closeness.notAssessedYet', 'No formal assessment yet.')}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {t('closeness.unassessedDesc', 'This company has not been assessed for relationship closeness.')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => navigateToCompanyDetail(selectedNode.id, 'relationship-closeness')}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: '5px',
                              background: '#2563eb',
                              color: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 600,
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            {t('closeness.viewAssessment', 'View Assessment')} →
                          </button>
                          <button
                            type="button"
                            onClick={() => navigateToCompanyDetail(selectedNode.id, 'overview')}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '5px',
                              background: '#ffffff',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            {t('closeness.viewProfile', 'View Profile')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            /* ========================================================================= */
            /* DEFAULT RELATIONSHIP CLOSENESS ANALYTICS MODE                             */
            /* ========================================================================= */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cds-text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('closeness.title', 'Relationship Closeness')}
                  {activeRelationshipGroup !== 'ALL' && (
                    <span style={{ marginLeft: '4px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'none' }}>
                      ({getGroupFilterLabel(activeRelationshipGroup)})
                    </span>
                  )}
                </span>
                {isClosenessLoading && (
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>{t('closeness.loading', 'Loading...')}</span>
                )}
              </div>

                {!closenessAnalytics.isEligible ? (
                  <div style={{ background: 'var(--cds-layer-01, #f8fafc)', border: '1px solid var(--cds-border-subtle-00, #e2e8f0)', borderRadius: '6px', padding: '12px', fontSize: '11.5px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.4 }}>
                    {t('closeness.notApplicableGroup', {
                      defaultValue: `Relationship Closeness is not applicable to the ${getGroupFilterLabel(activeRelationshipGroup)} group.`,
                      group: getGroupFilterLabel(activeRelationshipGroup)
                    })}
                  </div>
                ) : (
                  <>
                    {/* Rank Distribution (Interactive Filter) */}
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cds-text-primary, #475569)', marginBottom: '6px' }}>
                        {t('closeness.rankDistribution', 'Rank Distribution')}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {[
                          { key: 'ALL' as RankFilter, label: t('closeness.all', 'All'), count: closenessAnalytics.totalEligible },
                          { key: 'A' as RankFilter, label: 'Rank A', count: closenessAnalytics.rankA, color: '#10B981' },
                          { key: 'B' as RankFilter, label: 'Rank B', count: closenessAnalytics.rankB, color: '#2563EB' },
                          { key: 'C' as RankFilter, label: 'Rank C', count: closenessAnalytics.rankC, color: '#F59E0B' },
                          { key: 'D' as RankFilter, label: 'Rank D', count: closenessAnalytics.rankD, color: '#EF4444' },
                          { key: 'UNASSESSED' as RankFilter, label: t('closeness.unassessed', 'Not Evaluated'), count: closenessAnalytics.unassessed, color: '#94A3B8' },
                        ].map((r) => {
                          const isActive = rankFilter === r.key;
                          const isDisabled = r.count === 0 && r.key !== 'ALL';
                          return (
                            <div
                              key={r.key}
                              onClick={() => {
                                if (!isDisabled) {
                                  setRankFilter(r.key);
                                  setSelectedNode(null);
                                }
                              }}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '11px',
                                padding: '5px 8px',
                                borderRadius: '4px',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                opacity: isDisabled ? 0.45 : 1,
                                background: isActive ? (r.color ? `${r.color}15` : '#f1f5f9') : 'transparent',
                                borderLeft: isActive ? `3px solid ${r.color || '#2563eb'}` : '3px solid transparent',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive && !isDisabled) e.currentTarget.style.background = '#f8fafc';
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive && !isDisabled) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {r.color ? (
                                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                                ) : (
                                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'transparent', flexShrink: 0 }} />
                                )}
                                <span style={{ color: isActive ? '#0f172a' : (isDisabled ? '#94a3b8' : 'var(--cds-text-secondary)'), fontWeight: isActive ? 700 : 500 }}>
                                  {r.label}
                                </span>
                              </div>
                              <span style={{ fontWeight: isActive ? 800 : 600, color: isActive ? '#0f172a' : (isDisabled ? '#94a3b8' : 'var(--cds-text-primary)') }}>
                                {r.count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recent Assessment Updates (Strictly 72-hour window) */}
                    <div style={{ borderTop: '1px dashed var(--cds-border-subtle-00, #e2e8f0)', marginTop: '10px', paddingTop: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cds-text-primary, #475569)', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                          {t('closeness.recentUpdates', 'Recent Assessment Updates')}
                        </span>
                      </div>
                      {recentAssessmentUpdates.length === 0 ? (
                        <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary, #64748b)', fontStyle: 'italic', padding: '2px 0' }}>
                          {t('closeness.noRecentUpdates', 'No recent assessment updates.')}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {recentAssessmentUpdates.map(({ node, summary, trend }) => {
                            const unreadState = getUnreadState(node);
                            return (
                              <div
                                key={node.id}
                                onClick={() => setSelectedNode(node)}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '3px',
                                  background: unreadState ? '#FDF4FF' : '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderLeft: unreadState ? '3px solid #C026D3' : '1px solid #e2e8f0',
                                  borderRadius: '5px',
                                  padding: '6px 8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = '#cbd5e1';
                                  e.currentTarget.style.background = unreadState ? '#FAE8FF' : '#f1f5f9';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                  e.currentTarget.style.background = unreadState ? '#FDF4FF' : '#f8fafc';
                                }}
                                title={`${node.name} • ${trend.label}`}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                    {unreadState && (
                                      <span
                                        title={unreadState.type === 'INITIAL_ASSESSMENT' ? 'New assessment' : 'Updated assessment'}
                                        style={{
                                          fontSize: '8.5px',
                                          fontWeight: 700,
                                          letterSpacing: '0.2px',
                                          color: '#ffffff',
                                          background: '#C026D3',
                                          borderRadius: '999px',
                                          padding: '1px 6px',
                                          lineHeight: '12px',
                                          flexShrink: 0,
                                        }}
                                      >
                                        {unreadState.type === 'INITIAL_ASSESSMENT' ? 'NEW' : 'UPDATED'}
                                      </span>
                                    )}
                                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {node.name}
                                    </span>
                                  </div>
                                <span
                                  style={{
                                    fontSize: '8.5px',
                                    fontWeight: 800,
                                    color: trend.badgeColors.text,
                                    background: trend.badgeColors.bg,
                                    border: `1px solid ${trend.badgeColors.border}`,
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                  }}
                                >
                                  {trend.nodeBadgeText}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#64748b' }}>
                                <span>{summary.score !== null ? `${summary.score} / 100 · Rank ${summary.rank}` : '—'}</span>
                                <span>{formatDate(summary.latestAssessment?.finalizedAt)}</span>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
          )}
        </div>

      </div>

      {/* 4. Drawer Overlay on Node Click (Original 6 Tabs Improved to be Owner-Centric) */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedNode(null); }}
        title={selectedNode ? `${selectedNode.name}` : ''}
        subtitle={selectedNode ? `${selectedNodeIndustries.length > 0 ? selectedNodeIndustries.join(', ') : selectedNode.industry} • ${getGroupLabel(selectedNode.group).toUpperCase()}` : ''}
        width={840}
      >
        {selectedNode && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingBottom: '14px', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>

              <span style={{ fontSize: '12px', color: '#64748b' }}>{t('drawer.ecosystemStatus', 'Ecosystem Status:')}</span>
              <strong style={{ fontSize: '12px', color: '#0f172a', textTransform: 'uppercase' }}>
                {l1NodeIds.has(selectedNode.id) ? t('drawer.directConnection', 'Direct Connection') : t('drawer.secondDegreeConnection', 'Second-Degree Connection')}
              </strong>
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#64748b' }}>
                {selectedNode.connections} Connections
              </span>
            </div>

            <div style={{ flexShrink: 0 }}>
              <CompanyDetail companyId={selectedNode.id} isDrawerMode={true} setActivePage={setActivePage} />
            </div>
          </>
        )}
      </Drawer>

    </div>
  );
};
