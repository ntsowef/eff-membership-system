const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node scripts/convert_md_to_pdf.js <input_md_path> <output_pdf_path>');
        process.exit(1);
    }

    const inputPath = path.resolve(args[0]);
    const outputPath = path.resolve(args[1]);

    if (!fs.existsSync(inputPath)) {
        console.error(`Error: Input file not found at ${inputPath}`);
        process.exit(1);
    }

    console.log(`Reading Markdown file from: ${inputPath}`);
    let mdContent
    try {
        mdContent = fs.readFileSync(inputPath, 'utf8');
    } catch (err) {
        console.error('Error reading file:', err);
        process.exit(1);
    }

    const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Document</title>
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
        background-color: white;
      }
      @media (max-width: 767px) {
        .markdown-body {
          padding: 15px;
        }
      }
      .mermaid {
        display: flex;
        justify-content: center;
        margin: 20px 0;
      }
      /* Page break settings */
      @media print {
        h1, h2 { page-break-before: always; }
        h1:first-of-type { page-break-before: avoid; }
        pre, blockquote { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body class="markdown-body">
    <div id="content"></div>
    <script>
      mermaid.initialize({ 
        startOnLoad: false,
        theme: 'default'
      });
      
      const rawMarkdown = ${JSON.stringify(mdContent)};
      try {
        const parsedHtml = marked.parse(rawMarkdown);
        document.getElementById('content').innerHTML = parsedHtml;
      } catch (err) {
        document.getElementById('content').innerHTML = '<p style="color:red">Error parsing markdown: ' + err.message + '</p>';
      }
      
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

      mermaid.run().then(() => {
        window.isReady = true;
      }).catch(err => {
        console.error('Mermaid failed to render:', err);
        window.isReady = true;
      });
    </script>
  </body>
  </html>
  `;

    console.log('Launching browser...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    console.log('Rendering content...');
    await page.setContent(html);

    try {
        await page.waitForFunction(() => window.isReady, { timeout: 10000 });
    } catch (e) {
        console.warn('Timeout waiting for Mermaid readiness signal, proceeding anyway...');
    }

    // Extra wait to ensure layout settles
    await page.waitForTimeout(2000);

    console.log(`Generating PDF at ${outputPath}...`);
    await page.pdf({
        path: outputPath,
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
    console.log('PDF Successfully created.');
})();
