export type ToolId =
  | 'nutrizionale'
  | 'etichette'
  | 'etichette-vini'
  | 'rintracciabilita'
  | 'trattamento-termico'
  | 'schede-complete'
  | 'scheda-processo'
  | 'excel-import';

export interface User {
  id: string;
  email: string;
  password: string; // mock only — in prod use hashed passwords + backend
  name: string;
  company: string;
  purchasedTools: ToolId[];
  role: 'admin' | 'client' | 'demo';
}

export const TOOLS_CATALOG: Record<ToolId, { label: string; icon: string; description: string }> = {
  'nutrizionale': {
    label: 'Creazione tabelle valori nutrizionali',
    icon: '🥗',
    description: 'Calcolo tabella nutrizionale per etichetta (Reg. UE 1169/2011)',
  },
  'etichette': {
    label: 'Etichette Alimentari',
    icon: '🏷️',
    description: 'Generazione etichette per prodotti preconfezionati',
  },
  'etichette-vini': {
    label: 'Etichette Vini',
    icon: '🍷',
    description: 'Etichette vini secondo normativa EU 2021/2117',
  },
  'rintracciabilita': {
    label: 'Rintracciabilità & Costi',
    icon: '📦',
    description: 'Gestione costi produzione, rintracciabilità e giacenze magazzino',
  },
  'trattamento-termico': {
    label: 'Trattamento Termico F0',
    icon: '🌡️',
    description: 'Calcolo indice di letalità F0 per sterilizzazione e pastorizzazione',
  },
  'schede-complete': {
    label: 'Schede Complete',
    icon: '📋',
    description: 'Schede tecniche, schede processo e schede costi produzione',
  },
  'scheda-processo': {
    label: 'Scheda Processo',
    icon: '⚙️',
    description: 'Scheda processo produttivo con fabbisogni, fasi HACCP e rintracciabilità lotti',
  },
  'excel-import': {
    label: 'Import da Programma Excel AEA',
    icon: '📊',
    description: 'Importa ricette direttamente dal Programma Tabelle Nutrizionali Excel AEA',
  },
};

// MOCK_USERS rimosso — AUTH-2 (2026-07-30): nessun account finto deve poter
// autenticare un utente, nemmeno in caso di errore del backend. Vedi
// CONSOLIDAMENTO.md, sezione "AUTH-2".
