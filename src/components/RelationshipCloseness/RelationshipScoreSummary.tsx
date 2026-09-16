import React from 'react';
import { Award, Clock, Info, ShieldCheck, User } from 'lucide-react';
import type { RelationshipAssessmentResponse, RelationshipAssessmentRank } from '../../types/relationshipAssessment';
import styles from './RelationshipCloseness.module.css';
import { getRankMeta } from './scoringGuidanceConfig';

interface RelationshipScoreSummaryProps {
  assessment: RelationshipAssessmentResponse;
  liveSubtotal?: number | null;
  liveAssessedCount?: number | null;
  liveRawSubtotal?: number | null;
  liveExactNormalizedScore?: number | null;
  headerActions?: React.ReactNode;
}

const formatDateTime = (val?: string | null) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const RelationshipScoreSummary: React.FC<RelationshipScoreSummaryProps> = ({
  assessment,
  liveSubtotal,
  liveAssessedCount,
  liveRawSubtotal,
  liveExactNormalizedScore,
  headerActions,
}) => {
  const isFinalized = assessment.status === 'FINALIZED';
  const isSubmitted = assessment.status === 'SUBMITTED';
  const isChangesRequested = assessment.status === 'CHANGES_REQUESTED';
  const isDraft = assessment.status === 'DRAFT';

  const isV5 = assessment.scoringPolicyVersion === 'RELATIONSHIP_CLOSENESS_V5';
  const isV3 = assessment.scoringPolicyVersion === 'RELATIONSHIP_CLOSENESS_V3';
  const totalCriteria = assessment.totalCriteriaCount ?? (isV3 ? 3 : 6);

  // Check criteria completion
  const assessedCount = liveAssessedCount !== undefined && liveAssessedCount !== null
    ? liveAssessedCount
    : assessment.completedCriteriaCount ?? (
        isV3 ? (
          (assessment.commercialAwardedScore !== null && assessment.commercialAwardedScore !== undefined ? 1 : 0) +
          (assessment.engagementScore !== null && assessment.engagementScore !== undefined ? 1 : 0) +
          (assessment.relationshipNetworkScore !== null && assessment.relationshipNetworkScore !== undefined ? 1 : 0)
        ) : (
          (assessment.commercialAwardedScore !== null && assessment.commercialAwardedScore !== undefined ? 1 : 0) +
          (assessment.cooperationScore !== null && assessment.cooperationScore !== undefined ? 1 : 0) +
          (assessment.strategicScore !== null && assessment.strategicScore !== undefined ? 1 : 0) +
          (assessment.relationshipNetworkScore !== null && assessment.relationshipNetworkScore !== undefined ? 1 : 0) +
          (assessment.engagementScore !== null && assessment.engagementScore !== undefined ? 1 : 0) +
          ((assessment.trustScore ?? assessment.qualitativeScore) !== null && (assessment.trustScore ?? assessment.qualitativeScore) !== undefined ? 1 : 0)
        )
      );

  const isComplete = isFinalized || isSubmitted || assessedCount === totalCriteria;

  // Determine displayed score and raw details
  let currentScore: number | null | undefined = null;
  let rawScore: number | null | undefined = null;
  let exactNormalizedScore: number | null | undefined = null;
  let displayRank: RelationshipAssessmentRank | null = null;

  if (isV5) {
    if (isFinalized) {
      currentScore = assessment.ownerFinalTotalScore ?? assessment.managerTotalScore;
      rawScore = assessment.ownerRawScorableScore ?? assessment.managerRawScorableScore;
      exactNormalizedScore = assessment.ownerNormalizedScore ?? assessment.managerNormalizedScore;
      displayRank = (assessment.ownerFinalRank || assessment.managerRank || 'D') as RelationshipAssessmentRank;
    } else if (isSubmitted) {
      currentScore = assessment.managerTotalScore;
      rawScore = assessment.managerRawScorableScore;
      exactNormalizedScore = assessment.managerNormalizedScore;
      displayRank = (assessment.managerRank || 'D') as RelationshipAssessmentRank;
    } else {
      rawScore = liveRawSubtotal !== undefined && liveRawSubtotal !== null
        ? liveRawSubtotal
        : assessment.managerRawScorableScore ?? assessment.draftSubtotalScore;
      if (isComplete) {
        const exactNorm = liveExactNormalizedScore !== undefined && liveExactNormalizedScore !== null
          ? liveExactNormalizedScore
          : rawScore !== null && rawScore !== undefined
          ? (rawScore * 100.0) / 30.0
          : null;
        exactNormalizedScore = exactNorm;
        currentScore = exactNorm !== null && exactNorm !== undefined ? Math.min(100, Math.round(exactNorm)) : liveSubtotal;
        if (exactNorm !== null && exactNorm !== undefined) {
          if (exactNorm >= 90.0) displayRank = 'A';
          else if (exactNorm >= 60.0) displayRank = 'B';
          else if (exactNorm >= 30.0) displayRank = 'C';
          else displayRank = 'D';
        }
      } else {
        currentScore = null;
        rawScore = null;
        exactNormalizedScore = null;
        displayRank = null;
      }
    }
  } else {
    currentScore = isFinalized
      ? assessment.ownerFinalTotalScore
      : isSubmitted
      ? assessment.managerTotalScore
      : liveSubtotal !== undefined && liveSubtotal !== null
      ? liveSubtotal
      : assessment.draftSubtotalScore ?? assessment.managerTotalScore;

    if (isFinalized) {
      displayRank = assessment.ownerFinalRank || 'D';
    } else if (isSubmitted) {
      displayRank = assessment.managerRank || 'D';
    } else if (isComplete && currentScore !== null && currentScore !== undefined) {
      if (currentScore >= 90) displayRank = 'A';
      else if (currentScore >= 60) displayRank = 'B';
      else if (currentScore >= 30) displayRank = 'C';
      else displayRank = 'D';
    }
  }

  const rankMeta = displayRank ? getRankMeta(displayRank) : null;

  const isDirectManagerFinalized = isFinalized && isV5 && !assessment.ownerAccountId;
  const authorRole = isFinalized ? (isDirectManagerFinalized ? 'Manager' : (assessment.ownerAccountId ? 'Owner' : 'Manager')) : 'Manager';
  const timestamp = isFinalized
    ? assessment.finalizedAt
    : isSubmitted
    ? assessment.managerSubmittedAt
    : assessment.updatedAt || assessment.createdAt;

  const maxBase = 100;
  const scoreForScale = currentScore !== null && currentScore !== undefined
    ? Math.min(maxBase, Math.max(0, currentScore))
    : 0;

  const isLeftEdge = scoreForScale <= 4;
  const isRightEdge = scoreForScale >= 96;
  const markerTransform = isLeftEdge
    ? 'translateX(0%)'
    : isRightEdge
    ? 'translateX(-100%)'
    : 'translateX(-50%)';
  const arrowMargin = isLeftEdge
    ? '0 0 0 10px'
    : isRightEdge
    ? '0 10px 0 auto'
    : '0 auto';
  const pinColor = rankMeta?.color || '#0f172a';

  // Circumference for circular progress indicator (r = 58 => 116px width/height)
  const radius = 58;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = currentScore !== null && currentScore !== undefined
    ? circumference - (scoreForScale / maxBase) * circumference
    : circumference;

  const statusLabel = isComplete
    ? isFinalized
      ? 'HOÀN TẤT'
      : isSubmitted
      ? 'Submitted for Review'
      : isChangesRequested
      ? 'Changes Requested'
      : 'Draft Assessment'
    : 'Assessment in progress';

  return (
    <div className={styles.topSummaryCard}>
      <div className={styles.topSummaryTitleRow}>
        <div className={styles.topSummaryTitleGroup}>
          <Award size={20} style={{ color: '#2563eb' }} />
          <h2 className={styles.topSummaryTitle}>Tổng quan đánh giá mức độ thân thiết</h2>
        </div>
        {headerActions && (
          <div className={styles.summaryHeaderActions}>
            {headerActions}
          </div>
        )}
      </div>

      <div className={styles.topSummaryFourPartGrid}>
        {/* PART A: Score Circle */}
        <div className={styles.partScoreCircle}>
          <div className={styles.circularProgressWrap}>
            <svg height={radius * 2} width={radius * 2} className={styles.circularSvg}>
              <circle
                stroke="#e2e8f0"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke={
                  displayRank === 'A'
                    ? '#16a34a'
                    : displayRank === 'B'
                    ? '#2563eb'
                    : displayRank === 'C'
                    ? '#d97706'
                    : '#64748b'
                }
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className={styles.circularFillCircle}
              />
            </svg>
            <div className={styles.circularScoreText}>
              <span className={styles.circularBigNum}>
                {currentScore !== null && currentScore !== undefined ? currentScore : '—'}
              </span>
              <span className={styles.circularMax}>
                / 100
              </span>
            </div>
          </div>
        </div>

        {/* PART B: Rank */}
        <div className={styles.partRank}>
          {isComplete && displayRank && rankMeta ? (
            <div className={styles.rankContainer}>
              <div
                className={styles.rankBadgeLarge}
                style={{ background: rankMeta.bg, color: rankMeta.color }}
              >
                {displayRank}
              </div>
              <div className={styles.rankTitleGroup}>
                <div className={styles.rankMainTitle} style={{ color: rankMeta.color }}>
                  Rank {displayRank} — {rankMeta.title}
                </div>
                <div className={styles.rankViHelper}>{rankMeta.viTitle}</div>
              </div>
            </div>
          ) : (
            <div className={styles.rankIncompleteContainer}>
              <div className={styles.incompleteDraftBadge}>
                <Clock size={16} />
                <span>Assessment in progress</span>
              </div>
              <div className={styles.incompleteCriteriaCount}>
                <strong>{assessedCount} / {totalCriteria}</strong> criteria completed
              </div>
              <div className={styles.incompleteNoticeText}>
                Rank sẽ được tính toán khi hoàn tất cả {totalCriteria} tiêu chí.
              </div>
            </div>
          )}
        </div>

        {/* PART C: Metadata */}
        <div className={styles.partMetadata}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Status:</span>
            <span
              className={`${styles.statusPill} ${
                isFinalized
                  ? styles.statusFinalized
                  : isSubmitted
                  ? styles.statusSubmitted
                  : isChangesRequested
                  ? styles.statusChangesRequested
                  : styles.statusDraft
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Assessment Version:</span>
            <span className={styles.metaVersionVal}>V{assessment.versionNumber}</span>
          </div>

          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>{isFinalized ? 'Completed by:' : 'Updated by:'}</span>
            <span className={styles.metaText}>{authorRole}</span>
          </div>

          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>{isFinalized ? 'Completed at:' : 'Updated at:'}</span>
            <span className={styles.metaText}>{formatDateTime(timestamp)}</span>
          </div>
        </div>
      </div>

      {/* PART D: Horizontal Score Scale (0-30-60-90-100 with segmented rank zones and dynamic marker) */}
      <div className={styles.partScoreScaleContainer}>
        <div className={styles.scaleTrackWrap}>
          {/* Visual Rank Zones Bar */}
          <div className={styles.scaleZonesTrack}>
            <div
              className={`${styles.zoneSegment} ${displayRank === 'D' ? styles.zoneDActive : styles.zoneD}`}
              style={{ width: '30%' }}
              title="Rank D: 0–29"
            >
              <span>Rank D</span>
            </div>
            <div
              className={`${styles.zoneSegment} ${displayRank === 'C' ? styles.zoneCActive : styles.zoneC}`}
              style={{ width: '30%' }}
              title="Rank C: 30–59"
            >
              <span>Rank C</span>
            </div>
            <div
              className={`${styles.zoneSegment} ${displayRank === 'B' ? styles.zoneBActive : styles.zoneB}`}
              style={{ width: '30%' }}
              title="Rank B: 60–89"
            >
              <span>Rank B</span>
            </div>
            <div
              className={`${styles.zoneSegment} ${displayRank === 'A' ? styles.zoneAActive : styles.zoneA}`}
              style={{ width: '10%' }}
              title="Rank A: 90–100"
            >
              <span>Rank A</span>
            </div>
          </div>

          {/* Milestone markers at 0%, 30%, 60%, 90%, 100% */}
          <div className={styles.milestoneTick} style={{ left: '0%' }} />
          <div className={styles.milestoneTick} style={{ left: '30%' }} />
          <div className={styles.milestoneTick} style={{ left: '60%' }} />
          <div className={styles.milestoneTick} style={{ left: '90%' }} />
          <div className={styles.milestoneTick} style={{ left: '100%' }} />

          {/* Dynamic Score Marker / Pin */}
          {currentScore !== null && currentScore !== undefined && (
            <div
              className={styles.dynamicScorePin}
              style={{
                left: `${scoreForScale}%`,
                transform: markerTransform,
              }}
            >
              <div
                className={styles.pinBubble}
                style={{ background: pinColor }}
              >
                {currentScore}
              </div>
              <div
                className={styles.pinArrow}
                style={{
                  borderTop: `5px solid ${pinColor}`,
                  margin: arrowMargin,
                }}
              />
            </div>
          )}
        </div>

        {/* Milestone numerical labels */}
        <div className={styles.scaleMilestonesRow}>
          <span style={{ left: '0%', transform: 'none', position: 'absolute' }}>0</span>
          <span style={{ left: '30%', transform: 'translateX(-50%)', position: 'absolute' }}>30</span>
          <span style={{ left: '60%', transform: 'translateX(-50%)', position: 'absolute' }}>60</span>
          <span style={{ left: '90%', transform: 'translateX(-50%)', position: 'absolute' }}>90</span>
          <span style={{ right: '0%', transform: 'none', position: 'absolute' }}>100</span>
        </div>

        {/* Rank Zones labels below milestones */}
        <div className={styles.rankZonesLabelsRow}>
          <div style={{ width: '30%', textAlign: 'center' }}>
            {displayRank === 'D' && rankMeta ? (
              <span
                className={styles.zoneLabelBadgeActive}
                style={{ color: rankMeta.color, background: rankMeta.bg, border: `1px solid ${rankMeta.border}` }}
              >
                Rank D (0–29)
              </span>
            ) : (
              <span className={styles.zoneLabelMuted}>
                Rank D (0–29)
              </span>
            )}
          </div>
          <div style={{ width: '30%', textAlign: 'center' }}>
            {displayRank === 'C' && rankMeta ? (
              <span
                className={styles.zoneLabelBadgeActive}
                style={{ color: rankMeta.color, background: rankMeta.bg, border: `1px solid ${rankMeta.border}` }}
              >
                Rank C (30–59)
              </span>
            ) : (
              <span className={styles.zoneLabelMuted}>
                Rank C (30–59)
              </span>
            )}
          </div>
          <div style={{ width: '30%', textAlign: 'center' }}>
            {displayRank === 'B' && rankMeta ? (
              <span
                className={styles.zoneLabelBadgeActive}
                style={{ color: rankMeta.color, background: rankMeta.bg, border: `1px solid ${rankMeta.border}` }}
              >
                Rank B (60–89)
              </span>
            ) : (
              <span className={styles.zoneLabelMuted}>
                Rank B (60–89)
              </span>
            )}
          </div>
          <div style={{ width: '10%', textAlign: 'center' }}>
            {displayRank === 'A' && rankMeta ? (
              <span
                className={styles.zoneLabelBadgeActive}
                style={{ color: rankMeta.color, background: rankMeta.bg, border: `1px solid ${rankMeta.border}` }}
              >
                Rank A (90–100)
              </span>
            ) : (
              <span className={styles.zoneLabelMuted}>
                Rank A (90–100)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
