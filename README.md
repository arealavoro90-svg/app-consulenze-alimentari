# AEA Consulenze Alimentari — Portale Clienti

Portale web sicuro per i clienti di AEA Consulenze Alimentari. Include 7 calcolatori professionali per il settore alimentare.

## Stack

- **React 19** + **TypeScript 5.9** + **Vite 7**
- **React Router 7** — routing client-side
- **Recharts** — grafici
- **jsPDF** + **html2canvas** — export PDF
- Deploy su **Vercel**

## Strumenti disponibili

| Strumento | Descrizione |
|---|---|
| Tabelle Nutrizionali | Calcolo valori nutrizionali per etichettatura EU/USA/CA/AU/Arabi (Reg. 1169/2011) |
| Etichette Alimentari | Generatore etichette alimentari con anteprima live |
| Etichette Vini | Generatore etichette per prodotti vinicoli |
| Rintracciabilità & Costi | Calcolo costi produzione e tracciabilità lotti |
| Trattamento Termico | Calcolo F0 (modello Bigelow) per sterilizzazione/pastorizzazione |
| Schede Complete | Generazione schede tecniche prodotto |
| Scheda di Processo | Documentazione processi produttivi |

## Sviluppo locale

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build produzione
npm run lint       # controllo ESLint
```

**Credenziali demo:**
- Email: `demo@aeaconsulenze.it`
- Password: `Demo2024!`

## Deploy

Il progetto è collegato a Vercel. Ogni push su `main` avvia un deploy automatico.

```bash
vercel --prod      # deploy manuale
```

URL produzione: https://app-consulenze-alimentari.vercel.app

## Struttura

```
src/
├── auth/           # AuthContext, ProtectedRoute
├── calculators/    # 7 moduli calcolatori
├── components/     # AppShell, Sidebar, Dashboard, modali
├── engines/        # nutritionalEngine, costsEngine, thermalEngine
├── data/           # database ingredienti (668 KB)
├── hooks/          # useArchive, useLocalStorage, useSavedTables
├── logic/          # localizationModule (regole arrotondamento regionali)
└── utils/          # pdfGenerator, validation, regionalFormats
```
