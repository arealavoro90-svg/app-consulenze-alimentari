import React from 'react';
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

  const toggleAll = (group: OptGroup, value: boolean) => {
    const patch: Partial<SelectedOptionals> = {};
    group.items.forEach(item => { patch[item.key] = value; });
    onChange({ ...selected, ...patch });
  };

  const allSelected = (group: OptGroup) => group.items.every(i => selected[i.key]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 10, padding: 24, width: 'min(480px, 90vw)', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-navy)' }}>
            Configura nutrienti facoltativi
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1 }}
            aria-label="Chiudi"
          >×</button>
        </div>

        {/* Gruppi */}
        {GROUPS.map(group => (
          <div key={group.title} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-navy)', borderBottom: '1px solid var(--color-border)', paddingBottom: 4, flex: 1 }}>
                {group.title}
              </div>
              <button
                onClick={() => toggleAll(group, !allSelected(group))}
                style={{ fontSize: 11, color: 'var(--color-orange)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginLeft: 12, whiteSpace: 'nowrap' }}
              >
                {allSelected(group) ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
              {group.items.map(item => (
                <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selected[item.key]}
                    onChange={e => onChange({ ...selected, [item.key]: e.target.checked })}
                    style={{ width: 14, height: 14, accentColor: 'var(--color-orange)', cursor: 'pointer' }}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={() => onChange({ ...DEFAULT_OPTIONALS })}
            style={{ fontSize: 12, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Reset tutto
          </button>
          <button onClick={onClose} className="btn btn-primary" style={{ fontSize: 13 }}>
            Conferma
          </button>
        </div>
      </div>
    </div>
  );
}
