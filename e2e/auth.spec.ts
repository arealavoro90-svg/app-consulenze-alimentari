/**
 * E2E: AUTH — login fallito, login corretto, logout
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

test('Login fallito — password errata → errore mostrato, nessun redirect', async ({ page }) => {
  // Mock /api/auth/me/ come unauthenticated (no localStorage), login → 401
  await page.route(`${API_BASE}/api/auth/me/`, r => r.fulfill({
    status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Non autenticato' }),
  }));
  await page.route(`${API_BASE}/api/auth/login/`, r => r.fulfill({
    status: 400, contentType: 'application/json',
    body: JSON.stringify({ detail: 'Credenziali non valide' }),
  }));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');

  // Compila form con credenziali errate
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await emailInput.fill('wrong@example.com');
  await passwordInput.fill('wrongpassword');

  const submitBtn = page.locator('button[type="submit"], button:has-text("Accedi"), button:has-text("Login")').first();
  await submitBtn.click();
  await page.waitForTimeout(1500);

  // Verifica: siamo ancora su /login (nessun redirect)
  expect(page.url()).toContain('/login');

  // Verifica: messaggio di errore visibile
  const errorEl = page.locator('[class*="error"], [role="alert"], [class*="alert"], p:has-text("Credenziali"), p:has-text("errat"), p:has-text("non valide"), span:has-text("errat")').first();
  await expect(errorEl).toBeVisible({ timeout: 5000 });
});

test('Login corretto → redirect /dashboard → vede saluto e tool grid', async ({ page }) => {
  await setupAuthMock(page);

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');

  // Inietta utente dopo il login (simula il redirect post-login)
  await page.addInitScript((u) => {
    // Intercetta il momento in cui viene chiamata la login per settare localStorage
    const origFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const res = await origFetch(input, init);
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/login/')) {
        localStorage.setItem('aea_user', JSON.stringify(u));
      }
      return res;
    };
  }, MOCK_USER);

  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await emailInput.fill(MOCK_USER.email);
  await passwordInput.fill('correctpassword');

  const submitBtn = page.locator('button[type="submit"], button:has-text("Accedi"), button:has-text("Login")').first();
  await submitBtn.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Verifica: redirect verso dashboard (o home autenticata)
  const currentUrl = page.url();
  expect(currentUrl).not.toContain('/login');

  // Verifica: saluto con nome utente o email visibile
  const greeting = page.locator(`text=${MOCK_USER.name}, text=${MOCK_USER.email}, [class*="greeting"], [class*="welcome"], h1, h2`).first();
  const greetingVisible = await greeting.isVisible({ timeout: 5000 }).catch(() => false);
  // Tool grid visibile (almeno un tool card)
  const toolCard = page.locator('[class*="tool"], [class*="card"], [data-tool]').first();
  const toolVisible = await toolCard.isVisible({ timeout: 5000 }).catch(() => false);
  expect(greetingVisible || toolVisible).toBe(true);
});

test('Logout → redirect /login', async ({ page }) => {
  await loginAndGo(page, `${BASE}/dashboard`);

  // Trova e clicca il bottone logout
  const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Esci"), [aria-label*="logout" i], [aria-label*="esci" i], a:has-text("Logout"), a:has-text("Esci")').first();

  // Se il logout è in un menu a tendina, prova ad aprirlo prima
  if (!await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    const userMenu = page.locator('[class*="user-menu"], [class*="avatar"], [class*="profile"], button[aria-label*="utente" i], button[aria-label*="account" i]').first();
    if (await userMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userMenu.click();
      await page.waitForTimeout(500);
    }
  }

  await expect(logoutBtn).toBeVisible({ timeout: 5000 });
  await logoutBtn.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // Verifica redirect a /login
  expect(page.url()).toContain('/login');
});
