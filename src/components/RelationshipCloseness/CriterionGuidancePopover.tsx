import React, { useEffect, useId, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Info, X } from 'lucide-react';
import styles from './RelationshipCloseness.module.css';
import {
  V5_SCORING_GUIDANCE,
  type V5CriterionKey,
  type V5RuleLevel,
} from './scoringGuidanceConfig';

export type { V5CriterionKey, V5RuleLevel };
export { V5_SCORING_GUIDANCE };

export interface CriterionGuidancePopoverProps {
  criterionKey: V5CriterionKey;
  contractEvidenceSummary?: React.ReactNode;
}

export const CriterionGuidancePopover: React.FC<CriterionGuidancePopoverProps> = ({
  criterionKey,
  contractEvidenceSummary,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverId = useId();

  const guide = V5_SCORING_GUIDANCE[criterionKey];

  const clearTimers = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const canHover = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(420, window.innerWidth - 32);
    const popoverHeight = Math.min(520, window.innerHeight - 32);

    // Preferred: right of trigger
    let left = rect.right + 10;
    // Fallback: if not enough space on right, try left of trigger
    if (left + popoverWidth > window.innerWidth - 16) {
      if (rect.left - popoverWidth - 10 >= 16) {
        left = rect.left - popoverWidth - 10;
      } else {
        // Clamp within viewport
        left = Math.max(16, window.innerWidth - popoverWidth - 16);
      }
    }

    // Vertical positioning: align near trigger top, clamped inside viewport
    let top = rect.top - 14;
    if (top + popoverHeight > window.innerHeight - 16) {
      top = Math.max(16, window.innerHeight - popoverHeight - 16);
    }
    if (top < 16) {
      top = 16;
    }

    setCoords({ top, left });
  };

  const handleTriggerMouseEnter = () => {
    if (!canHover()) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (!isOpen && !openTimerRef.current) {
      openTimerRef.current = setTimeout(() => {
        updatePosition();
        setIsOpen(true);
        openTimerRef.current = null;
      }, 120);
    }
  };

  const handleTriggerMouseLeave = () => {
    if (!canHover()) return;
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (isOpen && !closeTimerRef.current) {
      closeTimerRef.current = setTimeout(() => {
        setIsOpen(false);
        closeTimerRef.current = null;
      }, 250);
    }
  };

  const handlePopoverMouseEnter = () => {
    if (!canHover()) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handlePopoverMouseLeave = () => {
    if (!canHover()) return;
    if (isOpen && !closeTimerRef.current) {
      closeTimerRef.current = setTimeout(() => {
        setIsOpen(false);
        closeTimerRef.current = null;
      }, 250);
    }
  };

  const handleClick = () => {
    clearTimers();
    if (isOpen) {
      setIsOpen(false);
    } else {
      updatePosition();
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    clearTimers();
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        clearTimers();
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.guidancePopoverTrigger}
        aria-label="Xem hướng dẫn chấm điểm"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
        onClick={handleClick}
      >
        <Info size={16} />
      </button>

      {isOpen &&
        ReactDOM.createPortal(
          <div
            id={popoverId}
            ref={popoverRef}
            className={styles.guidancePopover}
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            role="dialog"
            aria-label={`Hướng dẫn chấm điểm: ${guide.title}`}
            onMouseEnter={handlePopoverMouseEnter}
            onMouseLeave={handlePopoverMouseLeave}
          >
            {/* Header: Title + Close Button */}
            <div className={styles.popoverHeader}>
              <span className={styles.popoverTitle}>{guide.title}</span>
              <button
                type="button"
                className={styles.popoverCloseBtn}
                onClick={handleClose}
                aria-label="Đóng hướng dẫn chấm điểm"
              >
                <X size={15} />
              </button>
            </div>

            {/* Business Question */}
            <div className={styles.popoverQuestionSection}>
              <div className={styles.popoverQuestionMeta}>CÂU HỎI ĐÁNH GIÁ</div>
              <div className={styles.popoverQuestionText}>"{guide.question}"</div>
            </div>

            {/* Optional Contract Evidence (Commercial only, omitted if no meaningful data) */}
            {contractEvidenceSummary && (
              <div className={styles.popoverContractCompactLine}>
                {contractEvidenceSummary}
              </div>
            )}

            {/* 6 Compact Score Levels */}
            <div className={styles.popoverScoreLevelsList}>
              {guide.levels.map((level) => (
                <div key={level.score} className={styles.popoverScoreLevelRow}>
                  <div
                    className={`${styles.popoverScoreBadge} ${
                      styles[`scoreBadge${level.score}`] || ''
                    }`}
                  >
                    {level.score}
                  </div>
                  <div className={styles.popoverScoreLevelContent}>
                    <div className={styles.popoverScoreLevelLabel}>{level.label}</div>
                    <div className={styles.popoverScoreLevelDesc}>{level.description}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Optional Note (e.g. Engagement) */}
            {guide.note && (
              <div className={styles.guidanceInlineNote}>{guide.note}</div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
