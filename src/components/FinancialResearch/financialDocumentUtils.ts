import type { FinancialReportEntry } from '../../types/domain';

/**
 * Checks whether a report was created via Manual Entry.
 * Handles both canonical 'MANUAL' backend enum and any 'MANUAL_ENTRY' aliases.
 */
export const isManualReport = (
  report?: { dataEntryMethod?: string | null } | null,
): boolean => {
  if (!report?.dataEntryMethod) return false;
  const method = String(report.dataEntryMethod).toUpperCase().trim();
  return method === 'MANUAL' || method === 'MANUAL_ENTRY';
};

/**
 * Normalizes and validates a document identifier string.
 * Strictly rejects null, undefined, empty strings, and string literals 'null' / 'undefined'.
 */
export const normalizeDocumentId = (value?: string | null): string | null => {
  if (!value) return null;
  const id = value.trim();
  if (!id || id === 'null' || id === 'undefined') {
    return null;
  }
  return id;
};

/**
 * Resolves the real document identifier according to the report's entry method:
 * - For Manual Entry: checks referenceDocumentId before falling back to documentId.
 * - For AI Extraction: checks sourceDocumentId, rawDocumentId, documentId.
 */
export const resolveReportDocumentId = (
  report?: (FinancialReportEntry & {
    referenceDocumentId?: string | null;
    sourceDocumentId?: string | null;
    rawDocumentId?: string | null;
  }) | null,
): string | null => {
  if (!report) return null;

  if (isManualReport(report)) {
    return (
      normalizeDocumentId(report.referenceDocumentId) ??
      normalizeDocumentId((report.documentContext as any)?.referenceDocumentId) ??
      normalizeDocumentId(report.documentId) ??
      normalizeDocumentId((report.documentContext as any)?.documentId)
    );
  }

  return (
    normalizeDocumentId(report.sourceDocumentId) ??
    normalizeDocumentId(report.rawDocumentId) ??
    normalizeDocumentId(report.documentId) ??
    normalizeDocumentId((report.documentContext as any)?.documentId)
  );
};

/**
 * Checks whether a report has an existing valid document identifier.
 * Does NOT rely on fileName or metric counts.
 */
export const hasReportDocument = (
  report?: FinancialReportEntry | null,
): boolean => {
  return Boolean(resolveReportDocumentId(report));
};

/**
 * Single source of truth helper to check if a financial report requires revisions.
 */
export const isReportChangesRequested = (
  report?: { reviewStatus?: string | null } | null,
): boolean => {
  if (!report?.reviewStatus) return false;
  const status = report.reviewStatus.toUpperCase().trim();
  return (
    status === 'CHANGES_REQUESTED' ||
    status === 'REVISION_REQUIRED' ||
    status === 'NEEDS_REVISION'
  );
};
