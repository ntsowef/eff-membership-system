const fs = require('fs');
const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const mdPath = 'c:\\Development\\NewProj\\Membership-newV2\\docs\\Conceptual_Integration_Architecture.md';
    const outDir = 'C:\\Users\\ntsow\\.gemini\\antigravity\\brain\\aba12d24-1972-4c00-b2f5-8b1bf3c9e2d6';

    let mdContent = fs.readFileSync(mdPath, 'utf8');

    const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
      body { background-color: white; padding: 50px; display: block; }
      .mermaid { margin: 50px; background-color: white; padding: 20px; border-radius: 8px;}
    </style>
  </head>
  <body>
    <div id="content"></div>
    <script>
      mermaid.initialize({ startOnLoad: false, theme: 'base' });
      
      const rawMarkdown = ${JSON.stringify(mdContent)};
      document.getElementById('content').innerHTML = marked.parse(rawMarkdown);
      
      const mermaidCodeBlocks = document.querySelectorAll('code.language-mermaid');
      mermaidCodeBlocks.forEach(codeBlock => {
        const pre = codeBlock.parentElement;
        const div = document.createElement('div');
        div.className = 'mermaid';
        div.textContent = codeBlock.textContent;
        pre.replaceWith(div);
      });

      mermaid.run().then(() => {
        window.isReady = true;
      }).catch(err => {
        console.error(err);
        window.isReady = true;
      });
    </script>
  </body>
  </html>
  `;

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1920, height: 2000 } });
    await page.setContent(html);

    try {
        await page.waitForFunction(() => window.isReady, { timeout: 10000 });
    } catch (e) {
        console.log("Timeout waiting for Mermaid");
    }

    await page.waitForTimeout(2000); // Wait for fonts and layout

    const diagrams = await page.locator('.mermaid').all();
    console.log(`Found ${diagrams.length} diagrams.`);

    for (let i = 0; i < diagrams.length; i++) {
        const outName = path.join(outDir, `architecture_diagram_${i + 1}.png`);
        await diagrams[i].screenshot({ path: outName, omitBackground: false });
        console.log(`Saved ${outName}`);
    }
    await browser.close();
})();
