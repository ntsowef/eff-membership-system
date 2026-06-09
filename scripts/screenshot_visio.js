const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const htmlPath = 'file:///' + path.resolve('c:/Development/NewProj/Membership-newV2/scripts/visio_mockup.html').replace(/\\/g, '/');
    const outPath = 'C:\\Users\\ntsow\\.gemini\\antigravity\\brain\\aba12d24-1972-4c00-b2f5-8b1bf3c9e2d6\\architecture_visio_final.png';

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

    console.log(`Navigating to ${htmlPath}`);
    await page.goto(htmlPath);
    await page.waitForTimeout(1000); // Allow render

    await page.screenshot({ path: outPath, omitBackground: true });
    console.log(`Saved screenshot to ${outPath}`);

    await browser.close();
})();
