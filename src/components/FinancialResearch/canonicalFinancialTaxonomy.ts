export interface CanonicalMetricDefinition {
  code: string;
  label: string;
  statementType: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'BANKING' | 'RATIOS';
  subCategory?: 'CURRENT_ASSETS' | 'NON_CURRENT_ASSETS' | 'TOTAL_ASSETS' | 'LIABILITIES' | 'EQUITY' | null;
  defaultUnit: string;
  displayOrder: number;
  common: boolean;
  aliases: string[];
}

export const CANONICAL_FINANCIAL_TAXONOMY: CanonicalMetricDefinition[] = [
  // ==========================================
  // 1. BALANCE SHEET (BẢNG CÂN ĐỐI KẾ TOÁN) - 29 metrics
  // ==========================================

  // 1.1 Current Assets (Tài sản ngắn hạn) - 7 metrics
  {
    code: 'CURRENT_ASSETS',
    label: 'Tài sản ngắn hạn',
    statementType: 'BALANCE_SHEET',
    subCategory: 'CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 1,
    common: true,
    aliases: ['Tài sản ngắn hạn', 'Tổng tài sản ngắn hạn'],
  },
  {
    code: 'CASH_AND_CASH_EQUIVALENTS',
    label: 'Tiền và tương đương tiền',
    statementType: 'BALANCE_SHEET',
    subCategory: 'CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 2,
    common: true,
    aliases: ['Tiền và tương đương tiền', 'Tiền và các khoản tương đương tiền', 'Tiền mặt và tiền gửi'],
  },
  {
    code: 'SHORT_TERM_FINANCIAL_INVESTMENTS',
    label: 'Đầu tư tài chính ngắn hạn',
    statementType: 'BALANCE_SHEET',
    subCategory: 'CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 3,
    common: false,
    aliases: ['Đầu tư tài chính ngắn hạn', 'Các khoản đầu tư tài chính ngắn hạn'],
  },
  {
    code: 'SHORT_TERM_RECEIVABLES',
    label: 'Các khoản phải thu ngắn hạn',
    statementType: 'BALANCE_SHEET',
    subCategory: 'CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 4,
    common: true,
    aliases: ['Các khoản phải thu ngắn hạn', 'Phải thu ngắn hạn'],
  },
  {
    code: 'TRADE_RECEIVABLES',
    label: 'Phải thu ngắn hạn của khách hàng',
    statementType: 'BALANCE_SHEET',
    subCategory: 'CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 5,
    common: false,
    aliases: ['Phải thu ngắn hạn của khách hàng', 'Phải thu của khách hàng', 'Phải thu khách hàng ngắn hạn'],
  },
  {
    code: 'INVENTORIES',
    label: 'Hàng tồn kho',
    statementType: 'BALANCE_SHEET',
    subCategory: 'CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 6,
    common: true,
    aliases: ['Hàng tồn kho', 'Hàng tồn kho ròng'],
  },
  {
    code: 'OTHER_CURRENT_ASSETS',
    label: 'Tài sản ngắn hạn khác',
    statementType: 'BALANCE_SHEET',
    subCategory: 'CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 7,
    common: false,
    aliases: ['Tài sản ngắn hạn khác', 'Các tài sản ngắn hạn khác'],
  },

  // 1.2 Non-Current Assets (Tài sản dài hạn) - 8 metrics
  {
    code: 'NON_CURRENT_ASSETS',
    label: 'Tài sản dài hạn',
    statementType: 'BALANCE_SHEET',
    subCategory: 'NON_CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 8,
    common: true,
    aliases: ['Tài sản dài hạn', 'Tổng tài sản dài hạn'],
  },
  {
    code: 'LONG_TERM_RECEIVABLES',
    label: 'Các khoản phải thu dài hạn',
    statementType: 'BALANCE_SHEET',
    subCategory: 'NON_CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 9,
    common: false,
    aliases: ['Các khoản phải thu dài hạn', 'Phải thu dài hạn'],
  },
  {
    code: 'FIXED_ASSETS',
    label: 'Tài sản cố định',
    statementType: 'BALANCE_SHEET',
    subCategory: 'NON_CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 10,
    common: false,
    aliases: ['Tài sản cố định', 'Tổng tài sản cố định'],
  },
  {
    code: 'TANGIBLE_FIXED_ASSETS',
    label: 'Tài sản cố định hữu hình',
    statementType: 'BALANCE_SHEET',
    subCategory: 'NON_CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 11,
    common: false,
    aliases: ['Tài sản cố định hữu hình', 'TSCĐ hữu hình'],
  },
  {
    code: 'INTANGIBLE_FIXED_ASSETS',
    label: 'Tài sản cố định vô hình',
    statementType: 'BALANCE_SHEET',
    subCategory: 'NON_CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 12,
    common: false,
    aliases: ['Tài sản cố định vô hình', 'TSCĐ vô hình'],
  },
  {
    code: 'INVESTMENT_PROPERTIES',
    label: 'Bất động sản đầu tư',
    statementType: 'BALANCE_SHEET',
    subCategory: 'NON_CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 13,
    common: false,
    aliases: ['Bất động sản đầu tư', 'BĐS đầu tư'],
  },
  {
    code: 'LONG_TERM_FINANCIAL_INVESTMENTS',
    label: 'Đầu tư tài chính dài hạn',
    statementType: 'BALANCE_SHEET',
    subCategory: 'NON_CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 14,
    common: false,
    aliases: ['Đầu tư tài chính dài hạn', 'Các khoản đầu tư tài chính dài hạn'],
  },
  {
    code: 'OTHER_NON_CURRENT_ASSETS',
    label: 'Tài sản dài hạn khác',
    statementType: 'BALANCE_SHEET',
    subCategory: 'NON_CURRENT_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 15,
    common: false,
    aliases: ['Tài sản dài hạn khác', 'Các tài sản dài hạn khác'],
  },

  // 1.3 Total Assets (Tổng tài sản) - 1 metric
  {
    code: 'TOTAL_ASSETS',
    label: 'Tổng tài sản',
    statementType: 'BALANCE_SHEET',
    subCategory: 'TOTAL_ASSETS',
    defaultUnit: 'MILLION_VND',
    displayOrder: 16,
    common: true,
    aliases: ['Tổng tài sản', 'Tổng cộng tài sản'],
  },

  // 1.4 Liabilities (Nợ phải trả) - 8 metrics
  {
    code: 'CURRENT_LIABILITIES',
    label: 'Nợ ngắn hạn',
    statementType: 'BALANCE_SHEET',
    subCategory: 'LIABILITIES',
    defaultUnit: 'MILLION_VND',
    displayOrder: 17,
    common: true,
    aliases: ['Nợ ngắn hạn', 'Tổng nợ ngắn hạn'],
  },
  {
    code: 'TRADE_PAYABLES',
    label: 'Phải trả người bán ngắn hạn',
    statementType: 'BALANCE_SHEET',
    subCategory: 'LIABILITIES',
    defaultUnit: 'MILLION_VND',
    displayOrder: 18,
    common: false,
    aliases: ['Phải trả người bán ngắn hạn', 'Phải trả người bán', 'Phải trả cho người bán'],
  },
  {
    code: 'SHORT_TERM_BORROWINGS',
    label: 'Vay và nợ thuê tài chính ngắn hạn',
    statementType: 'BALANCE_SHEET',
    subCategory: 'LIABILITIES',
    defaultUnit: 'MILLION_VND',
    displayOrder: 19,
    common: false,
    aliases: ['Vay và nợ thuê tài chính ngắn hạn', 'Vay ngắn hạn', 'Vay và nợ ngắn hạn'],
  },
  {
    code: 'OTHER_CURRENT_LIABILITIES',
    label: 'Nợ ngắn hạn khác',
    statementType: 'BALANCE_SHEET',
    subCategory: 'LIABILITIES',
    defaultUnit: 'MILLION_VND',
    displayOrder: 20,
    common: false,
    aliases: ['Nợ ngắn hạn khác', 'Phải trả ngắn hạn khác'],
  },
  {
    code: 'NON_CURRENT_LIABILITIES',
    label: 'Nợ dài hạn',
    statementType: 'BALANCE_SHEET',
    subCategory: 'LIABILITIES',
    defaultUnit: 'MILLION_VND',
    displayOrder: 21,
    common: true,
    aliases: ['Nợ dài hạn', 'Tổng nợ dài hạn'],
  },
  {
    code: 'LONG_TERM_BORROWINGS',
    label: 'Vay và nợ thuê tài chính dài hạn',
    statementType: 'BALANCE_SHEET',
    subCategory: 'LIABILITIES',
    defaultUnit: 'MILLION_VND',
    displayOrder: 22,
    common: false,
    aliases: ['Vay và nợ thuê tài chính dài hạn', 'Vay dài hạn', 'Vay và nợ dài hạn'],
  },
  {
    code: 'OTHER_NON_CURRENT_LIABILITIES',
    label: 'Nợ dài hạn khác',
    statementType: 'BALANCE_SHEET',
    subCategory: 'LIABILITIES',
    defaultUnit: 'MILLION_VND',
    displayOrder: 23,
    common: false,
    aliases: ['Nợ dài hạn khác', 'Phải trả dài hạn khác'],
  },
  {
    code: 'TOTAL_LIABILITIES',
    label: 'Tổng nợ phải trả',
    statementType: 'BALANCE_SHEET',
    subCategory: 'LIABILITIES',
    defaultUnit: 'MILLION_VND',
    displayOrder: 24,
    common: true,
    aliases: ['Tổng nợ phải trả', 'Nợ phải trả'],
  },

  // 1.5 Equity (Vốn chủ sở hữu) - 5 metrics
  {
    code: 'OWNER_EQUITY',
    label: 'Vốn chủ sở hữu',
    statementType: 'BALANCE_SHEET',
    subCategory: 'EQUITY',
    defaultUnit: 'MILLION_VND',
    displayOrder: 25,
    common: true,
    aliases: ['Vốn chủ sở hữu', 'Nguồn vốn chủ sở hữu'],
  },
  {
    code: 'CHARTER_CAPITAL',
    label: 'Vốn điều lệ',
    statementType: 'BALANCE_SHEET',
    subCategory: 'EQUITY',
    defaultUnit: 'MILLION_VND',
    displayOrder: 26,
    common: false,
    aliases: ['Vốn điều lệ', 'Vốn góp của chủ sở hữu', 'Vốn đầu tư của chủ sở hữu'],
  },
  {
    code: 'RETAINED_EARNINGS',
    label: 'Lợi nhuận sau thuế chưa phân phối',
    statementType: 'BALANCE_SHEET',
    subCategory: 'EQUITY',
    defaultUnit: 'MILLION_VND',
    displayOrder: 27,
    common: false,
    aliases: ['Lợi nhuận sau thuế chưa phân phối', 'Lợi nhuận chưa phân phối'],
  },
  {
    code: 'TOTAL_EQUITY',
    label: 'Tổng vốn chủ sở hữu',
    statementType: 'BALANCE_SHEET',
    subCategory: 'EQUITY',
    defaultUnit: 'MILLION_VND',
    displayOrder: 28,
    common: false,
    aliases: ['Tổng vốn chủ sở hữu', 'Vốn và các quỹ'],
  },
  {
    code: 'TOTAL_LIABILITIES_AND_EQUITY',
    label: 'Tổng cộng nguồn vốn',
    statementType: 'BALANCE_SHEET',
    subCategory: 'EQUITY',
    defaultUnit: 'MILLION_VND',
    displayOrder: 29,
    common: false,
    aliases: ['Tổng cộng nguồn vốn', 'Tổng nguồn vốn'],
  },

  // ==========================================
  // 2. INCOME STATEMENT (BÁO CÁO KẾT QUẢ KINH DOANH) - 18 metrics
  // ==========================================
  {
    code: 'GROSS_REVENUE',
    label: 'Doanh thu bán hàng và cung cấp dịch vụ',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 30,
    common: false,
    aliases: ['Doanh thu bán hàng và cung cấp dịch vụ', 'Doanh thu gộp', 'Tổng doanh thu'],
  },
  {
    code: 'REVENUE_DEDUCTIONS',
    label: 'Các khoản giảm trừ doanh thu',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 31,
    common: false,
    aliases: ['Các khoản giảm trừ doanh thu', 'Giảm trừ doanh thu'],
  },
  {
    code: 'NET_REVENUE',
    label: 'Doanh thu thuần',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 32,
    common: true,
    aliases: ['Doanh thu thuần', 'Doanh thu thuần về bán hàng và cung cấp dịch vụ'],
  },
  {
    code: 'COST_OF_GOODS_SOLD',
    label: 'Giá vốn hàng bán',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 33,
    common: true,
    aliases: ['Giá vốn hàng bán', 'Giá vốn'],
  },
  {
    code: 'GROSS_PROFIT',
    label: 'Lợi nhuận gộp',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 34,
    common: true,
    aliases: ['Lợi nhuận gộp', 'Lợi nhuận gộp về bán hàng và cung cấp dịch vụ'],
  },
  {
    code: 'FINANCIAL_INCOME',
    label: 'Doanh thu hoạt động tài chính',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 35,
    common: false,
    aliases: ['Doanh thu hoạt động tài chính', 'Doanh thu tài chính'],
  },
  {
    code: 'FINANCIAL_EXPENSES',
    label: 'Chi phí tài chính',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 36,
    common: true,
    aliases: ['Chi phí tài chính', 'Tổng chi phí tài chính'],
  },
  {
    code: 'INTEREST_EXPENSE',
    label: 'Chi phí lãi vay',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 37,
    common: false,
    aliases: ['Chi phí lãi vay', 'Chi phí lãi'],
  },
  {
    code: 'SELLING_EXPENSE',
    label: 'Chi phí bán hàng',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 38,
    common: true,
    aliases: ['Chi phí bán hàng'],
  },
  {
    code: 'GENERAL_AND_ADMINISTRATIVE_EXPENSE',
    label: 'Chi phí quản lý doanh nghiệp',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 39,
    common: true,
    aliases: ['Chi phí quản lý doanh nghiệp', 'Chi phí quản lý'],
  },
  {
    code: 'OPERATING_PROFIT',
    label: 'Lợi nhuận thuần từ hoạt động kinh doanh',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 40,
    common: false,
    aliases: ['Lợi nhuận thuần từ hoạt động kinh doanh', 'Lợi nhuận từ HĐKD', 'Lợi nhuận thuần'],
  },
  {
    code: 'OTHER_INCOME',
    label: 'Thu nhập khác',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 41,
    common: false,
    aliases: ['Thu nhập khác'],
  },
  {
    code: 'OTHER_EXPENSE',
    label: 'Chi phí khác',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 42,
    common: false,
    aliases: ['Chi phí khác'],
  },
  {
    code: 'OTHER_PROFIT',
    label: 'Lợi nhuận khác',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 43,
    common: false,
    aliases: ['Lợi nhuận khác'],
  },
  {
    code: 'PROFIT_BEFORE_TAX',
    label: 'Lợi nhuận trước thuế',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 44,
    common: true,
    aliases: ['Lợi nhuận trước thuế', 'Tổng lợi nhuận kế toán trước thuế'],
  },
  {
    code: 'CURRENT_INCOME_TAX_EXPENSE',
    label: 'Chi phí thuế TNDN hiện hành',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 45,
    common: false,
    aliases: ['Chi phí thuế TNDN hiện hành', 'Thuế TNDN hiện hành'],
  },
  {
    code: 'DEFERRED_INCOME_TAX_EXPENSE',
    label: 'Chi phí thuế TNDN hoãn lại',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 46,
    common: false,
    aliases: ['Chi phí thuế TNDN hoãn lại', 'Thuế TNDN hoãn lại'],
  },
  {
    code: 'PROFIT_AFTER_TAX',
    label: 'Lợi nhuận sau thuế',
    statementType: 'INCOME_STATEMENT',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 47,
    common: true,
    aliases: ['Lợi nhuận sau thuế', 'Lợi nhuận sau thuế TNDN'],
  },

  // ==========================================
  // 3. BANKING & CREDIT INSTITUTIONS (NGÂN HÀNG & TỔ CHỨC TÍN DỤNG) - 8 metrics
  // ==========================================
  {
    code: 'CUSTOMER_LOANS',
    label: 'Cho vay khách hàng',
    statementType: 'BANKING',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 48,
    common: false,
    aliases: ['Cho vay khách hàng', 'Dư nợ cho vay khách hàng'],
  },
  {
    code: 'CUSTOMER_DEPOSITS',
    label: 'Tiền gửi của khách hàng',
    statementType: 'BANKING',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 49,
    common: false,
    aliases: ['Tiền gửi của khách hàng', 'Tiền gửi khách hàng'],
  },
  {
    code: 'NET_INTEREST_INCOME',
    label: 'Thu nhập lãi thuần',
    statementType: 'BANKING',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 50,
    common: false,
    aliases: ['Thu nhập lãi thuần', 'Lãi thuần'],
  },
  {
    code: 'NON_INTEREST_INCOME',
    label: 'Thu nhập ngoài lãi',
    statementType: 'BANKING',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 51,
    common: false,
    aliases: ['Thu nhập ngoài lãi', 'Tổng thu nhập ngoài lãi'],
  },
  {
    code: 'NET_FEE_COMMISSION_INCOME',
    label: 'Lãi thuần từ hoạt động dịch vụ',
    statementType: 'BANKING',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 52,
    common: false,
    aliases: ['Lãi thuần từ hoạt động dịch vụ', 'Thu nhập thuần từ hoạt động dịch vụ'],
  },
  {
    code: 'TOTAL_OPERATING_INCOME',
    label: 'Tổng thu nhập hoạt động',
    statementType: 'BANKING',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 53,
    common: false,
    aliases: ['Tổng thu nhập hoạt động', 'TOI'],
  },
  {
    code: 'OPERATING_EXPENSES',
    label: 'Chi phí hoạt động',
    statementType: 'BANKING',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 54,
    common: false,
    aliases: ['Chi phí hoạt động', 'Tổng chi phí hoạt động', 'OPEX'],
  },
  {
    code: 'CREDIT_RISK_PROVISION',
    label: 'Chi phí dự phòng rủi ro tín dụng',
    statementType: 'BANKING',
    subCategory: null,
    defaultUnit: 'MILLION_VND',
    displayOrder: 55,
    common: false,
    aliases: ['Chi phí dự phòng rủi ro tín dụng', 'Chi phí dự phòng rủi ro', 'Dự phòng rủi ro tín dụng'],
  },

  // ==========================================
  // 4. FINANCIAL & SAFETY RATIOS (CÁC CHỈ SỐ TÀI CHÍNH & AN TOÀN) - 6 metrics
  // ==========================================
  {
    code: 'NIM',
    label: 'Biên lãi thuần (NIM)',
    statementType: 'RATIOS',
    subCategory: null,
    defaultUnit: 'PERCENT',
    displayOrder: 56,
    common: false,
    aliases: ['Biên lãi thuần (NIM)', 'Tỷ lệ thu nhập lãi thuần (NIM)', 'NIM'],
  },
  {
    code: 'CIR',
    label: 'Tỷ lệ chi phí / thu nhập (CIR)',
    statementType: 'RATIOS',
    subCategory: null,
    defaultUnit: 'PERCENT',
    displayOrder: 57,
    common: false,
    aliases: ['Tỷ lệ chi phí / thu nhập (CIR)', 'Tỷ lệ chi phí trên thu nhập (CIR)', 'CIR'],
  },
  {
    code: 'NPL',
    label: 'Tỷ lệ nợ xấu (NPL)',
    statementType: 'RATIOS',
    subCategory: null,
    defaultUnit: 'PERCENT',
    displayOrder: 58,
    common: false,
    aliases: ['Tỷ lệ nợ xấu (NPL)', 'Tỷ lệ nợ xấu', 'NPL'],
  },
  {
    code: 'CAR',
    label: 'Tỷ lệ an toàn vốn (CAR)',
    statementType: 'RATIOS',
    subCategory: null,
    defaultUnit: 'PERCENT',
    displayOrder: 59,
    common: false,
    aliases: ['Tỷ lệ an toàn vốn (CAR)', 'Hệ số an toàn vốn', 'CAR'],
  },
  {
    code: 'ROAA',
    label: 'ROAA',
    statementType: 'RATIOS',
    subCategory: null,
    defaultUnit: 'PERCENT',
    displayOrder: 60,
    common: false,
    aliases: ['ROAA', 'Tỷ suất sinh lời trên tổng tài sản bình quân (ROAA)'],
  },
  {
    code: 'ROAE',
    label: 'ROAE',
    statementType: 'RATIOS',
    subCategory: null,
    defaultUnit: 'PERCENT',
    displayOrder: 61,
    common: false,
    aliases: ['ROAE', 'Tỷ suất sinh lời trên vốn chủ sở hữu bình quân (ROAE)'],
  },
];

export const COMMON_CANONICAL_METRICS = CANONICAL_FINANCIAL_TAXONOMY.filter((m) => m.common);

export function findCanonicalByCodeOrAlias(text: string): CanonicalMetricDefinition | undefined {
  if (!text) return undefined;
  const norm = normalizeTaxonomyText(text);
  return CANONICAL_FINANCIAL_TAXONOMY.find((d) => {
    if (d.code.toLowerCase() === text.trim().toLowerCase()) return true;
    if (normalizeTaxonomyText(d.label) === norm) return true;
    return d.aliases?.some((a) => normalizeTaxonomyText(a) === norm);
  });
}

export function normalizeTaxonomyText(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Maps internal unit codes/enums or raw unit strings to clean, user-friendly Vietnamese labels.
 * e.g. MILLION_VND -> 'Triệu VNĐ', BILLION_VND -> 'Tỷ VNĐ', PERCENT -> '%', etc.
 */
export function formatFinancialUnit(unit?: string | null): string {
  if (!unit || unit.trim() === '' || unit.trim() === '—') return '—';
  const trimmed = unit.trim();
  const upper = trimmed.toUpperCase();

  switch (upper) {
    case 'VND':
    case 'VN_D':
    case 'ĐỒNG':
    case 'DONG':
      return 'VNĐ';
    case 'THOUSAND_VND':
    case 'NGHÌN VND':
    case 'NGHÌN VNĐ':
    case 'NGHIN DONG':
      return 'Nghìn VNĐ';
    case 'MILLION_VND':
    case 'TRIỆU VND':
    case 'TRIỆU VNĐ':
    case 'TRIEU DONG':
    case 'MILION_VND':
      return 'Triệu VNĐ';
    case 'BILLION_VND':
    case 'TỶ VND':
    case 'TỶ VNĐ':
    case 'TY DONG':
      return 'Tỷ VNĐ';
    case 'USD':
      return 'USD';
    case 'THOUSAND_USD':
    case 'NGHÌN USD':
      return 'Nghìn USD';
    case 'MILLION_USD':
    case 'TRIỆU USD':
    case 'MILION_USD':
      return 'Triệu USD';
    case 'BILLION_USD':
    case 'TỶ USD':
      return 'Tỷ USD';
    case 'PERCENT':
    case '%':
      return '%';
    case 'TIMES':
    case 'LẦN':
      return 'Lần';
    case 'RATIO':
    case 'TỶ LỆ':
    case 'TY LE':
      return 'Tỷ lệ';
    case 'COUNT':
    case 'SỐ LƯỢNG':
    case 'SO LUONG':
      return 'Số lượng';
    default:
      return trimmed;
  }
}

export type FinancialStatementSectionKey =
  | 'BALANCE_SHEET'
  | 'INCOME_STATEMENT'
  | 'BANKING'
  | 'RATIOS'
  | 'OTHER';

export interface FinancialSectionMeta {
  key: FinancialStatementSectionKey;
  title: string;
  order: number;
}

export const FINANCIAL_STATEMENT_SECTIONS: FinancialSectionMeta[] = [
  { key: 'BALANCE_SHEET', title: '1. BẢNG CÂN ĐỐI KẾ TOÁN', order: 1 },
  { key: 'INCOME_STATEMENT', title: '2. BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH', order: 2 },
  { key: 'BANKING', title: '3. NGÂN HÀNG & TỔ CHỨC TÍN DỤNG', order: 3 },
  { key: 'RATIOS', title: '4. CÁC CHỈ SỐ TÀI CHÍNH & AN TOÀN', order: 4 },
  { key: 'OTHER', title: '5. CHỈ SỐ KHÁC', order: 5 },
];

/**
 * Authoritative taxonomy section resolver for financial metrics.
 * Maps canonical metrics to their canonical statement section, and unmapped/custom metrics to 'OTHER'.
 * Used by both Manual and AI reports.
 */
export function resolveFinancialMetricSection(
  metric: { metricCode?: string | null; label?: string | null; originalLabel?: string | null }
): FinancialStatementSectionKey {
  if (metric.metricCode) {
    const canonical = CANONICAL_FINANCIAL_TAXONOMY.find((c) => c.code === metric.metricCode);
    if (canonical) return canonical.statementType;
  }
  const text = metric.label || metric.originalLabel;
  if (text) {
    const canonical = findCanonicalByCodeOrAlias(text);
    if (canonical) return canonical.statementType;
  }
  return 'OTHER';
}
