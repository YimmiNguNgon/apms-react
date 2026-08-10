import React from 'react';
import { SearchInput } from './SearchInput';

export type FilterType = 'select' | 'text' | 'checkbox';

export interface FilterConfig {
  id: string;
  type: FilterType;
  label: string;
  value: string | boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  onChange: (value: string | boolean) => void;
}

export interface FilterBarProps {
  filters?: FilterConfig[];
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  actions?: React.ReactNode;
}

const controlStyle: React.CSSProperties = {
  height: '40px',
  padding: '0 12px',
  border: '1px solid var(--cds-border-subtle-01)',
  borderRadius: 'var(--cds-border-radius)',
  background: 'var(--cds-field-01)',
  color: 'var(--cds-text-primary)',
  fontSize: '14px',
  fontFamily: "'IBM Plex Sans', 'Inter', sans-serif",
  outline: 'none',
  cursor: 'pointer',
  minWidth: '140px',
  transition: 'border-color 0.15s',
  appearance: 'auto',
};

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  height: '40px',
  padding: '0 4px',
  fontSize: '14px',
  color: 'var(--cds-text-primary)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  searchValue,
  searchPlaceholder = 'Search...',
  onSearchChange,
  actions,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        background: 'var(--cds-background)',
        border: '1px solid var(--cds-border-color)',
        borderRadius: 'var(--cds-border-radius)',
        padding: '10px 16px',
        marginBottom: '16px',
      }}
    >
      {/* Search input */}
      {onSearchChange && (
        <SearchInput
          value={searchValue ?? ''}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          style={{ width: '240px' }}
        />
      )}

      {/* Separator */}
      {onSearchChange && filters && filters.length > 0 && (
        <div
          style={{
            width: '1px',
            height: '24px',
            background: 'var(--cds-border-subtle-01)',
            flexShrink: 0,
          }}
        />
      )}

      {/* Dynamic filter controls */}
      {filters?.map((filter) => {
        if (filter.type === 'select') {
          return (
            <select
              key={filter.id}
              id={`filter-${filter.id}`}
              value={filter.value as string}
              onChange={(e) => filter.onChange(e.target.value)}
              style={controlStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--cds-focus)'; e.currentTarget.style.outline = '2px solid var(--cds-focus)'; e.currentTarget.style.outlineOffset = '-2px'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--cds-border-subtle-01)'; e.currentTarget.style.outline = 'none'; }}
              aria-label={filter.label}
            >
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        }
        if (filter.type === 'text') {
          return (
            <input
              key={filter.id}
              id={`filter-${filter.id}`}
              type="text"
              placeholder={filter.placeholder ?? filter.label}
              value={filter.value as string}
              onChange={(e) => filter.onChange(e.target.value)}
              style={{ ...controlStyle, cursor: 'text' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--cds-focus)'; e.currentTarget.style.outline = '2px solid var(--cds-focus)'; e.currentTarget.style.outlineOffset = '-2px'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--cds-border-subtle-01)'; e.currentTarget.style.outline = 'none'; }}
              aria-label={filter.label}
            />
          );
        }
        if (filter.type === 'checkbox') {
          return (
            <label key={filter.id} style={checkboxRowStyle} htmlFor={`filter-${filter.id}`}>
              <input
                type="checkbox"
                id={`filter-${filter.id}`}
                checked={filter.value as boolean}
                onChange={(e) => filter.onChange(e.target.checked)}
                style={{ accentColor: 'var(--cds-interactive)', width: '14px', height: '14px', cursor: 'pointer' }}
              />
              {filter.label}
            </label>
          );
        }
        return null;
      })}

      {/* Right-side action slot */}
      {actions && (
        <>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {actions}
          </div>
        </>
      )}
    </div>
  );
};
