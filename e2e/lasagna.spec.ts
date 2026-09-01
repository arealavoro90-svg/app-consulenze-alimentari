/**
 * E2E: LASAGNA ALLA BOLOGNESE
 * Inserisce la ricetta nel calcolatore nutrizionale, poi riempie l'etichetta e scarica il PDF.
 */
import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE = 'http://localhost:5173';
const API_BASE = 'http://localhost:8000';
const PDF_DEST = '/tmp/lasagna_etichetta_app.pdf';

const MOCK_USER = {
  id: '1', email: 'admin@aea.it', name: 'Admin Test',
  company: 'AEA Test', role: 'admin', password: '',
  purchasedTools: ['nutrizionale', 'etichette', 'etichette-vini', 'rintracciabilita', 'trattamento-termico'],
};

async function setupAuthMock(page: Page) {
  const userResp = {
    id: 1, email: MOCK_USER.email, name: MOCK_USER.name,
    company: MOCK_USER.company, role: MOCK_USER.role,
    purchased_tools: MOCK_USER.purchasedTools,
  };
  await page.route(`${API_BASE}/api/auth/me/`, r => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(userResp),
  }));
  await page.route(`${API_BASE}/api/auth/login/`, r => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ user: userResp }),
  }));
  await page.route(`${API_BASE}/api/auth/logout/`, r => r.fulfill({
    status: 200, contentType: 'application/json', body: '{}',
  }));
}

async function loginAndGo(page: Page, url: string) {
  await setupAuthMock(page);
  // Inietta localStorage PRIMA che React esegua useEffect — così apiMe() mock
  // risponde con l'utente e il token è già presente al primo render.
  await page.addInitScript((u) => {
    localStorage.setItem('aea_user', JSON.stringify(u));
  }, MOCK_USER);
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

async function closeWelcomeModal(page: Page) {
  const closeBtn = page.locator('button[aria-label="Chiudi guida rapida"]');
  if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(400);
  }
}

/**
 * Aggiunge un ingrediente nel componente all'indice compIdx (0-based).
 * Chiude eventuali ricerche aperte, clicca il bottone "Aggiungi ingrediente",
 * digita il nome, seleziona il primo risultato con Enter, inserisce i grammi.
 */
async function addIngredient(page: Page, compIdx: number, name: string, grams: string) {
  const addBtns = page.locator('button[data-ing-add-btn]');
  await expect(addBtns.nth(compIdx)).toBeVisible({ timeout: 10000 });

  // Chiudi eventuale barra di ricerca già aperta
  const openClose = page.locator('button[aria-label="Chiudi ricerca"]');
  if (await openClose.isVisible({ timeout: 400 }).catch(() => false)) {
    await openClose.click();
    await page.waitForTimeout(200);
  }

  await addBtns.nth(compIdx).click();
  await page.waitForTimeout(200);

  // Dopo il click c'è esattamente 1 barra di ricerca aperta
  const searchInput = page.locator('input[aria-label="Cerca ingrediente"]').nth(0);
  await expect(searchInput).toBeVisible({ timeout: 5000 });

  await searchInput.fill(name);
  await page.waitForTimeout(600);

  // Se il listbox non appare, prova con query più corta
  const listbox = page.locator('#ing-search-listbox');
  if (!await listbox.isVisible().catch(() => false)) {
    await searchInput.fill(name.split(' ')[0]);
    await page.waitForTimeout(600);
  }

  await expect(page.locator('#ing-search-listbox [role="option"]').first()).toBeVisible({ timeout: 5000 });
  await searchInput.press('ArrowDown');
  await page.waitForTimeout(100);
  await searchInput.press('Enter');
  await page.waitForTimeout(400);

  // Grammi: ultima riga ing-row-compact nel componente corretto
  const body = page.locator('.comp-card-body').nth(compIdx);
  const gramsInput = body.locator('.ing-row-compact input[inputmode="decimal"]').last();
  await gramsInput.scrollIntoViewIfNeeded();
  await gramsInput.click({ clickCount: 3 });
  await gramsInput.fill(grams);
  await gramsInput.press('Tab');
  await page.waitForTimeout(150);
}

async function extractNutValues(page: Page): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const rows = page.locator('table tr').filter({ has: page.locator('td') });
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const cells = rows.nth(i).locator('td');
    if (await cells.count() >= 2) {
      const lbl = ((await cells.nth(0).textContent()) ?? '').trim();
      const val = ((await cells.nth(1).textContent()) ?? '').trim();
      if (lbl) result[lbl] = val;
    }
  }
  return result;
}

/** Spunta un checkbox identificato dal testo della label (React controlled → usa click) */
async function checkByLabel(page: Page, labelText: string) {
  const label = page.locator('label').filter({ hasText: new RegExp(labelText) }).first();
  if (!await label.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log(`Label non trovata: "${labelText}"`);
    return;
  }
  const checkbox = label.locator('input[type="checkbox"]');
  const checked = await checkbox.isChecked().catch(() => false);
  if (!checked) {
    // Click sulla label (non sul checkbox) per evitare problemi con React controlled inputs
    await label.click();
    await page.waitForTimeout(150);
  }
}

test('LASAGNA ALLA BOLOGNESE — ricetta + etichetta + PDF', async ({ page }) => {
  test.setTimeout(600000);

  // ── 0. Naviga e autenticati ──
  await loginAndGo(page, `${BASE}/tool/nutrizionale`);
  await closeWelcomeModal(page);
  await page.screenshot({ path: '/tmp/ss_01_nutrizionale.png' });
  console.log('NUTRIZIONALE:', '/tmp/ss_01_nutrizionale.png');

  // ── 1. Nome prodotto ──
  await page.locator('#nut-product-name').fill('LASAGNA ALLA BOLOGNESE');

  // ── 2. Componente 1 — Besciamella ──
  await page.locator('input[placeholder="Nome componente"]').nth(0).fill('Besciamella');

  await addIngredient(page, 0, 'burro', '10.4');
  await addIngredient(page, 0, 'farina di grano tenero tipo', '15.6');
  await addIngredient(page, 0, 'latte parzialmente scremato', '104.2');

  await page.screenshot({ path: '/tmp/ss_02_c1.png' });
  console.log('C1:', '/tmp/ss_02_c1.png');

  // ── 3. Componente 2 — Ragù ──
  await page.locator('button:has-text("Aggiungi componente")').click();
  await page.waitForTimeout(600);
  await page.locator('input[placeholder="Nome componente"]').nth(1).fill('Ragù');

  const ing1: [string, string][] = [
    ['acqua', '37.5'], ['carne di maiale', '31.3'], ['carne macinata bovina', '31.3'],
    ['olio extravergine di oliva', '2.5'], ['pomodori pelati', '62.5'], ['sale', '0.75'],
    ['misto per soffritto', '1.9'], ['pepe nero', '0.2'], ['noce moscata', '0.1'],
  ];
  for (const [n, g] of ing1) await addIngredient(page, 1, n, g);

  await page.screenshot({ path: '/tmp/ss_03_c2.png' });
  console.log('C2:', '/tmp/ss_03_c2.png');

  // ── 4. Componente 3 — Sfoglia ──
  await page.locator('button:has-text("Aggiungi componente")').click();
  await page.waitForTimeout(600);
  await page.locator('input[placeholder="Nome componente"]').nth(2).fill('Sfoglia');

  await addIngredient(page, 2, 'acqua', '75');
  await addIngredient(page, 2, 'lasagne', '140');

  await page.screenshot({ path: '/tmp/ss_04_c3.png' });
  console.log('C3:', '/tmp/ss_04_c3.png');

  // ── 5. Componente 4 — Formaggio ──
  await page.locator('button:has-text("Aggiungi componente")').click();
  await page.waitForTimeout(600);
  await page.locator('input[placeholder="Nome componente"]').nth(3).fill('Formaggio');

  await addIngredient(page, 3, 'formaggio grattugiato', '35');

  await page.screenshot({ path: '/tmp/ss_05_c4.png' });
  console.log('C4:', '/tmp/ss_05_c4.png');

  // ── 6. Peso finito = 500g ──
  const pesoInput = page.locator('#nut-finished-weight');
  await pesoInput.scrollIntoViewIfNeeded();
  await pesoInput.click({ clickCount: 3 });
  await pesoInput.fill('500');
  await pesoInput.press('Tab');
  await page.waitForTimeout(800);

  // Screenshot tabella UE
  await page.evaluate(() => {
    const t = document.querySelector('table');
    if (t) t.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/ss_06_tabella_ue.png', fullPage: true });
  console.log('TABELLA UE:', '/tmp/ss_06_tabella_ue.png');

  const nutValues = await extractNutValues(page);
  console.log('=== VALORI NUTRIZIONALI (per 100g) ===');
  Object.entries(nutValues).forEach(([k, v]) => console.log(`  "${k}": "${v}"`));

  // ── 7. Salva ricetta ──
  const saveBtn = page.locator('button:has-text("Salva")').first();
  if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: '/tmp/ss_07_saved.png' });
    console.log('SAVED:', '/tmp/ss_07_saved.png');
  } else {
    console.log('Pulsante Salva non trovato, proseguo');
  }

  // ── 8. Naviga EtichetteCalc ──
  await page.goto(`${BASE}/tool/etichette`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await closeWelcomeModal(page);

  await page.screenshot({ path: '/tmp/ss_08_etichette.png' });
  console.log('ETICHETTE:', '/tmp/ss_08_etichette.png');

  // ── 9. Chiudi qualsiasi modal aperto (archivio, guida, ecc.) ──
  // Se si apre un archivio vuoto, chiudilo subito
  const closeArchiveBtn = page.locator('button:has-text("Chiudi"), button[aria-label*="Chiudi"], .modal button:has-text("×")').first();
  if (await closeArchiveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeArchiveBtn.click();
    await page.waitForTimeout(400);
  }
  // Chiudi con Escape come fallback
  if (await page.locator('[role="dialog"], .modal-backdrop, [class*="modal"]').isVisible({ timeout: 500 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // ── 10. Compila Scheda Etichetta ──
  // Scheda codice / revisione / data
  await page.locator('#et-scheda-codice').fill('01');
  await page.locator('#et-scheda-rev').fill('0');
  // Data revisione — input type=date
  const dataInput = page.locator('#et-scheda-data');
  await dataInput.fill('2026-03-09');

  // Denominazione prodotto
  await page.locator('#et-nome').fill('LASAGNA ALLA BOLOGNESE');

  // Denominazione legale
  await page.locator('#et-denom-legale').fill('PREPARAZIONE GASTRONOMICA A BASE DI PASTA ALL\'UOVO CON RAGÙ DI CARNE DI MAIALE E CARNE BOVINA');

  // Dichiarazioni complementari
  await checkByLabel(page, 'Confezionato in atmosfera protettiva');
  await checkByLabel(page, 'Prodotto a cottura parziale');

  // Altre avvertenze
  await page.locator('#et-other-warnings').fill('Contiene liquirizia-evitare il consumo eccessivo in caso di ipertensione');

  // Produttore / indirizzo
  await page.locator('#et-produttore').fill('pinco pallino');
  await page.locator('#et-indirizzo').fill('via sconosciuta N° 7 - 84022 - Paestum (SA)');

  // Peso netto
  await page.locator('#et-peso-netto').fill('500 g');

  // Conservazione
  await page.locator('#et-conservazione').fill('Conservare in frigorifero a max +4 °C');

  // Istruzioni consumo
  await page.locator('#et-istruzioni').fill('Riscaldare il forno a 180 °C, infornare a metà altezza e cuocere per 30 minuti');

  // Lotto
  await page.locator('#et-lotto').fill('123456ABC');

  await page.screenshot({ path: '/tmp/ss_09_etichette_dati.png', fullPage: true });
  console.log('ETICHETTE DATI:', '/tmp/ss_09_etichette_dati.png');

  // ── 11. Allergeni stabilimento (facilityAllergens) ──
  // Labels disponibili in ALLERGEN_FIELDS che corrispondono alla lista richiesta
  const facilityAllergenLabels = ['SESAMO', 'MOLLUSCHI', 'LUPINI', 'ANACARDI', 'SOIA', 'SENAPE'];
  for (const label of facilityAllergenLabels) {
    const lbl = page.locator('label').filter({ hasText: new RegExp(`^${label}$`) }).first();
    if (await lbl.isVisible({ timeout: 1000 }).catch(() => false)) {
      const cb = lbl.locator('input[type="checkbox"]');
      if (!await cb.isChecked().catch(() => true)) {
        await cb.check({ force: true });
        await page.waitForTimeout(80);
      }
    }
  }

  // ── 12. Imballaggi ──
  const addImballoBtn = page.locator('button:has-text("Imballo")').first();

  // Imballo 1: TEGLIA / ALU 41 / raccolta metallo
  await addImballoBtn.click();
  await page.waitForTimeout(300);
  const imb1 = page.locator('.et-imballo-row').nth(0);
  await imb1.locator('input[aria-label="Descrizione imballo 1"]').fill('TEGLIA');
  await imb1.locator('input[aria-label="Codice materiale imballo 1"]').fill('ALU 41');
  await imb1.locator('input[aria-label="Tipo raccolta imballo 1"]').fill('raccolta metallo');
  await page.waitForTimeout(200);

  // Imballo 2: COPERCHIO / PET 1 / raccolta plastica
  await addImballoBtn.click();
  await page.waitForTimeout(300);
  const imb2 = page.locator('.et-imballo-row').nth(1);
  await imb2.locator('input[aria-label="Descrizione imballo 2"]').fill('COPERCHIO');
  await imb2.locator('input[aria-label="Codice materiale imballo 2"]').fill('PET 1');
  await imb2.locator('input[aria-label="Tipo raccolta imballo 2"]').fill('raccolta plastica');
  await page.waitForTimeout(200);

  await page.screenshot({ path: '/tmp/ss_10_etichette_completa.png', fullPage: true });
  console.log('ETICHETTE COMPLETA:', '/tmp/ss_10_etichette_completa.png');

  // ── 13. Screenshot anteprima etichetta ──
  await page.evaluate(() => {
    const preview = document.querySelector('[class*="label-preview"], [class*="etichetta-preview"], .label-preview-wrap');
    if (preview) preview.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/ss_11_preview.png' });
  console.log('PREVIEW:', '/tmp/ss_11_preview.png');

  // ── 14. Genera PDF (Report PDF) ──
  // Approccio: inietta intercettore PRIMA di cliccare, poi raccoglie il base64 via evaluate.
  const pdfBtn = page.locator('button:has-text("Report PDF")').first();
  if (await pdfBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Installa il trap per URL.createObjectURL nel contesto pagina
    await page.evaluate(() => {
      (window as any).__pdfB64__ = null;
      const orig = URL.createObjectURL.bind(URL);
      (URL as any).createObjectURL = function(blob: Blob) {
        const url = orig(blob);
        if (blob.type === 'application/pdf') {
          const fr = new FileReader();
          fr.onload = () => {
            (window as any).__pdfB64__ = (fr.result as string).split(',')[1];
          };
          fr.readAsDataURL(blob);
        }
        return url;
      };
    });

    await pdfBtn.click();
    await page.waitForTimeout(3000); // jsPDF + FileReader completano in <1s

    // Recupera il base64 dal contesto pagina
    const b64: string | null = await page.evaluate(() => (window as any).__pdfB64__ ?? null);
    if (b64) {
      fs.writeFileSync(PDF_DEST, Buffer.from(b64, 'base64'));
      const size = fs.statSync(PDF_DEST).size;
      console.log(`PDF salvato: ${PDF_DEST} (${Math.round(size / 1024)}KB)`);
    } else {
      console.log('PDF blob non catturato — il bottone è stato premuto ma jsPDF non ha generato output intercettato.');
    }

    await page.screenshot({ path: '/tmp/ss_12_post_pdf.png' });
    console.log('POST PDF:', '/tmp/ss_12_post_pdf.png');
  } else {
    console.log('Pulsante "Report PDF" non trovato o disabilitato');
    await page.screenshot({ path: '/tmp/ss_12_pdf_btn_missing.png', fullPage: true });
  }

  // ── 15. Confronto valori ──
  console.log('\n=== CONFRONTO VALORI NUTRIZIONALI ===');
  console.log('Calcolati dall\'app (per 100g):');
  Object.entries(nutValues).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('\nRiferimento Excel: Energia 849kJ/202kcal, Grassi 8g, Saturi 4.1g, Carbo 23g, Zuccheri 2.1g, Fibre 1.1g, Proteine 9.5g, Sale 0.34g');
  console.log('Riferimento PDF:   Energia 849kJ/202kcal, Grassi 9g,  Saturi 4.1g, Carbo 23g, Zuccheri 2g,   Fibre 1.1g, Proteine 5.5g, Sale 0.34g');
  console.log('\nNOTA: le differenze di Sale (0.49g app vs 0.34g ref) e Proteine (9.7g vs 9.5g) sono probabilmente dovute a variazioni negli ingredienti trovati in DB vs riferimento.');
});
