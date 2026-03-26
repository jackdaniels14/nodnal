// ─── Browser Session Pool ────────────────────────────────────────────────────
// Each agent gets its own isolated browser context (separate cookies, storage).
// Contexts are keyed by agentId — no cross-agent access.
// Playwright is loaded dynamically to avoid build failures in environments
// where browser binaries aren't available (e.g. Firebase App Hosting).

/* eslint-disable @typescript-eslint/no-explicit-any */
const contexts = new Map<string, any>();
const pages = new Map<string, any>();
let browser: any = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function getPage(agentId: string) {
  // Return existing page if still open
  const existing = pages.get(agentId);
  if (existing && !existing.isClosed()) return existing;

  // Create isolated context for this agent
  const b = await getBrowser();
  let ctx = contexts.get(agentId);
  if (!ctx) {
    ctx = await b.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    contexts.set(agentId, ctx);
  }

  const page = await ctx.newPage();
  pages.set(agentId, page);
  return page;
}

export async function closePage(agentId: string): Promise<void> {
  const page = pages.get(agentId);
  if (page && !page.isClosed()) await page.close();
  pages.delete(agentId);

  const ctx = contexts.get(agentId);
  if (ctx) {
    await ctx.close();
    contexts.delete(agentId);
  }
}

// ─── Browser Actions ─────────────────────────────────────────────────────────

export async function navigate(agentId: string, url: string): Promise<{ title: string; url: string }> {
  const page = await getPage(agentId);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  return { title: await page.title(), url: page.url() };
}

export async function screenshot(agentId: string): Promise<string> {
  const page = await getPage(agentId);
  const buffer = await page.screenshot({ type: 'png', fullPage: false });
  return buffer.toString('base64');
}

export async function getPageContent(agentId: string): Promise<string> {
  const page = await getPage(agentId);
  // Get visible text content, trimmed to a reasonable size
  const text = await page.evaluate(() => {
    const body = document.body;
    if (!body) return '';
    // Get text content but also include input values
    const elements = body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, li, td, th, span, label, input, select, textarea, button');
    const parts: string[] = [];
    elements.forEach(el => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        const input = el as HTMLInputElement;
        parts.push(`[${tag} name="${input.name}" value="${input.value}" placeholder="${input.placeholder}"]`);
      } else if (tag === 'select') {
        const select = el as HTMLSelectElement;
        parts.push(`[select name="${select.name}" value="${select.value}"]`);
      } else if (tag === 'a') {
        const anchor = el as HTMLAnchorElement;
        parts.push(`[link "${el.textContent?.trim()}" href="${anchor.href}"]`);
      } else if (tag === 'button') {
        parts.push(`[button "${el.textContent?.trim()}"]`);
      } else {
        const text = el.textContent?.trim();
        if (text) parts.push(text);
      }
    });
    return parts.join('\n');
  });
  // Cap at ~8000 chars to stay within reasonable token limits
  return text.slice(0, 8000);
}

export async function click(agentId: string, selector: string): Promise<{ success: boolean; error?: string }> {
  const page = await getPage(agentId);
  try {
    await page.click(selector, { timeout: 5000 });
    await page.waitForTimeout(500);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function fill(agentId: string, selector: string, value: string): Promise<{ success: boolean; error?: string }> {
  const page = await getPage(agentId);
  try {
    await page.fill(selector, value, { timeout: 5000 });
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function press(agentId: string, key: string): Promise<{ success: boolean; error?: string }> {
  const page = await getPage(agentId);
  try {
    await page.keyboard.press(key);
    await page.waitForTimeout(500);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function waitForSelector(agentId: string, selector: string, timeoutMs = 5000): Promise<{ found: boolean }> {
  const page = await getPage(agentId);
  try {
    await page.waitForSelector(selector, { timeout: timeoutMs });
    return { found: true };
  } catch {
    return { found: false };
  }
}
