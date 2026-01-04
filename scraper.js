const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function lockFreeScrape() {
  const url = process.env.AI_URL || "https://aistudio.google.com/u/1/apps/drive/1C95LlT34ylBJSzh30JU2J1ZlwMZSIQrx?showPreview=true&showAssistant=true";
  const rawCookies = process.env.SESSION_COOKIES || '[]';
  
  console.log('🛡️ [V14.8] Starting Lock-Free Bulletproof Scraper...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage', 
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--js-flags="--max-old-space-size=512"' 
      ]
    });
  } catch (launchError) {
    console.error('💥 [CRASH] Browser failed to launch:', launchError.message);
    process.exit(1);
  }
  
  try {
    const page = await browser.newPage();
    const androidUA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36';
    await page.setUserAgent(androidUA);

    if (rawCookies && rawCookies.length > 20) {
      console.log('🍪 [AUTH] Injecting Session Vault...');
      const cookies = JSON.parse(rawCookies);
      await page.setCookie(...cookies.map(c => ({
        ...c, 
        domain: c.domain || '.google.com',
        secure: true,
        httpOnly: c.httpOnly || false,
        sameSite: 'Lax'
      })));
      await delay(2000);
    }

    console.log('🌐 [NAVIGATE] Connecting to: ' + url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
    
    await delay(12000); // Increased delay for heavy SPA hydration

    const bundleData = await page.evaluate(() => {
      return {
        html: document.body.innerHTML,
        head: document.head.innerHTML,
        origin: window.location.origin,
        cookies: document.cookie
      };
    });

    const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <base href="${bundleData.origin}/">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
  <title>LockFree AI Native</title>
  ${bundleData.head}
  <script>
    (function() {
      const cookies = ${JSON.stringify(bundleData.cookies)};
      if (cookies) {
        cookies.split(';').forEach(c => {
          document.cookie = c.trim() + "; domain=.google.com; path=/; SameSite=Lax";
        });
      }
    })();
  </script>
  <style>
    body { background: #000 !important; color: #fff !important; margin: 0; padding: 0; }
    #forge-container { width: 100vw; height: 100vh; overflow: auto; -webkit-overflow-scrolling: touch; }
  </style>
</head>
<body class="lockfree-v14-8">
  <div id="forge-container">${bundleData.html}</div>
</body>
</html>`;

    if (!fs.existsSync('www')) fs.mkdirSync('www', { recursive: true });
    fs.writeFileSync(path.join('www', 'index.html'), finalHtml);
    console.log('✅ [SUCCESS] Content extracted.');
  } catch (err) {
    console.error('❌ [FATAL] Scraper execution failed:', err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}
lockFreeScrape();