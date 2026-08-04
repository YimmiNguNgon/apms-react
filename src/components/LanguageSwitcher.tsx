import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const LANG_OPTIONS = [
  { code: 'vi', label: 'VI' },
  { code: 'en', label: 'EN' },
] as const;

export const LanguageSwitcher: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <div
      className="lang-switcher"
      role="group"
      aria-label={t('language.label')}
      title={t('language.label')}
    >
      {LANG_OPTIONS.map((option) => {
        const active = i18n.language?.startsWith(option.code);
        return (
          <button
            key={option.code}
            type="button"
            className={`lang-switcher-btn ${active ? 'active' : ''}`}
            onClick={() => { void i18n.changeLanguage(option.code); }}
            aria-pressed={active}
            title={t(`language.${option.code}`)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
