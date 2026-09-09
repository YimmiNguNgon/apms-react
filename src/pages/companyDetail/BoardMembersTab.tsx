import React, { useEffect, useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { listingDataApi } from '../../API/listingDataApi';
import type { CompanyBoardMember } from '../../types/listingData';
import type { CompanyProfileMember } from '../../types/domain';
import { initialsOf, useListingTabData } from './utils';

export interface BoardMembersTabProps {
  companyId: string;
  isInlineEditing?: boolean;
  members?: CompanyProfileMember[];
  onAddMember?: () => void;
  onUpdateMember?: (index: number, field: keyof CompanyProfileMember, value: string) => void;
  onDeleteMember?: (index: number) => void;
  disabled?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  border: '1px solid #CBD5E1',
  borderRadius: '6px',
  fontSize: '0.72rem',
  color: '#0F172A',
  backgroundColor: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box',
};

const BoardMembersTab: React.FC<BoardMembersTabProps> = ({
  companyId,
  isInlineEditing = false,
  members: propMembers,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  disabled = false,
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
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
            }}
          >
            <Plus size={13} />
            Add Member
          </button>
        </div>
      )}

      {/* Flat List of Members */}
      {effectiveMembers.length === 0 ? (
        <div style={{ background: '#FFFFFF', padding: '32px', textAlign: 'center', borderRadius: '10px', border: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.75rem' }}>
          No leadership members recorded.
        </div>
      ) : isInlineEditing ? (
        /* Edit Mode: Compact editable card per member */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {effectiveMembers.map((member, idx) => (
            <div
              key={idx}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ fontSize: '0.62rem', color: '#64748B', display: 'block', marginBottom: '2px' }}>
                    Photo URL
                  </label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={member.imageUrl || ''}
                    onChange={(e) => onUpdateMember?.(idx, 'imageUrl', e.target.value)}
                    placeholder="https://... (photo)"
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
            </div>
          ))}
        </div>
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
                  src={member.imageUrl}
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
                    // Fallback to hidden image so initials can show or placeholder
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {initialsOf(member.fullName)}
                </div>
              )}

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
