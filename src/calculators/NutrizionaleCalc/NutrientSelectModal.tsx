import React from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_OPTIONALS } from './TabUE';
import type { SelectedOptionals } from './TabUE';

interface NutrientSelectModalProps {
  open: boolean;
  onClose: () => void;
  selected: SelectedOptionals;
  onChange: (s: SelectedOptionals) => void;
}

type OptGroup = {
  title: string;
  items: { label: string; key: keyof SelectedOptionals }[];
};

const GROUPS: OptGroup[] = [
  {
    title: 'Nutrienti facoltativi',
    items: [
      { label: 'Acidi grassi monoinsaturi', key: 'monoins' },
      { label: 'Acidi grassi polinsaturi', key: 'polins' },
      { label: 'Polioli', key: 'polioli' },
      { label: 'Amido', key: 'amido' },
    ],
  },
  {
    title: 'Sali minerali',
    items: [
      { label: 'Potassio', key: 'potassio' },
      { label: 'Calcio', key: 'calcio' },
      { label: 'Fosforo', key: 'fosforo' },
      { label: 'Magnesio', key: 'magnesio' },
      { label: 'Ferro', key: 'ferro' },
      { label: 'Zinco', key: 'zinco' },
      { label: 'Rame', key: 'rame' },
      { label: 'Manganese', key: 'manganese' },
      { label: 'Selenio', key: 'selenio' },
      { label: 'Iodio', key: 'iodio' },
    ],
  },
  {
    title: 'Vitamine',
    items: [
      { label: 'Vitamina A', key: 'vitA' },
      { label: 'Vitamina D', key: 'vitD' },
      { label: 'Vitamina E', key: 'vitE' },
      { label: 'Vitamina K', key: 'vitK' },
      { label: 'Vitamina C', key: 'vitC' },
      { label: 'Vitamina B1 (Tiamina)', key: 'vitB1' },
      { label: 'Vitamina B2 (Riboflavina)', key: 'vitB2' },
      { label: 'Vitamina B3 (Niacina/PP)', key: 'vitB3' },
      { label: 'Vitamina B6', key: 'vitB6' },
      { label: 'Acido folico (B9)', key: 'vitB9' },
      { label: 'Vitamina B12', key: 'vitB12' },
      { label: 'Acido pantotenico (B5)', key: 'vitB5' },
    ],
  },
];

export function NutrientSelectModal({ open, onClose, selected, onChange }: NutrientSelectModalProps) {
  if (!open) return null;

  const isMobile = window.innerWidth < 600;

  const toggleAll = (group: OptGroup, value: boolean) => {
    const patch: Partial<SelectedOptionals> = {};
    group.items.forEach(item => { patch[item.key] = value; });
    onChange({ ...selected, ...patch });
  };

  const allSelected = (group: OptGroup) => group.items.every(i => selected[i.key]);

  // Portal su body: il modal è usato dentro .m-slide-track (transform: translateX),
  // che rompe position:fixed — senza portal il backdrop finisce fuori viewport.
  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: isMobile ? '16px 16px 0 0' : 10,
          width: isMobile ? '100%' : 'min(480px, 90vw)',
          maxHeight: isMobile ? '85vh' : '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar (solo mobile) */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#ddd' }} />
          </div>
        )}

        {/* Header fisso */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '10px 20px 12px' : '20px 24px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-navy)' }}>
            Nutrienti facoltativi
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1, padding: '4px 8px' }}
            aria-label="Chiudi"
          >×</button>
        </div>

        {/* Lista scrollabile */}
        <div style={{ overflowY: 'auto', flex: 1, padding: isMobile ? '8px 0' : '16px 24px' }}>
          {GROUPS.map(group => (
            <div key={group.title}>
              {/* Intestazione gruppo */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: isMobile ? '10px 20px 6px' : '8px 0 6px',
                position: 'sticky', top: 0, background: 'white', zIndex: 1,
                borderBottom: '1px solid var(--color-border)',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {group.title}
                </span>
                <button
                  onClick={() => toggleAll(group, !allSelected(group))}
                  style={{ fontSize: 12, color: 'var(--color-orange)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '8px 12px', minHeight: 44 }}
                >
                  {allSelected(group) ? 'Deseleziona tutti' : 'Seleziona tutti'}
                </button>
              </div>

              {/* Voci gruppo — lista singola colonna */}
              {group.items.map(item => (
                <label
                  key={item.key}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: isMobile ? '0 20px' : '0 4px',
                    minHeight: 44, cursor: 'pointer',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <span style={{ fontSize: 14, color: 'var(--color-text)' }}>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={selected[item.key]}
                    onChange={e => onChange({ ...selected, [item.key]: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--color-orange)', cursor: 'pointer', flexShrink: 0 }}
                  />
                </label>
              ))}
            </div>
          ))}
        </div>

        {/* Footer fisso */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '12px 20px 20px' : '12px 24px', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
          <button
            onClick={() => onChange({ ...DEFAULT_OPTIONALS })}
            style={{ fontSize: 13, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', minHeight: 44 }}
          >
            Reset tutto
          </button>
          <button onClick={onClose} className="btn btn-primary" style={{ fontSize: 14, minHeight: 44, padding: '0 24px' }}>
            Conferma
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
