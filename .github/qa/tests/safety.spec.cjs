const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const bin = '#task-options input[value="recycleBin"]';
test.beforeEach(async ({page, context}) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.addInitScript(() => localStorage.setItem('systemCareTourSeen', 'true'));
  await page.goto('/');
});
function parseOnly(file) {
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
  execFileSync(shell, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.resolve(__dirname, '../parse-only.ps1'), '-Path', file], {stdio:'pipe'});
}
async function downloadScript(page, info, name) {
  const pending = page.waitForEvent('download');
  await page.locator('#download-script').click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe(name);
  const file = info.outputPath(name);
  await download.saveAs(file);
  const text = fs.readFileSync(file, 'utf8');
  expect(text).toBe(await page.locator('#script-code').textContent());
  parseOnly(file);
  return text;
}
for (const live of [false, true]) for (const recycle of [false, true]) {
  test(`Safe download: live=${live}, Recycle Bin=${recycle}`, async ({page}, info) => {
    await expect(page.locator('#live-safe')).not.toBeChecked();
    await expect(page.locator(bin)).not.toBeChecked();
    await expect(page.locator('#admin-tasks')).not.toBeChecked();
    if (recycle) await page.locator(bin).check();
    if (live) await page.locator('#live-safe').check();
    const text = await downloadScript(page, info, live ? 'system-care-safe-live.ps1' : 'system-care-script.ps1');
    expect(text).toContain(`Dry run: ${live ? 'disabled' : 'enabled'}`);
    expect(text).toContain('UtilityShelf\\SystemCareScriptBuilder\\Logs');
    expect(text).toContain('Finished with');
    expect(text).toContain('Invoke-CareStep');
    if (live) {
      expect(text).toContain('Run Live Safe cleanup as your normal user.');
      expect(text).toContain('Assert-LocalPath');
      expect(text).toContain('ReparsePoint');
      expect(text).toContain('Clear-DnsClientCache -ErrorAction Continue');
      expect(text.includes('Clear-RecycleBin -Force')).toBe(recycle);
      await expect(page.locator('#restore-point')).toBeDisabled();
    } else {
      expect(text).toContain('-WhatIf');
      expect(text).not.toContain('Clear-RecycleBin');
      expect(text).not.toContain('Clear-DnsClientCache -ErrorAction Continue');
      if (recycle) expect(text).toContain('Preview only: would empty the Recycle Bin.');
    }
  });
}
for (const level of ['balanced', 'deepClean', 'maxSpace']) {
  test(`${level} stays preview-only even if live checkbox is forced`, async ({page}, info) => {
    await page.locator('#live-safe').check();
    await page.locator(`[data-level="${level}"]`).click();
    await expect(page.locator('#live-safe')).not.toBeChecked();
    await expect(page.locator('#live-safe')).toBeDisabled();
    await expect(page.locator(bin)).not.toBeChecked();
    // Exercise the generator guard as well as the disabled UI.
    await page.locator('#live-safe').evaluate(el => { el.checked = true; });
    const text = await downloadScript(page, info, 'system-care-script.ps1');
    expect(text).toContain('Dry run: enabled');
    expect(text).not.toContain('LIVE SAFE CLEANUP');
  });
}
for (const change of ['admin', 'extra-task', 'missing-task', 'batch', 'shell']) {
  test(`changing ${change} revokes live consent`, async ({page}, info) => {
    await page.locator('#live-safe').check();
    if (change === 'admin') await page.locator('#admin-tasks').check();
    else if (change === 'extra-task') await page.locator('#task-options input[value="browserCaches"]').check();
    else if (change === 'missing-task') await page.locator('#task-options input[value="userTemp"]').uncheck();
    else await page.locator('#script-format').selectOption(change);
    await expect(page.locator('#live-safe')).not.toBeChecked();
    await expect(page.locator('#live-safe')).toBeDisabled();
    await page.locator('#live-safe').evaluate(el => { el.checked = true; });
    await page.locator('#generate-script').click();
    let text = await page.locator('#script-code').textContent();
    if (change === 'batch') {
      const base64 = [...text.matchAll(/>> "%SCB_B64%" echo\(([^\r\n]+)/g)].map(m=>m[1]).join('');
      expect(base64.length).toBeGreaterThan(0);
      text = Buffer.from(base64, 'base64').toString('utf8');
      const file = info.outputPath('batch-payload.ps1');
      fs.writeFileSync(file, text); parseOnly(file);
    }
    expect(text).not.toContain('LIVE SAFE CLEANUP');
    if (change !== 'shell') expect(text).toContain('Dry run: enabled');
    else expect(text).toContain('Preview');
  });
}
