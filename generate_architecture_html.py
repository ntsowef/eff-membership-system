#!/usr/bin/env python3
"""
Technical Architecture HTML Generator
Converts the technical architecture markdown to a professional HTML document
that can be printed to PDF from any browser
"""

import os
import re
from datetime import datetime

class ArchitectureHTMLGenerator:
    def __init__(self):
        self.html_content = ""
        
    def get_html_template(self):
        """Get the HTML template with CSS styling"""
        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Technical Architecture - Membership Management System</title>
    <style>
        @page {{
            size: A4;
            margin: 2cm;
        }}
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #1976d2;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #1976d2;
            font-size: 28px;
            margin: 0;
            font-weight: bold;
        }
        
        .header h2 {
            color: #424242;
            font-size: 20px;
            margin: 10px 0 0 0;
            font-weight: normal;
        }
        
        .generated-info {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-bottom: 30px;
        }
        
        h1 {
            color: #1976d2;
            font-size: 24px;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 10px;
            margin-top: 30px;
        }
        
        h2 {
            color: #1976d2;
            font-size: 20px;
            margin-top: 25px;
            margin-bottom: 15px;
        }
        
        h3 {
            color: #424242;
            font-size: 18px;
            margin-top: 20px;
            margin-bottom: 12px;
        }
        
        h4 {
            color: #424242;
            font-size: 16px;
            margin-top: 18px;
            margin-bottom: 10px;
        }
        
        p {
            margin-bottom: 12px;
            text-align: justify;
        }
        
        ul, ol {
            margin-bottom: 15px;
            padding-left: 25px;
        }
        
        li {
            margin-bottom: 5px;
        }
        
        .code-block {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-left: 4px solid #1976d2;
            padding: 15px;
            margin: 15px 0;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            overflow-x: auto;
            white-space: pre;
        }
        
        .diagram {
            background: #f8f9fa;
            border: 2px solid #1976d2;
            padding: 20px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            text-align: center;
            white-space: pre;
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
        }
        
        th {
            background: #1976d2;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
        }
        
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #ddd;
        }
        
        tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .highlight-box {
            background: #e3f2fd;
            border: 2px solid #1976d2;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .phase-box {
            background: #f1f8e9;
            border: 2px solid #4caf50;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .cost-box {
            background: #fff3e0;
            border: 2px solid #ff9800;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .risk-box {
            background: #ffebee;
            border: 2px solid #f44336;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .no-break {
            page-break-inside: avoid;
        }
        
        code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            color: #d32f2f;
            font-size: 90%;
        }
        
        strong {
            color: #1976d2;
            font-weight: bold;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 15px;
            }
            
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Technical Architecture Recommendation</h1>
        <h2>Membership Management System</h2>
    </div>
    
    <div class="generated-info">
        Generated on {timestamp}
    </div>
    
    {content}
    
    <div class="footer">
        <p>This document provides comprehensive technical architecture recommendations for scaling the membership management system.</p>
        <p>For questions or clarifications, please contact the development team.</p>
    </div>
</body>
</html>
"""

    def parse_markdown_to_html(self, content):
        """Convert markdown content to HTML"""
        lines = content.split('\n')
        html_lines = []
        i = 0
        in_code_block = False
        code_lines = []
        
        while i < len(lines):
            line = lines[i]
            
            # Handle code blocks
            if line.strip().startswith('```'):
                if in_code_block:
                    # End code block
                    code_content = '\n'.join(code_lines)
                    if any(char in code_content for char in ['┌', '├', '│', '└', '─']):
                        html_lines.append(f'<div class="diagram">{self.escape_html(code_content)}</div>')
                    else:
                        html_lines.append(f'<div class="code-block">{self.escape_html(code_content)}</div>')
                    code_lines = []
                    in_code_block = False
                else:
                    # Start code block
                    in_code_block = True
                i += 1
                continue
            
            if in_code_block:
                code_lines.append(line)
                i += 1
                continue
            
            # Skip empty lines
            if not line.strip():
                html_lines.append('<br>')
                i += 1
                continue
            
            # Headers
            if line.startswith('# '):
                html_lines.append(f'<h1>{line[2:].strip()}</h1>')
            elif line.startswith('## '):
                html_lines.append(f'<h2>{line[3:].strip()}</h2>')
            elif line.startswith('### '):
                title = line[4:].strip()
                if 'Phase' in title:
                    html_lines.append(f'<div class="phase-box"><h3>{title}</h3>')
                elif 'Cost' in title:
                    html_lines.append(f'<div class="cost-box"><h3>{title}</h3>')
                elif 'Risk' in title:
                    html_lines.append(f'<div class="risk-box"><h3>{title}</h3>')
                else:
                    html_lines.append(f'<h3>{title}</h3>')
            elif line.startswith('#### '):
                html_lines.append(f'<h4>{line[5:].strip()}</h4>')
            
            # Tables
            elif '|' in line and not line.strip().startswith('|---'):
                table_lines = [line]
                i += 1
                while i < len(lines) and '|' in lines[i]:
                    if not lines[i].strip().startswith('|---'):
                        table_lines.append(lines[i])
                    i += 1
                i -= 1
                
                if len(table_lines) > 1:
                    html_lines.append(self.create_html_table(table_lines))
            
            # Lists
            elif line.strip().startswith('- ') or line.strip().startswith('* '):
                # Start unordered list
                html_lines.append('<ul>')
                while i < len(lines) and (lines[i].strip().startswith('- ') or lines[i].strip().startswith('* ')):
                    item_text = lines[i].strip()[2:].strip()
                    item_text = self.format_inline_markdown(item_text)
                    html_lines.append(f'<li>{item_text}</li>')
                    i += 1
                html_lines.append('</ul>')
                i -= 1
            
            elif re.match(r'^\d+\. ', line.strip()):
                # Start ordered list
                html_lines.append('<ol>')
                while i < len(lines) and re.match(r'^\d+\. ', lines[i].strip()):
                    item_text = re.sub(r'^\d+\. ', '', lines[i].strip())
                    item_text = self.format_inline_markdown(item_text)
                    html_lines.append(f'<li>{item_text}</li>')
                    i += 1
                html_lines.append('</ol>')
                i -= 1
            
            # Regular paragraphs
            else:
                formatted_line = self.format_inline_markdown(line.strip())
                if formatted_line:
                    html_lines.append(f'<p>{formatted_line}</p>')
            
            i += 1
        
        return '\n'.join(html_lines)

    def format_inline_markdown(self, text):
        """Format inline markdown elements"""
        # Bold
        text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
        
        # Italic
        text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)
        
        # Inline code
        text = re.sub(r'`(.*?)`', r'<code>\1</code>', text)
        
        return text

    def escape_html(self, text):
        """Escape HTML characters"""
        return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

    def create_html_table(self, table_lines):
        """Create HTML table from markdown table lines"""
        html = ['<table>']
        
        for i, line in enumerate(table_lines):
            cells = [cell.strip() for cell in line.split('|')[1:-1]]
            if not cells:
                continue
                
            if i == 0:
                # Header row
                html.append('<tr>')
                for cell in cells:
                    html.append(f'<th>{self.format_inline_markdown(cell)}</th>')
                html.append('</tr>')
            else:
                # Data row
                html.append('<tr>')
                for cell in cells:
                    html.append(f'<td>{self.format_inline_markdown(cell)}</td>')
                html.append('</tr>')
        
        html.append('</table>')
        return '\n'.join(html)

    def generate_html(self, markdown_file, output_file):
        """Generate HTML from markdown file"""
        try:
            with open(markdown_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except FileNotFoundError:
            print(f"Error: Markdown file '{markdown_file}' not found.")
            return False
        except Exception as e:
            print(f"Error reading markdown file: {e}")
            return False
        
        # Convert markdown to HTML
        html_content = self.parse_markdown_to_html(content)
        
        # Get template and insert content
        template = self.get_html_template()
        final_html = template.replace('{content}', html_content).replace('{timestamp}', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        
        # Write HTML file
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(final_html)
            print(f"✅ HTML generated successfully: {output_file}")
            return True
        except Exception as e:
            print(f"Error writing HTML file: {e}")
            return False

def main():
    """Main function"""
    generator = ArchitectureHTMLGenerator()

    # Check command line arguments for file selection
    import sys
    if len(sys.argv) > 1:
        if sys.argv[1] == "solution":
            # Generate Solution Architecture
            markdown_file = "Comprehensive_Solution_Architecture.md"
            html_file = "Comprehensive_Solution_Architecture.html"
            doc_type = "Solution Architecture"
        elif sys.argv[1] == "guide":
            # Generate Implementation Guide
            markdown_file = "Architecture_Implementation_Guide.md"
            html_file = "Architecture_Implementation_Guide.html"
            doc_type = "Implementation Guide"
        elif sys.argv[1] == "index":
            # Generate Documentation Index
            markdown_file = "Architecture_Documentation_Index.md"
            html_file = "Architecture_Documentation_Index.html"
            doc_type = "Documentation Index"
        else:
            # Generate Technical Architecture (default)
            markdown_file = "Technical_Architecture_Membership_Management_System.md"
            html_file = "Technical_Architecture_Membership_Management_System.html"
            doc_type = "Technical Architecture"
    else:
        # Generate Technical Architecture (default)
        markdown_file = "Technical_Architecture_Membership_Management_System.md"
        html_file = "Technical_Architecture_Membership_Management_System.html"
        doc_type = "Technical Architecture"

    # Generate HTML
    success = generator.generate_html(markdown_file, html_file)

    if success:
        print(f"\n🎉 {doc_type} HTML created successfully!")
        print(f"📄 File: {html_file}")
        print(f"📍 Location: {os.path.abspath(html_file)}")
        print(f"\n📋 Instructions to create PDF:")
        print(f"1. Open {html_file} in your web browser")
        print(f"2. Press Ctrl+P (or Cmd+P on Mac)")
        print(f"3. Select 'Save as PDF' as destination")
        print(f"4. Choose 'More settings' and set margins to 'Minimum'")
        print(f"5. Save as '{html_file.replace('.html', '.pdf')}'")
    else:
        print(f"\n❌ Failed to generate {doc_type} HTML")

if __name__ == "__main__":
    main()
