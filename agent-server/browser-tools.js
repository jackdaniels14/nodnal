import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// ─── Browser State ───────────────────────────────────────────────────────────
// Each agent gets isolated browser context via agentId passed in tool args.

const sessions = new Map(); // agentId -> { browser, context, page }

async function getSession(agentId) {
  if (sessions.has(agentId)) {
    const s = sessions.get(agentId);
    if (s.page && !s.page.isClosed()) return s;
    // Clean up stale session
    sessions.delete(agentId);
  }

  const { chromium } = await import('playwright');
  const browserlessKey = process.env.BROWSERLESS_API_KEY?.trim();

  let browser;
  if (browserlessKey) {
    browser = await chromium.connectOverCDP(`wss://chrome.browserless.io?token=${browserlessKey}`);
  } else {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });
  const page = await context.newPage();
  const session = { browser, context, page };
  sessions.set(agentId, session);
  return session;
}

// ─── Tools ───────────────────────────────────────────────────────────────────

const navigate = tool(
  'navigate',
  'Go to a URL in the browser and return the page content. Use this to visit any website.',
  { url: z.string().describe('Full URL to visit') },
  async (args) => {
    const agentId = 'default'; // SDK manages sessions internally
    const { page } = await getSession(agentId);
    await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const title = await page.title();
    const body = await page.textContent('body').catch(() => '');
    const clean = (body || '').replace(/\s+/g, ' ').trim().slice(0, 6000);
    return { content: [{ type: 'text', text: `Navigated to "${title}" (${page.url()})\n\n${clean}` }] };
  }
);

const readPage = tool(
  'read_page',
  'Read the current page content in detail — links, buttons, forms, text. Use after navigating.',
  {},
  async () => {
    const agentId = 'default';
    const { page } = await getSession(agentId);
    const title = await page.title();
    const url = page.url();
    const content = await page.evaluate(() => {
      const els = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,li,td,th,span,label,input,select,textarea,button');
      const parts = [];
      els.forEach(el => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') {
          parts.push(`[${tag} name="${el.name}" type="${el.type}" value="${el.value}" placeholder="${el.placeholder}"]`);
        } else if (tag === 'select') {
          parts.push(`[select name="${el.name}" value="${el.value}"]`);
        } else if (tag === 'a') {
          parts.push(`[link "${el.textContent?.trim()}" href="${el.href}"]`);
        } else if (tag === 'button') {
          parts.push(`[button "${el.textContent?.trim()}"]`);
        } else {
          const text = el.textContent?.trim();
          if (text && text.length > 1) parts.push(text);
        }
      });
      return parts.slice(0, 200).join('\n');
    });
    return { content: [{ type: 'text', text: `Page: "${title}" (${url})\n\n${content}` }] };
  }
);

const click = tool(
  'click',
  'Click an element on the page. Use CSS selectors or text selectors like "button:text(\"Login\")", "#submit", "a:text(\"Sign In\")".',
  { selector: z.string().describe('CSS or text selector') },
  async (args) => {
    const { page } = await getSession('default');
    await page.click(args.selector, { timeout: 8000 });
    await page.waitForTimeout(1000);
    const title = await page.title();
    return { content: [{ type: 'text', text: `Clicked "${args.selector}". Now on: "${title}" (${page.url()})` }] };
  }
);

const fill = tool(
  'fill',
  'Type text into a form field. Use CSS selectors like "input[name=email]", "#password".',
  {
    selector: z.string().describe('CSS selector for the input'),
    value: z.string().describe('Text to type'),
  },
  async (args) => {
    const { page } = await getSession('default');
    await page.fill(args.selector, args.value, { timeout: 8000 });
    return { content: [{ type: 'text', text: `Filled "${args.selector}" with value.` }] };
  }
);

const pressKey = tool(
  'press_key',
  'Press a keyboard key. Common: Enter, Tab, Escape.',
  { key: z.string().describe('Key to press') },
  async (args) => {
    const { page } = await getSession('default');
    await page.keyboard.press(args.key);
    await page.waitForTimeout(500);
    return { content: [{ type: 'text', text: `Pressed "${args.key}".` }] };
  }
);

const screenshot = tool(
  'screenshot',
  'Take a screenshot of the current page to see it visually.',
  {},
  async () => {
    const { page } = await getSession('default');
    const buffer = await page.screenshot({ type: 'png', fullPage: false });
    return {
      content: [{
        type: 'image',
        data: buffer.toString('base64'),
        mimeType: 'image/png',
      }],
    };
  }
);

const fetchUrl = tool(
  'fetch_url',
  'Quick HTTP fetch of a URL — returns text content. For simple pages that don\'t need JavaScript.',
  { url: z.string().describe('URL to fetch') },
  async (args) => {
    const res = await fetch(args.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NodnalBot/1.0)' },
      redirect: 'follow',
    });
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : args.url;
    const clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000);
    return { content: [{ type: 'text', text: `"${title}" (${res.url})\n\n${clean}` }] };
  }
);

// ─── MCP Server ──────────────────────────────────────────────────────────────

export const browserServer = createSdkMcpServer({
  name: 'browser',
  version: '1.0.0',
  tools: [navigate, readPage, click, fill, pressKey, screenshot, fetchUrl],
});

export function cleanupSessions() {
  for (const [id, session] of sessions) {
    session.browser?.close().catch(() => {});
    sessions.delete(id);
  }
}
