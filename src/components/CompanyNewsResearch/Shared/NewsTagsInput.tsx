import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface NewsTagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export const NewsTagsInput: React.FC<NewsTagsInputProps> = ({ tags, onChange, disabled }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  const handleBlur = () => {
    addTag(inputValue);
  };

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      // Prevent duplicates
      if (!tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
      }
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    if (disabled) return;
    onChange(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div 
        style={{
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px',
          padding: '8px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          backgroundColor: disabled ? '#f8fafc' : '#fff',
          minHeight: '42px'
        }}
      >
        {tags.map(tag => (
          <span 
            key={tag}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              backgroundColor: '#e0e7ff',
              color: '#4338ca',
              borderRadius: '999px',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            {tag}
            {!disabled && (
              <X 
                size={14} 
                style={{ cursor: 'pointer', opacity: 0.7 }}
                onClick={() => removeTag(tag)}
              />
            )}
          </span>
        ))}
        {!disabled && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={tags.length === 0 ? 'e.g. finance, tech (press Enter)' : ''}
            style={{
              flex: 1,
              minWidth: '120px',
              border: 'none',
              outline: 'none',
              fontSize: '0.875rem',
              backgroundColor: 'transparent'
            }}
          />
        )}
      </div>
    </div>
  );
};
