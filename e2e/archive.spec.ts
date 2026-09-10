/**
 * E2E: ARCHIVIO — salva, carica, elimina documento in NutrizionaleCalc
 */
import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:5173';
const API_BASE = 'http://localhost:8000';

const MOCK_USER = {
  id: '1', email: 'admin@aea.it', name: 'Admin Test',
  company: 'AEA Test', role: 'admin', password: '',
  purchasedTools: ['nutrizionale', 'etichette', 'etichette-vini', 'rintracciabilita', 'trattamento-termico'],
};

const userResp = {
  id: 1, email: MOCK_USER.email, name: MOCK_USER.name,
  company: MOCK_USER.company, role: MOCK_USER.role,
  purchased_tools: MOCK_USER.purchasedTools,
};

const MOCK_DOC = {
  id: 42,
  name: 'Test Ricetta E2E',
  tool: 'nutrizionale',
  data: { productName: 'Test Ricetta E2E', components: [] },
  created_at: '2026-09-10T10:00:00Z',
  updated_at: '2026-09-10T10:00:00Z',
};

async function setupAuthMock(page: Page) {
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
  await page.addInitScript((u) => {
    localStorage.setItem('aea_user', JSON.stringify(u));
  }, MOCK_USER);
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

/** Apre la modal archivio tramite il pulsante Archivio/Carica */
async function openArchiveModal(page: Page) {
  const archiveBtn = page.locator(
    'button:has-text("Archivio"), button:has-text("Carica"), button[aria-label*="archivio" i], button[aria-label*="Archivio" i]'
  ).first();
  await expect(archiveBtn).toBeVisible({ timeout: 8000 });
  await archiveBtn.click();
  await page.waitForTimeout(800);
}

test('Salva documento in NutrizionaleCalc → appare nella lista archivio', async ({ page }) => {
  // Archive mock: GET lista vuota inizialmente, POST crea documento
  const archiveList: typeof MOCK_DOC[] = [];

  await page.route(`${API_BASE}/api/archives/`, async (r) => {
    if (r.request().method() === 'GET') {
      return r.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(archiveList),
      });
    }
    if (r.request().method() === 'POST') {
      archiveList.push(MOCK_DOC);
      return r.fulfill({
        status: 201, contentType: 'application/json',
        body: JSON.stringify(MOCK_DOC),
      });
    }
    return r.continue();
  });

  await loginAndGo(page, `${BASE}/tool/nutrizionale`);

  // Inserisci nome prodotto
  const productName = page.locator('#nut-product-name');
  if (await productName.isVisible({ timeout: 5000 }).catch(() => false)) {
    await productName.fill('Test Ricetta E2E');
  }

  // Clicca Salva
  const saveBtn = page.locator('button:has-text("Salva")').first();
  await expect(saveBtn).toBeVisible({ timeout: 8000 });
  await saveBtn.click();
  await page.waitForTimeout(1500);

  // Apri modal archivio e verifica che il documento appaia
  await openArchiveModal(page);

  const docItem = page.locator(
    `[class*="archive"] >> text=Test Ricetta E2E, [class*="modal"] >> text=Test Ricetta E2E, li:has-text("Test Ricetta E2E"), tr:has-text("Test Ricetta E2E")`
  ).first();
  await expect(docItem).toBeVisible({ timeout: 5000 });
});

test('Carica documento da archivio → ripristina dati nel calcolatore', async ({ page }) => {
  // Archive mock: GET restituisce un documento esistente
  await page.route(`${API_BASE}/api/archives/`, r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([MOCK_DOC]),
  }));
  await page.route(`${API_BASE}/api/archives/${MOCK_DOC.id}/`, r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify(MOCK_DOC),
  }));

  await loginAndGo(page, `${BASE}/tool/nutrizionale`);

  // Apri modal archivio
  await openArchiveModal(page);

  // Verifica che il documento sia presente nella lista
  const docItem = page.locator(
    `text=Test Ricetta E2E`
  ).first();
  await expect(docItem).toBeVisible({ timeout: 5000 });

  // Clicca Carica / Load sul documento
  const loadBtn = page.locator(
    'button:has-text("Carica"), button:has-text("Apri"), button[aria-label*="carica" i], button[aria-label*="load" i]'
  ).first();
  if (await loadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await loadBtn.click();
  } else {
    // Fallback: doppio click sul documento stesso
    await docItem.dblclick();
  }
  await page.waitForTimeout(1500);

  // Verifica che il nome prodotto sia stato ripristinato
  const productName = page.locator('#nut-product-name');
  if (await productName.isVisible({ timeout: 3000 }).catch(() => false)) {
    const value = await productName.inputValue();
    expect(value).toBe('Test Ricetta E2E');
  } else {
    // Verifica alternativa: testo presente nella pagina
    await expect(page.locator('text=Test Ricetta E2E').first()).toBeVisible({ timeout: 5000 });
  }
});

test('Elimina documento → dialog conferma → elemento rimosso dalla lista', async ({ page }) => {
  let deleted = false;
  const docList = [MOCK_DOC];

  await page.route(`${API_BASE}/api/archives/`, r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify(deleted ? [] : docList),
  }));
  await page.route(`${API_BASE}/api/archives/${MOCK_DOC.id}/`, r => {
    if (r.request().method() === 'DELETE') {
      deleted = true;
      return r.fulfill({ status: 204, body: '' });
    }
    return r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(MOCK_DOC),
    });
  });

  await loginAndGo(page, `${BASE}/tool/nutrizionale`);

  // Apri modal archivio
  await openArchiveModal(page);

  // Documento visibile
  await expect(page.locator('text=Test Ricetta E2E').first()).toBeVisible({ timeout: 5000 });

  // Clicca il bottone elimina
  const deleteBtn = page.locator(
    'button:has-text("Elimina"), button:has-text("Cancella"), button[aria-label*="elimina" i], button[aria-label*="delete" i]'
  ).first();
  await expect(deleteBtn).toBeVisible({ timeout: 5000 });
  await deleteBtn.click();
  await page.waitForTimeout(500);

  // Gestisci dialog di conferma nativo o custom
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  // Cerca bottone di conferma in modal custom
  const confirmBtn = page.locator(
    'button:has-text("Conferma"), button:has-text("Sì"), button:has-text("OK"), button:has-text("Elimina definitivamente")'
  ).first();
  if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmBtn.click();
  }

  await page.waitForTimeout(1500);

  // Verifica: elemento non più presente nella lista
  const docStillVisible = await page.locator('text=Test Ricetta E2E').first().isVisible({ timeout: 2000 }).catch(() => false);
  expect(docStillVisible).toBe(false);
});
