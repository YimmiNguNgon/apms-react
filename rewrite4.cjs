const fs = require('fs');
const content = fs.readFileSync('src/pages/companyDetail/CompanyProfileTabs.tsx', 'utf8');

const startIdx = content.indexOf('  const renderOverview = () => {');
const endIdx = content.indexOf('  const renderSwotView = () => {');

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find blocks", startIdx, endIdx);
  process.exit(1);
}

const newOverviewCode = `
  const [editingField, setEditingField] = useState<string | null>(null);

  const startFieldEdit = (key: string) => {
    startEditing('overview');
    setEditingField(key);
  };

  const cancelFieldEdit = () => {
    setEditingField(null);
    cancelAll();
  };

  const saveFieldEdit = () => {
    saveOverview();
    setEditingField(null);
  };

  const renderOverview = () => {
    const tradeName = profile.identity?.tradeName;
    const legalName = profile.identity?.legalName;
    const taxCode = profile.identity?.taxCode || 'Chưa cập nhật';
    const regNo = profile.identity?.registrationNumber || 'Chưa cập nhật';
    const empCount = profile.companySize?.employeeCount || intelligence?.company?.employeeCount;
    const empTier = profile.companySize?.employeeTier;
    const sizeStr = empCount ? \\\`\\\${empCount} nhân sự \\\${empTier ? \\\`(\\\${empTier})\\\` : ''}\\\` : (empTier || 'Chưa cập nhật');
    const website = profile.contact?.website || intelligence?.company?.website || 'Chưa cập nhật';
    const email = profile.contact?.emails?.[0] || 'Chưa cập nhật';
    const phone = profile.contact?.phones?.[0] || 'Chưa cập nhật';
    const address = profile.contact?.addresses?.[0]?.fullAddress || intelligence?.company?.headquarters || 'Chưa cập nhật';

    const setField = (key: keyof OverviewDraft) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setOverviewDraft((prev) => (prev ? { ...prev, [key]: event.target.value } : prev));
    };

    const renderEditableField = (
      key: keyof OverviewDraft,
      label: string,
      currentValue: React.ReactNode,
      hasValue: boolean,
      renderInput: () => React.ReactNode,
      isFullWidth: boolean = false
    ) => {
      const isEditingThis = editingField === key && overviewDraft;
      return (
        <div style={{ ...C.fieldCell, position: 'relative', gridColumn: isFullWidth ? '1 / -1' : 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={C.fieldLabel}>{label}</span>
            {editable && !isEditingThis && (
              <button 
                type="button" 
                onClick={() => startFieldEdit(key)} 
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', padding: '2px 8px', borderRadius: '4px' }}>
                Chỉnh sửa
              </button>
            )}
          </div>
          {isEditingThis ? (
            <div style={{ marginTop: '4px' }}>
              {renderInput()}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={cancelFieldEdit} style={{ ...GHOST_BUTTON, padding: '4px 12px', fontSize: '0.75rem', height: 'auto', minHeight: '28px' }}>Hủy</button>
                <button type="button" onClick={saveFieldEdit} disabled={saving} style={{ ...PRIMARY_BUTTON, padding: '4px 12px', fontSize: '0.75rem', height: 'auto', minHeight: '28px' }}>
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
                {msg && <span style={{ fontSize: '0.66rem', fontWeight: 600, color: msg.ok ? '#15803D' : '#B91C1C', alignSelf: 'center' }}>{msg.text}</span>}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '2px' }}>
              {typeof currentValue === 'string' ? (
                 <strong style={{ ...(hasValue ? C.value : C.muted), whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{currentValue}</strong>
              ) : currentValue}
            </div>
          )}
        </div>
      );
    };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: overviewAside ? '2fr 1fr' : '1fr', gap: '10px', alignItems: 'start' }} id="company-detail-2col-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          <section style={C.card}>
            <div style={C.cardHeader}><h2 style={C.h2}>Thông tin Pháp lý & Định danh Doanh nghiệp</h2></div>
            <div style={C.fieldGrid}>
              {renderEditableField('tradeName', 'Tên Thương Mại (Trade Name)', tradeName || 'Chưa cập nhật', !!tradeName, () => (
                <input value={overviewDraft!.tradeName} onChange={setField('tradeName')} style={INPUT_STYLE} />
              ))}
              {renderEditableField('legalName', 'Tên Pháp Lý (Legal Name)', legalName || 'Chưa cập nhật', !!legalName, () => (
                <input value={overviewDraft!.legalName} onChange={setField('legalName')} style={INPUT_STYLE} />
              ))}
              {renderEditableField('taxCode', 'Mã Số Thuế (Tax Code)', taxCode, taxCode !== 'Chưa cập nhật', () => (
                <input value={overviewDraft!.taxCode} onChange={setField('taxCode')} style={INPUT_STYLE} />
              ))}
              {renderEditableField('registrationNumber', 'Số Giấy Đăng Ký KD', regNo, regNo !== 'Chưa cập nhật', () => (
                <input value={overviewDraft!.registrationNumber} onChange={setField('registrationNumber')} style={INPUT_STYLE} />
              ))}
            </div>
          </section>

          <section style={C.card}>
            <div style={C.cardHeader}><h2 style={C.h2}>Thông tin Liên hệ & Quy mô</h2></div>
            <div style={C.fieldGrid}>
              {renderEditableField('website', 'Website', website !== 'Chưa cập nhật' ? <a href={website} target="_blank" rel="noreferrer" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>{website}</a> : <strong style={C.muted}>{website}</strong>, website !== 'Chưa cập nhật', () => (
                <input value={overviewDraft!.website} onChange={setField('website')} placeholder="https://..." style={INPUT_STYLE} />
              ))}
              {renderEditableField('email', 'Email liên hệ', email, email !== 'Chưa cập nhật', () => (
                <input type="email" value={overviewDraft!.email} onChange={setField('email')} style={INPUT_STYLE} />
              ))}
              {renderEditableField('phone', 'Điện thoại', phone, phone !== 'Chưa cập nhật', () => (
                <input value={overviewDraft!.phone} onChange={setField('phone')} style={INPUT_STYLE} />
              ))}
              {renderEditableField('employeeTier', 'Quy mô nhân sự (Tier)', sizeStr, sizeStr !== 'Chưa cập nhật', () => (
                <select value={overviewDraft!.employeeTier} onChange={setField('employeeTier')} style={INPUT_STYLE}>
                  <option value="">-- Chọn --</option>
                  <option value="1-10 employees">1-10 nhân sự</option>
                  <option value="11-50 employees">11-50 nhân sự</option>
                  <option value="51-200 employees">51-200 nhân sự</option>
                  <option value="201-500 employees">201-500 nhân sự</option>
                  <option value="501-1,000 employees">501-1,000 nhân sự</option>
                  <option value="1,001-5,000 employees">1,001-5,000 nhân sự</option>
                  <option value="5,001-10,000 employees">5,001-10,000 nhân sự</option>
                  <option value="10,000+ employees">10,000+ nhân sự</option>
                </select>
              ))}
              {renderEditableField('employeeCount', 'Số lượng nhân sự (Count)', empCount ? String(empCount) : 'Chưa cập nhật', !!empCount, () => (
                <input type="number" min={1} value={overviewDraft!.employeeCount} onChange={setField('employeeCount')} style={INPUT_STYLE} />
              ))}
              {renderEditableField('address', 'Địa chỉ trụ sở chính', address, address !== 'Chưa cập nhật', () => (
                <input value={overviewDraft!.address} onChange={setField('address')} style={INPUT_STYLE} />
              ), true)}
            </div>
          </section>

          <section style={C.card}>
            <div style={C.cardHeader}><h2 style={C.h2}>Giới thiệu & Mô hình kinh doanh</h2></div>
            <div style={C.fieldGrid}>
              {renderEditableField('industries', 'Ngành nghề', profile.business?.industries && profile.business.industries.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {profile.business.industries.map((ind, i) => <span key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#334155', fontWeight: 500 }}>{ind}</span>)}
                </div>
              ) : 'Chưa cập nhật', !!profile.business?.industries?.length, () => (
                <input value={overviewDraft!.industries} onChange={setField('industries')} placeholder="VD: Công nghệ, Dịch vụ phần mềm" style={INPUT_STYLE} />
              ), true)}

              {renderEditableField('businessModel', 'Mô hình kinh doanh', profile.business?.businessModel || 'Chưa cập nhật', !!profile.business?.businessModel, () => (
                <textarea rows={4} value={overviewDraft!.businessModel} onChange={setField('businessModel')} style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: '1.5' }} />
              ), true)}
            </div>
          </section>
        </div>

        {overviewAside && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{overviewAside}</div>
        )}
      </div>
    );
  };
  /* ―― SWOT ―――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――― */
`;

let newContent = content.slice(0, startIdx) + newOverviewCode + content.slice(endIdx);
newContent = newContent.replace(/const sizeStr = empCount \? \\\`\\\$\{empCount\}/, 'const sizeStr = empCount ? `${empCount}');
fs.writeFileSync('src/pages/companyDetail/CompanyProfileTabs.tsx', newContent, 'utf8');
