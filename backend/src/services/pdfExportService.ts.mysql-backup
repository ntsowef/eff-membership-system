const PDFDocument = require('pdfkit');
import { executeQuery } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import { ChartGenerationService } from './chartGenerationService';

export interface PDFExportOptions {
  title?: string;
  subtitle?: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
  pageSize?: 'A4' | 'A3' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface TableColumn {
  key: string;
  title: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

export class PDFExportService {
  private static readonly DEFAULT_OPTIONS: PDFExportOptions = {
    title: 'Export Report',
    subtitle: '',
    includeHeader: true,
    includeFooter: true,
    pageSize: 'A4',
    orientation: 'portrait',
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50
    }
  };

  static async exportMembersToPDF(
    filters: any = {},
    options: PDFExportOptions = {}
  ): Promise<Buffer> {
    try {
      console.log('🔄 Starting PDF generation...');

      // Create a simple PDF document first
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));

      console.log('📄 PDF document created, adding content...');

      // Add simple content
      doc.fontSize(20).text('Members Export Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Try to fetch members data
      try {
        console.log('🔍 Fetching members data...');
        const members = await this.fetchMembersData(filters);
        console.log(`📊 Found ${members.length} members`);

        doc.fontSize(14).text(`Total Members: ${members.length}`);
        doc.moveDown();

        // Add first few members as simple text (not table)
        const displayMembers = members.slice(0, 10);
        displayMembers.forEach((member, index) => {
          const name = member.full_name || `${member.firstname || ''} ${member.surname || ''}`.trim();
          doc.fontSize(10).text(`${index + 1}. ${name} - ${member.cell_number || 'No phone'}`);
        });

        if (members.length > 10) {
          doc.moveDown().text(`... and ${members.length - 10} more members`);
        }

      } catch (dbError) {
        console.error('❌ Database error:', dbError);
        doc.fontSize(12).text('Error loading members data from database.');
        doc.text('This is a test PDF to verify PDF generation is working.');
      }

      doc.end();
      console.log('✅ PDF generation completed');

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          console.log('📦 PDF buffer created successfully');
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', (error) => {
          console.error('❌ PDF generation error:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ PDF export error:', error);
      throw createDatabaseError('Failed to generate PDF export', error);
    }
  }

  static async exportVotingDistrictsToPDF(
    filters: any = {},
    options: PDFExportOptions = {}
  ): Promise<Buffer> {
    try {
      const opts = { ...this.DEFAULT_OPTIONS, ...options };
      
      // Fetch voting districts data
      const votingDistricts = await this.fetchVotingDistrictsData(filters);
      
      const doc = new PDFDocument({
        size: opts.pageSize,
        layout: opts.orientation,
        margins: opts.margins
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));

      if (opts.includeHeader) {
        this.addHeader(doc, opts.title || 'Voting Districts Report', opts.subtitle);
      }

      // Add voting districts table
      const columns: TableColumn[] = [
        { key: 'voting_district_number', title: 'VD #', width: 50, align: 'center' },
        { key: 'voting_district_name', title: 'Voting District', width: 150, align: 'left' },
        { key: 'ward_name', title: 'Ward', width: 80, align: 'left' },
        { key: 'municipality_name', title: 'Municipality', width: 100, align: 'left' },
        { key: 'member_count', title: 'Members', width: 60, align: 'center' },
        { key: 'is_active', title: 'Status', width: 60, align: 'center' }
      ];

      this.addTable(doc, votingDistricts, columns);

      if (opts.includeFooter) {
        this.addFooter(doc);
      }

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', reject);
      });

    } catch (error) {
      throw createDatabaseError('Failed to generate voting districts PDF', error);
    }
  }

  private static async fetchMembersData(filters: any = {}): Promise<any[]> {
    let query = `
      SELECT 
        m.member_id,
        m.firstname,
        m.surname,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
        m.cell_number,
        m.email,
        m.age,
        g.gender_name,
        w.ward_name,
        CONCAT('Ward ', w.ward_number) as ward_display,
        mu.municipality_name,
        d.district_name,
        p.province_name,
        vd.voting_district_name,
        CONCAT('VD ', vd.voting_district_number) as voting_district_display,
        m.created_at
      FROM members m
      LEFT JOIN genders g ON m.gender_id = g.id
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
      WHERE 1=1
    `;

    const queryParams: any[] = [];

    // Apply filters
    if (filters.province_code) {
      query += ' AND p.province_code = ?';
      queryParams.push(filters.province_code);
    }
    if (filters.municipality_code) {
      query += ' AND mu.municipality_code = ?';
      queryParams.push(filters.municipality_code);
    }
    if (filters.ward_code) {
      query += ' AND w.ward_code = ?';
      queryParams.push(filters.ward_code);
    }
    if (filters.voting_district_code) {
      query += ' AND vd.voting_district_code = ?';
      queryParams.push(filters.voting_district_code);
    }

    query += ' ORDER BY p.province_name, d.district_name, mu.municipality_name, w.ward_number, m.surname, m.firstname';
    query += ' LIMIT 1000'; // Limit for PDF performance

    return await executeQuery(query, queryParams);
  }

  private static async fetchVotingDistrictsData(filters: any = {}): Promise<any[]> {
    let query = `
      SELECT 
        vd.voting_district_code,
        vd.voting_district_name,
        vd.voting_district_number,
        w.ward_name,
        CONCAT('Ward ', w.ward_number) as ward_display,
        mu.municipality_name,
        d.district_name,
        p.province_name,
        COUNT(m.member_id) as member_count,
        CASE WHEN vd.is_active = 1 THEN 'Active' ELSE 'Inactive' END as status,
        vd.is_active
      FROM voting_districts vd
      LEFT JOIN wards w ON vd.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN members m ON vd.voting_district_code = m.voting_district_code
      WHERE 1=1
    `;

    const queryParams: any[] = [];

    if (filters.province_code) {
      query += ' AND p.province_code = ?';
      queryParams.push(filters.province_code);
    }
    if (filters.ward_code) {
      query += ' AND w.ward_code = ?';
      queryParams.push(filters.ward_code);
    }

    query += `
      GROUP BY vd.voting_district_code, vd.voting_district_name, vd.voting_district_number,
               w.ward_name, w.ward_number, mu.municipality_name, d.district_name, p.province_name, vd.is_active
      ORDER BY p.province_name, d.district_name, mu.municipality_name, w.ward_number, vd.voting_district_number
      LIMIT 500
    `;

    return await executeQuery(query, queryParams);
  }

  private static addHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string): void {
    doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
    
    if (subtitle) {
      doc.fontSize(14).font('Helvetica').text(subtitle, { align: 'center' });
    }
    
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);
  }

  private static addSummarySection(doc: PDFKit.PDFDocument, data: any[]): void {
    doc.fontSize(14).font('Helvetica-Bold').text('Summary Statistics', { underline: true });
    doc.moveDown(0.5);
    
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Records: ${data.length}`);
    
    // Calculate some basic stats
    const maleCount = data.filter(m => m.gender_name === 'Male').length;
    const femaleCount = data.filter(m => m.gender_name === 'Female').length;
    const avgAge = data.filter(m => m.age).reduce((sum, m) => sum + m.age, 0) / data.filter(m => m.age).length;
    
    doc.text(`Male Members: ${maleCount}`);
    doc.text(`Female Members: ${femaleCount}`);
    if (!isNaN(avgAge)) {
      doc.text(`Average Age: ${avgAge.toFixed(1)} years`);
    }
    
    doc.moveDown(1);
  }

  private static addTable(doc: PDFKit.PDFDocument, data: any[], columns: TableColumn[]): void {
    const startY = doc.y;
    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
    
    // Add table header
    doc.fontSize(10).font('Helvetica-Bold');
    let currentX = doc.page.margins.left;
    
    columns.forEach(col => {
      doc.text(col.title, currentX, startY, { width: col.width, align: col.align || 'left' });
      currentX += col.width;
    });
    
    // Add header line
    doc.moveTo(doc.page.margins.left, startY + 15)
       .lineTo(doc.page.margins.left + tableWidth, startY + 15)
       .stroke();
    
    // Add data rows
    doc.font('Helvetica').fontSize(8);
    let currentY = startY + 20;
    
    data.forEach((row, index) => {
      // Check if we need a new page
      if (currentY > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        currentY = doc.page.margins.top;
      }
      
      currentX = doc.page.margins.left;
      
      columns.forEach(col => {
        const value = row[col.key] || '';
        doc.text(String(value), currentX, currentY, { 
          width: col.width, 
          align: col.align || 'left',
          height: 12,
          ellipsis: true
        });
        currentX += col.width;
      });
      
      currentY += 12;
      
      // Add alternating row background (light gray for even rows)
      if (index % 2 === 0) {
        doc.rect(doc.page.margins.left, currentY - 12, tableWidth, 12)
           .fillOpacity(0.1)
           .fill('#000000')
           .fillOpacity(1);
      }
    });
  }

  // Export Demographics Report to PDF
  static async exportDemographicsReportToPDF(
    demographics: any,
    options: PDFExportOptions & {
      includeCharts?: boolean;
      filters?: any;
    } = {}
  ): Promise<Buffer> {
    try {
      console.log('🔄 Starting Demographics Report PDF generation...');

      const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

      // Create PDF document
      const doc = new PDFDocument({
        size: mergedOptions.pageSize,
        layout: mergedOptions.orientation,
        margins: mergedOptions.margins
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));

      // Add header
      if (mergedOptions.includeHeader) {
        this.addDemographicsHeader(doc, mergedOptions);
      }

      // Add executive summary
      this.addDemographicsExecutiveSummary(doc, demographics);

      // Generate and add charts if requested
      if (options.includeCharts) {
        console.log('🎨 Generating charts for PDF...');
        const charts = await ChartGenerationService.generateAllDemographicsCharts(demographics);

        // Add charts with text breakdowns
        this.addGenderBreakdownWithChart(doc, demographics.gender, charts.genderChart);
        this.addAgeGroupBreakdownWithChart(doc, demographics.age_groups, charts.ageGroupsChart);
        this.addRaceBreakdownWithChart(doc, demographics.race, charts.raceChart);
        this.addLanguageBreakdownWithChart(doc, demographics.language, charts.languagesChart);
        this.addOccupationBreakdownWithChart(doc, demographics.occupation, charts.occupationChart);
        this.addQualificationBreakdown(doc, demographics.qualification);
      } else {
        // Add detailed demographics sections without charts
        this.addGenderBreakdown(doc, demographics.gender);
        this.addAgeGroupBreakdown(doc, demographics.age_groups);
        this.addRaceBreakdown(doc, demographics.race);
        this.addLanguageBreakdown(doc, demographics.language);
        this.addOccupationBreakdown(doc, demographics.occupation);
        this.addQualificationBreakdown(doc, demographics.qualification);
      }

      // Add footer
      if (mergedOptions.includeFooter) {
        this.addFooter(doc);
      }

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log('✅ Demographics Report PDF generated successfully');
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });

    } catch (error) {
      console.error('❌ Error generating Demographics Report PDF:', error);
      throw error;
    }
  }

  private static addDemographicsHeader(doc: PDFKit.PDFDocument, options: any): void {
    const { title, subtitle } = options;

    // Title
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text(title || 'Demographics Report', 50, 50, { align: 'center' });

    // Subtitle
    if (subtitle) {
      doc.fontSize(12)
         .font('Helvetica')
         .text(subtitle, 50, 80, { align: 'center' });
    }

    // Add some spacing
    doc.moveDown(2);
  }

  private static addDemographicsExecutiveSummary(doc: PDFKit.PDFDocument, demographics: any): void {
    const totalMembers = demographics.gender.total;

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Executive Summary', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Total Members: ${totalMembers.toLocaleString()}`, { continued: false });

    doc.text(`Gender Distribution: ${demographics.gender.male.toLocaleString()} Male (${((demographics.gender.male / totalMembers) * 100).toFixed(1)}%), ${demographics.gender.female.toLocaleString()} Female (${((demographics.gender.female / totalMembers) * 100).toFixed(1)}%)`);

    doc.text(`Age Distribution: Largest group is ${demographics.age_groups.age_36_60 > demographics.age_groups.age_18_35 ? '36-60 years' : '18-35 years'} with ${Math.max(demographics.age_groups.age_36_60, demographics.age_groups.age_18_35).toLocaleString()} members`);

    if (demographics.race && demographics.race.length > 0) {
      const topRace = demographics.race[0];
      doc.text(`Primary Race: ${topRace.race_name} (${topRace.percentage}%)`);
    }

    if (demographics.language && demographics.language.length > 0) {
      const topLanguage = demographics.language[0];
      doc.text(`Primary Language: ${topLanguage.language_name} (${topLanguage.percentage}%)`);
    }

    doc.moveDown(1.5);
  }

  private static addGenderBreakdown(doc: PDFKit.PDFDocument, gender: any): void {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Gender Distribution', { underline: true });

    doc.moveDown(0.5);

    const total = gender.total;

    doc.fontSize(11)
       .font('Helvetica');

    doc.text(`Male: ${gender.male.toLocaleString()} (${((gender.male / total) * 100).toFixed(1)}%)`);
    doc.text(`Female: ${gender.female.toLocaleString()} (${((gender.female / total) * 100).toFixed(1)}%)`);
    if (gender.other > 0) {
      doc.text(`Other: ${gender.other.toLocaleString()} (${((gender.other / total) * 100).toFixed(1)}%)`);
    }
    doc.text(`Total: ${total.toLocaleString()}`);

    doc.moveDown(1);
  }

  private static addAgeGroupBreakdown(doc: PDFKit.PDFDocument, ageGroups: any): void {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Age Group Distribution', { underline: true });

    doc.moveDown(0.5);

    const total = ageGroups.total;

    doc.fontSize(11)
       .font('Helvetica');

    doc.text(`Under 18: ${ageGroups.under_18.toLocaleString()} (${((ageGroups.under_18 / total) * 100).toFixed(1)}%)`);
    doc.text(`18-35 years: ${ageGroups.age_18_35.toLocaleString()} (${((ageGroups.age_18_35 / total) * 100).toFixed(1)}%)`);
    doc.text(`36-60 years: ${ageGroups.age_36_60.toLocaleString()} (${((ageGroups.age_36_60 / total) * 100).toFixed(1)}%)`);
    doc.text(`Over 60: ${ageGroups.over_60.toLocaleString()} (${((ageGroups.over_60 / total) * 100).toFixed(1)}%)`);
    doc.text(`Total: ${total.toLocaleString()}`);

    doc.moveDown(1);
  }

  private static addRaceBreakdown(doc: PDFKit.PDFDocument, race: any[]): void {
    if (!race || race.length === 0) return;

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Race Distribution', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(11)
       .font('Helvetica');

    race.forEach(item => {
      doc.text(`${item.race_name}: ${item.count.toLocaleString()} (${item.percentage}%)`);
    });

    doc.moveDown(1);
  }

  private static addLanguageBreakdown(doc: PDFKit.PDFDocument, language: any[]): void {
    if (!language || language.length === 0) return;

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Language Distribution', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(11)
       .font('Helvetica');

    // Show top 10 languages
    const topLanguages = language.slice(0, 10);
    topLanguages.forEach(item => {
      doc.text(`${item.language_name}: ${item.count.toLocaleString()} (${item.percentage}%)`);
    });

    if (language.length > 10) {
      doc.text(`... and ${language.length - 10} other languages`);
    }

    doc.moveDown(1);
  }

  private static addOccupationBreakdown(doc: PDFKit.PDFDocument, occupation: any[]): void {
    if (!occupation || occupation.length === 0) return;

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Occupation Distribution', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(11)
       .font('Helvetica');

    occupation.forEach(item => {
      doc.text(`${item.category_name}: ${item.count.toLocaleString()} (${item.percentage}%)`);
    });

    doc.moveDown(1);
  }

  private static addQualificationBreakdown(doc: PDFKit.PDFDocument, qualification: any[]): void {
    if (!qualification || qualification.length === 0) return;

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Education/Qualification Distribution', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(11)
       .font('Helvetica');

    qualification.forEach(item => {
      doc.text(`${item.qualification_name}: ${item.count.toLocaleString()} (${item.percentage}%)`);
    });

    doc.moveDown(1);
  }

  // Enhanced methods with charts
  private static addGenderBreakdownWithChart(doc: PDFKit.PDFDocument, gender: any, chartBuffer: Buffer): void {
    doc.addPage();

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Gender Distribution', { underline: true });

    doc.moveDown(0.5);

    // Add chart
    doc.image(chartBuffer, 50, doc.y, { width: 500, height: 300 });
    doc.moveDown(18); // Move down to account for chart height

    // Add text breakdown
    const total = gender.total;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Detailed Breakdown:', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    doc.text(`Male: ${gender.male.toLocaleString()} (${((gender.male / total) * 100).toFixed(1)}%)`);
    doc.text(`Female: ${gender.female.toLocaleString()} (${((gender.female / total) * 100).toFixed(1)}%)`);
    if (gender.other > 0) {
      doc.text(`Other: ${gender.other.toLocaleString()} (${((gender.other / total) * 100).toFixed(1)}%)`);
    }
    doc.text(`Total: ${total.toLocaleString()}`);

    doc.moveDown(1);
  }

  private static addAgeGroupBreakdownWithChart(doc: PDFKit.PDFDocument, ageGroups: any, chartBuffer: Buffer): void {
    doc.addPage();

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Age Group Distribution', { underline: true });

    doc.moveDown(0.5);

    // Add chart
    doc.image(chartBuffer, 50, doc.y, { width: 500, height: 300 });
    doc.moveDown(18); // Move down to account for chart height

    // Add text breakdown
    const total = ageGroups.total;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Detailed Breakdown:', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    doc.text(`Under 18: ${ageGroups.under_18.toLocaleString()} (${((ageGroups.under_18 / total) * 100).toFixed(1)}%)`);
    doc.text(`18-35 years: ${ageGroups.age_18_35.toLocaleString()} (${((ageGroups.age_18_35 / total) * 100).toFixed(1)}%)`);
    doc.text(`36-60 years: ${ageGroups.age_36_60.toLocaleString()} (${((ageGroups.age_36_60 / total) * 100).toFixed(1)}%)`);
    doc.text(`Over 60: ${ageGroups.over_60.toLocaleString()} (${((ageGroups.over_60 / total) * 100).toFixed(1)}%)`);
    doc.text(`Total: ${total.toLocaleString()}`);

    doc.moveDown(1);
  }

  private static addRaceBreakdownWithChart(doc: PDFKit.PDFDocument, race: any[], chartBuffer: Buffer): void {
    if (!race || race.length === 0) return;

    doc.addPage();

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Race Distribution', { underline: true });

    doc.moveDown(0.5);

    // Add chart
    doc.image(chartBuffer, 50, doc.y, { width: 500, height: 300 });
    doc.moveDown(18); // Move down to account for chart height

    // Add text breakdown
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Detailed Breakdown:', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    race.forEach(item => {
      doc.text(`${item.race_name}: ${item.count.toLocaleString()} (${item.percentage}%)`);
    });

    doc.moveDown(1);
  }

  private static addLanguageBreakdownWithChart(doc: PDFKit.PDFDocument, language: any[], chartBuffer: Buffer): void {
    if (!language || language.length === 0) return;

    doc.addPage();

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Language Distribution', { underline: true });

    doc.moveDown(0.5);

    // Add chart
    doc.image(chartBuffer, 50, doc.y, { width: 500, height: 300 });
    doc.moveDown(18); // Move down to account for chart height

    // Add text breakdown
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Top Languages:', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    // Show top 10 languages
    const topLanguages = language.slice(0, 10);
    topLanguages.forEach(item => {
      doc.text(`${item.language_name}: ${item.count.toLocaleString()} (${item.percentage}%)`);
    });

    if (language.length > 10) {
      doc.text(`... and ${language.length - 10} other languages`);
    }

    doc.moveDown(1);
  }

  private static addOccupationBreakdownWithChart(doc: PDFKit.PDFDocument, occupation: any[], chartBuffer: Buffer): void {
    if (!occupation || occupation.length === 0) return;

    doc.addPage();

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Occupation Distribution', { underline: true });

    doc.moveDown(0.5);

    // Add chart
    doc.image(chartBuffer, 50, doc.y, { width: 500, height: 300 });
    doc.moveDown(18); // Move down to account for chart height

    // Add text breakdown
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Detailed Breakdown:', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    occupation.forEach(item => {
      doc.text(`${item.category_name}: ${item.count.toLocaleString()} (${item.percentage}%)`);
    });

    doc.moveDown(1);
  }

  // Export Provincial Distribution Report to PDF
  static async exportProvincialDistributionToPDF(
    provincialData: any,
    options: PDFExportOptions & {
      includeCharts?: boolean;
      sortBy?: string;
      sortOrder?: string;
    } = {}
  ): Promise<Buffer> {
    try {
      console.log('🔄 Starting Provincial Distribution Report PDF generation...');

      const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

      // Create PDF document
      const doc = new PDFDocument({
        size: mergedOptions.pageSize,
        layout: mergedOptions.orientation,
        margins: mergedOptions.margins
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));

      // Add header
      if (mergedOptions.includeHeader) {
        this.addProvincialDistributionHeader(doc, mergedOptions);
      }

      // Add executive summary
      this.addProvincialDistributionExecutiveSummary(doc, provincialData);

      // Generate and add charts if requested
      if (options.includeCharts) {
        console.log('🎨 Generating provincial distribution charts...');
        const charts = await ChartGenerationService.generateProvincialDistributionCharts(provincialData);

        // Add charts with detailed breakdowns
        this.addProvincialDistributionWithChart(doc, provincialData, charts.distributionChart);
        this.addProvincialComparisonWithChart(doc, provincialData, charts.comparisonChart);
      } else {
        // Add detailed provincial breakdown without charts
        this.addProvincialDistributionBreakdown(doc, provincialData);
      }

      // Add footer
      if (mergedOptions.includeFooter) {
        this.addFooter(doc);
      }

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log('✅ Provincial Distribution Report PDF generated successfully');
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });

    } catch (error) {
      console.error('❌ Error generating Provincial Distribution Report PDF:', error);
      throw error;
    }
  }

  private static addProvincialDistributionHeader(doc: PDFKit.PDFDocument, options: any): void {
    const { title, subtitle } = options;

    // Title
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text(title || 'Provincial Distribution Report', 50, 50, { align: 'center' });

    // Subtitle
    if (subtitle) {
      doc.fontSize(12)
         .font('Helvetica')
         .text(subtitle, 50, 80, { align: 'center' });
    }

    // Add some spacing
    doc.moveDown(2);
  }

  private static addProvincialDistributionExecutiveSummary(doc: PDFKit.PDFDocument, provincialData: any): void {
    const { summary, provinces } = provincialData;

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Executive Summary', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Total Members: ${summary.total_members.toLocaleString()}`, { continued: false });

    doc.text(`Total Provinces: ${summary.total_provinces}`);
    doc.text(`Average Members per Province: ${summary.average_members_per_province.toLocaleString()}`);
    doc.text(`Largest Province: ${summary.largest_province.name} (${summary.largest_province.count.toLocaleString()} members, ${summary.largest_province.percentage}%)`);
    doc.text(`Smallest Province: ${summary.smallest_province.name} (${summary.smallest_province.count.toLocaleString()} members, ${summary.smallest_province.percentage}%)`);

    // Top 3 provinces
    const top3 = provinces.slice(0, 3);
    doc.text(`Top 3 Provinces: ${top3.map((p: any) => `${p.province_name} (${p.percentage}%)`).join(', ')}`);

    doc.moveDown(1.5);
  }

  private static addProvincialDistributionWithChart(doc: PDFKit.PDFDocument, provincialData: any, chartBuffer: Buffer): void {
    doc.addPage();

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Provincial Distribution Overview', { underline: true });

    doc.moveDown(0.5);

    // Add chart
    doc.image(chartBuffer, 50, doc.y, { width: 500, height: 300 });
    doc.moveDown(18); // Move down to account for chart height

    // Add detailed breakdown
    this.addProvincialDistributionBreakdown(doc, provincialData);
  }

  private static addProvincialComparisonWithChart(doc: PDFKit.PDFDocument, provincialData: any, chartBuffer: Buffer): void {
    doc.addPage();

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Provincial Comparison Analysis', { underline: true });

    doc.moveDown(0.5);

    // Add chart
    doc.image(chartBuffer, 50, doc.y, { width: 500, height: 300 });
    doc.moveDown(18); // Move down to account for chart height

    // Add comparison analysis
    this.addProvincialComparisonAnalysis(doc, provincialData);
  }

  private static addProvincialDistributionBreakdown(doc: PDFKit.PDFDocument, provincialData: any): void {
    const { provinces } = provincialData;

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Detailed Provincial Breakdown', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(11)
       .font('Helvetica');

    provinces.forEach((province: any, index: number) => {
      doc.text(`${index + 1}. ${province.province_name}:`);
      doc.text(`   Members: ${province.member_count.toLocaleString()} (${province.percentage}%)`);
      doc.text(`   Districts: ${province.districts_count}, Municipalities: ${province.municipalities_count}, Wards: ${province.wards_count}`);
      doc.moveDown(0.3);
    });

    doc.moveDown(1);
  }

  private static addProvincialComparisonAnalysis(doc: PDFKit.PDFDocument, provincialData: any): void {
    const { provinces, summary } = provincialData;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Comparative Analysis:', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    // Above average provinces
    const aboveAverage = provinces.filter((p: any) => p.member_count > summary.average_members_per_province);
    doc.text(`Provinces Above Average (${aboveAverage.length}): ${aboveAverage.map((p: any) => p.province_name).join(', ')}`);

    // Below average provinces
    const belowAverage = provinces.filter((p: any) => p.member_count < summary.average_members_per_province);
    doc.text(`Provinces Below Average (${belowAverage.length}): ${belowAverage.map((p: any) => p.province_name).join(', ')}`);

    // Concentration analysis
    const top3Total = provinces.slice(0, 3).reduce((sum: number, p: any) => sum + p.percentage, 0);
    doc.text(`Top 3 Provinces Concentration: ${top3Total.toFixed(1)}% of total membership`);

    doc.moveDown(1);
  }

  // Export Regional Comparison Report to PDF
  static async exportRegionalComparisonToPDF(
    comparisonData: any,
    options: PDFExportOptions & {
      includeCharts?: boolean;
      regionType?: string;
      comparisonType?: string;
    } = {}
  ): Promise<Buffer> {
    try {
      console.log('🔄 Starting Regional Comparison Report PDF generation...');

      const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

      // Create PDF document
      const doc = new PDFDocument({
        size: mergedOptions.pageSize,
        layout: mergedOptions.orientation || 'landscape',
        margins: mergedOptions.margins
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));

      // Add header
      if (mergedOptions.includeHeader) {
        this.addRegionalComparisonHeader(doc, mergedOptions, comparisonData);
      }

      // Add executive summary
      this.addRegionalComparisonExecutiveSummary(doc, comparisonData);

      // Generate and add charts if requested
      if (options.includeCharts) {
        console.log('🎨 Generating regional comparison charts...');
        const charts = await ChartGenerationService.generateRegionalComparisonCharts(comparisonData);

        // Add charts with detailed analysis
        this.addRegionalComparisonWithCharts(doc, comparisonData, charts);
      } else {
        // Add detailed comparison without charts
        this.addRegionalComparisonDetails(doc, comparisonData);
      }

      // Add comparative analysis
      this.addRegionalComparativeAnalysis(doc, comparisonData);

      // Add footer
      if (mergedOptions.includeFooter) {
        this.addFooter(doc);
      }

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log('✅ Regional Comparison Report PDF generated successfully');
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });

    } catch (error) {
      console.error('❌ Error generating Regional Comparison Report PDF:', error);
      throw error;
    }
  }

  private static addRegionalComparisonHeader(doc: PDFKit.PDFDocument, options: any, comparisonData: any): void {
    const { title, subtitle } = options;
    const regionNames = comparisonData.regions.map((r: any) => r.region_name).join(' vs ');

    // Title
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text(title || `Regional Comparison Report`, 50, 50, { align: 'center' });

    // Subtitle with region names
    doc.fontSize(14)
       .font('Helvetica')
       .text(regionNames, 50, 75, { align: 'center' });

    // Date
    if (subtitle) {
      doc.fontSize(12)
         .font('Helvetica')
         .text(subtitle, 50, 95, { align: 'center' });
    }

    doc.moveDown(2);
  }

  private static addRegionalComparisonExecutiveSummary(doc: PDFKit.PDFDocument, comparisonData: any): void {
    const { summary, regions } = comparisonData;

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Executive Summary', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Comparison Type: ${summary.region_type.charAt(0).toUpperCase() + summary.region_type.slice(1)} Level Analysis`)
       .text(`Total Regions Compared: ${summary.total_regions}`)
       .text(`Combined Membership: ${summary.total_members.toLocaleString()}`)
       .text(`Average per Region: ${summary.average_members_per_region.toLocaleString()}`)
       .text(`Highest Performer: ${summary.largest_region.name} (${summary.largest_region.count.toLocaleString()} members, ${summary.largest_region.percentage}%)`)
       .text(`Lowest Performer: ${summary.smallest_region.name} (${summary.smallest_region.count.toLocaleString()} members, ${summary.smallest_region.percentage}%)`)
       .text(`Performance Gap: ${summary.performance_analysis.performance_gap.toLocaleString()} members`)
       .text(`Top Region Concentration: ${summary.performance_analysis.concentration_ratio}% of total membership`);

    doc.moveDown(1.5);
  }

  private static addRegionalComparisonWithCharts(doc: PDFKit.PDFDocument, comparisonData: any, charts: any): void {
    doc.addPage();

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Regional Comparison Analysis', { underline: true });

    doc.moveDown(0.5);

    // Add comparison chart
    if (charts.comparisonChart) {
      doc.image(charts.comparisonChart, 50, doc.y, { width: 700, height: 300 });
      doc.moveDown(18);
    }

    // Add detailed breakdown
    this.addRegionalComparisonDetails(doc, comparisonData);
  }

  private static addRegionalComparisonDetails(doc: PDFKit.PDFDocument, comparisonData: any): void {
    const { regions } = comparisonData;

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Detailed Regional Breakdown', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(11)
       .font('Helvetica');

    regions.forEach((region: any, index: number) => {
      const isTopPerformer = index === 0;
      if (isTopPerformer) {
        doc.font('Helvetica-Bold');
      } else {
        doc.font('Helvetica');
      }

      doc.text(`${region.ranking}. ${region.region_name} (${region.region_code})`);
      doc.text(`   Members: ${region.member_count.toLocaleString()} (${region.percentage}%)`);
      doc.text(`   Performance: ${region.above_average ? 'Above Average' : 'Below Average'}`);

      if (region.geographic_stats) {
        const stats = region.geographic_stats;
        if (stats.districts_count) {
          doc.text(`   Geographic Coverage: ${stats.districts_count} districts, ${stats.municipalities_count} municipalities, ${stats.wards_count} wards`);
        }
      }

      doc.moveDown(0.3);
    });

    doc.moveDown(1);
  }

  private static addRegionalComparativeAnalysis(doc: PDFKit.PDFDocument, comparisonData: any): void {
    const { comparative_analysis, summary } = comparisonData;

    doc.addPage();

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Comparative Analysis & Insights', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica');

    // Performance metrics
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Performance Metrics:', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    const metrics = comparative_analysis.performance_metrics;
    doc.text(`• Highest Performer: ${metrics.highest_performer}`)
       .text(`• Lowest Performer: ${metrics.lowest_performer}`)
       .text(`• Performance Spread: ${metrics.performance_spread}`)
       .text(`• Average Performance: ${metrics.average_performance.toLocaleString()} members`);

    doc.moveDown(0.5);

    // Strategic insights
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Strategic Insights:', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    doc.text(`• ${summary.performance_analysis.above_average_count} regions performing above average`)
       .text(`• ${summary.performance_analysis.below_average_count} regions performing below average`)
       .text(`• Top region holds ${summary.performance_analysis.concentration_ratio}% of combined membership`)
       .text(`• Performance gap of ${summary.performance_analysis.performance_gap.toLocaleString()} members between highest and lowest`);

    doc.moveDown(0.5);

    // Recommendations
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Strategic Recommendations:', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    doc.text('1. Resource Allocation: Focus resources on top-performing regions for maximum impact')
       .text('2. Growth Strategy: Develop targeted initiatives for underperforming regions')
       .text('3. Best Practices: Study and replicate successful strategies from top performers')
       .text('4. Performance Monitoring: Establish regular comparison reviews to track progress')
       .text('5. Balanced Development: Consider initiatives to reduce performance gaps between regions');

    doc.moveDown(1);
  }

  // Export Monthly Summary Report to PDF
  static async exportMonthlySummaryToPDF(
    summaryData: any,
    options: PDFExportOptions & {
      includeCharts?: boolean;
      reportFormat?: string;
      includeComparisons?: boolean;
    } = {}
  ): Promise<Buffer> {
    try {
      console.log('🔄 Starting Monthly Summary Report PDF generation...');

      const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

      // Create PDF document
      const doc = new PDFDocument({
        size: mergedOptions.pageSize,
        layout: mergedOptions.orientation || 'portrait',
        margins: mergedOptions.margins
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));

      // Add header
      if (mergedOptions.includeHeader) {
        this.addMonthlySummaryHeader(doc, mergedOptions, summaryData);
      }

      // Add executive summary
      this.addMonthlySummaryExecutiveSummary(doc, summaryData);

      // Add content based on report format
      if (options.reportFormat === 'executive') {
        this.addMonthlySummaryExecutiveContent(doc, summaryData);
      } else if (options.reportFormat === 'detailed') {
        this.addMonthlySummaryDetailedContent(doc, summaryData, options);
      } else {
        // Comprehensive format
        this.addMonthlySummaryComprehensiveContent(doc, summaryData, options);
      }

      // Add footer
      if (mergedOptions.includeFooter) {
        this.addFooter(doc);
      }

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log('✅ Monthly Summary Report PDF generated successfully');
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });

    } catch (error) {
      console.error('❌ Error generating Monthly Summary Report PDF:', error);
      throw error;
    }
  }

  private static addMonthlySummaryHeader(doc: PDFKit.PDFDocument, options: any, summaryData: any): void {
    const { title, subtitle } = options;

    // Title
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text(title || 'Monthly Summary Report', 50, 50, { align: 'center' });

    // Report period
    doc.fontSize(14)
       .font('Helvetica')
       .text(summaryData.monthly_metrics.report_period, 50, 75, { align: 'center' });

    // Date
    if (subtitle) {
      doc.fontSize(12)
         .font('Helvetica')
         .text(subtitle, 50, 95, { align: 'center' });
    }

    doc.moveDown(2);
  }

  private static addMonthlySummaryExecutiveSummary(doc: PDFKit.PDFDocument, summaryData: any): void {
    const { monthly_metrics, trend_analysis, executive_summary } = summaryData;

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Executive Summary', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Report Period: ${monthly_metrics.report_period}`)
       .text(`Total Members: ${monthly_metrics.total_members.toLocaleString()}`)
       .text(`New Registrations: ${monthly_metrics.new_registrations.toLocaleString()}`)
       .text(`Month-over-Month Growth: ${trend_analysis.month_over_month_growth}%`)
       .text(`Growth Trajectory: ${trend_analysis.growth_trajectory}`)
       .text(`Performance Status: ${executive_summary.performance_indicators.performance_status}`);

    doc.moveDown(0.5);

    // Key achievements
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Key Achievements:', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    executive_summary.key_achievements.forEach((achievement: string) => {
      doc.text(`• ${achievement}`);
    });

    doc.moveDown(1.5);
  }

  private static addMonthlySummaryExecutiveContent(doc: PDFKit.PDFDocument, summaryData: any): void {
    const { geographic_breakdown, demographic_insights } = summaryData;

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Geographic Highlights', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    geographic_breakdown.top_performing_regions.slice(0, 3).forEach((region: any, index: number) => {
      doc.text(`${index + 1}. ${region.province_name}: ${region.member_count.toLocaleString()} members (${region.percentage}%)`);
    });

    doc.moveDown(1);

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Demographic Overview', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    if (demographic_insights.gender_breakdown.length > 0) {
      const total = demographic_insights.gender_breakdown.reduce((sum: number, g: any) => sum + g.count, 0);
      demographic_insights.gender_breakdown.forEach((gender: any) => {
        const percentage = ((gender.count / total) * 100).toFixed(1);
        doc.text(`${gender.gender}: ${gender.count.toLocaleString()} (${percentage}%)`);
      });
    }

    doc.moveDown(1);
  }

  private static addMonthlySummaryDetailedContent(doc: PDFKit.PDFDocument, summaryData: any, options: any): void {
    doc.addPage();

    // Add detailed metrics
    this.addMonthlySummaryMetrics(doc, summaryData);

    // Add trend analysis
    this.addMonthlySummaryTrendAnalysis(doc, summaryData);

    // Add geographic breakdown
    this.addMonthlySummaryGeographicBreakdown(doc, summaryData);
  }

  private static addMonthlySummaryComprehensiveContent(doc: PDFKit.PDFDocument, summaryData: any, options: any): void {
    // Add detailed content
    this.addMonthlySummaryDetailedContent(doc, summaryData, options);

    // Add additional comprehensive sections
    doc.addPage();

    // Add demographic insights
    this.addMonthlySummaryDemographicInsights(doc, summaryData);

    // Add activity summary
    this.addMonthlySummaryActivitySummary(doc, summaryData);

    // Add strategic recommendations
    this.addMonthlySummaryStrategicRecommendations(doc, summaryData);
  }

  private static addMonthlySummaryMetrics(doc: PDFKit.PDFDocument, summaryData: any): void {
    const { monthly_metrics, trend_analysis } = summaryData;

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Monthly Metrics', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Total Members: ${monthly_metrics.total_members.toLocaleString()}`)
       .text(`New Registrations: ${monthly_metrics.new_registrations.toLocaleString()}`)
       .text(`Active Members: ${monthly_metrics.active_members.toLocaleString()}`)
       .text(`Membership Changes: ${monthly_metrics.membership_changes.toLocaleString()}`);

    if (trend_analysis.previous_month_comparison) {
      const prev = trend_analysis.previous_month_comparison;
      doc.text(`Previous Month Total: ${prev.total_members.toLocaleString()}`)
         .text(`Previous Month New: ${prev.new_registrations.toLocaleString()}`)
         .text(`Growth Rate: ${trend_analysis.month_over_month_growth}%`);
    }

    doc.moveDown(1);
  }

  private static addMonthlySummaryTrendAnalysis(doc: PDFKit.PDFDocument, summaryData: any): void {
    const { trend_analysis } = summaryData;

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Trend Analysis', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica')
       .text(`Month-over-Month Growth: ${trend_analysis.month_over_month_growth}%`)
       .text(`Growth Trajectory: ${trend_analysis.growth_trajectory}`)
       .text(`Performance Trend: ${trend_analysis.month_over_month_growth > 0 ? 'Positive' : trend_analysis.month_over_month_growth < 0 ? 'Negative' : 'Stable'}`);

    doc.moveDown(1);
  }

  private static addMonthlySummaryGeographicBreakdown(doc: PDFKit.PDFDocument, summaryData: any): void {
    const { geographic_breakdown } = summaryData;

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Geographic Distribution', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    geographic_breakdown.provincial_distribution.slice(0, 5).forEach((province: any, index: number) => {
      doc.text(`${index + 1}. ${province.province_name}: ${province.member_count.toLocaleString()} (${province.percentage}%)`);
    });

    doc.moveDown(1);
  }

  private static addMonthlySummaryDemographicInsights(doc: PDFKit.PDFDocument, summaryData: any): void {
    const { demographic_insights } = summaryData;

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Demographic Insights', { underline: true });

    doc.moveDown(0.5);

    // Age distribution
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Age Distribution:', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    demographic_insights.age_distribution.forEach((age: any) => {
      doc.text(`${age.age_group}: ${age.count.toLocaleString()}`);
    });

    doc.moveDown(0.5);

    // Gender breakdown
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Gender Breakdown:', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    demographic_insights.gender_breakdown.forEach((gender: any) => {
      doc.text(`${gender.gender}: ${gender.count.toLocaleString()}`);
    });

    doc.moveDown(1);
  }

  private static addMonthlySummaryActivitySummary(doc: PDFKit.PDFDocument, summaryData: any): void {
    const { activity_summary } = summaryData;

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Activity Summary', { underline: true });

    doc.moveDown(0.3);

    doc.fontSize(11)
       .font('Helvetica');

    // Monthly highlights
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Monthly Highlights:');

    doc.moveDown(0.2);

    doc.fontSize(11)
       .font('Helvetica');

    activity_summary.monthly_highlights.forEach((highlight: string) => {
      doc.text(`• ${highlight}`);
    });

    doc.moveDown(0.5);

    // Peak registration days
    if (activity_summary.peak_registration_days.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Peak Registration Days:');

      doc.moveDown(0.2);

      doc.fontSize(11)
         .font('Helvetica');

      activity_summary.peak_registration_days.forEach((day: any, index: number) => {
        doc.text(`${index + 1}. Day ${day.day_of_month}: ${day.registrations} registrations`);
      });
    }

    doc.moveDown(1);
  }

  private static addMonthlySummaryStrategicRecommendations(doc: PDFKit.PDFDocument, summaryData: any): void {
    const { executive_summary } = summaryData;

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Strategic Recommendations', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(11)
       .font('Helvetica');

    executive_summary.strategic_recommendations.forEach((recommendation: string, index: number) => {
      doc.text(`${index + 1}. ${recommendation}`);
    });

    if (executive_summary.challenges.length > 0) {
      doc.moveDown(0.5);

      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Areas for Improvement:', { underline: true });

      doc.moveDown(0.3);

      doc.fontSize(11)
         .font('Helvetica');

      executive_summary.challenges.forEach((challenge: string) => {
        doc.text(`• ${challenge}`);
      });
    }

    doc.moveDown(1);
  }

  // Export Membership Expiration Report to PDF
  static async exportExpirationReportToPDF(
    expirationData: any,
    options: PDFExportOptions & {
      includeContactDetails?: boolean;
      status?: string;
    } = {}
  ): Promise<Buffer> {
    try {
      console.log('🔄 Starting Membership Expiration Report PDF generation...');

      const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

      // Create PDF document
      const doc = new PDFDocument({
        size: mergedOptions.pageSize,
        layout: 'landscape', // Better for tabular data
        margins: mergedOptions.margins
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));

      // Add header
      if (mergedOptions.includeHeader) {
        this.addExpirationReportHeader(doc, mergedOptions, expirationData);
      }

      // Add summary section
      this.addExpirationReportSummary(doc, expirationData);

      // Add members table
      this.addExpirationMembersTable(doc, expirationData, options);

      // Add footer
      if (mergedOptions.includeFooter) {
        this.addFooter(doc);
      }

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log('✅ Membership Expiration Report PDF generated successfully');
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });

    } catch (error) {
      console.error('❌ Error generating Membership Expiration Report PDF:', error);
      throw error;
    }
  }

  private static addExpirationReportHeader(doc: PDFKit.PDFDocument, options: any, expirationData: any): void {
    const { title, subtitle, status } = options;

    // Title
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text(title || 'Membership Expiration Report', 50, 50, { align: 'center' });

    // Status filter
    if (status && status !== 'all') {
      const statusLabels: { [key: string]: string } = {
        'expiring_30': 'Members Expiring Within 30 Days',
        'expiring_7': 'Members Expiring Within 7 Days (Urgent)',
        'expired': 'Expired Members',
        'inactive': 'Inactive Members (90+ Days)'
      };

      doc.fontSize(12)
         .font('Helvetica')
         .text(statusLabels[status] || status, 50, 75, { align: 'center' });
    }

    // Date
    if (subtitle) {
      doc.fontSize(10)
         .font('Helvetica')
         .text(subtitle, 50, 95, { align: 'center' });
    }

    doc.moveDown(2);
  }

  private static addExpirationReportSummary(doc: PDFKit.PDFDocument, expirationData: any): void {
    const { status_summary } = expirationData;

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Report Summary', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(11)
       .font('Helvetica')
       .text(`Status Filter: ${status_summary.status_description}`)
       .text(`Total Records: ${status_summary.total_records.toLocaleString()}`)
       .text(`Report Generated: ${new Date().toLocaleDateString('en-US', {
         year: 'numeric',
         month: 'long',
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
       })}`);

    doc.moveDown(1.5);
  }

  private static addExpirationMembersTable(doc: PDFKit.PDFDocument, expirationData: any, options: any): void {
    const { members } = expirationData;
    const { includeContactDetails = true } = options;

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Member Details', { underline: true });

    doc.moveDown(0.5);

    // Table headers
    const startY = doc.y;
    const rowHeight = 20;
    const colWidths = includeContactDetails ? [150, 100, 80, 80, 100, 120] : [200, 100, 80, 80, 120];
    const colPositions = [50];

    // Calculate column positions
    for (let i = 0; i < colWidths.length - 1; i++) {
      colPositions.push(colPositions[i] + colWidths[i]);
    }

    // Headers
    doc.fontSize(10)
       .font('Helvetica-Bold');

    const headers = includeContactDetails
      ? ['Member Name', 'Email', 'Phone', 'Status', 'Days Until/Since', 'Expiry Date']
      : ['Member Name', 'Status', 'Days Until/Since', 'Province', 'Expiry Date'];

    headers.forEach((header, index) => {
      doc.text(header, colPositions[index], startY, { width: colWidths[index], align: 'left' });
    });

    // Draw header line
    doc.moveTo(50, startY + 15)
       .lineTo(750, startY + 15)
       .stroke();

    // Table rows
    let currentY = startY + 25;
    doc.fontSize(9)
       .font('Helvetica');

    members.slice(0, 50).forEach((member: any, index: number) => { // Limit to 50 for PDF
      // Check if we need a new page
      if (currentY > 500) {
        doc.addPage();
        currentY = 50;
      }

      const memberName = `${member.first_name} ${member.last_name}`;
      const expiryDate = new Date(member.membership_expiry_date).toLocaleDateString();
      const daysText = member.status === 'Expired'
        ? `${member.days_until_expiration} days ago`
        : `${member.days_until_expiration} days`;

      if (includeContactDetails) {
        const rowData = [
          memberName,
          member.email || 'N/A',
          member.phone_number || 'N/A',
          member.status,
          daysText,
          expiryDate
        ];

        rowData.forEach((data, colIndex) => {
          doc.text(data, colPositions[colIndex], currentY, {
            width: colWidths[colIndex] - 5,
            align: 'left',
            ellipsis: true
          });
        });
      } else {
        const rowData = [
          memberName,
          member.status,
          daysText,
          member.province_name || 'N/A',
          expiryDate
        ];

        rowData.forEach((data, colIndex) => {
          doc.text(data, colPositions[colIndex], currentY, {
            width: colWidths[colIndex] - 5,
            align: 'left',
            ellipsis: true
          });
        });
      }

      currentY += rowHeight;

      // Add alternating row background (light gray for even rows)
      if (index % 2 === 0) {
        doc.rect(50, currentY - rowHeight, 700, rowHeight)
           .fillOpacity(0.05)
           .fill('#000000')
           .fillOpacity(1);
      }
    });

    // Add note if more records exist
    if (members.length > 50) {
      doc.moveDown(1)
         .fontSize(10)
         .font('Helvetica-Oblique')
         .text(`Note: Showing first 50 of ${members.length} total records. Use filters to view specific segments.`,
               { align: 'center' });
    }
  }

  // Export Comprehensive Analytics Report to PDF
  static async exportComprehensiveAnalyticsToPDF(
    analyticsData: any,
    options: PDFExportOptions & {
      includeCharts?: boolean;
      includeDetails?: boolean;
      reportScope?: string;
    } = {}
  ): Promise<Buffer> {
    try {
      console.log('🔄 Starting Comprehensive Analytics Report PDF generation...');

      const mergedOptions = {
        ...this.DEFAULT_OPTIONS,
        ...options,
        orientation: 'landscape', // Force landscape for comprehensive analytics
        pageSize: 'A4'
      };

      // Create PDF document
      const doc = new PDFDocument({
        size: mergedOptions.pageSize,
        layout: mergedOptions.orientation,
        margins: { top: 40, bottom: 40, left: 40, right: 40 } // Smaller margins for landscape
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));

      // Add header
      if (mergedOptions.includeHeader) {
        this.addComprehensiveAnalyticsHeader(doc, mergedOptions, analyticsData);
      }

      // Add executive summary
      this.addComprehensiveAnalyticsExecutiveSummary(doc, analyticsData);

      // Add membership analytics section
      if (analyticsData.membership) {
        this.addMembershipAnalyticsSection(doc, analyticsData.membership);
      }

      // Add geographic performance section
      if (analyticsData.membership?.geographic_performance) {
        this.addGeographicPerformanceSection(doc, analyticsData.membership.geographic_performance);
      }

      // Add meeting analytics section
      if (analyticsData.meetings) {
        this.addMeetingAnalyticsSection(doc, analyticsData.meetings);
      }

      // Add leadership analytics section
      if (analyticsData.leadership) {
        this.addLeadershipAnalyticsSection(doc, analyticsData.leadership);
      }

      // Add dashboard statistics section
      if (analyticsData.dashboard) {
        this.addDashboardStatsSection(doc, analyticsData.dashboard);
      }

      // Add footer
      if (mergedOptions.includeFooter) {
        this.addFooter(doc);
      }

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log('✅ Comprehensive Analytics Report PDF generated successfully');
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });

    } catch (error) {
      console.error('❌ Error generating Comprehensive Analytics PDF:', error);
      throw error;
    }
  }

  // Export Ward Audit Report to PDF
  static async exportWardAuditToPDF(
    wardData: any[],
    options: PDFExportOptions & {
      filters?: any;
      includeCharts?: boolean;
      includeDetails?: boolean;
    } = {}
  ): Promise<Buffer> {
    try {
      console.log('🔄 Starting Ward Audit Report PDF generation...');

      const mergedOptions = {
        ...this.DEFAULT_OPTIONS,
        ...options,
        title: 'Ward Membership Audit Report',
        orientation: 'landscape' // Better for table data
      };

      // Create PDF document
      const doc = new PDFDocument({
        size: mergedOptions.pageSize,
        layout: mergedOptions.orientation,
        margins: { top: 40, bottom: 40, left: 40, right: 40 }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));

      // Add header
      if (mergedOptions.includeHeader) {
        this.addWardAuditHeader(doc, mergedOptions, options.filters);
      }

      // Add summary statistics
      this.addWardAuditSummary(doc, wardData);

      // Add ward data table
      this.addWardAuditTable(doc, wardData);

      // Add footer
      if (mergedOptions.includeFooter) {
        this.addFooter(doc);
      }

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          try {
            const pdfBuffer = Buffer.concat(buffers);
            console.log('✅ Ward Audit PDF generated successfully!');
            console.log(`📊 Report contains ${wardData.length} wards`);
            console.log(`📄 PDF size: ${pdfBuffer.length} bytes`);
            resolve(pdfBuffer);
          } catch (error) {
            console.error('❌ Error creating PDF buffer:', error);
            reject(error);
          }
        });

        doc.on('error', (error) => {
          console.error('❌ PDF generation error:', error);
          reject(error);
        });

        doc.end();
      });

    } catch (error: any) {
      console.error('❌ Ward Audit PDF generation failed:', error);
      throw new Error(`Failed to generate Ward Audit PDF: ${error.message}`);
    }
  }

  // Export Municipality Performance Report to PDF
  static async exportMunicipalityPerformanceToPDF(
    municipalityData: any[],
    options: PDFExportOptions & {
      filters?: any;
      includeCharts?: boolean;
      includeDetails?: boolean;
    } = {}
  ): Promise<Buffer> {
    try {
      console.log('🔄 Starting Municipality Performance Report PDF generation...');

      const mergedOptions = {
        ...this.DEFAULT_OPTIONS,
        ...options,
        title: 'Municipality Performance Report',
        orientation: 'landscape' // Better for table data
      };

      // Create PDF document
      const doc = new PDFDocument({
        size: mergedOptions.pageSize,
        layout: mergedOptions.orientation,
        margins: { top: 40, bottom: 40, left: 40, right: 40 }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));

      // Add header
      if (mergedOptions.includeHeader) {
        this.addMunicipalityPerformanceHeader(doc, mergedOptions, options.filters);
      }

      // Add summary statistics
      this.addMunicipalityPerformanceSummary(doc, municipalityData);

      // Add municipality data table
      this.addMunicipalityPerformanceTable(doc, municipalityData);

      // Add footer
      if (mergedOptions.includeFooter) {
        this.addFooter(doc);
      }

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          try {
            const pdfBuffer = Buffer.concat(buffers);
            console.log('✅ Municipality Performance PDF generated successfully!');
            console.log(`📊 Report contains ${municipalityData.length} municipalities`);
            console.log(`📄 PDF size: ${pdfBuffer.length} bytes`);
            resolve(pdfBuffer);
          } catch (error) {
            console.error('❌ Error creating PDF buffer:', error);
            reject(error);
          }
        });

        doc.on('error', (error) => {
          console.error('❌ PDF generation error:', error);
          reject(error);
        });

        doc.end();
      });

    } catch (error: any) {
      console.error('❌ Municipality Performance PDF generation failed:', error);
      throw new Error(`Failed to generate Municipality Performance PDF: ${error.message}`);
    }
  }

  // Export Renewal Report to PDF
  static async exportRenewalReportToPDF(
    renewalData: any,
    options: PDFExportOptions & {
      includeCharts?: boolean;
      reportType?: string;
      period?: string;
    } = {}
  ): Promise<Buffer> {
    try {
      console.log('🔄 Starting Renewal Report PDF generation...');

      const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

      // Create PDF document
      const doc = new PDFDocument({
        size: mergedOptions.pageSize,
        layout: mergedOptions.orientation || 'portrait',
        margins: mergedOptions.margins
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));

      // Add header
      if (mergedOptions.includeHeader) {
        this.addRenewalReportHeader(doc, mergedOptions, renewalData);
      }

      // Add content based on report type
      if (options.reportType === 'analytics') {
        this.addRenewalAnalyticsContent(doc, renewalData, options);
      } else {
        this.addRenewalDashboardContent(doc, renewalData, options);
      }

      // Add footer
      if (mergedOptions.includeFooter) {
        this.addFooter(doc);
      }

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log('✅ Renewal Report PDF generated successfully');
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });

    } catch (error) {
      console.error('❌ Error generating Renewal Report PDF:', error);
      throw error;
    }
  }

  // Helper methods for Ward Audit PDF
  private static addWardAuditHeader(doc: any, options: any, filters: any) {
    const currentDate = new Date().toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Title
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text('Ward Membership Audit Report', 40, 40);

    // Date and filters
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Generated on: ${currentDate}`, 40, 70);

    let yPos = 85;
    if (filters) {
      if (filters.province_code) {
        doc.text(`Province: ${filters.province_code}`, 40, yPos);
        yPos += 15;
      }
      if (filters.municipality_code) {
        doc.text(`Municipality: ${filters.municipality_code}`, 40, yPos);
        yPos += 15;
      }
      if (filters.standing) {
        doc.text(`Standing Filter: ${filters.standing}`, 40, yPos);
        yPos += 15;
      }
      if (filters.search) {
        doc.text(`Search Term: ${filters.search}`, 40, yPos);
        yPos += 15;
      }
    }

    // Add line separator
    doc.moveTo(40, yPos + 10)
       .lineTo(doc.page.width - 40, yPos + 10)
       .stroke();

    return yPos + 25;
  }

  private static addWardAuditSummary(doc: any, wardData: any[]) {
    const yStart = 140;

    // Calculate summary statistics
    const totalWards = wardData.length;
    const totalActiveMembers = wardData.reduce((sum, ward) => sum + (ward.active_members || 0), 0);
    const totalMembers = wardData.reduce((sum, ward) => sum + (ward.total_members || 0), 0);
    const avgActivePercentage = totalWards > 0 ? (totalActiveMembers / totalMembers * 100) : 0;

    const standingCounts = wardData.reduce((acc, ward) => {
      const standing = ward.ward_standing || 'Unknown';
      acc[standing] = (acc[standing] || 0) + 1;
      return acc;
    }, {});

    // Summary box
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Executive Summary', 40, yStart);

    doc.fontSize(10)
       .font('Helvetica')
       .text(`Total Wards: ${totalWards}`, 40, yStart + 25)
       .text(`Total Active Members: ${totalActiveMembers.toLocaleString()}`, 40, yStart + 40)
       .text(`Total Members: ${totalMembers.toLocaleString()}`, 40, yStart + 55)
       .text(`Average Active Percentage: ${avgActivePercentage.toFixed(1)}%`, 40, yStart + 70);

    // Standing breakdown
    let xPos = 300;
    doc.text('Ward Standing Breakdown:', xPos, yStart + 25);
    let yPos = yStart + 40;
    Object.entries(standingCounts).forEach(([standing, count]) => {
      doc.text(`${standing}: ${count}`, xPos, yPos);
      yPos += 15;
    });

    return yStart + 100;
  }

  private static addWardAuditTable(doc: any, wardData: any[]) {
    const startY = 260;
    const tableTop = startY;
    const itemHeight = 20;
    const pageHeight = doc.page.height - 80; // Leave margin for footer

    // Table headers
    const headers = [
      { text: 'Ward Code', x: 40, width: 80 },
      { text: 'Ward Name', x: 125, width: 120 },
      { text: 'Municipality', x: 250, width: 100 },
      { text: 'Province', x: 355, width: 80 },
      { text: 'Active', x: 440, width: 60 },
      { text: 'Total', x: 505, width: 60 },
      { text: 'Active %', x: 570, width: 60 },
      { text: 'Standing', x: 635, width: 100 }
    ];

    // Draw table header
    doc.fontSize(9)
       .font('Helvetica-Bold');

    headers.forEach(header => {
      doc.text(header.text, header.x, tableTop);
    });

    // Draw header line
    doc.moveTo(40, tableTop + 15)
       .lineTo(doc.page.width - 40, tableTop + 15)
       .stroke();

    // Draw table rows
    doc.font('Helvetica')
       .fontSize(8);

    let currentY = tableTop + 25;
    let rowCount = 0;

    wardData.forEach((ward, index) => {
      // Check if we need a new page
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = 50;

        // Redraw headers on new page
        doc.fontSize(9).font('Helvetica-Bold');
        headers.forEach(header => {
          doc.text(header.text, header.x, currentY);
        });
        doc.moveTo(40, currentY + 15)
           .lineTo(doc.page.width - 40, currentY + 15)
           .stroke();
        currentY += 25;
        doc.font('Helvetica').fontSize(8);
      }

      // Draw row data
      const activePercentage = ward.total_members > 0 ?
        (ward.active_members / ward.total_members * 100).toFixed(1) : '0.0';

      doc.text(ward.ward_code || '', 40, currentY)
         .text(this.truncateText(ward.ward_name || '', 15), 125, currentY)
         .text(this.truncateText(ward.municipality_name || '', 12), 250, currentY)
         .text(this.truncateText(ward.province_name || '', 8), 355, currentY)
         .text((ward.active_members || 0).toString(), 440, currentY)
         .text((ward.total_members || 0).toString(), 505, currentY)
         .text(`${activePercentage}%`, 570, currentY)
         .text(this.truncateText(ward.ward_standing || '', 12), 635, currentY);

      currentY += itemHeight;
      rowCount++;

      // Draw alternating row background (light gray for even rows)
      if (index % 2 === 0) {
        doc.rect(40, currentY - itemHeight, doc.page.width - 80, itemHeight)
           .fillOpacity(0.05)
           .fill('#000000')
           .fillOpacity(1);
      }
    });

    return currentY + 20;
  }

  // Helper methods for Municipality Performance PDF
  private static addMunicipalityPerformanceHeader(doc: any, options: any, filters: any) {
    const currentDate = new Date().toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Title
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text('Municipality Performance Report', 40, 40);

    // Date and filters
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Generated on: ${currentDate}`, 40, 70);

    let yPos = 85;
    if (filters) {
      if (filters.province_code) {
        doc.text(`Province: ${filters.province_code}`, 40, yPos);
        yPos += 15;
      }
      if (filters.performance) {
        doc.text(`Performance Filter: ${filters.performance}`, 40, yPos);
        yPos += 15;
      }
      if (filters.search) {
        doc.text(`Search Term: ${filters.search}`, 40, yPos);
        yPos += 15;
      }
    }

    // Add line separator
    doc.moveTo(40, yPos + 10)
       .lineTo(doc.page.width - 40, yPos + 10)
       .stroke();

    return yPos + 25;
  }

  private static addMunicipalityPerformanceSummary(doc: any, municipalityData: any[]) {
    const yStart = 140;

    // Calculate summary statistics
    const totalMunicipalities = municipalityData.length;
    const totalActiveMembers = municipalityData.reduce((sum, muni) => sum + (muni.total_active_members || 0), 0);
    const totalWards = municipalityData.reduce((sum, muni) => sum + (muni.total_wards || 0), 0);
    const avgCompliance = totalMunicipalities > 0 ?
      municipalityData.reduce((sum, muni) => sum + (muni.compliance_percentage || 0), 0) / totalMunicipalities : 0;

    const performanceCounts = municipalityData.reduce((acc, muni) => {
      const performance = muni.municipality_performance || 'Unknown';
      acc[performance] = (acc[performance] || 0) + 1;
      return acc;
    }, {});

    // Summary box
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Executive Summary', 40, yStart);

    doc.fontSize(10)
       .font('Helvetica')
       .text(`Total Municipalities: ${totalMunicipalities}`, 40, yStart + 25)
       .text(`Total Active Members: ${totalActiveMembers.toLocaleString()}`, 40, yStart + 40)
       .text(`Total Wards: ${totalWards.toLocaleString()}`, 40, yStart + 55)
       .text(`Average Compliance: ${avgCompliance.toFixed(1)}%`, 40, yStart + 70);

    // Performance breakdown
    let xPos = 300;
    doc.text('Performance Breakdown:', xPos, yStart + 25);
    let yPos = yStart + 40;
    Object.entries(performanceCounts).forEach(([performance, count]) => {
      doc.text(`${performance}: ${count}`, xPos, yPos);
      yPos += 15;
    });

    return yStart + 100;
  }

  private static addMunicipalityPerformanceTable(doc: any, municipalityData: any[]) {
    const startY = 260;
    const tableTop = startY;
    const itemHeight = 20;
    const pageHeight = doc.page.height - 80;

    // Table headers
    const headers = [
      { text: 'Municipality', x: 40, width: 120 },
      { text: 'District', x: 165, width: 100 },
      { text: 'Province', x: 270, width: 80 },
      { text: 'Total Wards', x: 355, width: 70 },
      { text: 'Compliant', x: 430, width: 70 },
      { text: 'Compliance %', x: 505, width: 80 },
      { text: 'Active Members', x: 590, width: 80 },
      { text: 'Performance', x: 675, width: 100 }
    ];

    // Draw table header
    doc.fontSize(9)
       .font('Helvetica-Bold');

    headers.forEach(header => {
      doc.text(header.text, header.x, tableTop);
    });

    // Draw header line
    doc.moveTo(40, tableTop + 15)
       .lineTo(doc.page.width - 40, tableTop + 15)
       .stroke();

    // Draw table rows
    doc.font('Helvetica')
       .fontSize(8);

    let currentY = tableTop + 25;

    municipalityData.forEach((municipality, index) => {
      // Check if we need a new page
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = 50;

        // Redraw headers on new page
        doc.fontSize(9).font('Helvetica-Bold');
        headers.forEach(header => {
          doc.text(header.text, header.x, currentY);
        });
        doc.moveTo(40, currentY + 15)
           .lineTo(doc.page.width - 40, currentY + 15)
           .stroke();
        currentY += 25;
        doc.font('Helvetica').fontSize(8);
      }

      // Draw row data
      doc.text(this.truncateText(municipality.municipality_name || '', 15), 40, currentY)
         .text(this.truncateText(municipality.district_name || '', 12), 165, currentY)
         .text(this.truncateText(municipality.province_name || '', 8), 270, currentY)
         .text((municipality.total_wards || 0).toString(), 355, currentY)
         .text((municipality.compliant_wards || 0).toString(), 430, currentY)
         .text(`${(municipality.compliance_percentage || 0).toFixed(1)}%`, 505, currentY)
         .text((municipality.total_active_members || 0).toLocaleString(), 590, currentY)
         .text(this.truncateText(municipality.municipality_performance || '', 12), 675, currentY);

      currentY += itemHeight;

      // Draw alternating row background
      if (index % 2 === 0) {
        doc.rect(40, currentY - itemHeight, doc.page.width - 80, itemHeight)
           .fillOpacity(0.05)
           .fill('#000000')
           .fillOpacity(1);
      }
    });

    return currentY + 20;
  }

  // Helper method to truncate text
  private static truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  private static addRenewalReportHeader(doc: PDFKit.PDFDocument, options: any, renewalData: any): void {
    const { title, subtitle, reportType } = options;

    // Title
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text(title || 'Membership Renewal Report', 50, 50, { align: 'center' });

    // Report type
    if (reportType) {
      const typeLabels: { [key: string]: string } = {
        'dashboard': 'Dashboard Overview',
        'analytics': 'Analytics & Trends',
        'member_renewals': 'Member Renewals Summary'
      };

      doc.fontSize(12)
         .font('Helvetica')
         .text(typeLabels[reportType] || reportType, 50, 75, { align: 'center' });
    }

    // Date
    if (subtitle) {
      doc.fontSize(10)
         .font('Helvetica')
         .text(subtitle, 50, 95, { align: 'center' });
    }

    doc.moveDown(2);
  }

  private static addRenewalDashboardContent(doc: PDFKit.PDFDocument, renewalData: any, options: any): void {
    const { renewal_statistics, upcoming_expirations, recent_renewals, payment_method_breakdown } = renewalData;

    // Renewal Statistics Summary
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Renewal Statistics Summary', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Total Renewals This Month: ${renewal_statistics.total_renewals_this_month.toLocaleString()}`)
       .text(`Completed Renewals: ${renewal_statistics.completed_renewals.toLocaleString()}`)
       .text(`Pending Renewals: ${renewal_statistics.pending_renewals.toLocaleString()}`)
       .text(`Failed Renewals: ${renewal_statistics.failed_renewals.toLocaleString()}`)
       .text(`Total Revenue: R${renewal_statistics.total_revenue.toLocaleString()}`)
       .text(`Average Renewal Amount: R${renewal_statistics.average_renewal_amount.toFixed(2)}`)
       .text(`Renewal Rate: ${renewal_statistics.renewal_rate}%`);

    doc.moveDown(1.5);

    // Payment Method Breakdown
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Payment Method Breakdown', { underline: true });

    doc.moveDown(0.5);

    payment_method_breakdown.forEach((method: any) => {
      doc.fontSize(11)
         .font('Helvetica')
         .text(`${method.method.charAt(0).toUpperCase() + method.method.slice(1).replace('_', ' ')}: ${method.count} (${method.percentage}%) - R${method.total_amount.toLocaleString()}`);
    });

    doc.moveDown(1.5);

    // Upcoming Expirations
    if (upcoming_expirations.length > 0) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Upcoming Expirations (Next 60 Days)', { underline: true });

      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica');

      upcoming_expirations.slice(0, 10).forEach((member: any) => {
        doc.text(`${member.first_name} ${member.last_name} - ${member.province_name} - Expires in ${member.days_until_expiry} days`);
      });

      if (upcoming_expirations.length > 10) {
        doc.text(`... and ${upcoming_expirations.length - 10} more members`);
      }
    }

    doc.moveDown(1.5);
  }

  private static addRenewalAnalyticsContent(doc: PDFKit.PDFDocument, renewalData: any, options: any): void {
    const { renewal_trends, revenue_analysis, retention_metrics, geographic_performance } = renewalData;

    // Revenue Analysis
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Revenue Analysis', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Total Revenue YTD: R${revenue_analysis.total_revenue_ytd.toLocaleString()}`)
       .text(`Average Monthly Revenue: R${revenue_analysis.average_monthly_revenue.toLocaleString()}`)
       .text(`Revenue Growth Rate: ${revenue_analysis.revenue_growth_rate}%`)
       .text(`Average Renewal Amount: R${revenue_analysis.average_renewal_amount}`)
       .text(`Highest Revenue Month: ${revenue_analysis.highest_revenue_month}`)
       .text(`Lowest Revenue Month: ${revenue_analysis.lowest_revenue_month}`);

    doc.moveDown(1.5);

    // Retention Metrics
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Retention Metrics', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(11)
       .font('Helvetica')
       .text(`Overall Retention Rate: ${retention_metrics.overall_retention_rate}%`)
       .text(`First Year Retention: ${retention_metrics.first_year_retention}%`)
       .text(`Long-term Retention: ${retention_metrics.long_term_retention}%`)
       .text(`Churn Rate: ${retention_metrics.churn_rate}%`)
       .text(`Average Membership Duration: ${retention_metrics.average_membership_duration} years`)
       .text(`Customer Lifetime Value: R${retention_metrics.lifetime_value}`);

    doc.moveDown(1.5);

    // Geographic Performance
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Geographic Performance', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(10)
       .font('Helvetica');

    geographic_performance.slice(0, 5).forEach((province: any) => {
      doc.text(`${province.province}: ${province.renewals_this_month} renewals (${province.renewal_rate}%) - R${province.revenue.toLocaleString()}`);
    });

    doc.moveDown(1);

    // Renewal Trends (Last 6 Months)
    if (renewal_trends.length > 0) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Recent Renewal Trends', { underline: true });

      doc.moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica');

      renewal_trends.slice(-6).forEach((trend: any) => {
        doc.text(`${trend.month}: ${trend.total_renewals} renewals, R${trend.revenue.toLocaleString()}, ${trend.renewal_rate}% rate`);
      });
    }
  }

  // Helper methods for Comprehensive Analytics PDF
  private static addComprehensiveAnalyticsHeader(doc: any, options: any, analyticsData: any): void {
    // Add title
    doc.fontSize(20)
       .fillColor('#1976d2')
       .text('📊 COMPREHENSIVE ANALYTICS REPORT', 50, 50, { align: 'center' });

    // Add subtitle with date range
    const subtitle = options.subtitle || `Generated on ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`;

    doc.fontSize(12)
       .fillColor('#666666')
       .text(subtitle, 50, 80, { align: 'center' });

    // Add report scope if available
    if (options.reportScope) {
      doc.fontSize(10)
         .fillColor('#888888')
         .text(`Report Scope: ${options.reportScope}`, 50, 100, { align: 'center' });
    }

    doc.moveDown(2);
  }

  private static addComprehensiveAnalyticsExecutiveSummary(doc: any, analyticsData: any): void {
    const startY = doc.y;

    // Section header
    doc.fontSize(16)
       .fillColor('#1976d2')
       .text('📋 EXECUTIVE SUMMARY', 50, startY);

    doc.moveDown(0.5);

    // Create summary cards in landscape layout
    const cardWidth = 180;
    const cardHeight = 80;
    const cardSpacing = 20;
    const startX = 50;
    let currentX = startX;
    let currentY = doc.y;

    // Summary cards data
    const summaryCards = [
      {
        title: 'Total Members',
        value: analyticsData.membership?.total_members?.toLocaleString() || '0',
        color: '#4caf50',
        icon: '👥'
      },
      {
        title: 'Active Members',
        value: analyticsData.membership?.active_members?.toLocaleString() || '0',
        color: '#2196f3',
        icon: '✅'
      },
      {
        title: 'Total Meetings',
        value: analyticsData.meetings?.total_meetings?.toLocaleString() || '0',
        color: '#ff9800',
        icon: '📅'
      },
      {
        title: 'Leadership Positions',
        value: analyticsData.leadership?.total_positions?.toLocaleString() || '0',
        color: '#9c27b0',
        icon: '👑'
      }
    ];

    // Draw summary cards
    summaryCards.forEach((card, index) => {
      if (index > 0 && index % 4 === 0) {
        currentY += cardHeight + cardSpacing;
        currentX = startX;
      }

      // Card background
      doc.rect(currentX, currentY, cardWidth, cardHeight)
         .fillAndStroke('#f5f5f5', '#e0e0e0');

      // Card content
      doc.fontSize(12)
         .fillColor(card.color)
         .text(card.icon + ' ' + card.title, currentX + 10, currentY + 10);

      doc.fontSize(18)
         .fillColor('#333333')
         .text(card.value, currentX + 10, currentY + 35);

      currentX += cardWidth + cardSpacing;
    });

    doc.y = currentY + cardHeight + 30;
  }

  private static addMembershipAnalyticsSection(doc: any, membershipData: any): void {
    // Check if we need a new page
    if (doc.y > 500) {
      doc.addPage();
    }

    const startY = doc.y;

    // Section header
    doc.fontSize(16)
       .fillColor('#1976d2')
       .text('👥 MEMBERSHIP ANALYTICS', 50, startY);

    doc.moveDown(1);

    // Membership statistics table
    const tableData = [
      ['Metric', 'Count', 'Percentage'],
      ['Total Members', membershipData.total_members?.toLocaleString() || '0', '100%'],
      ['Active Members', membershipData.active_members?.toLocaleString() || '0',
       `${((membershipData.active_members / membershipData.total_members) * 100).toFixed(1)}%`],
      ['Inactive Members', membershipData.inactive_members?.toLocaleString() || '0',
       `${((membershipData.inactive_members / membershipData.total_members) * 100).toFixed(1)}%`],
      ['Pending Members', membershipData.pending_members?.toLocaleString() || '0',
       `${((membershipData.pending_members / membershipData.total_members) * 100).toFixed(1)}%`]
    ];

    const membershipColumns = [
      { key: 'metric', title: 'Metric', width: 200, align: 'left' as const },
      { key: 'count', title: 'Count', width: 100, align: 'center' as const },
      { key: 'percentage', title: 'Percentage', width: 100, align: 'center' as const }
    ];

    this.addTable(doc, tableData, membershipColumns);

    doc.moveDown(2);

    // Gender distribution if available
    if (membershipData.gender_distribution && membershipData.gender_distribution.length > 0) {
      doc.fontSize(14)
         .fillColor('#1976d2')
         .text('Gender Distribution:', 50, doc.y);

      doc.moveDown(0.5);

      const genderTableData = [
        ['Gender', 'Count', 'Percentage'],
        ...membershipData.gender_distribution.map((item: any) => [
          item.gender,
          item.member_count?.toLocaleString() || '0',
          `${item.percentage?.toFixed(1) || '0'}%`
        ])
      ];

      const genderColumns = [
        { key: 'gender', title: 'Gender', width: 150, align: 'left' as const },
        { key: 'count', title: 'Count', width: 100, align: 'center' as const },
        { key: 'percentage', title: 'Percentage', width: 100, align: 'center' as const }
      ];

      this.addTable(doc, genderTableData, genderColumns);

      doc.moveDown(1);
    }
  }

  private static addGeographicPerformanceSection(doc: any, geographicData: any): void {
    // Check if we need a new page
    if (doc.y > 400) {
      doc.addPage();
    }

    const startY = doc.y;

    // Section header
    doc.fontSize(16)
       .fillColor('#1976d2')
       .text('🌍 GEOGRAPHIC PERFORMANCE', 50, startY);

    doc.moveDown(1);

    // Top Performing Districts
    if (geographicData.top_performing_districts && geographicData.top_performing_districts.length > 0) {
      doc.fontSize(14)
         .fillColor('#4caf50')
         .text('🏆 Top 5 Performing Districts:', 50, doc.y);

      doc.moveDown(0.5);

      const districtTableData = [
        ['Rank', 'District', 'Province', 'Members', 'Performance', 'Growth'],
        ...geographicData.top_performing_districts.slice(0, 5).map((district: any, index: number) => [
          `#${index + 1}`,
          district.district_name || 'N/A',
          district.province_name || 'N/A',
          district.member_count?.toLocaleString() || '0',
          `${district.performance_score?.toFixed(1) || '0'}%`,
          `+${district.growth_rate || '0'}%`
        ])
      ];

      const districtColumns = [
        { key: 'rank', title: 'Rank', width: 50, align: 'center' as const },
        { key: 'district', title: 'District', width: 150, align: 'left' as const },
        { key: 'province', title: 'Province', width: 120, align: 'left' as const },
        { key: 'members', title: 'Members', width: 80, align: 'center' as const },
        { key: 'performance', title: 'Performance', width: 80, align: 'center' as const },
        { key: 'growth', title: 'Growth', width: 70, align: 'center' as const }
      ];

      this.addTable(doc, districtTableData, districtColumns);

      doc.moveDown(1.5);
    }

    // Worst Performing Municipalities
    if (geographicData.worst_performing_municipalities && geographicData.worst_performing_municipalities.length > 0) {
      doc.fontSize(14)
         .fillColor('#f44336')
         .text('🚨 Municipalities Needing Attention:', 50, doc.y);

      doc.moveDown(0.5);

      const municipalityTableData = [
        ['Municipality', 'District', 'Members', 'Target', 'Gap', 'Compliance'],
        ...geographicData.worst_performing_municipalities.slice(0, 5).map((municipality: any) => [
          municipality.municipality_name || 'N/A',
          municipality.district_name || 'N/A',
          municipality.member_count?.toLocaleString() || '0',
          municipality.target_count?.toLocaleString() || '1000',
          municipality.performance_gap?.toLocaleString() || '0',
          `${municipality.compliance_rate || '0'}%`
        ])
      ];

      const municipalityColumns = [
        { key: 'municipality', title: 'Municipality', width: 140, align: 'left' as const },
        { key: 'district', title: 'District', width: 120, align: 'left' as const },
        { key: 'members', title: 'Members', width: 70, align: 'center' as const },
        { key: 'target', title: 'Target', width: 70, align: 'center' as const },
        { key: 'gap', title: 'Gap', width: 70, align: 'center' as const },
        { key: 'compliance', title: 'Compliance', width: 80, align: 'center' as const }
      ];

      this.addTable(doc, municipalityTableData, municipalityColumns);

      doc.moveDown(1);
    }
  }

  private static addMeetingAnalyticsSection(doc: any, meetingData: any): void {
    // Check if we need a new page
    if (doc.y > 500) {
      doc.addPage();
    }

    const startY = doc.y;

    // Section header
    doc.fontSize(16)
       .fillColor('#1976d2')
       .text('📅 MEETING ANALYTICS', 50, startY);

    doc.moveDown(1);

    // Meeting statistics
    const meetingStats = [
      ['Metric', 'Count'],
      ['Total Meetings', meetingData.total_meetings?.toLocaleString() || '0'],
      ['Completed Meetings', meetingData.completed_meetings?.toLocaleString() || '0'],
      ['Cancelled Meetings', meetingData.cancelled_meetings?.toLocaleString() || '0'],
      ['Upcoming Meetings', meetingData.upcoming_meetings?.toLocaleString() || '0'],
      ['Average Attendance', `${meetingData.average_attendance?.toFixed(1) || '0'}%`]
    ];

    const meetingColumns = [
      { key: 'metric', title: 'Metric', width: 200, align: 'left' as const },
      { key: 'count', title: 'Count', width: 150, align: 'center' as const }
    ];

    this.addTable(doc, meetingStats, meetingColumns);

    doc.moveDown(1);
  }

  private static addLeadershipAnalyticsSection(doc: any, leadershipData: any): void {
    // Check if we need a new page
    if (doc.y > 500) {
      doc.addPage();
    }

    const startY = doc.y;

    // Section header
    doc.fontSize(16)
       .fillColor('#1976d2')
       .text('👑 LEADERSHIP ANALYTICS', 50, startY);

    doc.moveDown(1);

    // Leadership statistics
    const leadershipStats = [
      ['Metric', 'Count'],
      ['Total Positions', leadershipData.total_positions?.toLocaleString() || '0'],
      ['Filled Positions', leadershipData.filled_positions?.toLocaleString() || '0'],
      ['Vacant Positions', leadershipData.vacant_positions?.toLocaleString() || '0'],
      ['Average Tenure', `${leadershipData.average_tenure?.toFixed(1) || '0'} months`]
    ];

    const leadershipColumns = [
      { key: 'metric', title: 'Metric', width: 200, align: 'left' as const },
      { key: 'count', title: 'Count', width: 150, align: 'center' as const }
    ];

    this.addTable(doc, leadershipStats, leadershipColumns);

    doc.moveDown(1);
  }

  private static addDashboardStatsSection(doc: any, dashboardData: any): void {
    // Check if we need a new page
    if (doc.y > 500) {
      doc.addPage();
    }

    const startY = doc.y;

    // Section header
    doc.fontSize(16)
       .fillColor('#1976d2')
       .text('📊 DASHBOARD STATISTICS', 50, startY);

    doc.moveDown(1);

    // Dashboard key metrics
    const dashboardStats = [
      ['Metric', 'Value'],
      ['Total Members', dashboardData.total_members?.toLocaleString() || '0'],
      ['New Members (This Month)', dashboardData.new_members_this_month?.toLocaleString() || '0'],
      ['Active Wards', dashboardData.active_wards?.toLocaleString() || '0'],
      ['Upcoming Meetings', dashboardData.upcoming_meetings?.toLocaleString() || '0']
    ];

    const dashboardColumns = [
      { key: 'metric', title: 'Metric', width: 250, align: 'left' as const },
      { key: 'value', title: 'Value', width: 150, align: 'center' as const }
    ];

    this.addTable(doc, dashboardStats, dashboardColumns);

    doc.moveDown(2);
  }

  private static addFooter(doc: PDFKit.PDFDocument): void {
    // Add footer to current page only
    doc.fontSize(8)
       .text(`Generated on ${new Date().toLocaleDateString()}`,
             doc.page.margins.left,
             doc.page.height - doc.page.margins.bottom + 10,
             { align: 'center' });
  }
}
