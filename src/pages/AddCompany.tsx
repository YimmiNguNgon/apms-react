import React from 'react';

// For BD Staff: Upload documents and fill in company profile data
export const AddCompany: React.FC = () => {
  return (
    <section className="page active" id="page-add-company">
      <div className="breadcrumb"><a>Hồ sơ DN</a> / <span>Thêm mới</span></div>
      <div className="page-header"><h1>Thêm Hồ sơ Doanh nghiệp Mới</h1></div>

      <div className="step-indicator">
        <div className="step active"><div className="step-number">1</div><span className="step-label">Thông tin cơ bản</span></div>
        <div className="step-line"></div>
        <div className="step"><div className="step-number">2</div><span className="step-label">Năng lực &amp; Tài chính</span></div>
        <div className="step-line"></div>
        <div className="step"><div className="step-number">3</div><span className="step-label">Quan hệ &amp; Rủi ro</span></div>
        <div className="step-line"></div>
        <div className="step"><div className="step-number">4</div><span className="step-label">Xác nhận</span></div>
      </div>

      <div className="card form-card">
        <div className="form-section">
          <h3>🔍 Tra cứu tự động</h3>
          <div className="lookup-row">
            <input type="text" className="form-input" placeholder="Nhập Mã số Thuế (MST)..." />
            <button className="btn btn-primary">Tra cứu tự động 🔍</button>
          </div>
        </div>

        <div className="form-section">
          <h3>📎 Tải lên tài liệu năng lực</h3>
          <div className="upload-zone">
            <div className="upload-icon">📄</div>
            <p>Kéo thả file hoặc <span className="upload-link">Chọn file</span></p>
            <p className="upload-hint">PDF, DOCX, PPT, Excel — tối đa 50MB</p>
          </div>
        </div>

        <div className="form-section">
          <h3>📋 Thông tin cơ bản</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Tên pháp lý <span className="required">*</span></label>
              <input type="text" className="form-input" placeholder="Tên đầy đủ..." />
            </div>
            <div className="form-field">
              <label>Tên thương mại</label>
              <input type="text" className="form-input" placeholder="Tên thương mại..." />
            </div>
            <div className="form-field">
              <label>Website</label>
              <input type="text" className="form-input" placeholder="https://" />
            </div>
            <div className="form-field">
              <label>Số điện thoại</label>
              <input type="text" className="form-input" placeholder="+84..." />
            </div>
            <div className="form-field full-width">
              <label>Địa chỉ trụ sở</label>
              <input type="text" className="form-input" placeholder="Địa chỉ đầy đủ..." />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>🏷️ Phân loại quan hệ</h3>
          <div className="radio-group-row">
            <label className="radio-card active"><input type="radio" name="relation" defaultChecked /><span className="radio-card-label">🤝 Đối tác</span></label>
            <label className="radio-card"><input type="radio" name="relation" /><span className="radio-card-label">⚔️ Đối thủ</span></label>
            <label className="radio-card"><input type="radio" name="relation" /><span className="radio-card-label">🔍 Tiềm năng</span></label>
            <label className="radio-card"><input type="radio" name="relation" /><span className="radio-card-label">📁 Khác</span></label>
          </div>
          <div className="form-grid mt-12">
            <div className="form-field">
              <label>Người phụ trách</label>
              <select className="form-input">
                <option>Hà Đức Huy</option>
                <option>Trần Minh</option>
                <option>Nguyễn An</option>
              </select>
            </div>
            <div className="form-field">
              <label>Ghi chú</label>
              <textarea className="form-input" rows={3} placeholder="Ghi chú thêm về đối tác..."></textarea>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-ghost">← Hủy</button>
          <button className="btn btn-outline">Lưu nháp</button>
          <button className="btn btn-primary">Tiếp theo →</button>
        </div>
      </div>
    </section>
  );
};
