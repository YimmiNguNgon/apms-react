import React from 'react';
import { Award, CheckCircle2, FileText, Info, ShieldCheck, User } from 'lucide-react';
import type { RelationshipAssessmentResponse, CommercialEvidence } from '../../types/relationshipAssessment';
import styles from './RelationshipCloseness.module.css';
import { CriterionGuidancePopover } from './CriterionGuidancePopover';
import { getRankMeta } from './scoringGuidanceConfig';

interface RelationshipScoreBreakdownProps {
  assessment?: RelationshipAssessmentResponse | null;
  commercialEvidence?: CommercialEvidence | null;
  showDetails?: boolean;
}

const formatVnd = (val?: number | null) => {
  if (val == null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const formatDate = (val?: string | null) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB');
};

const formatDuration = (months?: number | null, fallbackDate?: string | null) => {
  if (fallbackDate) {
    const d = new Date(fallbackDate);
    if (!Number.isNaN(d.getTime())) {
      const now = new Date();
      const diffMonths = Math.max(
        0,
        (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
      );
      if (diffMonths < 12) return `${diffMonths} tháng`;
      const years = Math.floor(diffMonths / 12);
      return `${years} năm`;
    }
  }
  if (months !== undefined && months !== null) {
    if (months < 12) return `${months} tháng`;
    const years = Math.floor(months / 12);
    return `${years} năm`;
  }
  return '—';
};

const formatRecency = (recencyMonths?: number | null, fallbackDate?: string | null) => {
  if (fallbackDate) {
    const d = new Date(fallbackDate);
    if (!Number.isNaN(d.getTime())) {
      const now = new Date();
      const diffMonths = Math.max(
        0,
        (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
      );
      if (diffMonths === 0) return 'trong tháng này';
      if (diffMonths < 12) return `${diffMonths} tháng trước`;
      const years = Math.floor(diffMonths / 12);
      return `${years} năm trước`;
    }
  }
  if (recencyMonths !== undefined && recencyMonths !== null) {
    if (recencyMonths === 0) return 'trong tháng này';
    if (recencyMonths < 12) return `${recencyMonths} tháng trước`;
    return `${Math.floor(recencyMonths / 12)} năm trước`;
  }
  return '—';
};

export const RelationshipScoreBreakdown: React.FC<RelationshipScoreBreakdownProps> = ({
  assessment,
  commercialEvidence,
  showDetails = true,
}) => {
  if (!assessment && !commercialEvidence) return null;

  const isFinalized = assessment?.status === 'FINALIZED';
  const hasOwnerBreakdown = Boolean(
    isFinalized ||
    (assessment?.ownerFinalTotalScore !== null && assessment?.ownerFinalTotalScore !== undefined)
  );

  const policy = assessment?.scoringPolicyVersion || commercialEvidence?.scoringPolicyVersion;
  const isV5 = policy === 'RELATIONSHIP_CLOSENESS_V5';
  const isV4 = policy === 'RELATIONSHIP_CLOSENESS_V4';
  const isV3 = policy === 'RELATIONSHIP_CLOSENESS_V3';

  // Commercial evidence reference
  const contractCount = assessment?.approvedContractCount ?? commercialEvidence?.approvedContractCount ?? 0;
  const contractValueStatus = assessment?.contractValueStatus ?? commercialEvidence?.contractValueStatus ?? 'SCORABLE';
  const totalVnd = assessment?.totalContractValueVnd ?? commercialEvidence?.totalContractValueVnd;
  const firstCoop = assessment?.firstCooperationDate ?? commercialEvidence?.firstCooperationDate;
  const latestContract = assessment?.latestContractDate ?? commercialEvidence?.latestContractDate;
  const currencies = assessment?.contractCurrencies ?? commercialEvidence?.contractCurrencies;
  const durationMonths = assessment?.firstCooperationDate ? null : commercialEvidence?.relationshipDurationMonths;
  const recencyMonths = assessment?.latestContractDate ? null : commercialEvidence?.contractRecencyMonths;
  const commercialSuggestionStatus = assessment?.commercialSuggestionStatus ?? commercialEvidence?.commercialSuggestionStatus ?? 'COMPLETE';
  const commercialAvailablePoints = assessment?.commercialAvailablePoints ?? commercialEvidence?.commercialAvailablePoints ?? (isV5 ? 5 : isV3 ? 50 : 35);

  const suggestedComm =
    assessment?.commercialSuggestedScore ??
    commercialEvidence?.commercialScore ??
    assessment?.commercialScore ??
    0;

  const managerComm = assessment?.commercialAwardedScore ?? ((isV4 || isV5) ? 0 : (assessment?.commercialScore ?? suggestedComm));
  const ownerComm = assessment?.ownerCommercialScore ?? managerComm;

  const managerCoop = assessment?.cooperationScore ?? 0;
  const ownerCoop = assessment?.ownerCooperationScore ?? managerCoop;

  const managerStrat = assessment?.strategicScore ?? 0;
  const ownerStrat = assessment?.ownerStrategicScore ?? managerStrat;

  const managerNet = assessment?.relationshipNetworkScore ?? 0;
  const ownerNet = assessment?.ownerRelationshipNetworkScore ?? managerNet;

  const managerEng = assessment?.engagementScore ?? 0;
  const ownerEng = assessment?.ownerEngagementScore ?? managerEng;

  const managerQual = assessment?.qualitativeScore ?? 0;
  const ownerQual = assessment?.ownerQualitativeScore ?? managerQual;

  // Scores for V5 direct-manager assessment
  const commScore = assessment?.commercialAwardedScore ?? assessment?.ownerCommercialScore ?? assessment?.commercialScore;
  const coopScore = assessment?.cooperationScore ?? assessment?.ownerCooperationScore;
  const stratScore = assessment?.strategicScore ?? assessment?.ownerStrategicScore;
  const netScore = assessment?.relationshipNetworkScore ?? assessment?.ownerRelationshipNetworkScore;
  const engScore = assessment?.engagementScore ?? assessment?.ownerEngagementScore;
  const trustScore = assessment?.trustScore ?? assessment?.qualitativeScore ?? assessment?.ownerTrustScore ?? assessment?.ownerQualitativeScore;

  const finalTotalScore = assessment?.managerTotalScore ?? assessment?.ownerFinalTotalScore;
  const finalRank = assessment?.managerRank ?? assessment?.ownerFinalRank;
  const rankMeta = finalRank ? getRankMeta(finalRank) : null;

  const contractSegments: string[] = [];
  if (contractCount && contractCount > 0) {
    contractSegments.push(`${contractCount} hợp đồng`);
  }
  if (totalVnd != null && totalVnd > 0) {
    contractSegments.push(formatVnd(totalVnd));
  }
  const durationText = formatDuration(durationMonths, firstCoop);
  if (durationText && durationText !== '—') {
    contractSegments.push(`hợp tác ${durationText}`);
  }
  const recencyText = formatRecency(recencyMonths, latestContract);
  if (recencyText && recencyText !== '—') {
    contractSegments.push(`gần nhất ${recencyText}`);
  }
  const compactContractEvidence =
    contractSegments.length > 0 ? (
      <span>
        <strong>Tham khảo:</strong> {contractSegments.join(' · ')}
      </span>
    ) : undefined;
  const hasMeaningfulContractEvidence = contractSegments.length > 0;

  return (
    <div className={styles.breakdownSection}>
      {isV5 ? (
        <div className={styles.comparisonTableWrapper}>
          <div className={styles.comparisonHeaderBar}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Chi tiết điểm đánh giá
              </h4>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Điểm đánh giá chính thức của phiên bản này.
              </span>
            </div>
          </div>

          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Dimension</th>
                <th style={{ width: '20%', textAlign: 'center' }}>Final Score</th>
                <th style={{ width: '35%' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: Commercial Relationship */}
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>1. Commercial Relationship</span>
                    <CriterionGuidancePopover
                      criterionKey="commercial"
                      contractEvidenceSummary={compactContractEvidence}
                    />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                    Đánh giá có hướng dẫn (0–5)
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>
                  {commScore !== null && commScore !== undefined ? `${commScore} / 5` : '—'}
                </td>
                <td>
                  {assessment?.commercialEvidenceNote ? (
                    <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                      {assessment.commercialEvidenceNote}
                    </div>
                  ) : hasMeaningfulContractEvidence ? (
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                      {contractCount > 0 ? `${contractCount} contracts` : ''}
                      {contractCount > 0 && totalVnd != null && totalVnd > 0 ? ' · ' : ''}
                      {totalVnd != null && totalVnd > 0 ? `Value: ${formatVnd(totalVnd)}` : ''}
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>—</span>
                  )}
                </td>
              </tr>

              {/* Row 2: Interaction & Cooperation */}
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>2. Interaction & Cooperation</span>
                    <CriterionGuidancePopover criterionKey="cooperation" />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                    Đánh giá có hướng dẫn (0–5)
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>
                  {coopScore !== null && coopScore !== undefined ? `${coopScore} / 5` : '—'}
                </td>
                <td>
                  <div style={{ fontSize: '0.82rem', color: assessment?.cooperationEvidenceNote ? '#334155' : '#94a3b8' }}>
                    {assessment?.cooperationEvidenceNote || '—'}
                  </div>
                </td>
              </tr>

              {/* Row 3: Strategic Importance */}
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>3. Strategic Importance</span>
                    <CriterionGuidancePopover criterionKey="strategic" />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                    Đánh giá có hướng dẫn (0–5)
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>
                  {stratScore !== null && stratScore !== undefined ? `${stratScore} / 5` : '—'}
                </td>
                <td>
                  <div style={{ fontSize: '0.82rem', color: assessment?.strategicEvidenceNote ? '#334155' : '#94a3b8' }}>
                    {assessment?.strategicEvidenceNote || '—'}
                  </div>
                </td>
              </tr>

              {/* Row 4: Relationship Network */}
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>4. Relationship Network</span>
                    <CriterionGuidancePopover criterionKey="network" />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                    Đánh giá có hướng dẫn (0–5)
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>
                  {netScore !== null && netScore !== undefined ? `${netScore} / 5` : '—'}
                </td>
                <td>
                  <div style={{ fontSize: '0.82rem', color: (assessment?.ownerRelationshipNetworkNote || assessment?.relationshipNetworkNote) ? '#334155' : '#94a3b8' }}>
                    {assessment?.ownerRelationshipNetworkNote || assessment?.relationshipNetworkNote || '—'}
                  </div>
                </td>
              </tr>

              {/* Row 5: Business Engagement */}
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>5. Business Engagement</span>
                    <CriterionGuidancePopover criterionKey="engagement" />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                    Đánh giá có hướng dẫn (0–5)
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>
                  {engScore !== null && engScore !== undefined ? `${engScore} / 5` : '—'}
                </td>
                <td>
                  <div style={{ fontSize: '0.82rem', color: assessment?.engagementEvidenceNote ? '#334155' : '#94a3b8' }}>
                    {assessment?.engagementEvidenceNote || '—'}
                  </div>
                </td>
              </tr>

              {/* Row 6: Trust & Reliability */}
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>6. Trust & Reliability</span>
                    <CriterionGuidancePopover criterionKey="trust" />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                    Đánh giá có hướng dẫn (0–5)
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>
                  {trustScore !== null && trustScore !== undefined ? `${trustScore} / 5` : '—'}
                </td>
                <td>
                  <div style={{ fontSize: '0.82rem', color: (assessment?.trustEvidenceNote || assessment?.qualitativeEvidenceNote) ? '#334155' : '#94a3b8' }}>
                    {assessment?.trustEvidenceNote || assessment?.qualitativeEvidenceNote || '—'}
                  </div>
                </td>
              </tr>

              {/* TOTAL ROW */}
              <tr className={styles.comparisonTotalRow} style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                <td style={{ padding: '16px 14px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.96rem', letterSpacing: '0.02em' }}>
                    TOTAL SCORE
                  </div>
                </td>
                <td style={{ textAlign: 'center', padding: '16px 14px' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1.2 }}>
                    {finalTotalScore !== null && finalTotalScore !== undefined ? `${finalTotalScore} / 100` : '—'}
                  </div>
                  {rankMeta && (
                    <div style={{ marginTop: 6 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: rankMeta.color,
                          backgroundColor: rankMeta.bg,
                          border: `1px solid ${rankMeta.border}`,
                        }}
                      >
                        [{rankMeta.rank}] {rankMeta.title}
                      </span>
                    </div>
                  )}
                </td>
                {/* <td style={{ padding: '16px 14px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#15803d' }}>
                    Official Final Score
                  </span>
                </td> */}
              </tr>
            </tbody>
          </table>

          {/* Notes summary callouts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {assessment?.managerNote && (
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 700, color: '#334155', marginBottom: 2 }}>
                  Manager Assessment Note:
                </div>
                <div style={{ color: '#475569' }}>{assessment.managerNote}</div>
              </div>
            )}
            {assessment?.ownerNote && (
              <div className={styles.alertBannerBlue} style={{ fontSize: '0.82rem' }}>
                <Info size={16} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Owner Final Note:</strong> {assessment.ownerNote}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : hasOwnerBreakdown ? (
        <div className={styles.comparisonTableWrapper}>
          <div className={styles.comparisonHeaderBar}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Evaluation Breakdown: Manager Submission vs Owner Final
              </h4>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Both scoring assessments are preserved independently.
              </span>
            </div>
          </div>

          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th style={{ width: '32%' }}>Dimension</th>
                <th style={{ width: '18%', textAlign: 'center' }}>Manager Submitted</th>
                <th style={{ width: '18%', textAlign: 'center' }}>Owner Final</th>
                <th style={{ width: '32%' }}>Evidence & Notes</th>
              </tr>
            </thead>
            <tbody>
              {isV3 ? (
                <>
                  {/* V3: 1. Commercial Relationship */}
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>1. Commercial Relationship</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Suggested: {suggestedComm} pts
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                      {managerComm} pts
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                      {ownerComm} pts
                    </td>
                    <td>
                      <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                        {contractCount > 0
                          ? `${contractCount} contracts · Value: ${contractValueStatus === 'UNSCORABLE_NON_VND' ? `Non-VND (${currencies || 'Mixed'})` : formatVnd(totalVnd)}`
                          : '—'}
                      </div>
                      {commercialSuggestionStatus !== 'COMPLETE' && (
                        <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: 2 }}>
                          ⚠️ Suggestion Status: {commercialSuggestionStatus} ({commercialAvailablePoints}/50 pts scorable)
                        </div>
                      )}
                      {assessment?.commercialAdjustmentReason && (
                        <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: 2 }}>
                          <strong>Adjustment:</strong> {assessment.commercialAdjustmentReason}
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* V3: 2. Business Engagement */}
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>2. Business Engagement</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                      {managerEng} pts
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                      {ownerEng} pts
                    </td>
                    <td>
                      <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                        {assessment?.engagementEvidenceNote || '—'}
                      </div>
                    </td>
                  </tr>

                  {/* V3: 3. Relationship Network */}
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>3. Relationship Network</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                      {managerNet} pts
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                      {ownerNet} pts
                    </td>
                    <td>
                      <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                        {assessment?.ownerRelationshipNetworkNote || assessment?.relationshipNetworkNote || '—'}
                      </div>
                    </td>
                  </tr>
                </>
              ) : (
                <>
                  {/* V1/V2 Legacy: 1. Commercial */}
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>1. Commercial Relationship</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {isV4 ? 'Manual Guided (0–35)' : `Suggested: ${suggestedComm} pts`}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                      {managerComm} pts
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                      {ownerComm} pts
                    </td>
                    <td>
                      <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                        {contractCount > 0
                          ? `${contractCount} contracts · Value: ${contractValueStatus === 'UNSCORABLE_NON_VND' ? `Non-VND (${currencies || 'Mixed'})` : formatVnd(totalVnd)}`
                          : '—'}
                      </div>
                      {isV4 ? (
                        assessment?.commercialEvidenceNote && (
                          <div style={{ fontSize: '0.74rem', color: '#334155', marginTop: 2 }}>
                            <strong>Evidence Note:</strong> {assessment.commercialEvidenceNote}
                          </div>
                        )
                      ) : (
                        assessment?.commercialAdjustmentReason && (
                          <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: 2 }}>
                            <strong>Adjustment:</strong> {assessment.commercialAdjustmentReason}
                          </div>
                        )
                      )}
                    </td>
                  </tr>

                  {/* V1/V2: 2. Cooperation */}
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>2. Interaction & Cooperation</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                      {managerCoop} pts
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                      {ownerCoop} pts
                    </td>
                    <td>
                      <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                        {assessment?.cooperationEvidenceNote || '—'}
                      </div>
                    </td>
                  </tr>

                  {/* V1/V2: 3. Strategic */}
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>3. Strategic Relationship</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                      {managerStrat} pts
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                      {ownerStrat} pts
                    </td>
                    <td>
                      <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                        {assessment?.strategicEvidenceNote || '—'}
                      </div>
                    </td>
                  </tr>

                  {/* V1/V2: 4. Network */}
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>4. Relationship Network</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                      {managerNet} pts
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                      {ownerNet} pts
                    </td>
                    <td>
                      <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                        {assessment?.ownerRelationshipNetworkNote || assessment?.relationshipNetworkNote || '—'}
                      </div>
                    </td>
                  </tr>

                  {/* V1/V2: 5. Engagement */}
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>5. Business Engagement</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                      {managerEng} pts
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                      {ownerEng} pts
                    </td>
                    <td>
                      <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                        {assessment?.engagementEvidenceNote || '—'}
                      </div>
                    </td>
                  </tr>

                  {/* V1/V2: 6. Qualitative */}
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>6. Qualitative Assessment</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                      {managerQual} pts
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                      {ownerQual} pts
                    </td>
                    <td>
                      <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                        {assessment?.qualitativeEvidenceNote || '—'}
                      </div>
                    </td>
                  </tr>
                </>
              )}

              {/* TOTAL ROW */}
              <tr className={styles.comparisonTotalRow}>
                <td>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Total Score</div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>
                  <div>{assessment?.managerTotalScore ?? '—'} / 100 (Rank {assessment?.managerRank ?? '—'})</div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                  <div>{assessment?.ownerFinalTotalScore ?? '—'} / 100 (Rank {assessment?.ownerFinalRank ?? '—'})</div>
                </td>
                <td>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#15803d' }}>
                    Official Final Score
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Notes summary callouts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {assessment?.ownerAdjustmentReason && (
              <div className={styles.alertBannerOrange} style={{ fontSize: '0.82rem' }}>
                <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Owner Score Adjustment Reason:</strong> {assessment.ownerAdjustmentReason}
                </div>
              </div>
            )}

            {assessment?.ownerNote && (
              <div className={styles.alertBannerBlue} style={{ fontSize: '0.82rem' }}>
                <Info size={16} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Owner Final Note:</strong> {assessment.ownerNote}
                </div>
              </div>
            )}

            {assessment?.managerNote && (
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 700, color: '#334155', marginBottom: 2 }}>
                  Manager Assessment Note:
                </div>
                <div style={{ color: '#475569' }}>{assessment.managerNote}</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Regular single-view breakdown (Draft / Submitted / Preview) */
        <div className={styles.standardBreakdown}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, margin: '0 0 10px 0', color: '#1e293b' }}>
            Score Breakdown by Evaluation Dimension
          </h4>

          {isV3 ? (
            <>
              {/* V3: 1. Commercial Relationship */}
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownItemHeader}>
                  <span className={styles.criteriaName}>1. Commercial Relationship</span>
                  <span className={styles.criteriaPoints}>{managerComm} / 50 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, (managerComm / 50) * 100)}%` }}
                  />
                </div>

                {showDetails && (
                  <div className={styles.evidenceGrid}>
                    <div className={styles.evidenceItem}>
                      <span className={styles.evidenceLabel}>Total Contract Value</span>
                      <span className={styles.evidenceValue}>
                        {contractValueStatus === 'UNSCORABLE_NON_VND' ? (
                          <span style={{ color: '#b45309' }}>Non-VND ({currencies || 'Mixed'})</span>
                        ) : (
                          formatVnd(totalVnd)
                        )}
                      </span>
                    </div>
                    <div className={styles.evidenceItem}>
                      <span className={styles.evidenceLabel}>Approved Contracts</span>
                      <span className={styles.evidenceValue}>{contractCount} approved</span>
                    </div>
                    <div className={styles.evidenceItem}>
                      <span className={styles.evidenceLabel}>Relationship Duration</span>
                      <span className={styles.evidenceValue}>
                        {firstCoop ? `Since ${formatDate(firstCoop)}` : '—'}
                      </span>
                    </div>
                    <div className={styles.evidenceItem}>
                      <span className={styles.evidenceLabel}>Latest Contract</span>
                      <span className={styles.evidenceValue}>{formatDate(latestContract)}</span>
                    </div>
                  </div>
                )}

                {commercialSuggestionStatus !== 'COMPLETE' && (
                  <div style={{ fontSize: '0.78rem', color: '#b45309', marginTop: 6 }}>
                    ⚠️ <strong>Dữ liệu gợi ý:</strong> {commercialSuggestionStatus} ({commercialAvailablePoints}/50 điểm khả dụng)
                  </div>
                )}

                {assessment?.commercialAdjustmentReason && (
                  <div style={{ fontSize: '0.78rem', color: '#b45309', marginTop: 6 }}>
                    <strong>Commercial Adjustment:</strong> {assessment.commercialAdjustmentReason}
                  </div>
                )}
              </div>

              {/* V3: 2. Business Engagement */}
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownItemHeader}>
                  <span className={styles.criteriaName}>2. Business Engagement</span>
                  <span className={styles.criteriaPoints}>{managerEng} / 20 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, (managerEng / 20) * 100)}%` }}
                  />
                </div>
                {assessment?.engagementEvidenceNote && (
                  <div className={styles.evidenceNoteText}>
                    "{assessment.engagementEvidenceNote}"
                  </div>
                )}
              </div>

              {/* V3: 3. Relationship Network */}
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownItemHeader}>
                  <span className={styles.criteriaName}>3. Relationship Network</span>
                  <span className={styles.criteriaPoints}>{managerNet} / 30 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, (managerNet / 30) * 100)}%` }}
                  />
                </div>
                {assessment?.relationshipNetworkNote && (
                  <div className={styles.evidenceNoteText}>
                    "{assessment.relationshipNetworkNote}"
                  </div>
                )}
              </div>
            </>
          ) : isV5 ? (
            <>
                  {/* V5: 1. Commercial Relationship */}
                  <div className={styles.breakdownItem}>
                    <div className={styles.breakdownItemHeader}>
                      <span className={styles.criteriaName}>1. Commercial Relationship</span>
                  <span className={styles.criteriaPoints}>{assessment?.commercialAwardedScore ?? '—'} / 5 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, ((assessment?.commercialAwardedScore ?? 0) / 5) * 100)}%` }}
                  />
                </div>

                {showDetails && (
                  <div className={styles.evidenceGrid}>
                    <div className={styles.evidenceItem}>
                      <span className={styles.evidenceLabel}>Total Contract Value</span>
                      <span className={styles.evidenceValue}>
                        {contractValueStatus === 'UNSCORABLE_NON_VND' ? (
                          <span style={{ color: '#b45309' }}>Non-VND ({currencies || 'Mixed'})</span>
                        ) : (
                          formatVnd(totalVnd)
                        )}
                      </span>
                    </div>
                    <div className={styles.evidenceItem}>
                      <span className={styles.evidenceLabel}>Approved Contracts</span>
                      <span className={styles.evidenceValue}>{contractCount} approved</span>
                    </div>
                    <div className={styles.evidenceItem}>
                      <span className={styles.evidenceLabel}>Relationship Duration</span>
                      <span className={styles.evidenceValue}>Since {formatDate(firstCoop)}</span>
                    </div>
                    <div className={styles.evidenceItem}>
                      <span className={styles.evidenceLabel}>Latest Contract</span>
                      <span className={styles.evidenceValue}>{formatDate(latestContract)}</span>
                    </div>
                  </div>
                )}

                {assessment?.commercialEvidenceNote && (
                  <div className={styles.evidenceNoteText}>
                    "{assessment.commercialEvidenceNote}"
                  </div>
                )}
              </div>

              {/* V5: 2. Interaction & Cooperation */}
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownItemHeader}>
                  <span className={styles.criteriaName}>2. Interaction & Cooperation</span>
                  <span className={styles.criteriaPoints}>{assessment?.cooperationScore ?? '—'} / 5 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, ((assessment?.cooperationScore ?? 0) / 5) * 100)}%` }}
                  />
                </div>
                {assessment?.cooperationEvidenceNote && (
                  <div className={styles.evidenceNoteText}>
                    "{assessment.cooperationEvidenceNote}"
                  </div>
                )}
              </div>

              {/* V5: 3. Strategic Importance */}
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownItemHeader}>
                  <span className={styles.criteriaName}>3. Strategic Importance</span>
                  <span className={styles.criteriaPoints}>{assessment?.strategicScore ?? '—'} / 5 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, ((assessment?.strategicScore ?? 0) / 5) * 100)}%` }}
                  />
                </div>
                {assessment?.strategicEvidenceNote && (
                  <div className={styles.evidenceNoteText}>
                    "{assessment.strategicEvidenceNote}"
                  </div>
                )}
              </div>

              {/* V5: 4. Relationship Network */}
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownItemHeader}>
                  <span className={styles.criteriaName}>4. Relationship Network</span>
                  <span className={styles.criteriaPoints}>{assessment?.relationshipNetworkScore ?? '—'} / 5 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, ((assessment?.relationshipNetworkScore ?? 0) / 5) * 100)}%` }}
                  />
                </div>
                {assessment?.relationshipNetworkNote && (
                  <div className={styles.evidenceNoteText}>
                    "{assessment.relationshipNetworkNote}"
                  </div>
                )}
              </div>

              {/* V5: 5. Business Engagement */}
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownItemHeader}>
                  <span className={styles.criteriaName}>5. Business Engagement</span>
                  <span className={styles.criteriaPoints}>{assessment?.engagementScore ?? '—'} / 5 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, ((assessment?.engagementScore ?? 0) / 5) * 100)}%` }}
                  />
                </div>
                {assessment?.engagementEvidenceNote && (
                  <div className={styles.evidenceNoteText}>
                    "{assessment.engagementEvidenceNote}"
                  </div>
                )}
              </div>

              {/* V5: 6. Trust & Reliability */}
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownItemHeader}>
                  <span className={styles.criteriaName}>6. Trust & Reliability</span>
                  <span className={styles.criteriaPoints}>{(assessment?.trustScore ?? assessment?.qualitativeScore) ?? '—'} / 5 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, (((assessment?.trustScore ?? assessment?.qualitativeScore) ?? 0) / 5) * 100)}%` }}
                  />
                </div>
                {(assessment?.trustEvidenceNote || assessment?.qualitativeEvidenceNote) && (
                  <div className={styles.evidenceNoteText}>
                    "{assessment.trustEvidenceNote || assessment.qualitativeEvidenceNote}"
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Legacy V1/V2: 1. Commercial Relationship */}
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownItemHeader}>
                  <span className={styles.criteriaName}>1. Commercial Relationship</span>
                  <span className={styles.criteriaPoints}>{managerComm} / 35 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, (managerComm / 35) * 100)}%` }}
                  />
                </div>

                {showDetails && (
                  <div className={styles.evidenceGrid}>
                    <div className={styles.evidenceItem}>
                      <span className={styles.evidenceLabel}>Total Contract Value</span>
                      <span className={styles.evidenceValue}>
                        {contractValueStatus === 'UNSCORABLE_NON_VND' ? (
                          <span style={{ color: '#b45309' }}>Non-VND ({currencies || 'Mixed'})</span>
                        ) : (
                          formatVnd(totalVnd)
                        )}
                      </span>
                    </div>
                    <div className={styles.evidenceItem}>
                      <span className={styles.evidenceLabel}>Approved Contracts</span>
                      <span className={styles.evidenceValue}>{contractCount} approved</span>
                    </div>
                    <div className={styles.evidenceItem}>
                      <span className={styles.evidenceLabel}>Relationship Duration</span>
                      <span className={styles.evidenceValue}>Since {formatDate(firstCoop)}</span>
                    </div>
                    <div className={styles.evidenceItem}>
                      <span className={styles.evidenceLabel}>Latest Contract</span>
                      <span className={styles.evidenceValue}>{formatDate(latestContract)}</span>
                    </div>
                  </div>
                )}

                {isV4 ? (
                  assessment?.commercialEvidenceNote && (
                    <div className={styles.evidenceNoteText}>
                      "{assessment.commercialEvidenceNote}"
                    </div>
                  )
                ) : (
                  assessment?.commercialAdjustmentReason && (
                    <div style={{ fontSize: '0.78rem', color: '#b45309', marginTop: 6 }}>
                      <strong>Commercial Adjustment:</strong> {assessment.commercialAdjustmentReason}
                    </div>
                  )
                )}
              </div>

              {/* Legacy V1/V2: 2. Interaction & Cooperation */}
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownItemHeader}>
                  <span className={styles.criteriaName}>2. Interaction & Cooperation</span>
                  <span className={styles.criteriaPoints}>{managerCoop} / 25 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, (managerCoop / 25) * 100)}%` }}
                  />
                </div>
                {assessment?.cooperationEvidenceNote && (
                  <div className={styles.evidenceNoteText}>
                    "{assessment.cooperationEvidenceNote}"
                  </div>
                )}
              </div>

              {/* Legacy V1/V2: 3. Strategic Relationship */}
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownItemHeader}>
                  <span className={styles.criteriaName}>3. Strategic Relationship</span>
                  <span className={styles.criteriaPoints}>{managerStrat} / 20 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, (managerStrat / 20) * 100)}%` }}
                  />
                </div>
                {assessment?.strategicEvidenceNote && (
                  <div className={styles.evidenceNoteText}>
                    "{assessment.strategicEvidenceNote}"
                  </div>
                )}
              </div>

              {/* Legacy V1/V2: 4. Relationship Network */}
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownItemHeader}>
                  <span className={styles.criteriaName}>4. Relationship Network</span>
                  <span className={styles.criteriaPoints}>{managerNet} / 10 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, (managerNet / 10) * 100)}%` }}
                  />
                </div>
                {assessment?.relationshipNetworkNote && (
                  <div className={styles.evidenceNoteText}>
                    "{assessment.relationshipNetworkNote}"
                  </div>
                )}
              </div>

              {/* Legacy V1/V2: 5. Business Engagement */}
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownItemHeader}>
                  <span className={styles.criteriaName}>5. Business Engagement</span>
                  <span className={styles.criteriaPoints}>{managerEng} / 5 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, (managerEng / 5) * 100)}%` }}
                  />
                </div>
                {assessment?.engagementEvidenceNote && (
                  <div className={styles.evidenceNoteText}>
                    "{assessment.engagementEvidenceNote}"
                  </div>
                )}
              </div>

              {/* Legacy V1/V2: 6. Qualitative Assessment */}
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownItemHeader}>
                  <span className={styles.criteriaName}>6. Qualitative Assessment</span>
                  <span className={styles.criteriaPoints}>{managerQual} / 5 pts</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, (managerQual / 5) * 100)}%` }}
                  />
                </div>
                {assessment?.qualitativeEvidenceNote && (
                  <div className={styles.evidenceNoteText}>
                    "{assessment.qualitativeEvidenceNote}"
                  </div>
                )}
              </div>
            </>
          )}

          {/* Manager Overall Note */}
          {assessment?.managerNote && (
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: 2 }}>
                Overall Assessment Note:
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                {assessment.managerNote}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
