import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
}

const SearchIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.25" />
    <line x1="9.9" y1="9.9" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
);

const ClearIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  disabled = false,
  size = 'md',
  id,
  style,
  autoFocus = false,
}) => {
  const { t } = useTranslation('common');
  const resolvedPlaceholder = placeholder === 'Search...' ? t('generic.searchPlaceholder') : placeholder;
  const inputRef = useRef<HTMLInputElement>(null);
  const heights = { sm: '32px', md: '40px', lg: '48px' };
  const fontSizes = { sm: '12px', md: '14px', lg: '14px' };

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '100%',
        ...style,
      }}
    >
      {/* Search icon */}
      <span
        style={{
          position: 'absolute',
          left: '12px',
          color: 'var(--cds-text-placeholder)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <SearchIcon size={size === 'sm' ? 14 : 16} />
      </span>

      <input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={resolvedPlaceholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        style={{
          width: '100%',
          height: heights[size],
          paddingLeft: '38px',
          paddingRight: value ? '36px' : '12px',
          fontSize: fontSizes[size],
          fontFamily: "'IBM Plex Sans', 'Inter', sans-serif",
          color: 'var(--cds-text-primary)',
          background: 'var(--cds-field-01)',
          border: '1px solid var(--cds-border-subtle-01)',
          borderRadius: 'var(--cds-border-radius)',
          outline: 'none',
          transition: 'border-color 0.15s',
          cursor: disabled ? 'not-allowed' : 'text',
          opacity: disabled ? 0.5 : 1,
          // remove default search field X button
          WebkitAppearance: 'none',
          MozAppearance: 'textfield',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--cds-focus)';
          e.currentTarget.style.outline = '2px solid var(--cds-focus)';
          e.currentTarget.style.outlineOffset = '-2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--cds-border-subtle-01)';
          e.currentTarget.style.outline = 'none';
        }}
      />

      {/* Clear button */}
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label={t('generic.clearSearch')}
          style={{
            position: 'absolute',
            right: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            border: 'none',
            background: 'none',
            color: 'var(--cds-text-secondary)',
            cursor: 'pointer',
            borderRadius: '50%',
            padding: 0,
            transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--cds-background-hover)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--cds-text-primary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--cds-text-secondary)';
          }}
        >
          <ClearIcon size={12} />
        </button>
      )}
    </div>
  );
};
