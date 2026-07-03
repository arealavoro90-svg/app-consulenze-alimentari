# Product

## Register

product

## Users

Due profili in egual misura:

1. **Tecnologo alimentare** — usa il tool quotidianamente, conosce bene le norme (EU Reg. 1169/2011, FDA, ecc.), vuole velocità e precisione. Opera in modalità Esperto. Ha familiarità con i dati nutrizionali e sa leggere tabelle dense.

2. **Cliente/produttore alimentare** — usa il tool occasionalmente, guidato o affiancato da un consulente AEA. Opera in modalità Guidata. Deve capire cosa sta compilando e cosa significa il risultato, senza conoscenza tecnica profonda.

La stessa interfaccia serve entrambi grazie al toggle Guidato/Esperto. Le decisioni di design devono onorare questo dualismo: nessuno dei due profili deve sentirsi sacrificato.

## Product Purpose

Portale web SaaS per consulenti e clienti di AEA Consulenze Alimentari. Sette calcolatori specializzati (nutrizionale, termico, etichette, rintracciabilità, ecc.) che producono output normativi (tabelle nutrizionali PDF, etichette, schede tecniche). Il successo si misura in output corretti e pronti all'uso generati con il minimo attrito.

Il calcolatore nutrizionale è il tool core: data entry ingredienti → calcolo su 30+ nutrienti → tabelle conformi a 5 regioni normative (EU, USA, Canada, Australia, Arabi).

## Brand Personality

Precisa. Affidabile. Professionale senza essere fredda.

AEA è una consulenza alimentare italiana: c'è competenza tecnica rigorosa, ma anche un rapporto diretto e umano con il cliente. Il tool deve trasmettere "questo è costruito da esperti per esperti" senza intimidire chi è meno tecnico.

## Anti-references

- Tool medici o scientifici con UI anni '90 (dense grid di numeri senza gerarchia)
- Dashboard SaaS generiche con KPI hero numerici e gradiente ovunque
- App consumer food (troppo friendly, troppo colorato, nasconde la complessità utile)

## Design Principles

1. **Gerarchia prima della completezza** — non tutti i 30+ nutrienti hanno la stessa importanza. L'UI deve guidare l'occhio verso i valori chiave (energia, grassi, carboidrati, proteine, sale) e lasciare il resto accessibile ma non rumoroso.

2. **Il dato è il prodotto** — le tabelle nutrizionali generate sono l'output che il cliente porta al mercato. Devono sembrare professionali e conformi, non screenshot di una web app.

3. **Modalità è contesto, non skinning** — la differenza tra Guidato ed Esperto deve essere strutturale (quante informazioni vedi, in quale ordine), non solo estetica.

4. **Feedback progressivo** — l'utente deve sapere sempre: cosa ho inserito, cosa manca, qual è il risultato parziale. Nessun calcolo silenzioso.

5. **Densità guadagnata** — la UI densa è OK per il tecnologo, ma deve essere raggiunta, non imposta. Si comincia da una vista chiara e si scende nel dettaglio su richiesta.

## Accessibility & Inclusion

WCAG 2.1 AA come target. Font leggibili su schermo (min 12px per labels). Contrasto sufficiente per uso in ambienti luminosi (ufficio, laboratorio). Navigazione da tastiera per il profilo tecnologo (flusso rapido senza mouse).
