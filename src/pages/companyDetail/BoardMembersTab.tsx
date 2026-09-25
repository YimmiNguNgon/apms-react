import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Plus, Trash2, Upload, Camera, Users } from 'lucide-react';
import { listingDataApi } from '../../API/listingDataApi';
import { API_BASE_URL } from '../../services/api';
import type { CompanyBoardMember } from '../../types/listingData';
import type { CompanyProfileMember } from '../../types/domain';
import { initialsOf, useListingTabData } from './utils';
import { CompanyDetailEmptyState } from './CompanyDetailEmptyState';

export interface BoardMembersTabProps {
  companyId: string;
  isInlineEditing?: boolean;
  members?: CompanyProfileMember[];
  onAddMember?: () => void;
  onUpdateMember?: (
    index: number,
    fieldOrPartial: keyof CompanyProfileMember | Partial<CompanyProfileMember>,
    value?: any
  ) => void;
  onDeleteMember?: (index: number) => void;
  disabled?: boolean;
  canManage?: boolean;
  onStartManageLeadership?: () => void;
}

export const resolveMemberImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const cleanBase = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${cleanBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const formatFileSize = (bytes?: number | null): string => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #CBD5E1',
  borderRadius: '6px',
  fontSize: '0.75rem',
  color: '#0F172A',
  backgroundColor: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box',
};

interface MemberPhotoUploadFieldProps {
  member: CompanyProfileMember;
  onPhotoChange: (file: File, previewUrl: string) => void;
  onPhotoRemove: () => void;
  disabled?: boolean;
}

const MemberPhotoUploadField: React.FC<MemberPhotoUploadFieldProps> = ({
  member,
  onPhotoChange,
  onPhotoRemove,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const activePhotoUrl = member.previewUrl || member.imageUrl;
  const hasPhoto = Boolean(activePhotoUrl && activePhotoUrl.trim());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    // Validate type: JPG, PNG, WEBP
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!validTypes.includes(file.type) && !hasValidExt) {
      setValidationError('Please select a JPG, PNG, or WEBP image.');
      return;
    }

    // Validate size: max 5 MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setValidationError('Image size must not exceed 5 MB.');
      return;
    }

    setValidationError(null);
    const objectUrl = URL.createObjectURL(file);
    onPhotoChange(file, objectUrl);
  };

  const handleRemove = () => {
    setValidationError(null);
    onPhotoRemove();
  };

  const displayUrl = resolveMemberImageUrl(activePhotoUrl);
  const displayName = member.imageFileName || (activePhotoUrl ? activePhotoUrl.split('/').pop()?.split('?')[0] : 'photo');

  return (
    <div>
      <label style={{ fontSize: '0.62rem', color: '#64748B', display: 'block', marginBottom: '4px' }}>
        Photo
      </label>

      {hasPhoto ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
          }}
        >
          <img
            src={displayUrl}
            alt={member.fullName || 'Preview'}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1px solid #CBD5E1',
              flexShrink: 0,
            }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#0F172A',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={displayName}
            >
              {displayName}
            </div>
            {member.imageFileSize ? (
              <div style={{ fontSize: '0.62rem', color: '#64748B' }}>
                {formatFileSize(member.imageFileSize)}
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => !disabled && fileInputRef.current?.click()}
                disabled={disabled}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  padding: 0,
                }}
              >
                Change Photo
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EF4444',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  padding: 0,
                }}
              >
                Remove Photo
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          style={{
            border: '1px dashed #CBD5E1',
            borderRadius: '6px',
            padding: '10px 12px',
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!disabled) (e.currentTarget as HTMLElement).style.borderColor = '#2563EB';
          }}
          onMouseLeave={(e) => {
            if (!disabled) (e.currentTarget as HTMLElement).style.borderColor = '#CBD5E1';
          }}
        >
          <Upload size={16} color="#2563EB" />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1E293B' }}>
            Upload photo
          </span>
          <span style={{ fontSize: '0.62rem', color: '#64748B' }}>
            Click to choose an image (JPG, PNG or WEBP &le; 5 MB)
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={disabled}
      />

      {validationError && (
        <span style={{ fontSize: '0.65rem', color: '#DC2626', display: 'block', marginTop: '4px' }}>
          {validationError}
        </span>
      )}
    </div>
  );
};

const BoardMembersTab: React.FC<BoardMembersTabProps> = ({
  companyId,
  isInlineEditing = false,
  members: propMembers,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  disabled = false,
  canManage = false,
  onStartManageLeadership,
}) => {
  // Only query listingDataApi if propMembers is not passed
  const { loading, error, data } = useListingTabData<CompanyBoardMember[]>(
    `board-members:${companyId}`,
    companyId,
    propMembers !== undefined ? () => Promise.resolve({ hasData: true, crawledAt: null, data: [] }) : listingDataApi.getBoardMembers,
  );

  const effectiveMembers: CompanyProfileMember[] = propMembers !== undefined
    ? propMembers
    : (data?.data ?? []).map(m => ({
        fullName: m.name ?? undefined,
        position: m.position ?? undefined,
        imageUrl: m.imageUrl ?? undefined,
        sourceUrl: m.profileUrl ?? undefined,
      }));

  const handlePhotoChange = (idx: number, file: File, previewUrl: string) => {
    const prev = (propMembers || [])[idx];
    if (prev?.previewUrl && prev.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(prev.previewUrl);
    }
    onUpdateMember?.(idx, {
      pendingImageFile: file,
      previewUrl,
      imageFileName: file.name,
      imageFileSize: file.size,
      imageUrl: previewUrl,
    });
  };

  const handlePhotoRemove = (idx: number) => {
    const prev = (propMembers || [])[idx];
    if (prev?.previewUrl && prev.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(prev.previewUrl);
    }
    onUpdateMember?.(idx, {
      pendingImageFile: undefined,
      previewUrl: null,
      imageFileName: null,
      imageFileSize: null,
      imageUrl: '',
    });
  };

  if (loading && propMembers === undefined) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', color: '#64748B', fontSize: '0.75rem' }}>
        Loading leadership data...
      </div>
    );
  }

  if (error && propMembers === undefined) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', color: '#EF4444', fontSize: '0.75rem' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Edit Mode Header Action */}
      {isInlineEditing && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onAddMember}
            disabled={disabled}
            style={{
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
            }}
          >
            <Plus size={14} />
            Add Member
          </button>
        </div>
      )}

      {/* View Mode Management Banner (When not editing but user has manage role) */}
      {!isInlineEditing && canManage && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            fontSize: '0.72rem',
            color: '#64748B',
          }}
        >
          <span>
            Hồ sơ doanh nghiệp chủ quản: bạn có quyền cập nhật danh sách Ban lãnh đạo trực tiếp.
          </span>
          <button
            type="button"
            onClick={onStartManageLeadership}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: '#0F172A',
              cursor: 'pointer',
            }}
          >
            Cập nhật ban lãnh đạo
          </button>
        </div>
      )}

      {/* Main Content: Edit Mode vs View Mode */}
      {isInlineEditing ? (
        (propMembers || []).length === 0 ? (
          <CompanyDetailEmptyState
            icon={<Users size={22} />}
            title="No leadership data yet"
            description="Leadership and key management information will appear here once it is available for this company."
          />
        ) : (
          /* Edit Mode: Compact Grid of editable Member Cards */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {(propMembers || []).map((member, idx) => (
            <div
              key={idx}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155' }}>
                  Member #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteMember?.(idx)}
                  disabled={disabled}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EF4444',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    padding: 0,
                  }}
                  title="Delete Member"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>

              <div>
                <label style={{ fontSize: '0.62rem', color: '#64748B', display: 'block', marginBottom: '2px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={member.fullName || ''}
                  onChange={(e) => onUpdateMember?.(idx, 'fullName', e.target.value)}
                  placeholder="Full Name (e.g. Nguyen Van A)"
                  disabled={disabled}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.62rem', color: '#64748B', display: 'block', marginBottom: '2px' }}>
                  Position *
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={member.position || ''}
                  onChange={(e) => onUpdateMember?.(idx, 'position', e.target.value)}
                  placeholder="Position (e.g. CEO / Director)"
                  disabled={disabled}
                />
              </div>

              {/* Photo Upload & Preview replaces Photo URL */}
              <div>
                <MemberPhotoUploadField
                  member={member}
                  onPhotoChange={(file, preview) => handlePhotoChange(idx, file, preview)}
                  onPhotoRemove={() => handlePhotoRemove(idx)}
                  disabled={disabled}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.62rem', color: '#64748B', display: 'block', marginBottom: '2px' }}>
                  Source URL
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={member.sourceUrl || ''}
                  onChange={(e) => onUpdateMember?.(idx, 'sourceUrl', e.target.value)}
                  placeholder="https://... (source)"
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
        </div>
        )
      ) : effectiveMembers.length === 0 ? (
        <CompanyDetailEmptyState
          icon={<Users size={22} />}
          title="No leadership data yet"
          description="Leadership and key management information will appear here once it is available for this company."
        />
      ) : (
        /* View Mode: Clean flat member list, strictly preserving persisted order, no role grouping */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {effectiveMembers.map((member, idx) => (
            <div
              key={idx}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              {member.imageUrl ? (
                <img
                  src={resolveMemberImageUrl(member.imageUrl)}
                  alt={member.fullName || ''}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                    border: '1px solid #E2E8F0',
                  }}
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    (e.target as HTMLElement).style.display = 'none';
                    const fallback = (e.target as HTMLElement).nextElementSibling;
                    if (fallback) {
                      (fallback as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: member.imageUrl ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {initialsOf(member.fullName)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', margin: '0 0 2px', wordBreak: 'break-word' }}>
                  {member.fullName || 'Unnamed Member'}
                </h4>
                <p style={{ fontSize: '0.7rem', color: '#2563EB', fontWeight: 600, margin: 0, wordBreak: 'break-word' }}>
                  {member.position || 'No title'}
                </p>
                {member.sourceUrl && (
                  <a
                    href={member.sourceUrl.startsWith('http') ? member.sourceUrl : `https://${member.sourceUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '0.62rem',
                      color: '#64748B',
                      marginTop: '3px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={10} />
                    Source
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BoardMembersTab;
