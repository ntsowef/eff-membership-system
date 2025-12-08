import htmlPdf from 'html-pdf-node';
import fs from 'fs';
import path from 'path';

interface WardInfo {
  ward_code: string;
  ward_number?: string;
  ward_name?: string;
  province_name: string;
  province_code: string;
  municipality_name: string;
  municipality_code?: string;
  district_name?: string;
}

interface MemberData {
  member_id: number;
  full_name: string;
  first_name?: string;
  surname?: string;
  id_number: string;
  cell_number?: string;
  voting_district_name?: string;
  voting_district_code?: string;
  voting_district_number?: string;
  ward_code?: string;
}

export class HtmlPdfService {
  /**
   * Generate Ward Attendance Register PDF from HTML
   * Similar to the reference code provided by the user
   */
  static async generateWardAttendanceRegisterPDF(
    wardInfo: WardInfo,
    members: MemberData[]
  ): Promise<Buffer> {
    try {
      console.log('🔄 Starting HTML-based PDF Ward Attendance Register generation...');
      console.log(`📊 Ward: ${wardInfo.ward_code}, Members: ${members.length}`);

      // Group members by voting district
      // EXCLUDE members who are "Not Registered to vote" and "Registered in different Ward" from main table
      const grouped: Record<string, MemberData[]> = {};
      const differentWardMembers: MemberData[] = [];

      // Debug: Log unique voting district names and codes
      const uniqueVDs = new Set(members.map(m => m.voting_district_name || 'Not Registered to vote'));
      const uniqueVDCodes = new Set(members.map(m => m.voting_district_code || 'NULL'));
      console.log(`📋 Unique voting district names in data:`, Array.from(uniqueVDs));
      console.log(`📋 Unique voting district codes in data:`, Array.from(uniqueVDCodes));

      members.forEach(member => {
        const vdCode = member.voting_district_code || '';
        const vdName = member.voting_district_name || 'Not Registered to vote';
        const vdNameLower = vdName.toLowerCase().trim();

        // Check for special voting district codes
        // '99999999' or '999999999' = Not Registered to vote
        if (vdCode === '99999999' || vdCode === '999999999' || vdNameLower === 'not registered to vote') {
          console.log(`⏭️ Skipping unregistered voter: ${member.full_name || member.first_name} - VD Code: "${vdCode}"`);
          return;
        }

        // '22222222' or '222222222' = Registered in different ward
        if (vdCode === '22222222' || vdCode === '222222222' ||
            vdNameLower === 'registered in different ward' ||
            vdNameLower.includes('different ward') ||
            vdNameLower.includes('other ward')) {
          console.log(`🔄 Separating member to different ward table: ${member.full_name || member.first_name} - VD Code: "${vdCode}", VD Name: "${vdName}"`);
          differentWardMembers.push(member);
          return;
        }

        // Add to main table (registered in this ward)
        if (!grouped[vdName]) {
          grouped[vdName] = [];
        }
        grouped[vdName].push(member);
      });

      // Calculate total from ALL registered voters (this ward + different ward)
      const thisWardCount = Object.values(grouped).reduce((sum, list) => sum + list.length, 0);
      const total = thisWardCount + differentWardMembers.length;  // Include different ward members in total
      const excludedCount = members.length - total;
      const quorum = Math.floor(total / 2) + 1;

      console.log(`📊 Total members: ${members.length}, Registered in this ward: ${thisWardCount}, Different ward: ${differentWardMembers.length}, Total registered: ${total}, Excluded (not registered): ${excludedCount}`);
      const province = wardInfo.province_name || 'UNKNOWN';
      const municipality = wardInfo.municipality_name || 'UNKNOWN';
      const municipalityCode = wardInfo.municipality_code || '';
      const wardNumber = wardInfo.ward_number || wardInfo.ward_code;
      const wardCode = wardInfo.ward_code || wardNumber;

      // Count voting districts (already excludes "Not Registered to vote")
      const vdCount = Object.keys(grouped).length;

      // Load logo if exists
      let logoHtml = '';
      const logoPath = path.join(process.cwd(), 'assets', 'logo.png');
      if (fs.existsSync(logoPath)) {
        const imgBuffer = fs.readFileSync(logoPath);
        const base64 = imgBuffer.toString('base64');
        logoHtml = `<div class="logo"><img src="data:image/png;base64,${base64}" width="90"></div>`;
      }

      const subRegionText = municipalityCode ? `${municipalityCode} - ${municipality}` : municipality;

      // Generate HTML
      let num = 1;
      let html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
    body { font-family: Arial; margin: 40px 30px 90px 30px; font-size: 10pt; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid black; padding: 5px; font-size: 9pt; }
    th { background: #383535; color: white; font-weight: bold; }
    .header { font-size: 20pt; text-align: center; font-weight: bold; }
    .logo { text-align: center; margin: 15px; }
    .info td { border: none; padding: 3px 0; }
    .vd-group { background: #ddd; font-weight: bold; }
    .total-row { background: yellow; font-weight: bold; }
    .right { text-align: right; }
</style></head><body>
<div class="header">FORM A: ATTENDANCE REGISTER</div>
<hr style="border:2px solid black">
${logoHtml}

<table class="info"><tr>
  <td><strong>PROVINCE:</strong> ${province}</td>
  <td class="right"><strong>SUB REGION:</strong> ${subRegionText}</td>
</tr><tr>
  <td><strong>TOTAL MEMBERSHIP IN GOOD STANDING:</strong> ${total}</td>
  <td class="right"><strong>WARD:</strong> ${wardCode}</td>
</tr><tr>
  <td><strong>QUORUM:</strong> ${quorum}</td>
  <td class="right"><strong>BPA:</strong> |_|   <strong>BGA:</strong> |_|</td>
</tr><tr>
  <td><strong>DATE OF BPA/BGA:</strong></td>
  <td class="right"><strong>TOTAL NUMBER OF VOTING STATIONS:</strong> ${vdCount}</td>
</tr></table>

<table><thead><tr>
  <th>NUM...</th><th>NAME</th><th>WARD NUMBER</th><th>ID NUMBER</th>
  <th>CELL NUMBER</th><th>REGISTERED VD</th><th>SIGNATURE</th><th>NEW CELL NUM</th>
</tr></thead><tbody>`;

      // Add members grouped by voting district
      Object.keys(grouped).sort().forEach(vd => {
        const list = grouped[vd];
        const vdCode = list[0]?.voting_district_code || list[0]?.voting_district_number || '';
        html += `<tr class="vd-group"><td colspan="8">Voting Station: ${vd} (VD Code: ${vdCode})</td></tr>`;
        
        list.forEach(member => {
          const fullName = member.full_name || `${member.first_name || ''} ${member.surname || ''}`.trim().toUpperCase();
          const cellNum = (member.cell_number || '').replace(/[^0-9]/g, '').slice(0, 15);
          const wardCode = member.ward_code || wardNumber;
          
          html += `<tr><td>${num++}</td><td>${fullName}</td><td>${wardCode}</td><td>${member.id_number}</td>
            <td>${cellNum}</td><td>${vd}</td><td></td><td></td></tr>`;
        });
        
        html += `<tr class="total-row"><td colspan="8">Total Voters in ${vd}: ${list.length}</td></tr>`;
      });

      html += `</tbody></table>`;

      // Add separate table for members registered in different ward
      if (differentWardMembers.length > 0) {
        html += `
<div style="margin-top: 30px; page-break-before: auto;">
  <h3 style="background: #f0f0f0; padding: 10px; border: 2px solid #333;">
    MEMBERS REGISTERED IN DIFFERENT WARD (${differentWardMembers.length})
  </h3>
  <p style="font-size: 9pt; color: #666; margin: 10px 0;">
    These members are registered to vote in a different ward but are part of this ward's membership.
  </p>
  <table><thead><tr>
    <th>NUM...</th><th>NAME</th><th>WARD NUMBER</th><th>ID NUMBER</th>
    <th>CELL NUMBER</th><th>REGISTERED VD</th><th>SIGNATURE</th><th>NEW CELL NUM</th>
  </tr></thead><tbody>`;

        let diffWardNum = 1;
        differentWardMembers.forEach(member => {
          const fullName = member.full_name || `${member.first_name || ''} ${member.surname || ''}`.trim().toUpperCase();
          const cellNum = (member.cell_number || '').replace(/[^0-9]/g, '').slice(0, 15);
          const wardCode = member.ward_code || wardNumber;
          const vdInfo = member.voting_district_name || 'Different Ward';

          html += `<tr><td>${diffWardNum++}</td><td>${fullName}</td><td>${wardCode}</td><td>${member.id_number}</td>
            <td>${cellNum}</td><td>${vdInfo}</td><td></td><td></td></tr>`;
        });

        html += `<tr class="total-row"><td colspan="8">Total Members Registered in Different Ward: ${differentWardMembers.length}</td></tr>`;
        html += `</tbody></table>`;
      }

      html += `</body></html>`;

      console.log('📄 Generating PDF from HTML...');
      const file = { content: html };
      const pdfBuffer = await htmlPdf.generatePdf(file, {
        format: 'Letter',
        landscape: true,
        margin: { top: 40, bottom: 90, left: 30, right: 30 },
        displayHeaderFooter: true,
        footerTemplate: `
          <div style="width:100%; font-size:9pt; padding:0 40px; color:#333; display:flex; justify-content:space-between; align-items:center; height:40px;">
            <span>${subRegionText}</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
            <span>WARD: ${wardCode}</span>
          </div>`,
        headerTemplate: '<div></div>',
        printBackground: true
      });

      console.log(`✅ PDF generated successfully, size: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
    } catch (error) {
      console.error('❌ Failed to generate PDF from HTML:', error);
      throw error;
    }
  }

  /**
   * Generate Comprehensive Analytics Report PDF from HTML
   */
  static async generateComprehensiveAnalyticsPDF(
    data: any,
    options: {
      title?: string;
      subtitle?: string;
      orientation?: 'portrait' | 'landscape';
      reportScope?: string;
    } = {}
  ): Promise<Buffer> {
    const {
      title = 'Comprehensive Analytics Report',
      subtitle = `Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      orientation = 'landscape',
      reportScope = 'National Level'
    } = options;

    console.log('🔄 Starting HTML-based Comprehensive Analytics PDF generation...');

    // Extract data with safe defaults
    const totalMembers = data.membership?.total_members ?? 0;
    const activeMembers = data.membership?.active_members ?? 0;
    const inactiveMembers = data.membership?.inactive_members ?? 0;
    const pendingMembers = data.membership?.pending_members ?? 0;
    const totalMeetings = data.meetings?.total_meetings ?? 0;
    const totalPositions = data.leadership?.total_positions ?? 0;
    const filledPositions = data.leadership?.filled_positions ?? 0;
    const vacantPositions = data.leadership?.vacant_positions ?? 0;

    // Calculate percentages
    const activePercentage = totalMembers > 0 ? ((activeMembers / totalMembers) * 100).toFixed(1) : '0';
    const inactivePercentage = totalMembers > 0 ? ((inactiveMembers / totalMembers) * 100).toFixed(1) : '0';
    const filledPercentage = totalPositions > 0 ? ((filledPositions / totalPositions) * 100).toFixed(1) : '0';

    // Generate gender distribution HTML
    const genderDistribution = data.membership?.gender_distribution || [];
    const genderHTML = genderDistribution.length > 0 ? genderDistribution.map((g: any) => `
      <tr>
        <td>${g.gender || 'Unknown'}</td>
        <td class="center">${(g.member_count ?? 0).toLocaleString()}</td>
        <td class="center">${(g.percentage ?? 0).toFixed(1)}%</td>
        <td>
          <div class="progress-bar">
            <div class="progress-fill ${g.gender === 'Male' ? 'blue' : g.gender === 'Female' ? 'pink' : 'gray'}" style="width: ${g.percentage ?? 0}%"></div>
          </div>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="4" class="center">No gender data available</td></tr>';

    // Generate age distribution HTML
    const ageDistribution = data.membership?.age_distribution || [];
    const ageHTML = ageDistribution.length > 0 ? ageDistribution.map((a: any) => `
      <tr>
        <td>${a.age_group || 'Unknown'}</td>
        <td class="center">${(a.member_count ?? 0).toLocaleString()}</td>
        <td class="center">${(a.percentage ?? 0).toFixed(1)}%</td>
        <td>
          <div class="progress-bar">
            <div class="progress-fill green" style="width: ${a.percentage ?? 0}%"></div>
          </div>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="4" class="center">No age data available</td></tr>';

    // Generate geographic performance HTML
    const geoPerformance = data.membership?.geographic_performance || {};
    const bestWards = geoPerformance.best_performing_wards || [];
    const worstWards = geoPerformance.worst_performing_wards || [];

    const bestWardsHTML = bestWards.slice(0, 5).map((w: any, i: number) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${w.ward_name || w.ward_code || 'Unknown'}</td>
        <td class="center">${(w.member_count ?? 0).toLocaleString()}</td>
        <td class="center"><span class="badge success">${(w.compliance_rate ?? 0).toFixed(1)}%</span></td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="center">No data</td></tr>';

    const worstWardsHTML = worstWards.slice(0, 5).map((w: any, i: number) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${w.ward_name || w.ward_code || 'Unknown'}</td>
        <td class="center">${(w.member_count ?? 0).toLocaleString()}</td>
        <td class="center"><span class="badge error">${(w.compliance_rate ?? 0).toFixed(1)}%</span></td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="center">No data</td></tr>';

    const html = this.getComprehensiveAnalyticsHTML({
      title, subtitle, reportScope,
      totalMembers, activeMembers, inactiveMembers, pendingMembers,
      totalMeetings, totalPositions, filledPositions, vacantPositions,
      activePercentage, inactivePercentage, filledPercentage,
      genderHTML, ageHTML, bestWardsHTML, worstWardsHTML
    });

    console.log('📄 Generating PDF from HTML...');
    const file = { content: html };
    const pdfBuffer = await htmlPdf.generatePdf(file, {
      format: 'A4',
      landscape: orientation === 'landscape',
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
      printBackground: true
    });

    console.log(`✅ Comprehensive Analytics PDF generated successfully, size: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  }

  private static getComprehensiveAnalyticsHTML(params: any): string {
    const {
      title, subtitle, reportScope,
      totalMembers, activeMembers, inactiveMembers, pendingMembers,
      totalMeetings, totalPositions, filledPositions, vacantPositions,
      activePercentage, inactivePercentage, filledPercentage,
      genderHTML, ageHTML, bestWardsHTML, worstWardsHTML
    } = params;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #fff; color: #333; padding: 30px; font-size: 11pt; }
    .header { background: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%); color: white; padding: 25px 30px; border-radius: 10px; margin-bottom: 25px; }
    .header h1 { font-size: 24px; margin-bottom: 6px; letter-spacing: 0.5px; }
    .header .subtitle { opacity: 0.9; font-size: 12px; }
    .header .scope { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 15px; display: inline-block; margin-top: 8px; font-size: 11px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
    .stat-card { background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); border-left: 4px solid; }
    .stat-card.primary { border-color: #1976d2; }
    .stat-card.success { border-color: #4caf50; }
    .stat-card.warning { border-color: #ff9800; }
    .stat-card.purple { border-color: #9c27b0; }
    .stat-card .icon { font-size: 20px; margin-bottom: 6px; }
    .stat-card .value { font-size: 28px; font-weight: 700; color: #1976d2; }
    .stat-card .label { font-size: 11px; color: #666; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
    .section { background: #fff; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); border: 1px solid #eee; }
    .section-title { font-size: 16px; color: #1976d2; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e3f2fd; display: flex; align-items: center; gap: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th { background: linear-gradient(135deg, #f5f5f5, #eeeeee); padding: 10px 12px; text-align: left; font-weight: 600; color: #444; border-bottom: 2px solid #ddd; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; }
    tr:hover { background: #fafafa; }
    .center { text-align: center; }
    .progress-bar { height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; min-width: 100px; }
    .progress-fill { height: 100%; border-radius: 4px; }
    .progress-fill.green { background: linear-gradient(90deg, #4caf50, #81c784); }
    .progress-fill.blue { background: linear-gradient(90deg, #1976d2, #64b5f6); }
    .progress-fill.pink { background: linear-gradient(90deg, #e91e63, #f48fb1); }
    .progress-fill.gray { background: linear-gradient(90deg, #9e9e9e, #bdbdbd); }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; }
    .badge.success { background: #e8f5e9; color: #2e7d32; }
    .badge.warning { background: #fff3e0; color: #ef6c00; }
    .badge.error { background: #ffebee; color: #c62828; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #eee; }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { color: #666; }
    .summary-value { font-weight: 600; color: #333; }
    .footer { text-align: center; padding: 15px; color: #999; font-size: 9px; margin-top: 20px; border-top: 1px solid #eee; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 ${title}</h1>
    <div class="subtitle">${subtitle}</div>
    <div class="scope">${reportScope}</div>
  </div>
  <div class="stats-grid">
    <div class="stat-card primary"><div class="icon">👥</div><div class="value">${totalMembers.toLocaleString()}</div><div class="label">Total Members</div></div>
    <div class="stat-card success"><div class="icon">✅</div><div class="value">${activeMembers.toLocaleString()}</div><div class="label">Active (${activePercentage}%)</div></div>
    <div class="stat-card warning"><div class="icon">📅</div><div class="value">${totalMeetings.toLocaleString()}</div><div class="label">Total Meetings</div></div>
    <div class="stat-card purple"><div class="icon">👑</div><div class="value">${totalPositions.toLocaleString()}</div><div class="label">Leadership Positions</div></div>
  </div>
  <div class="two-col">
    <div class="section">
      <div class="section-title">👥 Membership Summary</div>
      <div class="summary-row"><span class="summary-label">Total Members</span><span class="summary-value">${totalMembers.toLocaleString()}</span></div>
      <div class="summary-row"><span class="summary-label">Active Members</span><span class="summary-value">${activeMembers.toLocaleString()} <span class="badge success">${activePercentage}%</span></span></div>
      <div class="summary-row"><span class="summary-label">Inactive/Expired</span><span class="summary-value">${inactiveMembers.toLocaleString()} <span class="badge warning">${inactivePercentage}%</span></span></div>
      <div class="summary-row"><span class="summary-label">Pending</span><span class="summary-value">${pendingMembers.toLocaleString()}</span></div>
    </div>
    <div class="section">
      <div class="section-title">👑 Leadership Summary</div>
      <div class="summary-row"><span class="summary-label">Total Positions</span><span class="summary-value">${totalPositions.toLocaleString()}</span></div>
      <div class="summary-row"><span class="summary-label">Filled Positions</span><span class="summary-value">${filledPositions.toLocaleString()} <span class="badge success">${filledPercentage}%</span></span></div>
      <div class="summary-row"><span class="summary-label">Vacant Positions</span><span class="summary-value">${vacantPositions.toLocaleString()} <span class="badge error">${(100 - parseFloat(filledPercentage)).toFixed(1)}%</span></span></div>
    </div>
  </div>
  <div class="two-col">
    <div class="section">
      <div class="section-title">👫 Gender Distribution</div>
      <table><thead><tr><th>Gender</th><th class="center">Count</th><th class="center">%</th><th>Distribution</th></tr></thead><tbody>${genderHTML}</tbody></table>
    </div>
    <div class="section">
      <div class="section-title">📊 Age Distribution</div>
      <table><thead><tr><th>Age Group</th><th class="center">Count</th><th class="center">%</th><th>Distribution</th></tr></thead><tbody>${ageHTML}</tbody></table>
    </div>
  </div>
  <div class="two-col">
    <div class="section">
      <div class="section-title">🏆 Best Performing Wards</div>
      <table><thead><tr><th class="center">#</th><th>Ward</th><th class="center">Members</th><th class="center">Compliance</th></tr></thead><tbody>${bestWardsHTML}</tbody></table>
    </div>
    <div class="section">
      <div class="section-title">⚠️ Wards Needing Attention</div>
      <table><thead><tr><th class="center">#</th><th>Ward</th><th class="center">Members</th><th class="center">Compliance</th></tr></thead><tbody>${worstWardsHTML}</tbody></table>
    </div>
  </div>
  <div class="footer">EFF Membership Portal • Report Generated: ${new Date().toLocaleString()} • ${reportScope} • Confidential</div>
</body>
</html>`;
  }
}

