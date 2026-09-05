import React, { useState, useMemo } from 'react';
import { FileText, ChevronDown, ChevronRight, Bookmark, Copy, Check } from 'lucide-react';
import styles from './CandidateReview.module.css';

export interface EvidenceCitation {
  id: string;
  fileName: string;
  docId?: string;
  page?: string;
  pageNumber?: number;
  quote: string;
}

export function cleanQuoteText(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^["“”']+|["“”']+$/g, '').trim();
  cleaned = cleaned.replace(/^(\.\.\.|\u2026)\s*/, '').trim();
  cleaned = cleaned.replace(/\s*(\.\.\.|\u2026)+$/, '...').trim();
  return cleaned;
}

export function formatPageLabel(val: string | number): string {
  const str = String(val).trim();
  if (!str) return 'Page not identified';
  if (/^(page|trang|pp|p\.)\b/i.test(str)) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  if (/^\d+(\s*[-–—]\s*\d+)?$/.test(str)) {
    return str.includes('-') || str.includes('–') || str.includes('—') ? `Pages ${str}` : `Page ${str}`;
  }
  return str;
}

export function parseEvidenceCitations(
  rawEvidenceText?: string | null,
  fallbackFileName?: string,
  fallbackPage?: string | number
): EvidenceCitation[] {
  if (!rawEvidenceText || !rawEvidenceText.trim()) {
    return [];
  }

  const text = rawEvidenceText.trim();
  const tagRegex = /\[([^|\]\n]+?)\s*(?:\|\s*([^|\]\n]+?))?(?:\s*\|\s*([^\]\n]+?))?\]/g;

  const matches: Array<{
    matchIndex: number;
    matchLength: number;
    fileName: string;
    docId?: string;
    pageStr?: string;
  }> = [];

  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(text)) !== null) {
    const p1 = m[1]?.trim() || '';
    const p2 = m[2]?.trim();
    const p3 = m[3]?.trim();

    let fileName = p1;
    let docId: string | undefined = undefined;
    let pageStr: string | undefined = undefined;

    if (p3 !== undefined) {
      docId = p2;
      pageStr = p3;
    } else if (p2 !== undefined) {
      if (/^(page|trang|\d+)/i.test(p2)) {
        pageStr = p2;
      } else {
        docId = p2;
      }
    }

    matches.push({
      matchIndex: m.index,
      matchLength: m[0].length,
      fileName,
      docId,
      pageStr,
    });
  }

  if (matches.length === 0) {
    return [{
      id: 'cit-0',
      fileName: fallbackFileName || 'Source Document',
      page: fallbackPage !== undefined && fallbackPage !== null ? formatPageLabel(fallbackPage) : undefined,
      quote: cleanQuoteText(text),
    }];
  }

  const citations: EvidenceCitation[] = [];

  // If there is meaningful text before first match
  if (matches[0].matchIndex > 0) {
    const preText = cleanQuoteText(text.substring(0, matches[0].matchIndex));
    if (preText && preText.length > 3) {
      citations.push({
        id: 'cit-pre',
        fileName: fallbackFileName || matches[0].fileName || 'Source Document',
        page: fallbackPage !== undefined && fallbackPage !== null ? formatPageLabel(fallbackPage) : undefined,
        quote: preText,
      });
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const quoteStart = current.matchIndex + current.matchLength;
    const quoteEnd = i + 1 < matches.length ? matches[i + 1].matchIndex : text.length;
    const rawQuote = text.substring(quoteStart, quoteEnd);
    const cleanedQuote = cleanQuoteText(rawQuote);

    const pageLabel = current.pageStr
      ? formatPageLabel(current.pageStr)
      : (fallbackPage !== undefined && fallbackPage !== null ? formatPageLabel(fallbackPage) : undefined);

    if (cleanedQuote || current.pageStr) {
      citations.push({
        id: `cit-${i}`,
        fileName: current.fileName || fallbackFileName || 'Source Document',
        docId: current.docId,
        page: pageLabel,
        quote: cleanedQuote || 'Direct quote not provided.',
      });
    }
  }

  return citations;
}

export interface EvidenceSectionProps {
  evidenceText?: string;
  pageNumber?: number;
  expanded: boolean;
  onToggle: () => void;
  defaultFileName?: string;
}

export const EvidenceSection: React.FC<EvidenceSectionProps> = ({
  evidenceText,
  pageNumber,
  expanded,
  onToggle,
  defaultFileName,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const citations = useMemo(() => {
    return parseEvidenceCitations(evidenceText, defaultFileName, pageNumber);
  }, [evidenceText, defaultFileName, pageNumber]);

  const groupedByFile = useMemo(() => {
    const map = new Map<string, EvidenceCitation[]>();
    for (const cit of citations) {
      const list = map.get(cit.fileName) || [];
      list.push(cit);
      map.set(cit.fileName, list);
    }
    return Array.from(map.entries()).map(([fileName, items]) => {
      // Gather unique pages
      const uniquePages = Array.from(
        new Set(
          items
            .map(item => item.page)
            .filter((p): p is string => Boolean(p && p !== 'Page not identified'))
        )
      );

      let pageSummary = '';
      if (uniquePages.length === 1) {
        pageSummary = uniquePages[0];
      } else if (uniquePages.length > 1) {
        // Extract raw numbers if formatted as Page X
        const pagesClean = uniquePages.map(p => p.replace(/^(Page|Pages|Trang)\s*/i, ''));
        pageSummary = `Pages ${pagesClean.join(', ')}`;
      }

      return {
        fileName,
        items,
        pageSummary,
      };
    });
  }, [citations]);

  if (!evidenceText || citations.length === 0) {
    return null;
  }

  const handleCopy = (citation: EvidenceCitation) => {
    navigator.clipboard.writeText(citation.quote).then(() => {
      setCopiedId(citation.id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(console.error);
  };

  return (
    <div className={styles.evidenceContainer}>
      <button
        type="button"
        onClick={onToggle}
        className={`${styles.evidenceHeaderBtn} ${expanded ? styles.evidenceHeaderBtnOpen : ''}`}
        aria-expanded={expanded}
      >
        <FileText size={14} color="#3b82f6" />
        <span>Evidence</span>
        {citations.length > 1 && (
          <span className={styles.evidenceCountBadge} title={`${citations.length} supporting citations`}>
            {citations.length}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {expanded && (
        <div className={styles.evidenceBody}>
          {groupedByFile.map(group => {
            const isPdf = group.fileName.toLowerCase().endsWith('.pdf');

            return (
              <div key={group.fileName} className={styles.evidenceFileGroup}>
                <div className={styles.evidenceFileHeader}>
                  <div className={styles.evidenceFileTitle}>
                    <FileText size={15} color="#3b82f6" style={{ flexShrink: 0 }} />
                    <strong title={group.fileName}>{group.fileName}</strong>
                    {isPdf && <span className={styles.evidencePdfTag}>PDF</span>}
                  </div>
                  <div className={styles.evidencePageSummary}>
                    {group.items.length > 1
                      ? `${group.items.length} citations${group.pageSummary ? ` · ${group.pageSummary}` : ''}`
                      : (group.pageSummary || 'Page not identified')}
                  </div>
                </div>

                <div className={styles.evidenceList}>
                  {group.items.map((cit, idx) => (
                    <article key={cit.id} className={styles.evidenceCard}>
                      <div className={styles.evidenceCardHead}>
                        <div className={styles.evidenceCardMeta}>
                          {cit.page ? (
                            <span className={styles.evidencePageBadge}>
                              <Bookmark size={11} />
                              {cit.page}
                            </span>
                          ) : (
                            <span className={styles.evidencePageBadgeMuted}>
                              Page not identified
                            </span>
                          )}

                          {group.items.length > 1 && (
                            <span className={styles.evidenceIndexTag}>
                              #{idx + 1} of {group.items.length}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {cit.docId && (
                            <span
                              className={styles.evidenceDocId}
                              title={`Source Doc ID: ${cit.docId}`}
                            >
                              #{cit.docId.slice(0, 8)}
                            </span>
                          )}
                          <button
                            type="button"
                            className={`${styles.evidenceCopyBtn} ${copiedId === cit.id ? styles.evidenceCopyBtnSuccess : ''}`}
                            onClick={() => handleCopy(cit)}
                            title={copiedId === cit.id ? 'Copied to clipboard!' : 'Copy quote'}
                            aria-label="Copy quote text"
                          >
                            {copiedId === cit.id ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>

                      <div className={styles.evidenceQuoteBox}>
                        &ldquo;{cit.quote}&rdquo;
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
