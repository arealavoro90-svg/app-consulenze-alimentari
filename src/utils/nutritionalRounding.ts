// Rounding helpers for regional nutrition label tables (Canada, Australia, Arabi)

// ─── Canada (Canadian Food Inspection Agency, SOR/2022-168) ──────────────────
export function rCA_energy(v: number): string {
    if (v < 5) return '0';
    if (v <= 50) return (Math.round(v / 5) * 5).toString();
    return (Math.round(v / 10) * 10).toString();
}
export function rCA_fat(v: number): string {
    if (v < 0.5) return '0';
    if (v <= 5) return (Math.round(v / 0.5) * 0.5).toFixed(1);
    return Math.round(v).toString();
}
export function rCA_carb(v: number): string { return v < 0.5 ? '0' : Math.round(v).toString(); }
export function rCA_chol(v: number): string {
    if (v < 2) return '0';
    if (v <= 5) return 'less than 5';
    return Math.round(v).toString();
}
export function rCA_na(v: number): string {
    if (v < 5) return '0';
    if (v <= 140) return (Math.round(v / 5) * 5).toString();
    return (Math.round(v / 10) * 10).toString();
}
export function rCA_iron(v: number): string { return v < 0.05 ? '0' : v.toFixed(1); }
export function rCA_pct(v: number, dv: number): string { return Math.round(v / dv * 100).toString(); }

// ─── Australia (FSANZ Standard 1.2.8) ────────────────────────────────────────
export function rAU_kj(v: number): string { return v < 40 ? 'less than 40' : Math.round(v).toString(); }
export function rAU_kcal(v: number): string { return v < 9.5 ? 'less than 9.5' : Math.round(v).toString(); }
export function rAU_g1(v: number): string { return v < 1 ? 'less than 1' : v.toFixed(1); }
export function rAU_mg(v: number): string { return v < 5 ? 'less than 5' : Math.round(v).toString(); }

// ─── Paesi Arabi (SFDA) ──────────────────────────────────────────────────────
export function rArabi_energy(v: number): string { return Math.round(v).toString(); }
export function rArabi_g(v: number): string { return v < 0.1 ? '0' : v.toFixed(1); }
export function rArabi_mg(v: number): string { return Math.round(v).toString(); }
