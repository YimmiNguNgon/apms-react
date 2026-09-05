import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import type { AiFieldResult } from '../../types/domain';
import { EditableFieldCard } from './EditableFieldCard';
import styles from './CandidateReview.module.css';

interface Product {
  name?: string;
  category?: string;
  description?: string;
}

interface EditableProductListProps {
  label: string;
  fieldKey: string;
  fieldResult?: AiFieldResult;
  onChange: (key: string, value: Product[], status?: string) => void;
  disabled?: boolean;
}

export const EditableProductList: React.FC<EditableProductListProps> = ({
  label,
  fieldKey,
  fieldResult,
  onChange,
  disabled,
}) => {
  const hasStaffReviewedValue = fieldResult?.reviewedValue !== undefined || fieldResult?.staffReviewedValue !== undefined;
  const rawCurrentValue = hasStaffReviewedValue
    ? (fieldResult?.reviewedValue !== undefined ? fieldResult.reviewedValue : fieldResult?.staffReviewedValue)
    : fieldResult?.value;
  const currentValue: Product[] = Array.isArray(rawCurrentValue) ? rawCurrentValue : [];
  const aiOriginal: Product[] = Array.isArray(fieldResult?.value) ? fieldResult.value : [];

  const [draftProducts, setDraftProducts] = useState<Product[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Product>({});
  
  const [showAll, setShowAll] = useState(false);
  const initialShowCount = 3;

  useEffect(() => {
    setDraftProducts(currentValue);
  }, [JSON.stringify(currentValue)]);

  const handleSaveList = () => {
    let finalProducts = draftProducts;
    if (adding && draft.name?.trim()) {
      finalProducts = [...draftProducts, draft];
      setDraftProducts(finalProducts);
      setDraft({});
      setAdding(false);
    }
    const isUnchanged = JSON.stringify(finalProducts) === JSON.stringify(currentValue);
    if (isUnchanged) {
      const currentStatus = fieldResult?.staffReviewStatus ?? 'PENDING';
      onChange(fieldKey, finalProducts, currentStatus);
      return;
    }

    const isAiValEmpty = aiOriginal.length === 0;
    const isNowEmpty = finalProducts.length === 0;
    const status = isAiValEmpty ? 'ADDED' : (isNowEmpty ? 'REMOVED' : 'EDITED');
    onChange(fieldKey, finalProducts, status);
  };

  const handleCancelList = () => {
    setDraftProducts(currentValue);
    setAdding(false);
  };

  const handleConfirm = () => {
    onChange(fieldKey, currentValue, 'CONFIRMED');
  };

  const handleRestore = () => {
    onChange(fieldKey, aiOriginal, 'RESTORED');
  };

  const addProduct = () => {
    if (!draft.name?.trim()) {
      setAdding(false);
      return;
    }
    setDraftProducts([...draftProducts, draft]);
    setDraft({});
    setAdding(false);
  };

  const deleteProduct = (index: number) => {
    setDraftProducts(draftProducts.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof Product, val: string) => {
    const newList = [...draftProducts];
    newList[index] = { ...newList[index], [field]: val };
    setDraftProducts(newList);
  };

  const displayList = (
    <div className={styles.productGrid}>
      {currentValue.length > 0 ? (
        <>
          {currentValue.slice(0, showAll ? currentValue.length : initialShowCount).map((p, idx) => (
            <div key={idx} className={styles.productCard}>
              <div className={styles.productHeader}>
                <span className={styles.productName}>{p.name || 'Unnamed Product'}</span>
                {p.category && <span className={styles.productCategory}>{p.category}</span>}
              </div>
              {p.description && <p className={styles.productDesc}>{p.description}</p>}
            </div>
          ))}
          {currentValue.length > initialShowCount && (
            <button 
              type="button" 
              className={styles.btnSecondary} 
              onClick={() => setShowAll(!showAll)}
              style={{ alignSelf: 'flex-start', marginTop: '8px' }}
            >
              {showAll ? <><ChevronUp size={14}/> Show less</> : <><ChevronDown size={14}/> Show {currentValue.length - initialShowCount} more</>}
            </button>
          )}
        </>
      ) : (
        <span className={styles.emptyValue}>N/A</span>
      )}
    </div>
  );

  return (
    <EditableFieldCard
      label={label}
      fieldResult={fieldResult}
      onSave={handleSaveList}
      onCancel={handleCancelList}
      onConfirm={handleConfirm}
      onRestore={handleRestore}
      currentValueDisplay={displayList}
      isList
      disabled={disabled}
    >
      <div className={styles.productGrid}>
        {draftProducts.map((p, idx) => (
          <div key={idx} className={styles.productCard}>
            <div className={styles.editContainer}>
              <div className={styles.grid2Col}>
                <input 
                  type="text" 
                  placeholder="Product Name" 
                  value={p.name || ''} 
                  onChange={(e) => updateProduct(idx, 'name', e.target.value)} 
                  className={styles.input} 
                />
                <input 
                  type="text" 
                  placeholder="Category" 
                  value={p.category || ''} 
                  onChange={(e) => updateProduct(idx, 'category', e.target.value)} 
                  className={styles.input} 
                />
              </div>
              <textarea 
                placeholder="Description" 
                value={p.description || ''} 
                onChange={(e) => updateProduct(idx, 'description', e.target.value)} 
                className={styles.textarea} 
                rows={2} 
              />
              <div className={styles.productActions}>
                <button type="button" className={styles.btnDanger} onClick={() => deleteProduct(idx)}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        {adding ? (
          <div className={styles.productCard}>
            <div className={styles.editContainer}>
              <div className={styles.grid2Col}>
                <input 
                  type="text" 
                  placeholder="Product Name" 
                  value={draft.name || ''} 
                  onChange={(e) => setDraft({...draft, name: e.target.value})} 
                  className={styles.input}
                  autoFocus 
                />
                <input 
                  type="text" 
                  placeholder="Category" 
                  value={draft.category || ''} 
                  onChange={(e) => setDraft({...draft, category: e.target.value})} 
                  className={styles.input} 
                />
              </div>
              <textarea 
                placeholder="Description" 
                value={draft.description || ''} 
                onChange={(e) => setDraft({...draft, description: e.target.value})} 
                className={styles.textarea} 
                rows={2} 
              />
              <div className={styles.productActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => { setDraft({}); setAdding(false); }}>
                  <X size={14} /> Cancel
                </button>
                <button type="button" className={styles.btnPrimary} onClick={addProduct}>
                  <Plus size={14} /> Add Product
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button type="button" className={styles.btnSecondary} onClick={() => setAdding(true)} style={{ alignSelf: 'flex-start' }}>
            <Plus size={14} /> Add new product
          </button>
        )}
      </div>
    </EditableFieldCard>
  );
};
