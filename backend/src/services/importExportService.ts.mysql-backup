import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError, ValidationError } from '../middleware/errorHandler';
import { logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';

export interface ImportResult {
  total_records: number;
  successful_imports: number;
  failed_imports: number;
  errors: ImportError[];
  import_id: string;
}

export interface ImportError {
  row: number;
  field: string;
  value: any;
  error: string;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  include_headers: boolean;
  date_format?: string;
  filters?: any;
}

export interface ImportOptions {
  skip_duplicates: boolean;
  update_existing: boolean;
  validate_references: boolean;
  batch_size: number;
}

export class ImportExportService {
  private static readonly SUPPORTED_FORMATS = ['csv', 'xlsx', 'xls', 'json'];
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly DEFAULT_BATCH_SIZE = 1000;

  // Member Import/Export
  static async importMembers(
    filePath: string,
    userId: number,
    options: ImportOptions = {
      skip_duplicates: true,
      update_existing: false,
      validate_references: true,
      batch_size: this.DEFAULT_BATCH_SIZE
    }
  ): Promise<ImportResult> {
    try {
      const importId = this.generateImportId();
      const data = await this.readFile(filePath);
      
      if (!data || data.length === 0) {
        throw new ValidationError('No data found in file');
      }

      const result: ImportResult = {
        total_records: data.length,
        successful_imports: 0,
        failed_imports: 0,
        errors: [],
        import_id: importId
      };

      // Log import start
      await executeQuery(`
        INSERT INTO import_export_logs (import_id, user_id, operation_type, entity_type, total_records, status, created_at)
        VALUES (?, ?, 'import', 'members', ?, 'processing', NOW())
      `, [importId, userId, data.length]);

      // Process in batches
      for (let i = 0; i < data.length; i += options.batch_size) {
        const batch = data.slice(i, i + options.batch_size);
        await this.processMemberBatch(batch, i, result, options, userId);
      }

      // Update import log
      await executeQuery(`
        UPDATE import_export_logs 
        SET successful_records = ?, failed_records = ?, status = 'completed', completed_at = NOW()
        WHERE import_id = ?
      `, [result.successful_imports, result.failed_imports, importId]);

      return result;
    } catch (error) {
      throw createDatabaseError('Failed to import members', error);
    }
  }

  static async exportMembers(
    userId: number,
    options: ExportOptions,
    filters: any = {}
  ): Promise<string> {
    try {
      const exportId = this.generateImportId();
      
      // Build query with filters
      let query = `
        SELECT 
          m.member_id,
          m.firstname,
          m.surname,
          m.email,
          m.phone,
          m.date_of_birth,
          m.gender,
          m.id_number,
          m.address,
          m.city,
          m.province,
          m.postal_code,
          m.hierarchy_level,
          m.entity_id,
          m.membership_type,
          m.membership_status,
          m.join_date,
          m.expiry_date,
          m.created_at,
          m.updated_at
        FROM members m
        WHERE 1=1
      `;

      const queryParams: any[] = [];

      // Apply filters
      if (filters.hierarchy_level) {
        query += ' AND m.hierarchy_level = ?';
        queryParams.push(filters.hierarchy_level);
      }

      if (filters.entity_id) {
        query += ' AND m.entity_id = ?';
        queryParams.push(filters.entity_id);
      }

      if (filters.membership_status) {
        query += ' AND m.membership_status = ?';
        queryParams.push(filters.membership_status);
      }

      if (filters.date_from) {
        query += ' AND m.created_at >= ?';
        queryParams.push(filters.date_from);
      }

      if (filters.date_to) {
        query += ' AND m.created_at <= ?';
        queryParams.push(filters.date_to);
      }

      query += ' ORDER BY m.created_at DESC';

      const members = await executeQuery(query, queryParams);

      // Log export start
      await executeQuery(`
        INSERT INTO import_export_logs (import_id, user_id, operation_type, entity_type, total_records, status, created_at)
        VALUES (?, ?, 'export', 'members', ?, 'processing', NOW())
      `, [exportId, userId, members.length]);

      // Generate file
      const fileName = `members_export_${exportId}.${options.format === 'excel' ? 'xlsx' : options.format}`;
      const filePath = path.join(process.cwd(), 'exports', fileName);

      // Ensure exports directory exists
      const exportsDir = path.dirname(filePath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      await this.writeFile(filePath, members, options);

      // Update export log
      await executeQuery(`
        UPDATE import_export_logs 
        SET file_path = ?, status = 'completed', completed_at = NOW()
        WHERE import_id = ?
      `, [filePath, exportId]);

      return filePath;
    } catch (error) {
      throw createDatabaseError('Failed to export members', error);
    }
  }

  // Meeting Import/Export
  static async importMeetings(
    filePath: string,
    userId: number,
    options: ImportOptions = {
      skip_duplicates: true,
      update_existing: false,
      validate_references: true,
      batch_size: this.DEFAULT_BATCH_SIZE
    }
  ): Promise<ImportResult> {
    try {
      const importId = this.generateImportId();
      const data = await this.readFile(filePath);
      
      const result: ImportResult = {
        total_records: data.length,
        successful_imports: 0,
        failed_imports: 0,
        errors: [],
        import_id: importId
      };

      // Process meetings
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          await this.validateMeetingData(row, i + 1, result);
          
          if (result.errors.length === 0 || !options.skip_duplicates) {
            await this.insertMeeting(row, userId);
            result.successful_imports++;
          }
        } catch (error) {
          result.failed_imports++;
          result.errors.push({
            row: i + 1,
            field: 'general',
            value: row,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return result;
    } catch (error) {
      throw createDatabaseError('Failed to import meetings', error);
    }
  }

  static async exportMeetings(
    userId: number,
    options: ExportOptions,
    filters: any = {}
  ): Promise<string> {
    try {
      const exportId = this.generateImportId();
      
      let query = `
        SELECT 
          m.id,
          m.title,
          m.description,
          mt.name as meeting_type,
          m.hierarchy_level,
          m.entity_id,
          m.scheduled_date,
          m.duration_minutes,
          m.location,
          m.virtual_link,
          m.status,
          CONCAT(u.firstname, ' ', u.surname) as created_by_name,
          m.created_at
        FROM meetings m
        LEFT JOIN meeting_types mt ON m.meeting_type_id = mt.id
        LEFT JOIN users u ON m.created_by = u.id
        WHERE 1=1
      `;

      const queryParams: any[] = [];

      // Apply filters
      if (filters.hierarchy_level) {
        query += ' AND m.hierarchy_level = ?';
        queryParams.push(filters.hierarchy_level);
      }

      if (filters.status) {
        query += ' AND m.status = ?';
        queryParams.push(filters.status);
      }

      if (filters.date_from) {
        query += ' AND m.scheduled_date >= ?';
        queryParams.push(filters.date_from);
      }

      if (filters.date_to) {
        query += ' AND m.scheduled_date <= ?';
        queryParams.push(filters.date_to);
      }

      query += ' ORDER BY m.scheduled_date DESC';

      const meetings = await executeQuery(query, queryParams);

      const fileName = `meetings_export_${exportId}.${options.format === 'excel' ? 'xlsx' : options.format}`;
      const filePath = path.join(process.cwd(), 'exports', fileName);

      await this.writeFile(filePath, meetings, options);

      return filePath;
    } catch (error) {
      throw createDatabaseError('Failed to export meetings', error);
    }
  }

  // Leadership Import/Export
  static async exportLeadership(
    userId: number,
    options: ExportOptions,
    filters: any = {}
  ): Promise<string> {
    try {
      const exportId = this.generateImportId();
      
      let query = `
        SELECT 
          la.id,
          lp.title as position,
          CONCAT(m.firstname, ' ', m.surname) as member_name,
          m.member_id,
          la.hierarchy_level,
          la.entity_id,
          la.appointment_type,
          la.start_date,
          la.end_date,
          la.status,
          CONCAT(appointed_by.firstname, ' ', appointed_by.surname) as appointed_by_name,
          la.created_at
        FROM leadership_appointments la
        LEFT JOIN leadership_positions lp ON la.position_id = lp.id
        LEFT JOIN members m ON la.member_id = m.id
        LEFT JOIN users appointed_by ON la.appointed_by = appointed_by.id
        WHERE 1=1
      `;

      const queryParams: any[] = [];

      if (filters.hierarchy_level) {
        query += ' AND la.hierarchy_level = ?';
        queryParams.push(filters.hierarchy_level);
      }

      if (filters.status) {
        query += ' AND la.status = ?';
        queryParams.push(filters.status);
      }

      query += ' ORDER BY la.created_at DESC';

      const leadership = await executeQuery(query, queryParams);

      const fileName = `leadership_export_${exportId}.${options.format === 'excel' ? 'xlsx' : options.format}`;
      const filePath = path.join(process.cwd(), 'exports', fileName);

      await this.writeFile(filePath, leadership, options);

      return filePath;
    } catch (error) {
      throw createDatabaseError('Failed to export leadership data', error);
    }
  }

  // Analytics Export
  static async exportAnalytics(
    userId: number,
    reportType: string,
    options: ExportOptions,
    filters: any = {}
  ): Promise<string> {
    try {
      const exportId = this.generateImportId();
      let data: any[] = [];

      switch (reportType) {
        case 'membership_summary':
          data = await this.getMembershipSummaryData(filters);
          break;
        case 'meeting_attendance':
          data = await this.getMeetingAttendanceData(filters);
          break;
        case 'leadership_tenure':
          data = await this.getLeadershipTenureData(filters);
          break;
        case 'election_results':
          data = await this.getElectionResultsData(filters);
          break;
        default:
          throw new ValidationError('Invalid report type');
      }

      const fileName = `${reportType}_${exportId}.${options.format === 'excel' ? 'xlsx' : options.format}`;
      const filePath = path.join(process.cwd(), 'exports', fileName);

      await this.writeFile(filePath, data, options);

      return filePath;
    } catch (error) {
      throw createDatabaseError('Failed to export analytics', error);
    }
  }

  // Helper Methods
  private static async readFile(filePath: string): Promise<any[]> {
    const ext = path.extname(filePath).toLowerCase();
    
    if (!this.SUPPORTED_FORMATS.includes(ext.substring(1))) {
      throw new ValidationError(`Unsupported file format: ${ext}`);
    }

    const stats = fs.statSync(filePath);
    if (stats.size > this.MAX_FILE_SIZE) {
      throw new ValidationError('File size exceeds maximum limit');
    }

    if (ext === '.json') {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } else {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet);
    }
  }

  static async writeFile(filePath: string, data: any[], options: ExportOptions): Promise<void> {
    if (options.format === 'json') {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } else if (options.format === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      fs.writeFileSync(filePath, csv);
    } else if (options.format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
      XLSX.writeFile(workbook, filePath);
    }
  }

  private static async processMemberBatch(
    batch: any[],
    startIndex: number,
    result: ImportResult,
    options: ImportOptions,
    userId: number
  ): Promise<void> {
    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const rowIndex = startIndex + i + 1;

      try {
        await this.validateMemberData(row, rowIndex, result);
        
        if (result.errors.length === 0 || !options.skip_duplicates) {
          await this.insertMember(row, userId);
          result.successful_imports++;
        }
      } catch (error) {
        result.failed_imports++;
        result.errors.push({
          row: rowIndex,
          field: 'general',
          value: row,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private static async validateMemberData(row: any, rowIndex: number, result: ImportResult): Promise<void> {
    // Required fields validation
    const requiredFields = ['firstname', 'surname', 'email', 'phone'];
    
    for (const field of requiredFields) {
      if (!row[field] || row[field].toString().trim() === '') {
        result.errors.push({
          row: rowIndex,
          field,
          value: row[field],
          error: `${field} is required`
        });
      }
    }

    // Email validation
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      result.errors.push({
        row: rowIndex,
        field: 'email',
        value: row.email,
        error: 'Invalid email format'
      });
    }

    // Check for duplicate email
    if (row.email) {
      const existing = await executeQuerySingle('SELECT id FROM members WHERE email = ?', [row.email]);
      if (existing) {
        result.errors.push({
          row: rowIndex,
          field: 'email',
          value: row.email,
          error: 'Email already exists'
        });
      }
    }
  }

  private static async insertMember(row: any, userId: number): Promise<void> {
    const memberId = await this.generateMemberId();
    
    await executeQuery(`
      INSERT INTO members (
        member_id, firstname, surname, email, phone, date_of_birth, gender,
        id_number, address, city, province, postal_code, hierarchy_level,
        entity_id, membership_type, membership_status, join_date, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', NOW(), ?, NOW())
    `, [
      memberId, row.firstname, row.surname, row.email, row.phone,
      row.date_of_birth, row.gender, row.id_number, row.address,
      row.city, row.province, row.postal_code, row.hierarchy_level || 'Ward',
      row.entity_id || 1, row.membership_type || 'Regular', userId
    ]);
  }

  private static async validateMeetingData(row: any, rowIndex: number, result: ImportResult): Promise<void> {
    const requiredFields = ['title', 'scheduled_date', 'hierarchy_level'];
    
    for (const field of requiredFields) {
      if (!row[field]) {
        result.errors.push({
          row: rowIndex,
          field,
          value: row[field],
          error: `${field} is required`
        });
      }
    }
  }

  private static async insertMeeting(row: any, userId: number): Promise<void> {
    await executeQuery(`
      INSERT INTO meetings (
        title, description, meeting_type_id, hierarchy_level, entity_id,
        scheduled_date, duration_minutes, location, virtual_link, status, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, NOW())
    `, [
      row.title, row.description, row.meeting_type_id || 1, row.hierarchy_level,
      row.entity_id || 1, row.scheduled_date, row.duration_minutes || 60,
      row.location, row.virtual_link, userId
    ]);
  }

  private static generateImportId(): string {
    return `IMP_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  private static async generateMemberId(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await executeQuerySingle(
      'SELECT COUNT(*) as count FROM members WHERE member_id LIKE ?',
      [`${year}%`]
    );
    const sequence = (count?.count || 0) + 1;
    return `${year}${sequence.toString().padStart(6, '0')}`;
  }

  // Analytics data methods
  private static async getMembershipSummaryData(filters: any): Promise<any[]> {
    return await executeQuery(`
      SELECT
        hierarchy_level,
        membership_status,
        COUNT(*) as count,
        AVG(DATEDIFF(NOW(), join_date)) as avg_tenure_days
      FROM members
      WHERE 1=1
      GROUP BY hierarchy_level, membership_status
      ORDER BY hierarchy_level, membership_status
    `);
  }

  private static async getMeetingAttendanceData(filters: any): Promise<any[]> {
    return await executeQuery(`
      SELECT
        m.title,
        m.scheduled_date,
        COUNT(ma.member_id) as attendees,
        AVG(CASE WHEN ma.attended = 1 THEN 1 ELSE 0 END) * 100 as attendance_rate
      FROM meetings m
      LEFT JOIN meeting_attendance ma ON m.id = ma.meeting_id
      GROUP BY m.id, m.title, m.scheduled_date
      ORDER BY m.scheduled_date DESC
    `);
  }

  private static async getLeadershipTenureData(filters: any): Promise<any[]> {
    return await executeQuery(`
      SELECT
        lp.title as position,
        CONCAT(m.firstname, ' ', m.surname) as member_name,
        la.start_date,
        la.end_date,
        DATEDIFF(COALESCE(la.end_date, NOW()), la.start_date) as tenure_days,
        la.status
      FROM leadership_appointments la
      JOIN leadership_positions lp ON la.position_id = lp.id
      JOIN members m ON la.member_id = m.id
      ORDER BY la.start_date DESC
    `);
  }

  private static async getElectionResultsData(filters: any): Promise<any[]> {
    return await executeQuery(`
      SELECT
        e.title as election_title,
        lp.title as position,
        CONCAT(m.firstname, ' ', m.surname) as candidate_name,
        COUNT(ev.id) as votes_received,
        CASE WHEN ec.is_winner = 1 THEN 'Winner' ELSE 'Candidate' END as result
      FROM elections e
      JOIN leadership_positions lp ON e.position_id = lp.id
      JOIN election_candidates ec ON e.id = ec.election_id
      JOIN members m ON ec.member_id = m.id
      LEFT JOIN election_votes ev ON ec.id = ev.candidate_id
      GROUP BY e.id, ec.id
      ORDER BY e.created_at DESC, votes_received DESC
    `);
  }

  // Template generation
  static async generateImportTemplate(entityType: string, format: 'csv' | 'excel' = 'excel'): Promise<string> {
    const templates: { [key: string]: any[] } = {
      members: [
        {
          firstname: 'John',
          surname: 'Doe',
          email: 'john.doe@example.com',
          phone: '+27123456789',
          date_of_birth: '1990-01-01',
          gender: 'Male',
          id_number: '9001010000000',
          address: '123 Main Street',
          city: 'Cape Town',
          province: 'Western Cape',
          postal_code: '8000',
          hierarchy_level: 'Ward',
          entity_id: 1,
          membership_type: 'Regular'
        }
      ],
      meetings: [
        {
          title: 'Monthly General Meeting',
          description: 'Regular monthly meeting for all members',
          meeting_type_id: 1,
          hierarchy_level: 'Ward',
          entity_id: 1,
          scheduled_date: '2024-01-15 14:00:00',
          duration_minutes: 120,
          location: 'Community Hall',
          virtual_link: 'https://zoom.us/j/123456789'
        }
      ]
    };

    const templateData = templates[entityType];
    if (!templateData) {
      throw new ValidationError('Invalid entity type for template');
    }

    const fileName = `${entityType}_import_template.${format === 'excel' ? 'xlsx' : 'csv'}`;
    const filePath = path.join(process.cwd(), 'templates', fileName);

    // Ensure templates directory exists
    const templatesDir = path.dirname(filePath);
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    const options: ExportOptions = {
      format: format === 'excel' ? 'excel' : 'csv',
      include_headers: true
    };

    await this.writeFile(filePath, templateData, options);

    return filePath;
  }
}
