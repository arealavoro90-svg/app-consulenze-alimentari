export type ToolId =
  | 'nutrizionale'
  | 'etichette'
  | 'etichette-vini'
  | 'rintracciabilita'
  | 'trattamento-termico'
  | 'schede-complete'
  | 'scheda-processo';

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
};

export const MOCK_USERS: User[] = [
  {
    id: 'admin-1',
    email: 'admin@aea.it',
    password: 'admin2024',
    name: 'Gelsomino Panico',
    company: 'AEA Consulenze Alimentari',
    purchasedTools: ['nutrizionale', 'etichette', 'etichette-vini', 'rintracciabilita', 'trattamento-termico', 'schede-complete', 'scheda-processo'],
    role: 'admin',
  },
  {
    id: 'demo',
    email: 'demo@aeaconsulenze.it',
    password: 'Demo2024!',
    name: 'Utente Demo',
    company: 'Demo AEA',
    purchasedTools: ['nutrizionale', 'etichette', 'etichette-vini', 'rintracciabilita', 'trattamento-termico', 'schede-complete', 'scheda-processo'],
    role: 'demo',
  },
  {
    id: 'client-1',
    email: 'mario@test.it',
    password: 'password123',
    name: 'Mario Rossi',
    company: 'Rossi Alimentari Srl',
    purchasedTools: ['nutrizionale'],
    role: 'client',
  },
  {
    id: 'client-2',
    email: 'laura@test.it',
    password: 'password123',
    name: 'Laura Bianchi',
    company: 'Bianchi Food SpA',
    purchasedTools: ['etichette', 'nutrizionale', 'rintracciabilita'],
    role: 'client',
  },
  {
    id: 'client-3',
    email: 'vino@test.it',
    password: 'password123',
    name: 'Carlo Verdi',
    company: 'Cantina Verdi',
    purchasedTools: ['etichette-vini', 'nutrizionale'],
    role: 'client',
  },
];
