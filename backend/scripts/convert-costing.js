const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');

const sourcePath = path.join(__dirname, '../../PROJECT_COSTING.md');
const destPath = path.join(__dirname, '../../PROJECT_COSTING.docx');

// Read the markdown file
const markdown = fs.readFileSync(sourcePath, 'utf8');
const lines = markdown.split('\n');

const children = [];
let inTable = false;
let tableRows = [];

function createTable(rows) {
    const tableRowParams = rows.map((row, rowIndex) => {
        const cells = row.split('|').map(c => c.trim()).filter(c => c);
        
        // Skip separator lines like |---|---|
        if (cells.some(c => c.match(/^-+$/))) return null;

        return new TableRow({
            children: cells.map(cellText => {
                // Remove bold markers for simplicity in table headers if present
                const cleanText = cellText.replace(/\*\*/g, '');
                return new TableCell({
                    children: [new Paragraph({ text: cleanText, style: rowIndex === 0 ? "strong" : undefined })],
                    width: { size: 100 / cells.length, type: WidthType.PERCENTAGE },
                });
            }),
        });
    }).filter(r => r !== null);

    return new Table({
        rows: tableRowParams,
        width: { size: 100, type: WidthType.PERCENTAGE },
    });
}

lines.forEach(line => {
    const trimmed = line.trim();
    
    // Handle Table logic
    if (trimmed.startsWith('|')) {
        inTable = true;
        tableRows.push(trimmed);
        return;
    } else if (inTable) {
        inTable = false;
        children.push(createTable(tableRows));
        tableRows = [];
    }

    if (trimmed === '') return;

    // Headers
    if (line.startsWith('# ')) {
        children.push(new Paragraph({
            text: line.substring(2),
            heading: HeadingLevel.TITLE,
            spacing: { before: 240, after: 120 }
        }));
    } else if (line.startsWith('## ')) {
        children.push(new Paragraph({
            text: line.substring(3),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 }
        }));
    } else if (line.startsWith('### ')) {
        children.push(new Paragraph({
            text: line.substring(4),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 }
        }));
    } 
    // Bullet Points
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        // Handle bolding in bullets
        const text = line.trim().substring(2);
        const parts = text.split('**');
        const textRuns = parts.map((part, index) => new TextRun({
            text: part,
            bold: index % 2 === 1 // Odd indices are inside ** **
        }));

        children.push(new Paragraph({
            children: textRuns,
            bullet: { level: 0 }
        }));
    }
    // Normal Text
    else {
        // Simple bold parser for normal text
        const parts = line.split('**');
        const textRuns = parts.map((part, index) => new TextRun({
            text: part,
            bold: index % 2 === 1
        }));
        
        children.push(new Paragraph({
            children: textRuns,
            spacing: { after: 120 }
        }));
    }
});

// Catch trailing table
if (inTable) {
    children.push(createTable(tableRows));
}

const doc = new Document({
    sections: [{
        properties: {},
        children: children,
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(destPath, buffer);
    console.log(`Successfully created ${destPath}`);
});
