#!/usr/bin/env python3
"""
Technical Architecture PDF Generator
Converts the technical architecture markdown to a professional PDF document
"""

import os
import sys
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white, blue, green, red, orange
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.platypus import Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from datetime import datetime
import re

class ArchitecturePDFGenerator:
    def __init__(self):
        self.doc = None
        self.story = []
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
        
    def setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Title'],
            fontSize=24,
            spaceAfter=30,
            textColor=HexColor('#1976d2'),
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='CustomSubtitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            textColor=HexColor('#424242'),
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Section heading
        self.styles.add(ParagraphStyle(
            name='SectionHeading',
            parent=self.styles['Heading1'],
            fontSize=16,
            spaceAfter=15,
            spaceBefore=20,
            textColor=HexColor('#1976d2'),
            fontName='Helvetica-Bold'
        ))
        
        # Subsection heading
        self.styles.add(ParagraphStyle(
            name='SubsectionHeading',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=10,
            spaceBefore=15,
            textColor=HexColor('#424242'),
            fontName='Helvetica-Bold'
        ))
        
        # Code block style
        self.styles.add(ParagraphStyle(
            name='CodeBlock',
            parent=self.styles['Code'],
            fontSize=10,
            fontName='Courier',
            backgroundColor=HexColor('#f5f5f5'),
            borderColor=HexColor('#e0e0e0'),
            borderWidth=1,
            leftIndent=20,
            rightIndent=20,
            spaceAfter=10,
            spaceBefore=10
        ))
        
        # Highlight box
        self.styles.add(ParagraphStyle(
            name='HighlightBox',
            parent=self.styles['Normal'],
            fontSize=11,
            backgroundColor=HexColor('#e3f2fd'),
            borderColor=HexColor('#1976d2'),
            borderWidth=2,
            leftIndent=15,
            rightIndent=15,
            spaceAfter=15,
            spaceBefore=10
        ))

    def create_header_footer(self, canvas, doc):
        """Create header and footer for each page"""
        canvas.saveState()
        
        # Header
        canvas.setFont('Helvetica-Bold', 10)
        canvas.setFillColor(HexColor('#1976d2'))
        canvas.drawString(50, A4[1] - 50, "Technical Architecture - Membership Management System")
        
        # Footer
        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(black)
        canvas.drawString(50, 30, f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        canvas.drawRightString(A4[0] - 50, 30, f"Page {doc.page}")
        
        canvas.restoreState()

    def parse_markdown_content(self, content):
        """Parse markdown content and convert to PDF elements"""
        lines = content.split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            if not line:
                i += 1
                continue
                
            # Title (# )
            if line.startswith('# '):
                title = line[2:].strip()
                self.story.append(Paragraph(title, self.styles['CustomTitle']))
                self.story.append(Spacer(1, 20))
                
            # Subtitle (## )
            elif line.startswith('## '):
                subtitle = line[3:].strip()
                self.story.append(Paragraph(subtitle, self.styles['CustomSubtitle']))
                self.story.append(Spacer(1, 15))
                
            # Section heading (### )
            elif line.startswith('### '):
                heading = line[4:].strip()
                self.story.append(Paragraph(heading, self.styles['SectionHeading']))
                self.story.append(Spacer(1, 10))
                
            # Subsection heading (#### )
            elif line.startswith('#### '):
                subheading = line[5:].strip()
                self.story.append(Paragraph(subheading, self.styles['SubsectionHeading']))
                self.story.append(Spacer(1, 8))
                
            # Code blocks (```)
            elif line.startswith('```'):
                code_lines = []
                i += 1
                while i < len(lines) and not lines[i].strip().startswith('```'):
                    code_lines.append(lines[i])
                    i += 1
                
                if code_lines:
                    code_text = '\n'.join(code_lines)
                    # Escape HTML characters
                    code_text = code_text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    self.story.append(Paragraph(f'<pre>{code_text}</pre>', self.styles['CodeBlock']))
                    self.story.append(Spacer(1, 10))
                    
            # ASCII diagrams (detect box drawing characters)
            elif '┌' in line or '├' in line or '│' in line:
                diagram_lines = [line]
                i += 1
                while i < len(lines) and ('┌' in lines[i] or '├' in lines[i] or '│' in lines[i] or '└' in lines[i] or '─' in lines[i] or lines[i].strip() == ''):
                    if lines[i].strip():  # Only add non-empty lines
                        diagram_lines.append(lines[i])
                    i += 1
                i -= 1  # Back up one since we'll increment at the end
                
                if diagram_lines:
                    diagram_text = '\n'.join(diagram_lines)
                    self.story.append(Paragraph(f'<pre>{diagram_text}</pre>', self.styles['CodeBlock']))
                    self.story.append(Spacer(1, 15))
                    
            # Tables (detect | characters)
            elif '|' in line and '─' not in line:
                table_lines = [line]
                i += 1
                while i < len(lines) and '|' in lines[i]:
                    table_lines.append(lines[i])
                    i += 1
                i -= 1
                
                if len(table_lines) > 1:
                    self.create_table(table_lines)
                    
            # Bullet points
            elif line.startswith('- ') or line.startswith('* '):
                bullet_text = line[2:].strip()
                bullet_text = self.format_inline_markdown(bullet_text)
                self.story.append(Paragraph(f'• {bullet_text}', self.styles['Normal']))
                self.story.append(Spacer(1, 5))
                
            # Numbered lists
            elif re.match(r'^\d+\. ', line):
                list_text = re.sub(r'^\d+\. ', '', line).strip()
                list_text = self.format_inline_markdown(list_text)
                number = re.match(r'^(\d+)\.', line).group(1)
                self.story.append(Paragraph(f'{number}. {list_text}', self.styles['Normal']))
                self.story.append(Spacer(1, 5))
                
            # Regular paragraphs
            else:
                if line:
                    formatted_text = self.format_inline_markdown(line)
                    self.story.append(Paragraph(formatted_text, self.styles['Normal']))
                    self.story.append(Spacer(1, 8))
            
            i += 1

    def format_inline_markdown(self, text):
        """Format inline markdown elements like bold, italic, code"""
        # Bold (**text**)
        text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
        
        # Italic (*text*)
        text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
        
        # Inline code (`code`)
        text = re.sub(r'`(.*?)`', r'<font name="Courier" color="#d32f2f">\1</font>', text)
        
        return text

    def create_table(self, table_lines):
        """Create a table from markdown table lines"""
        # Parse table data
        data = []
        for line in table_lines:
            if '─' in line:  # Skip separator lines
                continue
            cells = [cell.strip() for cell in line.split('|')[1:-1]]  # Remove empty first/last
            if cells:
                data.append(cells)
        
        if not data:
            return
            
        # Create table
        table = Table(data)
        
        # Style the table
        table_style = [
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f5f5f5')),
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
        ]
        
        table.setStyle(TableStyle(table_style))
        self.story.append(table)
        self.story.append(Spacer(1, 15))

    def generate_pdf(self, markdown_file, output_file):
        """Generate PDF from markdown file"""
        # Read markdown content
        try:
            with open(markdown_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except FileNotFoundError:
            print(f"Error: Markdown file '{markdown_file}' not found.")
            return False
        except Exception as e:
            print(f"Error reading markdown file: {e}")
            return False
        
        # Create PDF document
        self.doc = SimpleDocTemplate(
            output_file,
            pagesize=A4,
            rightMargin=50,
            leftMargin=50,
            topMargin=70,
            bottomMargin=50
        )
        
        # Parse content
        self.parse_markdown_content(content)
        
        # Build PDF
        try:
            self.doc.build(self.story, onFirstPage=self.create_header_footer, onLaterPages=self.create_header_footer)
            print(f"✅ PDF generated successfully: {output_file}")
            return True
        except Exception as e:
            print(f"Error generating PDF: {e}")
            return False

def main():
    """Main function"""
    generator = ArchitecturePDFGenerator()
    
    # Input and output files
    markdown_file = "Technical_Architecture_Membership_Management_System.md"
    output_file = "Technical_Architecture_Membership_Management_System.pdf"
    
    # Generate PDF
    success = generator.generate_pdf(markdown_file, output_file)
    
    if success:
        print(f"\n🎉 Technical Architecture PDF created successfully!")
        print(f"📄 File: {output_file}")
        print(f"📍 Location: {os.path.abspath(output_file)}")
    else:
        print("\n❌ Failed to generate PDF")
        sys.exit(1)

if __name__ == "__main__":
    main()
