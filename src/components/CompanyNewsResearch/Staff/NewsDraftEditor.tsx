import React, { useEffect, useMemo, useState } from 'react';
import type { CreateNewsResearchDraftRequest } from '../../../types/domain';
import { NewsTagsInput } from '../Shared/NewsTagsInput';
import { AlertCircle, ExternalLink, Image as ImageIcon, Link, Loader2, Save, Upload, X } from 'lucide-react';

interface NewsDraftEditorProps {
  initialData: CreateNewsResearchDraftRequest | null;
  onSave: (data: CreateNewsResearchDraftRequest) => void;
  onCancel: () => void;
  onUploadImage: (file: File) => Promise<string>;
  saving: boolean;
  canEdit: boolean;
}

const emptyDraft: CreateNewsResearchDraftRequest = {
  title: '',
  sourceUrl: '',
  publishedAt: '',
  summary: '',
  content: '',
  imageStorageKey: '',
  externalImageUrl: '',
  sourceName: '',
  author: '',
  tags: [],
  staffNotes: '',
};

const validSourceUrl = (value: string) => /^https?:\/\/.+/i.test(value.trim());

const toInputDateTime = (value?: string | null) => {
  if (!value) return '';
  return value.substring(0, 16);
};

export const NewsDraftEditor: React.FC<NewsDraftEditorProps> = ({
  initialData,
  onSave,
  onCancel,
  onUploadImage,
  saving,
  canEdit,
}) => {
  const [formData, setFormData] = useState<CreateNewsResearchDraftRequest>(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{ name: string; size: number } | null>(null);

  useEffect(() => {
    setFormData({
      ...emptyDraft,
      ...initialData,
      publishedAt: toInputDateTime(initialData?.publishedAt),
      tags: initialData?.tags || [],
    });
    setErrors({});
    setImageMode(initialData?.externalImageUrl ? 'url' : 'upload');
    setLocalPreview(null);
    setUploadedFileMeta(null);
  }, [initialData]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const sourceIsValid = useMemo(() => validSourceUrl(formData.sourceUrl || ''), [formData.sourceUrl]);

  const handleChange = <K extends keyof CreateNewsResearchDraftRequest>(
    field: K,
    value: CreateNewsResearchDraftRequest[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field as string]) return prev;
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  };

  const validateForSave = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.title.trim()) nextErrors.title = 'Title is required.';
    if (!formData.sourceUrl.trim()) nextErrors.sourceUrl = 'Source URL is required.';
    if (formData.sourceUrl.trim() && !validSourceUrl(formData.sourceUrl)) {
      nextErrors.sourceUrl = 'Enter a valid http/https source URL.';
    }
    if (!formData.publishedAt) nextErrors.publishedAt = 'Published date is required.';
    if (!(formData.summary || '').trim() && !(formData.content || '').trim()) {
      nextErrors.summaryContent = 'Please provide a summary or detailed content.';
    }
    if ((formData.externalImageUrl || '').trim() && !validSourceUrl(formData.externalImageUrl || '')) {
      nextErrors.externalImageUrl = 'Enter a valid http/https image URL.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForSave()) return;
    const payload: CreateNewsResearchDraftRequest = {
      ...formData,
      title: formData.title.trim(),
      sourceUrl: formData.sourceUrl.trim(),
      publishedAt: formData.publishedAt.length === 16 ? `${formData.publishedAt}:00` : formData.publishedAt,
      summary: formData.summary?.trim() || null,
      content: formData.content?.trim() || null,
      externalImageUrl: imageMode === 'url' ? formData.externalImageUrl?.trim() || null : null,
      imageStorageKey: imageMode === 'upload' ? formData.imageStorageKey || null : null,
      sourceName: formData.sourceName?.trim() || null,
      author: formData.author?.trim() || null,
      tags: formData.tags?.filter((tag) => tag.trim()) || [],
      staffNotes: formData.staffNotes?.trim() || null,
    };
    onSave(payload);
  };

  const handleImageFile = async (file: File | null) => {
    if (!file) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next.image;
      return next;
    });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrors((prev) => ({ ...prev, image: 'Only JPG, PNG and WEBP images are supported.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Image must be 5 MB or smaller.' }));
      return;
    }
    try {
      setUploading(true);
      const storageKey = await onUploadImage(file);
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(URL.createObjectURL(file));
      setUploadedFileMeta({ name: file.name, size: file.size });
      setImageMode('upload');
      setFormData((prev) => ({ ...prev, imageStorageKey: storageKey, externalImageUrl: '' }));
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        image: error instanceof Error ? error.message : 'Image upload failed.',
      }));
    } finally {
      setUploading(false);
    }
  };

  const control = {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#0f172a',
    fontSize: '14px',
    outline: 'none',
    background: canEdit ? '#fff' : '#f8fafc',
  } as const;
  const label = { display: 'grid', gap: '7px', color: '#334155', fontWeight: 700, fontSize: '13px' } as const;
  const errorText = { color: '#dc2626', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
        <div>
          <span style={{ color: '#2563eb', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}>News article draft</span>
          <h3 style={{ margin: '4px 0 0', color: '#0f172a', fontSize: '20px' }}>{initialData ? 'Edit News Article' : 'Add News Article'}</h3>
        </div>
        <button type="button" onClick={onCancel} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', background: '#f8fafc' }}>
        <div style={{ display: 'grid', gap: '16px', maxWidth: '980px', margin: '0 auto' }}>
          <section style={{ border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', padding: '18px', display: 'grid', gap: '14px' }}>
            <label style={label}>
              Title *
              <input style={{ ...control, borderColor: errors.title ? '#dc2626' : '#cbd5e1' }} value={formData.title} onChange={(e) => handleChange('title', e.target.value)} disabled={!canEdit} />
              {errors.title && <span style={errorText}><AlertCircle size={13} />{errors.title}</span>}
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 220px)', gap: '14px' }}>
              <label style={label}>
                Source URL *
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Link size={15} style={{ position: 'absolute', left: 10, top: 12, color: '#64748b' }} />
                    <input style={{ ...control, paddingLeft: 32, borderColor: errors.sourceUrl ? '#dc2626' : '#cbd5e1' }} value={formData.sourceUrl} onChange={(e) => handleChange('sourceUrl', e.target.value)} placeholder="https://..." disabled={!canEdit} />
                  </div>
                  <a href={sourceIsValid ? formData.sourceUrl : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!sourceIsValid} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 8, color: sourceIsValid ? '#1d4ed8' : '#94a3b8', background: '#fff', textDecoration: 'none', pointerEvents: sourceIsValid ? 'auto' : 'none', fontWeight: 700 }}>
                    Open Source <ExternalLink size={14} />
                  </a>
                </div>
                {errors.sourceUrl && <span style={errorText}><AlertCircle size={13} />{errors.sourceUrl}</span>}
              </label>
              <label style={label}>
                Published At *
                <input type="datetime-local" style={{ ...control, borderColor: errors.publishedAt ? '#dc2626' : '#cbd5e1' }} value={formData.publishedAt} onChange={(e) => handleChange('publishedAt', e.target.value)} disabled={!canEdit} />
                {errors.publishedAt && <span style={errorText}><AlertCircle size={13} />{errors.publishedAt}</span>}
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              <label style={label}>
                Source Name
                <input style={control} value={formData.sourceName || ''} onChange={(e) => handleChange('sourceName', e.target.value)} disabled={!canEdit} />
              </label>
              <label style={label}>
                Author
                <input style={control} value={formData.author || ''} onChange={(e) => handleChange('author', e.target.value)} disabled={!canEdit} />
              </label>
            </div>
          </section>

          <section style={{ border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', padding: '18px', display: 'grid', gap: '14px' }}>
            <div>
              <h4 style={{ margin: 0, color: '#0f172a' }}>Article body</h4>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>At least one of Summary or Detailed Content is required.</p>
            </div>
            {errors.summaryContent && <span style={errorText}><AlertCircle size={13} />{errors.summaryContent}</span>}
            <label style={label}>
              Summary
              <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Short summary of the article.</span>
              <textarea rows={4} style={{ ...control, resize: 'vertical' }} value={formData.summary || ''} onChange={(e) => handleChange('summary', e.target.value)} disabled={!canEdit} />
            </label>
            <label style={label}>
              Detailed Content
              <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Detailed article content or research notes.</span>
              <textarea rows={8} style={{ ...control, resize: 'vertical' }} value={formData.content || ''} onChange={(e) => handleChange('content', e.target.value)} disabled={!canEdit} />
            </label>
          </section>

          <section style={{ border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', padding: '18px', display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <h4 style={{ margin: 0, color: '#0f172a' }}>Article Image</h4>
              <div style={{ display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                <button type="button" onClick={() => setImageMode('upload')} style={{ padding: '8px 12px', border: 0, background: imageMode === 'upload' ? '#eff6ff' : '#fff', color: '#1d4ed8', fontWeight: 800, cursor: 'pointer' }}>Upload Image</button>
                <button type="button" onClick={() => setImageMode('url')} style={{ padding: '8px 12px', border: 0, borderLeft: '1px solid #cbd5e1', background: imageMode === 'url' ? '#eff6ff' : '#fff', color: '#1d4ed8', fontWeight: 800, cursor: 'pointer' }}>Use Image URL</button>
              </div>
            </div>
            {imageMode === 'upload' ? (
              <label style={{ border: '1px dashed #94a3b8', borderRadius: '10px', background: '#f8fafc', minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', cursor: canEdit ? 'pointer' : 'default', padding: '18px' }}>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void handleImageFile(e.target.files?.[0] ?? null)} disabled={!canEdit || uploading} style={{ display: 'none' }} />
                {localPreview ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, width: '100%', alignItems: 'center', textAlign: 'left' }}>
                    <img src={localPreview} alt="Uploaded preview" style={{ width: '160px', height: '90px', objectFit: 'cover', borderRadius: 8 }} />
                    <div>
                      <strong>{uploadedFileMeta?.name || 'Uploaded image'}</strong>
                      <p style={{ margin: '5px 0', color: '#64748b' }}>{uploadedFileMeta ? `${(uploadedFileMeta.size / 1024 / 1024).toFixed(2)} MB` : formData.imageStorageKey}</p>
                      <span style={{ color: '#2563eb', fontSize: 13, fontWeight: 700 }}>Click to replace</span>
                    </div>
                  </div>
                ) : formData.imageStorageKey ? (
                  <div style={{ color: '#475569' }}><ImageIcon size={28} /><strong style={{ display: 'block', marginTop: 8 }}>Uploaded image attached</strong><span style={{ fontSize: 12 }}>{formData.imageStorageKey}</span></div>
                ) : uploading ? (
                  <div style={{ color: '#2563eb' }}><Loader2 size={28} className="animate-spin" /><strong style={{ display: 'block', marginTop: 8 }}>Uploading image...</strong></div>
                ) : (
                  <div style={{ color: '#64748b' }}><Upload size={28} /><strong style={{ display: 'block', marginTop: 8 }}>Drag image here or click to browse</strong><span style={{ fontSize: 12 }}>JPG, PNG, WEBP · Max 5 MB</span></div>
                )}
              </label>
            ) : (
              <label style={label}>
                External Image URL
                <input style={{ ...control, borderColor: errors.externalImageUrl ? '#dc2626' : '#cbd5e1' }} value={formData.externalImageUrl || ''} placeholder="https://..." onChange={(e) => handleChange('externalImageUrl', e.target.value)} disabled={!canEdit} />
                {errors.externalImageUrl && <span style={errorText}><AlertCircle size={13} />{errors.externalImageUrl}</span>}
              </label>
            )}
            {errors.image && <span style={errorText}><AlertCircle size={13} />{errors.image}</span>}
          </section>

          <section style={{ border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', padding: '18px', display: 'grid', gap: '14px' }}>
            <label style={label}>
              Tags
              <NewsTagsInput tags={formData.tags || []} onChange={(tags) => handleChange('tags', tags)} disabled={!canEdit} />
            </label>
            <label style={label}>
              Staff Notes
              <textarea rows={3} style={{ ...control, resize: 'vertical' }} value={formData.staffNotes || ''} onChange={(e) => handleChange('staffNotes', e.target.value)} disabled={!canEdit} />
            </label>
          </section>
        </div>
      </div>

      <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <button type="button" onClick={onCancel} disabled={saving || uploading} style={{ padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', color: '#334155', fontWeight: 800, cursor: 'pointer' }}>
          Cancel
        </button>
        {canEdit && (
          <button type="button" onClick={handleSave} disabled={saving || uploading} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid #2563eb', borderRadius: '8px', background: '#2563eb', color: '#fff', fontWeight: 900, cursor: saving || uploading ? 'wait' : 'pointer' }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : initialData ? 'Save Changes' : 'Save Draft'}
          </button>
        )}
      </div>
    </div>
  );
};
