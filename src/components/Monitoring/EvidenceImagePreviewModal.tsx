import React, { useEffect, useState, useCallback } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { companyMonitoringApi } from '../../API/companyMonitoringApi';

export interface EvidenceImagePreviewModalProps {
  imageId: string | null;
  onClose: () => void;
}

export const EvidenceImagePreviewModal: React.FC<EvidenceImagePreviewModalProps> = ({
  imageId,
  onClose
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadImage = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const blob = await companyMonitoringApi.getMonitoringEvidenceBlob(id);
      const url = URL.createObjectURL(blob);
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err: any) {
      console.error('Failed to load evidence image:', err);
      const status = err?.response?.status;
      setError(`Unable to load evidence image.${status ? ` (HTTP ${status})` : ''}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!imageId) {
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setError(null);
      setLoading(false);
      return;
    }

    void loadImage(imageId);

    return () => {
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [imageId, loadImage]);

  if (!imageId) return null;

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      style={{ zIndex: 12000 }}
      onMouseDown={onClose}
    >
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: '90vw',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: '#fff',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Evidence Image
          </h3>
          <button
            type="button"
            className="workspace-icon-btn"
            onClick={onClose}
            aria-label="Close image preview"
          >
            <X size={20} color="var(--text-secondary)" />
          </button>
        </div>

        <div
          style={{
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '260px',
            background: 'var(--cds-layer-01, #f8fafc)',
            overflow: 'auto'
          }}
        >
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
              <div style={{ width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.9rem' }}>Loading image...</span>
            </div>
          )}

          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#dc2626' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 500 }}>
                {error}
              </p>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => void loadImage(imageId)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {!loading && !error && imageUrl && (
            <img
              src={imageUrl}
              alt="Evidence preview"
              style={{
                maxWidth: '100%',
                maxHeight: '65vh',
                objectFit: 'contain',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
          )}
        </div>

        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--workspace-muted-border, #e2e8f0)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
