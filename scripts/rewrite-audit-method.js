const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'backend', 'src', 'services', 'excelReportService.ts');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// We want to replace lines 217-672 (1-based) with new content
// That's index 216-671 (0-based)
const before = lines.slice(0, 216); // lines 1-216
const after = lines.slice(672);      // lines 673+

const newMethodBody = `      // ===== DATA QUERY =====
      const muniQuery = \`
        SELECT
          COALESCE(p.province_name, parent_p.province_name) as province_name,
          COALESCE(d.district_name, parent_d.district_name) as district_name,
          COALESCE(d.district_code, parent_d.district_code) as district_code,
          mu.municipality_code,
          COALESCE(mu.municipality_name, d.district_name) as municipality_name,
          mu.municipality_type,
          COUNT(DISTINCT w.ward_code) as ward_count,
          COUNT(DISTINCT CASE WHEN wd.delegate_id IS NOT NULL AND wd.delegate_status = 'Active' THEN w.ward_code END) as convened,
          COUNT(DISTINCT w.ward_code) - COUNT(DISTINCT CASE WHEN wd.delegate_id IS NOT NULL AND wd.delegate_status = 'Active' THEN w.ward_code END) as not_convened,
          COUNT(DISTINCT CASE WHEN wma.ward_standing IN ('Good Standing', 'Excellent Standing') THEN w.ward_code END) as passed,
          COUNT(DISTINCT CASE WHEN wma.ward_standing IN ('Poor Standing', 'Critical Standing', 'Fair Standing') THEN w.ward_code END) as failed
        FROM wards w
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN municipalities parent_mu ON mu.parent_municipality_id = parent_mu.municipality_id
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN districts parent_d ON parent_mu.district_code = parent_d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN provinces parent_p ON parent_d.province_code = parent_p.province_code
        LEFT JOIN ward_delegates wd ON w.ward_code = wd.ward_code
        LEFT JOIN vw_ward_membership_audit wma ON w.ward_code = wma.ward_code
        WHERE COALESCE(mu.municipality_type, 'Local') != 'Metropolitan'
        \${province_code ? 'AND COALESCE(p.province_code, parent_p.province_code) = $1' : ''}
        GROUP BY COALESCE(p.province_name, parent_p.province_name),
                 COALESCE(d.district_name, parent_d.district_name),
                 COALESCE(d.district_code, parent_d.district_code),
                 mu.municipality_code, mu.municipality_name, mu.municipality_type, d.district_name
        ORDER BY COALESCE(p.province_name, parent_p.province_name),
                 COALESCE(d.district_name, parent_d.district_name),
                 COALESCE(mu.municipality_name, d.district_name)
      \`;

      const muniParams = province_code ? [province_code] : [];
      const muniDataRaw = await executeQuery(muniQuery, muniParams);

      // Build lookup: municipality_code -> raw data row
      const muniLookup = new Map<string, any>();
      muniDataRaw.forEach((row: any) => {
        if (row.municipality_code) muniLookup.set(row.municipality_code, row);
      });

      // Process combinations and build grouped structure
      const processedComboCodes = new Set<string>();
      const grouped: Record<string, Record<string, { districtCode: string; rows: any[] }>> = {};
      const combinedRows: Array<{ targetProvince: string; targetDistrict: string; targetDistrictCode: string; row: any }> = [];

      for (const combo of MUNICIPALITY_COMBINATIONS) {
        const parts: Array<{ code: string; data: any }> = [];
        for (const code of combo.codes) {
          const data = muniLookup.get(code);
          if (data) parts.push({ code, data });
        }
        if (parts.length === 0) continue;
        combo.codes.forEach(code => processedComboCodes.add(code));

        let targetDistrictCode = combo.targetDistrict || parts[0].data.district_code;
        let targetDistrictName = parts[0].data.district_name;
        let targetProvince = parts[0].data.province_name;
        if (combo.targetDistrict) {
          const mp = parts.find(p => p.data.district_code === combo.targetDistrict);
          if (mp) { targetDistrictName = mp.data.district_name; targetProvince = mp.data.province_name; }
        }

        const wardParts: number[] = [];
        let totalPassed = 0, totalFailed = 0;
        parts.forEach(p => {
          wardParts.push(Number(p.data.ward_count) || 0);
          totalPassed += Number(p.data.passed) || 0;
          totalFailed += Number(p.data.failed) || 0;
        });
        const totalWards = wardParts.reduce((a, b) => a + b, 0);

        combinedRows.push({
          targetProvince: targetProvince || 'Unknown Province',
          targetDistrict: targetDistrictName || 'Unknown District',
          targetDistrictCode: targetDistrictCode || '',
          row: {
            label: combo.label,
            wardParts,
            wardTotal: totalWards,
            passed: totalPassed,
            failed: totalFailed,
            _isCombined: true,
          }
        });
      }

      // Process regular (non-combined) municipalities
      muniDataRaw.forEach((row: any) => {
        const code = row.municipality_code;
        if (!code || processedComboCodes.has(code)) return;
        const pn = row.province_name || 'Unknown Province';
        const dn = row.district_name || 'Unknown District';
        const dc = row.district_code || '';
        if (!grouped[pn]) grouped[pn] = {};
        if (!grouped[pn][dn]) grouped[pn][dn] = { districtCode: dc, rows: [] };
        grouped[pn][dn].rows.push({
          label: row.municipality_name || dn,
          wardTotal: Number(row.ward_count) || 0,
          passed: Number(row.passed) || 0,
          failed: Number(row.failed) || 0,
          _isCombined: false,
        });
      });

      // Insert combined rows into grouped structure
      combinedRows.forEach(cr => {
        if (!grouped[cr.targetProvince]) grouped[cr.targetProvince] = {};
        if (!grouped[cr.targetProvince][cr.targetDistrict]) {
          grouped[cr.targetProvince][cr.targetDistrict] = { districtCode: cr.targetDistrictCode, rows: [] };
        }
        grouped[cr.targetProvince][cr.targetDistrict].rows.push(cr.row);
      });`;

const newContent = [...before, newMethodBody, ...after].join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Phase 1 done - replaced lines 217-672 with data query + grouping logic');
console.log('New file has', newContent.split('\n').length, 'lines');

