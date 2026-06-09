const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
    // Input and Output Paths
    const mdPath = 'c:\\Development\\NewProj\\Membership-newV2\\docs\\Conceptual_Integration_Architecture.md';
    const outPath = 'c:\\Development\\NewProj\\Membership-newV2\\docs\\Conceptual_Integration_Architecture.pdf';

    console.log('Reading Markdown file...');
    let mdContent
    try {
        mdContent = fs.readFileSync(mdPath, 'utf8');
    } catch (err) {
        console.error('Error reading file:', err);
        process.exit(1);
    }

    const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Conceptual Integration Architecture</title>
    <!-- Marked for Markdown Parsing -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <!-- Mermaid for Diagrams -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <!-- GitHub Markdown CSS for Styling -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.0/github-markdown.min.css" rel="stylesheet">
    <style>
      .markdown-body {
        box-sizing: border-box;
        min-width: 200px;
        max-width: 980px;
        margin: 0 auto;
        padding: 45px;
        background-color: white; /* Ensure white background for PDF */
      }
      @media (max-width: 767px) {
        .markdown-body {
          padding: 15px;
        }
      }
      /* Ensure mermaid diagrams are centered and readable */
      .mermaid {
        display: flex;
        justify-content: center;
        margin: 20px 0;
      }
      
      /* Force breaks to prevent mid-diagram splits */
      .mermaid {
          page-break-inside: avoid;
      }
    </style>
  </head>
  <body class="markdown-body">
    <div id="content"></div>
    <script>
      // Initialize Mermaid
      mermaid.initialize({ 
        startOnLoad: false,
        theme: 'default'
      });
      
      // Parse Markdown
      const rawMarkdown = ${JSON.stringify(mdContent)};
      try {
        const parsedHtml = marked.parse(rawMarkdown);
        document.getElementById('content').innerHTML = parsedHtml;
      } catch (err) {
        document.getElementById('content').innerHTML = '<p style="color:red">Error parsing markdown: ' + err.message + '</p>';
      }
      
      // Transform code blocks to mermaid divs
      const mermaidCodeBlocks = document.querySelectorAll('code.language-mermaid');
      
      mermaidCodeBlocks.forEach(codeBlock => {
        const preElement = codeBlock.parentElement;
        if (preElement && preElement.tagName === 'PRE') {
          const div = document.createElement('div');
          div.className = 'mermaid';
          div.textContent = codeBlock.textContent;
          preElement.replaceWith(div);
        }
      });

      // Run Mermaid
      mermaid.run().then(() => {
        // Signal ready for Playwright
        window.isReady = true;
      }).catch(err => {
        console.error('Mermaid failed to render:', err);
        window.isReady = true; // Proceed anyway
      });
    </script>
  </body>
  </html>
  `;

    console.log('Launching browser for PDF generation...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Function to wait for window.isReady
    console.log('Rendering content...');
    await page.setContent(html);

    try {
        await page.waitForFunction(() => window.isReady, { timeout: 10000 });
    } catch (e) {
        console.warn('Timeout waiting for Mermaid readiness signal, proceeding anyway...');
    }

    // Extra wait to ensure layout settles
    await page.waitForTimeout(2000);

    console.log('Generating PDF...');
    await page.pdf({
        path: outPath,
        format: 'A4',
        printBackground: true,
        margin: {
            top: '20px',
            bottom: '20px',
            left: '20px',
            right: '20px'
        }
    });

    await browser.close();
    console.log('PDF Successfully created at:', outPath);
})();
