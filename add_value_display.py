import re

file_path = r'd:\APMS\apms-react\src\pages\CompanyMonitoringPage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Create ValueDisplay component
value_display_code = """
const ValueDisplay = ({ value, level = 0 }: { value: unknown; level?: number }) => {
  if (value === null || value === undefined || value === '') return <span style={{ color: 'var(--text-muted)' }}>-</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  
  if (typeof value === 'string') {
    if (value.startsWith('http') && (value.includes('.jpg') || value.includes('.png') || value.includes('.jpeg') || value.includes('.webp'))) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <img src={value} alt="Preview" style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
          <a href={value} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#2563eb', wordBreak: 'break-all' }}>{value}</a>
        </div>
      );
    }
    if (value.startsWith('http')) {
      return <a href={value} target="_blank" rel="noreferrer" style={{ color: '#2563eb', wordBreak: 'break-all' }}>{value}</a>;
    }
    return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{value}</span>;
  }
  
  if (typeof value === 'number') return <span>{value}</span>;

  if (Array.isArray(value)) {
    if (!value.length) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    if (value.every((item) => typeof item !== 'object' || item === null)) {
      return <span>{value.join(', ')}</span>;
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {value.map((item, i) => (
          <div key={i} style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.4)' }}>
            <ValueDisplay value={item} level={level + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    const hiddenKeys = ['notes', 'researchedAt', 'researchedBy', 'taskId'];
    const entries = Object.entries(value).filter(([k, v]) => v !== null && v !== undefined && v !== '' && !hiddenKeys.includes(k));
    
    if (!entries.length) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
              {k.replace(/([A-Z])/g, ' $1').trim()}
            </div>
            <ValueDisplay value={v} level={level + 1} />
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
};

const CompanyMonitoringPage"""

content = content.replace('const CompanyMonitoringPage', value_display_code)

# Replace <pre> with ValueDisplay
old_values = """                        <div className="monitoring-change-values">
                          <div className="monitoring-value-box">
                            <span>Current</span>
                            <pre>{formatValue(change.currentValue)}</pre>
                          </div>
                          <div className="monitoring-value-box proposed">
                            <span>Proposed</span>
                            <pre>{formatValue(change.proposedValue)}</pre>
                          </div>
                        </div>"""

new_values = """                        <div className="monitoring-change-values">
                          <div className="monitoring-value-box">
                            <span>Current</span>
                            <div style={{ marginTop: '8px', color: 'var(--text-primary)', font: '400 var(--text-body)/1.5 \"Inter\", sans-serif' }}>
                              <ValueDisplay value={change.currentValue} />
                            </div>
                          </div>
                          <div className="monitoring-value-box proposed">
                            <span>Proposed</span>
                            <div style={{ marginTop: '8px', color: 'var(--text-primary)', font: '400 var(--text-body)/1.5 \"Inter\", sans-serif' }}>
                              <ValueDisplay value={change.proposedValue} />
                            </div>
                          </div>
                        </div>"""

content = content.replace(old_values, new_values)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated ValueDisplay component")
