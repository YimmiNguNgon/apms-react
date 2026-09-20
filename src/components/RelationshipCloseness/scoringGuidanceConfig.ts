import type { RelationshipAssessmentRank, RelationshipAssessmentResponse } from '../../types/relationshipAssessment';

export type V5CriterionKey =
  | 'commercial'
  | 'cooperation'
  | 'strategic'
  | 'network'
  | 'engagement'
  | 'trust';

export interface V5RuleLevel {
  score: number;
  label: string;
  description: string;
}

export interface V5CriterionConfig {
  key: V5CriterionKey;
  order: number;
  label: string;
  viLabel: string;
  question: string;
  maxScore: number;
  levels: V5RuleLevel[];
  note?: string;
}

export const V5_SCORING_GUIDANCE: Record<
  V5CriterionKey,
  {
    title: string;
    question: string;
    levels: V5RuleLevel[];
    note?: string;
  }
> = {
  commercial: {
    title: 'Commercial Relationship',
    question: 'Chúng ta thực sự làm ăn với doanh nghiệp này nhiều đến đâu?',
    levels: [
      { score: 5, label: 'RẤT MẠNH', description: 'Hợp tác lâu dài, thường xuyên và có giá trị thương mại đáng kể.' },
      { score: 4, label: 'MẠNH', description: 'Quan hệ thương mại ổn định, có giao dịch hoặc hợp đồng đáng kể.' },
      { score: 3, label: 'TRUNG BÌNH', description: 'Có quan hệ thương mại rõ ràng nhưng mức độ hợp tác chưa sâu.' },
      { score: 2, label: 'HẠN CHẾ', description: 'Ít giao dịch, quan hệ còn mới hoặc hoạt động không thường xuyên.' },
      { score: 1, label: 'RẤT THẤP', description: 'Rất ít hoạt động thương mại hoặc quan hệ gần như không phát sinh thêm.' },
      { score: 0, label: 'KHÔNG CÓ', description: 'Không có quan hệ thương mại đáng kể.' },
    ],
  },
  cooperation: {
    title: 'Interaction & Cooperation',
    question: 'Chúng ta phối hợp làm việc với nhau tốt đến đâu?',
    levels: [
      { score: 5, label: 'RẤT TỐT', description: 'Phối hợp chủ động, nhanh chóng và xử lý công việc rất hiệu quả.' },
      { score: 4, label: 'TỐT', description: 'Phối hợp thường xuyên, ổn định và phản hồi tốt.' },
      { score: 3, label: 'TRUNG BÌNH', description: 'Phối hợp nhìn chung ổn nhưng đôi lúc còn chậm hoặc chưa đồng bộ.' },
      { score: 2, label: 'HẠN CHẾ', description: 'Chỉ phối hợp khi cần và mức độ chủ động còn thấp.' },
      { score: 1, label: 'RẤT THẤP', description: 'Ít tương tác, phản hồi chậm hoặc thường xuyên khó phối hợp.' },
      { score: 0, label: 'KHÔNG CÓ', description: 'Gần như chưa có hoạt động phối hợp thực tế.' },
    ],
  },
  strategic: {
    title: 'Strategic Importance',
    question: 'Doanh nghiệp này quan trọng với tương lai của chúng ta đến đâu?',
    levels: [
      { score: 5, label: 'CỐT LÕI', description: 'Có vai trò trực tiếp và quan trọng trong chiến lược dài hạn.' },
      { score: 4, label: 'RẤT QUAN TRỌNG', description: 'Có vai trò lớn đối với tăng trưởng hoặc mở rộng thị trường.' },
      { score: 3, label: 'QUAN TRỌNG', description: 'Có giá trị chiến lược rõ ràng nhưng chưa phải mắt xích cốt lõi.' },
      { score: 2, label: 'CÓ TIỀM NĂNG', description: 'Có tiềm năng chiến lược nhưng vai trò hiện tại còn hạn chế.' },
      { score: 1, label: 'THẤP', description: 'Chủ yếu là quan hệ giao dịch thông thường.' },
      { score: 0, label: 'KHÔNG ĐÁNG KỂ', description: 'Không có vai trò chiến lược rõ ràng.' },
    ],
  },
  network: {
    title: 'Relationship Network',
    question: 'Chúng ta có quan hệ sâu với những người nào bên doanh nghiệp này?',
    levels: [
      { score: 5, label: 'RẤT SÂU', description: 'Có quan hệ tin cậy với người ra quyết định hoặc lãnh đạo chủ chốt.' },
      { score: 4, label: 'SÂU', description: 'Có quan hệ trực tiếp với Director/C-Level và nhiều đầu mối ổn định.' },
      { score: 3, label: 'TRUNG BÌNH', description: 'Có quan hệ ổn định với Manager/Department Head và đầu mối nghiệp vụ.' },
      { score: 2, label: 'HẠN CHẾ', description: 'Chủ yếu liên hệ với nhân sự vận hành hoặc cấp Staff.' },
      { score: 1, label: 'RẤT THẤP', description: 'Có rất ít đầu mối hoặc mối liên hệ không ổn định.' },
      { score: 0, label: 'KHÔNG CÓ', description: 'Không có đầu mối quan hệ đáng kể.' },
    ],
  },
  engagement: {
    title: 'Business Engagement',
    question: 'Hai bên có chủ động duy trì và nuôi dưỡng mối quan hệ không?',
    levels: [
      { score: 5, label: 'RẤT CAO', description: 'Hai bên thường xuyên và chủ động duy trì nhiều hoạt động kết nối.' },
      { score: 4, label: 'CAO', description: 'Có nhiều hoạt động gặp gỡ, sự kiện hoặc kết nối định kỳ.' },
      { score: 3, label: 'TRUNG BÌNH', description: 'Có hoạt động duy trì quan hệ nhưng chưa thường xuyên.' },
      { score: 2, label: 'HẠN CHẾ', description: 'Chỉ thỉnh thoảng có hoạt động kết nối.' },
      { score: 1, label: 'RẤT THẤP', description: 'Rất hiếm có hoạt động duy trì mối quan hệ.' },
      { score: 0, label: 'KHÔNG CÓ', description: 'Không có hoạt động engagement đáng kể.' },
    ],
    note: 'Không tính điểm dựa trên giá trị quà tặng bằng tiền.',
  },
  trust: {
    title: 'Trust & Reliability',
    question: 'Chúng ta có tin tưởng doanh nghiệp này không?',
    levels: [
      { score: 5, label: 'RẤT CAO', description: 'Rất đáng tin cậy, minh bạch và luôn giữ cam kết.' },
      { score: 4, label: 'CAO', description: 'Đáng tin cậy, có trách nhiệm và phần lớn giữ cam kết.' },
      { score: 3, label: 'TRUNG BÌNH', description: 'Nhìn chung đáng tin nhưng vẫn có một số vấn đề nhỏ.' },
      { score: 2, label: 'HẠN CHẾ', description: 'Có những vấn đề đáng kể về cam kết hoặc trách nhiệm.' },
      { score: 1, label: 'RẤT THẤP', description: 'Thường xuyên không giữ cam kết hoặc gây lo ngại về độ tin cậy.' },
      { score: 0, label: 'KHÔNG TIN CẬY', description: 'Có vấn đề nghiêm trọng làm mất nền tảng tin tưởng.' },
    ],
  },
};

export const V5_CRITERIA_LIST: V5CriterionConfig[] = [
  {
    key: 'commercial',
    order: 1,
    label: 'Commercial Relationship',
    viLabel: 'Quan hệ thương mại',
    question: V5_SCORING_GUIDANCE.commercial.question,
    maxScore: 5,
    levels: V5_SCORING_GUIDANCE.commercial.levels,
  },
  {
    key: 'cooperation',
    order: 2,
    label: 'Interaction & Cooperation',
    viLabel: 'Phối hợp & Hợp tác',
    question: V5_SCORING_GUIDANCE.cooperation.question,
    maxScore: 5,
    levels: V5_SCORING_GUIDANCE.cooperation.levels,
  },
  {
    key: 'strategic',
    order: 3,
    label: 'Strategic Importance',
    viLabel: 'Tầm quan trọng chiến lược',
    question: V5_SCORING_GUIDANCE.strategic.question,
    maxScore: 5,
    levels: V5_SCORING_GUIDANCE.strategic.levels,
  },
  {
    key: 'network',
    order: 4,
    label: 'Relationship Network',
    viLabel: 'Mạng lưới quan hệ',
    question: V5_SCORING_GUIDANCE.network.question,
    maxScore: 5,
    levels: V5_SCORING_GUIDANCE.network.levels,
  },
  {
    key: 'engagement',
    order: 5,
    label: 'Business Engagement',
    viLabel: 'Hoạt động gắn kết',
    question: V5_SCORING_GUIDANCE.engagement.question,
    maxScore: 5,
    levels: V5_SCORING_GUIDANCE.engagement.levels,
    note: V5_SCORING_GUIDANCE.engagement.note,
  },
  {
    key: 'trust',
    order: 6,
    label: 'Trust & Reliability',
    viLabel: 'Mức độ tin cậy',
    question: V5_SCORING_GUIDANCE.trust.question,
    maxScore: 5,
    levels: V5_SCORING_GUIDANCE.trust.levels,
  },
];

export const getRankMeta = (
  rank?: string | null
): { rank: RelationshipAssessmentRank; title: string; viTitle: string; color: string; bg: string; border: string } => {
  switch (rank) {
    case 'A':
      return {
        rank: 'A',
        title: 'Strategic / Very Close Relationship',
        viTitle: 'Quan hệ chiến lược rất thân thiết',
        color: '#15803d',
        bg: '#dcfce7',
        border: '#86efac',
      };
    case 'B':
      return {
        rank: 'B',
        title: 'Strong Relationship',
        viTitle: 'Mức độ thân thiết tốt',
        color: '#1d4ed8',
        bg: '#dbeafe',
        border: '#93c5fd',
      };
    case 'C':
      return {
        rank: 'C',
        title: 'Developing / Normal Relationship',
        viTitle: 'Quan hệ đang phát triển',
        color: '#b45309',
        bg: '#fef3c7',
        border: '#fde68a',
      };
    case 'D':
    default:
      return {
        rank: 'D',
        title: 'Limited Relationship',
        viTitle: 'Quan hệ hạn chế',
        color: '#475569',
        bg: '#f1f5f9',
        border: '#cbd5e1',
      };
  }
};

export const getRankFromNormalizedScore = (score: number): ReturnType<typeof getRankMeta> => {
  if (score >= 90.0) return getRankMeta('A');
  if (score >= 60.0) return getRankMeta('B');
  if (score >= 30.0) return getRankMeta('C');
  return getRankMeta('D');
};

export interface V5ScoreInput {
  commercial?: number | null;
  cooperation?: number | null;
  strategic?: number | null;
  network?: number | null;
  engagement?: number | null;
  qualitative?: number | null;
}

export interface V5CalculationResult {
  rawScore: number;
  normalizedScore: number;
  exactNormalizedScore: number;
  rank: RelationshipAssessmentRank;
  rankMeta: ReturnType<typeof getRankMeta>;
  isComplete: boolean;
}

export const calculateRelationshipClosenessV5 = (scores: V5ScoreInput): V5CalculationResult => {
  const { commercial, cooperation, strategic, network, engagement, qualitative } = scores;
  const isComplete =
    commercial !== null && commercial !== undefined &&
    cooperation !== null && cooperation !== undefined &&
    strategic !== null && strategic !== undefined &&
    network !== null && network !== undefined &&
    engagement !== null && engagement !== undefined &&
    qualitative !== null && qualitative !== undefined;

  const c = commercial ?? 0;
  const coop = cooperation ?? 0;
  const s = strategic ?? 0;
  const n = network ?? 0;
  const e = engagement ?? 0;
  const q = qualitative ?? 0;

  const rawScore = Math.max(0, Math.min(30, c + coop + s + n + e + q));
  const exactNormalizedScore = (rawScore * 100.0) / 30.0;
  const normalizedScore = Math.max(0, Math.min(100, Math.round(exactNormalizedScore)));
  const rank: RelationshipAssessmentRank =
    exactNormalizedScore >= 90.0 ? 'A' : exactNormalizedScore >= 60.0 ? 'B' : exactNormalizedScore >= 30.0 ? 'C' : 'D';
  const rankMeta = getRankMeta(rank);

  return {
    rawScore,
    normalizedScore,
    exactNormalizedScore,
    rank,
    rankMeta,
    isComplete,
  };
};

export const getOfficialScoresFromAssessment = (
  assessment?: RelationshipAssessmentResponse | null
): {
  commercial: number | null;
  cooperation: number | null;
  strategic: number | null;
  network: number | null;
  engagement: number | null;
  qualitative: number | null;
} => {
  if (!assessment) {
    return {
      commercial: null,
      cooperation: null,
      strategic: null,
      network: null,
      engagement: null,
      qualitative: null,
    };
  }

  const isOwnerAdj = assessment.isOwnerAdjustment || assessment.assessmentType === 'OWNER_ADJUSTMENT';
  const hasOwnerFinal = assessment.ownerFinalTotalScore !== null && assessment.ownerFinalTotalScore !== undefined;

  if (isOwnerAdj || hasOwnerFinal) {
    return {
      commercial: assessment.ownerCommercialScore ?? assessment.commercialAwardedScore ?? assessment.commercialScore ?? null,
      cooperation: assessment.ownerCooperationScore ?? assessment.cooperationScore ?? null,
      strategic: assessment.ownerStrategicScore ?? assessment.strategicScore ?? null,
      network: assessment.ownerRelationshipNetworkScore ?? assessment.relationshipNetworkScore ?? null,
      engagement: assessment.ownerEngagementScore ?? assessment.engagementScore ?? null,
      qualitative: assessment.ownerQualitativeScore ?? assessment.ownerTrustScore ?? assessment.qualitativeScore ?? assessment.trustScore ?? null,
    };
  }

  return {
    commercial: assessment.commercialAwardedScore ?? assessment.commercialScore ?? null,
    cooperation: assessment.cooperationScore ?? null,
    strategic: assessment.strategicScore ?? null,
    network: assessment.relationshipNetworkScore ?? null,
    engagement: assessment.engagementScore ?? null,
    qualitative: assessment.qualitativeScore ?? assessment.trustScore ?? null,
  };
};
