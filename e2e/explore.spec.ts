import { test, expect } from '@playwright/test';

test('explore app structure', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  // Login se necessario
  const loginForm = await page.locator('form, input[type="password"]').count();
  if (loginForm > 0) {
    // Mock auth: set localStorage
    await page.evaluate(() => {
      localStorage.setItem('aea_user', JSON.stringify({ email: 'test@aea.it', name: 'Test' }));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  }

  await page.screenshot({ path: '/tmp/explore_home.png', fullPage: false });

  // Naviga al calcolatore nutrizionale
  await page.goto('http://localhost:5173/tool/nutrizionale');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: '/tmp/explore_nutrizionale.png', fullPage: true });

  // Raccoglie struttura input
  const inputs = page.locator('input, textarea, select, button');
  const count = await inputs.count();
  const info: string[] = [];
  for (let i = 0; i < Math.min(count, 40); i++) {
    const el = inputs.nth(i);
    const tag = await el.evaluate(e => e.tagName);
    const id = await el.getAttribute('id');
    const ph = await el.getAttribute('placeholder');
    const cls = await el.getAttribute('class');
    const txt = tag === 'BUTTON' ? await el.textContent() : '';
    info.push(`[${i}] ${tag} id=${id} ph=${ph} cls=${cls?.substring(0,30)} txt=${txt?.trim().substring(0,30)}`);
  }
  console.log('=== NutrizionaleCalc structure ===');
  info.forEach(l => console.log(l));

  // Naviga a EtichetteCalc
  await page.goto('http://localhost:5173/tool/etichette');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: '/tmp/explore_etichette.png', fullPage: true });

  const inputs2 = page.locator('input[type="text"], input:not([type]), textarea');
  const count2 = await inputs2.count();
  const info2: string[] = [];
  for (let i = 0; i < Math.min(count2, 60); i++) {
    const el = inputs2.nth(i);
    const id = await el.getAttribute('id');
    const ph = await el.getAttribute('placeholder');
    const name = await el.getAttribute('name');
    info2.push(`[${i}] id=${id} name=${name} ph=${ph}`);
  }
  console.log('=== EtichetteCalc inputs ===');
  info2.forEach(l => console.log(l));
});
