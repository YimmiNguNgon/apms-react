import re

with open('src/pages/companyDetail/CompanyProfileTabs.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('  const renderOverviewView = () => {')
end_idx = content.find('  const renderSwotView = () => {')

if start_idx == -1 or end_idx == -1:
    print('Could not find blocks')
    exit(1)

new_overview_code = r'''
  const renderOverview = () => {
    const tradeName = profile.identity?.tradeName;
    const legalName = profile.identity?.legalName;
    const taxCode = profile.identity?.taxCode || 'Chưa cập nhật';
    const regNo = profile.identity?.registrationNumber || 'Chưa cập nhật';
    const empCount = profile.companySize?.employeeCount || intelligence?.company?.employeeCount;
    const empTier = profile.companySize?.employeeTier;
    const sizeStr = empCount ? `${empCount} nhân sự ${empTier ? `(${empTier})` : ''}` : (empTier || 'Chưa cập nhật');
    const website = profile.contact?.website || intelligence?.company?.website || 'Chưa cập nhật';
    const email = profile.contact?.emails?.[0] || 'Chưa cập nhật';
    const phone = profile.contact?.phones?.[0] || 'Chưa cập nhật';
    const address = profile.contact?.addresses?.[0]?.fullAddress || intelligence?.company?.headquarters || 'Chưa cập nhật';

    const setField = (key: keyof OverviewDraft) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setOverviewDraft((prev) => (prev ? { ...prev, [key]: event.target.value } : prev));
    };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: overviewAside ? '2fr 1fr' : '1fr', gap: '10px', alignItems: 'start' }} id="company-detail-2col-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Section: Identity */}
          <section style={C.card}>
            <div style={{ ...C.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={C.h2}>Thông tin Pháp lý & Định danh Doanh nghiệp</h2>
              {editable && editing !== 'overview_identity' && (
                <button type="button" onClick={() => startEditing('overview_identity')} style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.68rem', fontWeight: 600, padding: '3px 10px', borderRadius: '6px', cursor: 'pointer' }}>Chỉnh sửa</button>
              )}
            </div>
            {editing === 'overview_identity' && overviewDraft ? (
              <div style={{ padding: '16px' }}>
                <div style={C.fieldGrid}>
                  <FormField label="Tên Thương Mại (Trade Name)"><input value={overviewDraft.tradeName} onChange={setField('tradeName')} style={INPUT_STYLE} /></FormField>
                  <FormField label="Tên Pháp Lý (Legal Name)"><input value={overviewDraft.legalName} onChange={setField('legalName')} style={INPUT_STYLE} /></FormField>
                  <FormField label="Mã Số Thuế (Tax Code)"><input value={overviewDraft.taxCode} onChange={setField('taxCode')} style={INPUT_STYLE} /></FormField>
                  <FormField label="Số Giấy Đăng Ký KD (Registration No)"><input value={overviewDraft.registrationNumber} onChange={setField('registrationNumber')} style={INPUT_STYLE} /></FormField>
                </div>
                <div style={{ marginTop: '16px' }}><SaveBar saving={saving} msg={msg} onCancel={cancelAll} onSave={saveOverview} /></div>
              </div>
            ) : (
              <div style={C.fieldGrid}>
                <div style={C.fieldCell}><span style={C.fieldLabel}>Tên Thương Mại (Trade Name)</span><strong style={tradeName ? C.value : C.muted}>{tradeName || 'Chưa cập nhật'}</strong></div>
                <div style={C.fieldCell}><span style={C.fieldLabel}>Tên Pháp Lý (Legal Name)</span><strong style={legalName ? C.value : C.muted}>{legalName || 'Chưa cập nhật'}</strong></div>
                <div style={C.fieldCell}><span style={C.fieldLabel}>Mã Số Thuế (Tax Code)</span><strong style={{ ...(taxCode !== 'Chưa cập nhật' ? C.value : C.muted), fontFamily: 'monospace' }}>{taxCode}</strong></div>
                <div style={C.fieldCell}><span style={C.fieldLabel}>Số Giấy Đăng Ký KD (Registration No)</span><strong style={{ ...(regNo !== 'Chưa cập nhật' ? C.value : C.muted), fontFamily: 'monospace' }}>{regNo}</strong></div>
              </div>
            )}
          </section>

          {/* Section: Contact & Size */}
          <section style={C.card}>
            <div style={{ ...C.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={C.h2}>Thông tin Liên hệ & Quy mô</h2>
              {editable && editing !== 'overview_contact' && (
                <button type="button" onClick={() => startEditing('overview_contact')} style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.68rem', fontWeight: 600, padding: '3px 10px', borderRadius: '6px', cursor: 'pointer' }}>Chỉnh sửa</button>
              )}
            </div>
            {editing === 'overview_contact' && overviewDraft ? (
              <div style={{ padding: '16px' }}>
                <div style={C.fieldGrid}>
                  <FormField label="Website"><input value={overviewDraft.website} onChange={setField('website')} placeholder="https://..." style={INPUT_STYLE} /></FormField>
                  <FormField label="Email liên hệ"><input type="email" value={overviewDraft.email} onChange={setField('email')} style={INPUT_STYLE} /></FormField>
                  <FormField label="Điện thoại"><input value={overviewDraft.phone} onChange={setField('phone')} style={INPUT_STYLE} /></FormField>
                  <FormField label="Quy mô nhân sự (Employee Tier)">
                    <select value={overviewDraft.employeeTier} onChange={(event) => setOverviewDraft((prev) => (prev ? { ...prev, employeeTier: event.target.value } : prev))} style={INPUT_STYLE}>
                      <option value="">-- Chọn --</option><option value="1-10 employees">1-10 nhân sự</option><option value="11-50 employees">11-50 nhân sự</option><option value="51-200 employees">51-200 nhân sự</option><option value="201-500 employees">201-500 nhân sự</option><option value="501-1,000 employees">501-1,000 nhân sự</option><option value="1,001-5,000 employees">1,001-5,000 nhân sự</option><option value="5,001-10,000 employees">5,001-10,000 nhân sự</option><option value="10,000+ employees">10,000+ nhân sự</option>
                    </select>
                  </FormField>
                  <FormField label="Số lượng nhân sự (Employee Count)"><input type="number" min={1} value={overviewDraft.employeeCount} onChange={setField('employeeCount')} style={INPUT_STYLE} /></FormField>
                  <FormField label="Địa chỉ trụ sở chính"><input value={overviewDraft.address} onChange={setField('address')} style={INPUT_STYLE} /></FormField>
                </div>
                <div style={{ marginTop: '16px' }}><SaveBar saving={saving} msg={msg} onCancel={cancelAll} onSave={saveOverview} /></div>
              </div>
            ) : (
              <div style={C.fieldGrid}>
                <div style={C.fieldCell}><span style={C.fieldLabel}>Website</span><strong style={website !== 'Chưa cập nhật' ? C.link : C.muted}>{website !== 'Chưa cập nhật' ? <a href={website} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{website}</a> : website}</strong></div>
                <div style={C.fieldCell}><span style={C.fieldLabel}>Email liên hệ</span><strong style={email !== 'Chưa cập nhật' ? C.value : C.muted}>{email}</strong></div>
                <div style={C.fieldCell}><span style={C.fieldLabel}>Điện thoại</span><strong style={phone !== 'Chưa cập nhật' ? C.value : C.muted}>{phone}</strong></div>
                <div style={C.fieldCell}><span style={C.fieldLabel}>Quy mô nhân sự</span><strong style={sizeStr !== 'Chưa cập nhật' ? C.value : C.muted}>{sizeStr}</strong></div>
                <div style={{ ...C.fieldCell, gridColumn: '1 / -1' }}><span style={C.fieldLabel}>Địa chỉ trụ sở chính</span><strong style={address !== 'Chưa cập nhật' ? C.value : C.muted}>{address}</strong></div>
              </div>
            )}
          </section>

          {/* Section: Business */}
          <section style={C.card}>
            <div style={{ ...C.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={C.h2}>Giới thiệu & Mô hình kinh doanh</h2>
              {editable && editing !== 'overview_business' && (
                <button type="button" onClick={() => startEditing('overview_business')} style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.68rem', fontWeight: 600, padding: '3px 10px', borderRadius: '6px', cursor: 'pointer' }}>Chỉnh sửa</button>
              )}
            </div>
            {editing === 'overview_business' && overviewDraft ? (
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <FormField label="Ngành nghề (phân cách bằng dấu phẩy)"><input value={overviewDraft.industries} onChange={setField('industries')} placeholder="VD: Công nghệ, Dịch vụ phần mềm" style={INPUT_STYLE} /></FormField>
                  <FormField label="Mô hình kinh doanh"><textarea rows={3} value={overviewDraft.businessModel} onChange={setField('businessModel')} style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: '1.4' }} /></FormField>
                </div>
                <div style={{ marginTop: '16px' }}><SaveBar saving={saving} msg={msg} onCancel={cancelAll} onSave={saveOverview} /></div>
              </div>
            ) : (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {profile.business?.industries && profile.business.industries.length > 0 ? (
                    profile.business.industries.map((ind, i) => (
                      <span key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.72rem', color: '#334155', fontWeight: 500 }}>{ind}</span>
                    ))
                  ) : <span style={C.muted}>Ngành nghề chưa cập nhật</span>}
                </div>
                <div>
                  <span style={C.fieldLabel}>Mô hình kinh doanh</span>
                  <div style={{ fontSize: '0.75rem', lineHeight: 1.5, color: '#334155', whiteSpace: 'pre-wrap', background: '#F8FAFC', padding: '10px', borderRadius: '6px', border: '1px solid #F1F5F9', marginTop: '4px' }}>
                    {profile.business?.businessModel || <span style={C.muted}>Chưa có thông tin mô hình kinh doanh.</span>}
                  </div>
                </div>
              </div>
            )}
          </section>

        </div>

        {overviewAside && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{overviewAside}</div>
        )}
      </div>
    );
  };

'''

new_content = content[:start_idx] + new_overview_code + content[end_idx:]

with open('src/pages/companyDetail/CompanyProfileTabs.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
