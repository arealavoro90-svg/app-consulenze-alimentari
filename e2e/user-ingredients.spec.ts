/**
 * E2E: ING-E2E-2 / ING-E2E-4
 * ING-E2E-2: Admin → BrowseIngredientsModal → "Modifica" visibile su TUTTI gli ingredienti
 * ING-E2E-4: User (client) → BrowseIngredientsModal → "Modifica" visibile solo su _custom propri
 */
import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:5173';
const API_BASE = 'http://localhost:8000';

const ADMIN_USER = {
  id: '1', email: 'admin@aea.it', name: 'Admin AEA',
  company: 'AEA', role: 'admin', password: '',
  purchasedTools: ['nutrizionale', 'etichette', 'etichette-vini', 'rintracciabilita', 'trattamento-termico'],
};

const CLIENT_USER = {
  id: '99', email: 'client@aea-test.it', name: 'Client Test',
  company: 'Test', role: 'client', password: '',
  purchasedTools: ['nutrizionale'],
};

const DB_INGREDIENT = {
  id: 10, nome: 'Farina 00', etichetta: 'Farina 00', categoria: 'cereali',
  kcal: 350, kj: 1465, grassi: 1.5, saturi: 0.3, carboidrati: 72, zuccheri: 1.5,
  proteine: 11, sodio_mg: 2, sale: 0,
};

const CUSTOM_INGREDIENT = {
  id: 201, _uid: '201', nome: 'Mio Ingrediente', etichetta: 'Mio Ingrediente',
  categoria: '_custom', kcal: 80, kj: 335, grassi: 2, saturi: 0.5,
  carboidrati: 8, zuccheri: 1, proteine: 4, sodio_mg: 100, sale: 0.25,
};

function toApiFormat(ing: typeof DB_INGREDIENT | typeof CUSTOM_INGREDIENT) {
  return { ...ing };
}

async function setupCommonMocks(page: Page, userObj: typeof ADMIN_USER | typeof CLIENT_USER) {
  const userResp = {
    id: parseInt(userObj.id), email: userObj.email, name: userObj.name,
    company: userObj.company, role: userObj.role,
    purchased_tools: userObj.purchasedTools,
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

  // DB ingredienti ufficiali
  await page.route(`${API_BASE}/api/ingredients/**`, r => {
    const url = r.request().url();
    if (url.includes('/user/')) {
      // ingredienti custom dell'utente
      const customList = userObj.role === 'client' ? [CUSTOM_INGREDIENT] : [];
      return r.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify(customList),
      });
    }
    // lista ufficiale
    return r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([toApiFormat(DB_INGREDIENT)]),
    });
  });
}

async function loginAndGoToNutrizionale(page: Page, userObj: typeof ADMIN_USER | typeof CLIENT_USER) {
  await setupCommonMocks(page, userObj);
  await page.addInitScript((u) => {
    localStorage.setItem('aea_user', JSON.stringify(u));
    // Sopprime WelcomeModal
    localStorage.setItem('aea_welcome_seen', 'true');
    sessionStorage.setItem('aea_welcome_shown_session', '1');
    // Override VITE_DEV_MOCK_AUTH: disabilita il mock statico di AuthContext
    // così il contesto legge da localStorage invece di forzare sempre admin
    // @ts-ignore
    if (window.__vite_import_meta_env) {
      // @ts-ignore
      window.__vite_import_meta_env.VITE_DEV_MOCK_AUTH = 'false';
    }
  }, userObj);
  await page.goto(`${BASE}/tool/nutrizionale`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

async function openBrowseModal(page: Page) {
  // 1. Apri dropdown "Database" nella topbar
  const dbBtn = page.locator('button.topbar-btn-ghost:has-text("Database")').first();
  await expect(dbBtn).toBeVisible({ timeout: 8000 });
  await dbBtn.click();
  await page.waitForTimeout(400);
  // 2. Clicca "Sfoglia database" nel dropdown
  const sfogliaBtn = page.locator('button:has-text("Sfoglia database")').first();
  await expect(sfogliaBtn).toBeVisible({ timeout: 3000 });
  await sfogliaBtn.click();
  await page.waitForTimeout(800);
}

// ──────────────────────────────────────────────
// ING-E2E-2: Admin vede "Modifica" su tutti gli ingredienti (anche DB ufficiali)
// ──────────────────────────────────────────────
test('ING-E2E-2: Admin — "Modifica" visibile su ingrediente DB ufficiale', async ({ page }) => {
  await loginAndGoToNutrizionale(page, ADMIN_USER);
  await openBrowseModal(page);

  // Verifica modal aperta con almeno un ingrediente DB (badge "DB")
  const dbBadge = page.locator('.bim-badge:has-text("DB")').first();
  await expect(dbBadge).toBeVisible({ timeout: 8000 });

  // "Modifica" presente — almeno uno visibile nella lista corrente
  const modificaBtn = page.locator('button.bim-edit-btn:has-text("Modifica")').first();
  await expect(modificaBtn).toBeVisible({ timeout: 5000 });

  // Verifica: NON è un ingrediente custom (admin vede Modifica anche su DB)
  // Cerca riga con badge DB che abbia anche Modifica
  const dbRowWithModifica = page.locator('.bim-badge:has-text("DB")').first().locator('..').locator('..').locator('button:has-text("Modifica")');
  await expect(dbRowWithModifica).toBeVisible({ timeout: 5000 });
});

// ──────────────────────────────────────────────
// ING-E2E-4: Client vede "Modifica" solo sui propri _custom, NON sul DB ufficiale
// ──────────────────────────────────────────────
test('ING-E2E-4: Client — nessun "Modifica" su ingredienti DB ufficiali', async ({ page }) => {
  await loginAndGoToNutrizionale(page, CLIENT_USER);
  await openBrowseModal(page);

  // Attendi che la lista carichi (almeno un badge DB)
  const dbBadge = page.locator('.bim-badge:has-text("DB")').first();
  await expect(dbBadge).toBeVisible({ timeout: 8000 });

  // Client NON deve vedere "Modifica" su ingredienti DB (nessun _custom nel DB corrente)
  // Conta i Modifica totali: deve essere 0 (nessun ingrediente _custom per questo utente)
  const allModifica = page.locator('button.bim-edit-btn:has-text("Modifica")');
  // Se ci sono ingredienti custom propri saranno visibili, ma per un client fresco non ce ne sono
  const count = await allModifica.count();
  // Ogni Modifica presente deve essere su una riga con badge "Personale" (non "DB")
  for (let i = 0; i < count; i++) {
    const btn = allModifica.nth(i);
    const row = btn.locator('../..');
    const badge = row.locator('.bim-badge');
    await expect(badge).toHaveText('Personale');
  }

  // "Promuovi" non deve mai apparire per un client
  await expect(page.locator('button:has-text("Promuovi")')).toHaveCount(0);
});
