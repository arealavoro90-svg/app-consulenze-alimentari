import { useState } from 'react';

let sliderUid = 0;

export function SliderControl({ label, value, min, max, onChange, unit = '%' }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void, unit?: string }) {
    const [id] = useState(() => `slider-${++sliderUid}`);
    return (
        <div className="form-field" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label htmlFor={id} style={{ margin: 0, fontSize: 12 }}>{label}</label>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>{value}{unit}</span>
            </div>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                value={value}
                aria-valuenow={value}
                aria-valuemin={min}
                aria-valuemax={max}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{ width: '100%', height: 4, background: '#eee', borderRadius: 2, appearance: 'none', cursor: 'pointer' }}
            />
        </div>
    );
}
