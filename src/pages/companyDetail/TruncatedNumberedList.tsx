import React, { useState, useRef } from 'react';

export interface TruncatedNumberedListProps<T = string> {
  items: T[];
  limit?: number;
  columnLabel: string;
  tagBg?: string;
  tagColor?: string;
  renderItem?: (item: T, index: number) => React.ReactNode;
  rowPadding?: string;
  emptyNode?: React.ReactNode;
  maxHeight?: string | number;
}

export function TruncatedNumberedList<T = string>({
  items,
  limit = 5,
  columnLabel,
  tagBg = '#F1F5F9',
  tagColor = '#334155',
  renderItem,
  rowPadding = '5px 8px',
  emptyNode = <strong style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', wordBreak: 'break-word' }}>N/A</strong>,
  maxHeight = '210px',
}: TruncatedNumberedListProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) {
    return <>{emptyNode}</>;
  }

  const handleToggle = () => {
    if (expanded && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    setExpanded((prev) => !prev);
  };

  const visibleItems = expanded ? items : items.slice(0, limit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '36px 1fr',
          gap: '8px',
          padding: '4px 8px',
          background: '#F1F5F9',
          borderRadius: '4px',
          fontSize: '0.66rem',
          fontWeight: 700,
          color: '#475569',
          alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>#</div>
        <div>{columnLabel}</div>
      </div>
      <div
        ref={scrollContainerRef}
        style={
          expanded
            ? {
                maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                paddingRight: '3px',
                scrollbarWidth: 'thin',
              }
            : {
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }
        }
      >
        {visibleItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr',
              gap: '8px',
              alignItems: 'center',
              background: '#F8FAFC',
              padding: rowPadding,
              borderRadius: '6px',
              border: '1px solid #F1F5F9',
            }}
          >
            <div style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>
              {idx + 1}
            </div>
            <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
              {renderItem ? (
                renderItem(item, idx)
              ) : (
                <span
                  style={{
                    fontSize: '0.7rem',
                    background: tagBg,
                    color: tagColor,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    display: 'inline-block',
                    wordBreak: 'break-word',
                  }}
                >
                  {String(item)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {items.length > limit && (
        <button
          type="button"
          onClick={handleToggle}
          style={{
            background: 'none',
            border: 'none',
            color: '#1D4ED8',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 0',
            textAlign: 'left',
            width: 'fit-content',
          }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

export default TruncatedNumberedList;
