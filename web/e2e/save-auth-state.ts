import { chromium } from '@playwright/test';

(async () => {
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto('http://127.0.0.1:3788/app');
console.log('请在弹出的浏览器完成登录，然后回终端按 Enter...');
await new Promise<void>((resolve) => process.stdin.once('data', () => resolve()));
await context.storageState({ path: 'e2e/auth-state.json' });
await browser.close();
console.log('已保存 e2e/auth-state.json');
})();
