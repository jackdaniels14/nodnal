// ─── Cloud Browser Pool ──────────────────────────────────────────────────────
// Connects to Browserless.io cloud browser service.
// Each agent gets its own isolated browser context.
// Falls back to local Playwright if no Browserless key is set.

/* eslint-disable @typescript-eslint/no-explicit-any */

const contexts = new Map<string, any>();
const pages = new Map<string, any>();
let browser: any = null;

async function ensureBrowser() {
  if (browser && browser.isConnected()) return browser;

  const { chromium } = await import('playwright');
  const key = process.env.BROWSERLESS_API_KEY?.trim();

  if (key) {
    browser = await chromium.connectOverCDP(`wss://chrome.browserless.io?token=${key}`);
  } else {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

async function getPage(agentId: string) {
  const existing = pages.get(agentId);
  if (existing && !existing.isClosed()) return existing;

  const b = await ensureBrowser();

  // Clean up old context if exists
  const oldCtx = contexts.get(agentId);
  if (oldCtx) {
    try { await oldCtx.close(); } catch { /* ignore */ }
    contexts.delete(agentId);
    pages.delete(agentId);
  }

  const ctx = await b.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  contexts.set(agentId, ctx);

  const page = await ctx.newPage();
  pages.set(agentId, page);
  return page;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function navigate(agentId: string, url: string): Promise<string> {
  const page = await getPage(agentId);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const title = await page.title();
  const body = await page.textContent('body').catch(() => '');
  const clean = (body || '').replace(/\s+/g, ' ').trim().slice(0, 6000);
  return `Navigated to "${title}" (${page.url()})\n\nPage content:\n${clean}`;
}

export async function screenshot(agentId: string): Promise<string> {
  const page = await getPage(agentId);
  const buffer = await page.screenshot({ type: 'png', fullPage: false });
  return buffer.toString('base64');
}

export async function readPage(agentId: string): Promise<string> {
  const page = await getPage(agentId);
  const title = await page.title();
  const url = page.url();

  const content = await page.evaluate(() => {
    const els = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,li,td,th,span,label,input,select,textarea,button');
    const parts: string[] = [];
    els.forEach(el => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        const inp = el as HTMLInputElement;
        parts.push(`[${tag} name="${inp.name}" type="${inp.type}" value="${inp.value}" placeholder="${inp.placeholder}"]`);
      } else if (tag === 'select') {
        const sel = el as HTMLSelectElement;
        parts.push(`[select name="${sel.name}" value="${sel.value}"]`);
      } else if (tag === 'a') {
        parts.push(`[link "${el.textContent?.trim()}" href="${(el as HTMLAnchorElement).href}"]`);
      } else if (tag === 'button') {
        parts.push(`[button "${el.textContent?.trim()}"]`);
      } else {
        const text = el.textContent?.trim();
        if (text && text.length > 1) parts.push(text);
      }
    });
    return parts.slice(0, 200).join('\n');
  });

  return `Page: "${title}" (${url})\n\n${content}`;
}

export async function click(agentId: string, selector: string): Promise<string> {
  const page = await getPage(agentId);
  await page.click(selector, { timeout: 8000 });
  await page.waitForTimeout(1000);
  const title = await page.title();
  return `Clicked "${selector}". Page is now: "${title}" (${page.url()})`;
}

export async function fill(agentId: string, selector: string, value: string): Promise<string> {
  const page = await getPage(agentId);
  await page.fill(selector, value, { timeout: 8000 });
  return `Filled "${selector}" with value.`;
}

export async function pressKey(agentId: string, key: string): Promise<string> {
  const page = await getPage(agentId);
  await page.keyboard.press(key);
  await page.waitForTimeout(500);
  return `Pressed "${key}".`;
}

export async function closeBrowser(agentId: string): Promise<void> {
  const page = pages.get(agentId);
  if (page && !page.isClosed()) await page.close().catch(() => {});
  pages.delete(agentId);

  const ctx = contexts.get(agentId);
  if (ctx) { await ctx.close().catch(() => {}); contexts.delete(agentId); }
}
