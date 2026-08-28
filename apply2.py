import re

with open(r'src\pages\CompanyMonitoringPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the first staffFilter select
content = re.sub(r'\s*<select className="admin-select" value=\{staffFilter\}.*?</select>', '', content, flags=re.DOTALL)

# Remove the proposalStaffFilter select
content = re.sub(r'\s*<select\s+className="admin-select"\s+value=\{proposalStaffFilter\}.*?</select>', '', content, flags=re.DOTALL)

with open(r'src\pages\CompanyMonitoringPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open(r'src\index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Append CSS for alignment
new_css = """
.monitoring-company-link {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  text-align: left;
  font: inherit;
  color: var(--text-primary);
  cursor: pointer;
  text-decoration: none;
}
.monitoring-company-link:hover {
  text-decoration: underline;
  color: var(--primary-color, #2563eb);
}

.monitoring-management-header {
  padding: 12px 16px;
  background: transparent;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.monitoring-management-row {
  padding: 16px;
  background: var(--bg-card, #ffffff);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  font-size: 0.9rem;
}

.monitoring-proposal-table-header,
.monitoring-proposal-table-row,
.monitoring-history-header,
.monitoring-history-row {
  display: grid;
  grid-template-columns: minmax(180px, 2fr) minmax(160px, 1.5fr) minmax(100px, 1fr) minmax(140px, 1fr) 100px;
  gap: 12px;
  align-items: center;
}

.monitoring-proposal-table-header, .monitoring-history-header {
  padding: 12px 16px;
  background: transparent;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
  text-transform: uppercase;
}

.monitoring-proposal-table-row, .monitoring-history-row {
  padding: 16px;
  background: var(--bg-card, #ffffff);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.monitoring-management-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}
.monitoring-management-filters .admin-input {
  flex-grow: 1;
}
"""

if '.monitoring-company-link' not in css:
    css += new_css

with open(r'src\index.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Updates applied")
