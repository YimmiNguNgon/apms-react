export type ScoreRole = 'PARTNER' | 'POTENTIAL_PARTNER' | 'COMPETITOR' | 'CUSTOMER' | 'SUPPLIER';

export interface ScoreCriterion {
  key: string;
  label: string;
  weight: number;
  inverse?: boolean;
  description: string;
}

export interface ScoreRoleDefinition {
  title: string;
  summary: string;
  outcomeLabel: string;
  criteria: ScoreCriterion[];
}

export const SCORE_RULES: Record<ScoreRole, ScoreRoleDefinition> = {
  PARTNER: {
    title: 'Partner health model',
    summary: 'Measures current partnership value, execution quality, and governance stability.',
    outcomeLabel: 'Higher score means a stronger, more durable partnership.',
    criteria: [
      { key: 'businessValueContribution', label: 'Business value contribution', weight: 25, description: 'Revenue, margin impact, contract value, and indirect business benefit.' },
      { key: 'strategicAlignment', label: 'Strategic alignment', weight: 21, description: 'Fit between joint goals, market direction, and long-term collaboration intent.' },
      { key: 'operationalPerformance', label: 'Operational performance', weight: 20, description: 'Execution against KPI, SLA, quality, and delivery commitments.' },
      { key: 'capabilityComplementarity', label: 'Capability complementarity', weight: 16, description: 'How well the company strengthens missing expertise, assets, or network reach.' },
      { key: 'relationshipQuality', label: 'Relationship quality', weight: 9, description: 'Trust, communication quality, and consistency of cooperation.' },
      { key: 'governanceCompliance', label: 'Governance and compliance', weight: 9, description: 'Legal compliance, security posture, and control of relationship risk.' },
    ],
  },
  POTENTIAL_PARTNER: {
    title: 'Potential partner fit model',
    summary: 'Measures future collaboration fit before a company is approved into a long-term partnership flow.',
    outcomeLabel: 'Higher score means the company is a stronger candidate for future collaboration.',
    criteria: [
      { key: 'strategicFit', label: 'Strategic fit', weight: 25, description: 'Alignment with target market, positioning, and business direction.' },
      { key: 'capabilityComplementarity', label: 'Capability complementarity', weight: 20, description: 'Potential to fill capability gaps or extend market reach.' },
      { key: 'trustReputation', label: 'Trust and reputation', weight: 13, description: 'Transparency, track record, and perceived credibility.' },
      { key: 'financialAttractiveness', label: 'Financial attractiveness', weight: 11, description: 'Expected commercial value, ROI, and economic upside.' },
      { key: 'collaborationPotential', label: 'Collaboration potential', weight: 20, description: 'Likelihood of productive joint work, shared programs, and cross-sell value.' },
      { key: 'partnershipRisk', label: 'Partnership risk', weight: 11, inverse: true, description: 'Legal, financial, operational, or dependency risks. Lower risk is better.' },
    ],
  },
  COMPETITOR: {
    title: 'Competitive threat model',
    summary: 'Measures how directly a company can threaten core market position and future growth.',
    outcomeLabel: 'Higher score means the competitor represents a stronger threat.',
    criteria: [
      { key: 'marketPosition', label: 'Market position', weight: 20, description: 'Brand presence, share, and influence in the target market.' },
      { key: 'productMarketOverlap', label: 'Product and market overlap', weight: 16, description: 'How closely the company overlaps in product, customer, and geography.' },
      { key: 'competitiveCapability', label: 'Competitive capability', weight: 20, description: 'Technology, capital, operations, distribution, and execution power.' },
      { key: 'strategicIntent', label: 'Strategic intent', weight: 11, description: 'Signals of aggressive moves such as launches, investment, or expansion.' },
      { key: 'growthMomentum', label: 'Growth momentum', weight: 9, description: 'Speed of growth in customer base, talent, funding, or market coverage.' },
      { key: 'competitiveThreat', label: 'Competitive threat', weight: 24, description: 'Direct risk of share loss, price pressure, or substitution.' },
    ],
  },
  CUSTOMER: {
    title: 'Customer value model',
    summary: 'Measures present revenue quality and future customer lifetime value.',
    outcomeLabel: 'Higher score means the customer is more valuable and more durable.',
    criteria: [
      { key: 'revenueProfitability', label: 'Revenue and profitability', weight: 22, description: 'Current revenue contribution, margin, and service cost profile.' },
      { key: 'purchaseBehavior', label: 'Purchase behavior', weight: 15, description: 'Recency, frequency, transaction value, and usage consistency.' },
      { key: 'customerLifetimeValue', label: 'Customer lifetime value', weight: 24, description: 'Expected total value across the relationship horizon.' },
      { key: 'retentionLoyalty', label: 'Retention and loyalty', weight: 18, description: 'Repeat purchase strength, renewal pattern, and relationship stickiness.' },
      { key: 'growthPotential', label: 'Growth potential', weight: 11, description: 'Upsell, cross-sell, and expansion opportunity.' },
      { key: 'paymentChurnRisk', label: 'Payment and churn risk', weight: 10, inverse: true, description: 'Late payment, non-payment, or churn signals. Lower risk is better.' },
    ],
  },
  SUPPLIER: {
    title: 'Supplier reliability model',
    summary: 'Measures delivery quality, responsiveness, and supply chain resilience.',
    outcomeLabel: 'Higher score means the supplier is more reliable and lower risk.',
    criteria: [
      { key: 'qualityPerformance', label: 'Quality performance', weight: 22, description: 'Defect rate, return rate, and quality consistency.' },
      { key: 'costCompetitiveness', label: 'Cost competitiveness', weight: 15, description: 'Commercial terms, unit cost, and total cost of ownership.' },
      { key: 'deliveryPerformance', label: 'Delivery performance', weight: 21, description: 'On-time delivery, order accuracy, and operational consistency.' },
      { key: 'capacityFlexibility', label: 'Capacity and flexibility', weight: 14, description: 'Ability to scale, flex, or handle demand variation.' },
      { key: 'serviceResponsiveness', label: 'Service and responsiveness', weight: 10, description: 'Support quality, incident response, and issue resolution pace.' },
      { key: 'supplyRiskCompliance', label: 'Supply risk and compliance', weight: 18, description: 'Continuity, dependency risk, and compliance posture.' },
    ],
  },
};

const ROLE_ALIASES: Array<{ match: RegExp; role: ScoreRole }> = [
  { match: /POTENTIAL_PARTNER/i, role: 'POTENTIAL_PARTNER' },
  { match: /COMPETITOR/i, role: 'COMPETITOR' },
  { match: /SUPPLIER/i, role: 'SUPPLIER' },
  { match: /CUSTOMER/i, role: 'CUSTOMER' },
  { match: /PARTNER/i, role: 'PARTNER' },
];

export const resolveScoreRole = (...values: Array<string | null | undefined>): ScoreRole | null => {
  for (const value of values) {
    if (!value) continue;
    const matched = ROLE_ALIASES.find((item) => item.match.test(value));
    if (matched) return matched.role;
  }

  return null;
};

