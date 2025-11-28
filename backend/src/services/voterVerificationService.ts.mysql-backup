import axios, { AxiosResponse } from 'axios';
import * as XLSX from 'xlsx';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import { config } from '../config/config';
import { iecElectoralEventsService, ElectoralEvent } from './iecElectoralEventsService';

export interface VoterData {
  id: string;
  bRegistered: boolean;
  ward_id?: number;
  province?: string;
  municipality?: string;
  voting_station?: string;
  vd_number?: string;
  suburb?: string;
  street?: string;
  electoral_event_context?: {
    event_id: number;
    event_type_id: number;
    event_description: string;
    election_year: number | null;
  };
}

export interface ProcessingResult {
  success: boolean;
  statistics: {
    total_members: number;
    registered_voters: number;
    not_registered: number;
    deceased: number;
    not_in_ward: number;
    registered_in_ward: number;
    processing_time: number;
    voting_station_counts: Record<string, number>;
  };
  output_files: string[];
  error?: string;
  electoral_event_context?: {
    event_id: number;
    event_type_id: number;
    event_description: string;
    election_year: number | null;
    is_municipal_election: boolean;
  };
}

export interface VoterRecord {
  NAME: string;
  WARD_NUMBER: string;
  ID_NUMBER: string;
  CELL_NUMBER: string;
  REGISTERED_VD: string;
  VD_NUMBER: string;
  SIGNATURE: string;
  NEW_CELL_NUM: string;
  PROVINCE: string;
  MUNICIPALITY: string;
}

interface ColumnMapping {
  firstnameIndex: number;
  surnameIndex: number;
  wardNumberIndex: number;
  idNumberIndex: number;
  cellNumberIndex: number;
}

export interface VoterCategory {
  RegisteredInWard: VoterRecord[];
  NotRegisteredInWard: VoterRecord[];
  NotRegisteredVoter: VoterRecord[];
  Deceased: VoterRecord[];
}

export class VoterVerificationService {
  private static readonly API_BASE_URL = 'https://api.elections.org.za/';
  private static accessToken: string | null = null;
  private static tokenExpiry: Date | null = null;
  private static currentElectoralEvent: ElectoralEvent | null = null;

  static async getAccessToken(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const response = await axios.post(`${this.API_BASE_URL}token`,
          new URLSearchParams({
            grant_type: 'password',
            username: config.iec.username,
            password: config.iec.password
          }), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: config.iec.timeout
          }
        );

        if (response.data.access_token) {
          this.accessToken = response.data.access_token;
          // Set expiry to 50 minutes (tokens usually last 1 hour)
          this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000);
          console.log('✅ IEC API access token obtained');
          return this.accessToken as string;
        }
      } catch (error) {
        retryCount++;
        console.error(`❌ Failed to get access token (attempt ${retryCount}):`, error);
        
        if (retryCount < maxRetries) {
          await this.delay(2000 * retryCount); // Exponential backoff
        }
      }
    }

    throw new Error('Failed to obtain IEC API access token after multiple attempts');
  }

  /**
   * Get current municipal electoral event context
   */
  static async getCurrentElectoralEventContext(): Promise<ElectoralEvent | null> {
    try {
      if (!this.currentElectoralEvent) {
        this.currentElectoralEvent = await iecElectoralEventsService.getCurrentMunicipalElection();
      }
      return this.currentElectoralEvent;
    } catch (error) {
      console.error('❌ Error fetching current electoral event context:', error);
      return null;
    }
  }

  /**
   * Refresh electoral event context (call when needed to update)
   */
  static async refreshElectoralEventContext(): Promise<ElectoralEvent | null> {
    try {
      this.currentElectoralEvent = await iecElectoralEventsService.getCurrentMunicipalElection();
      return this.currentElectoralEvent;
    } catch (error) {
      console.error('❌ Error refreshing electoral event context:', error);
      return null;
    }
  }

  /**
   * Fetch voter data with specific electoral event context
   */
  static async fetchVoterDataWithElectoralEvent(
    idNumber: string,
    electoralEventId?: number
  ): Promise<VoterData | null> {
    try {
      const accessToken = await this.getAccessToken();
      let url = `${this.API_BASE_URL}api/Voters/IDNumber/${idNumber}`;

      // Add electoral event ID to the request if provided
      if (electoralEventId) {
        url += `?ElectoralEventID=${electoralEventId}`;
      }

      const response: AxiosResponse = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `bearer ${accessToken}`
        },
        timeout: config.iec.timeout
      });

      if (response.status === 200 && response.data) {
        // Get electoral event context (either specific or current)
        let electoralEvent: ElectoralEvent | null = null;
        if (electoralEventId) {
          // Try to get specific electoral event
          const events = await iecElectoralEventsService.getElectoralEventsByType(3); // Municipal elections
          electoralEvent = events.find(e => e.iec_event_id === electoralEventId) || null;
        } else {
          electoralEvent = await this.getCurrentElectoralEventContext();
        }

        const voterData: VoterData = {
          id: idNumber,
          bRegistered: response.data.bRegistered || false,
          ward_id: response.data.VotingStation?.Delimitation?.WardID || null,
          province: response.data.VotingStation?.Delimitation?.Province || '',
          municipality: response.data.VotingStation?.Delimitation?.Municipality || '',
          voting_station: response.data.VotingStation?.Name || '',
          vd_number: response.data.VotingStation?.Delimitation?.VDNumber || '',
          suburb: response.data.VotingStation?.Location?.Suburb || '',
          street: response.data.VotingStation?.Location?.Street || ''
        };

        // Add electoral event context if available
        if (electoralEvent) {
          voterData.electoral_event_context = {
            event_id: electoralEvent.iec_event_id,
            event_type_id: electoralEvent.iec_event_type_id,
            event_description: electoralEvent.description,
            election_year: electoralEvent.election_year
          };
        }

        return voterData;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error fetching voter data for ID ${idNumber} with electoral event ${electoralEventId}:`, error);
      return null;
    }
  }

  static async fetchVoterData(idNumber: string): Promise<VoterData | null> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${this.API_BASE_URL}api/Voters/IDNumber/${idNumber}`;
      
      const response: AxiosResponse = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `bearer ${accessToken}`
        },
        timeout: config.iec.timeout
      });

      if (response.status === 200 && response.data) {
        // Get current electoral event context
        const electoralEvent = await this.getCurrentElectoralEventContext();

        const voterData: VoterData = {
          id: idNumber,
          bRegistered: response.data.bRegistered || false,
          ward_id: response.data.VotingStation?.Delimitation?.WardID || null,
          province: response.data.VotingStation?.Delimitation?.Province || '',
          municipality: response.data.VotingStation?.Delimitation?.Municipality || '',
          voting_station: response.data.VotingStation?.Name || '',
          vd_number: response.data.VotingStation?.Delimitation?.VDNumber || '',
          suburb: response.data.VotingStation?.Location?.Suburb || '',
          street: response.data.VotingStation?.Location?.Street || ''
        };

        // Add electoral event context if available
        if (electoralEvent) {
          voterData.electoral_event_context = {
            event_id: electoralEvent.iec_event_id,
            event_type_id: electoralEvent.iec_event_type_id,
            event_description: electoralEvent.description,
            election_year: electoralEvent.election_year
          };
        }

        return voterData;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error fetching voter data for ID ${idNumber}:`, error);
      return null;
    }
  }

  static async processExcelFile(
    filePath: string,
    wardNumber: number,
    progressCallback?: (progress: number, message: string) => void
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      progressCallback?.(0, 'Starting file processing...');

      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Check if file is already processed (avoid infinite loops)
      const fileName = path.basename(filePath);
      if (fileName.includes('_processed')) {
        throw new Error(`File appears to be already processed: ${fileName}`);
      }

      progressCallback?.(10, 'Reading Excel file...');

      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (data.length <= 1) {
        throw new Error('Excel file contains no data rows');
      }

      progressCallback?.(15, 'Mapping column headers...');

      // Get column headers and create mapping
      const headers = data[0] as string[];
      const columnMapping = this.createColumnMapping(headers);

      console.log('📊 Column mapping:', columnMapping);

      progressCallback?.(20, 'Extracting ID numbers...');

      // Extract ID numbers using proper column mapping
      const idNumbers: string[] = [];
      for (let i = 1; i < data.length; i++) { // Skip header row
        const idNumber = data[i][columnMapping.idNumberIndex];
        if (idNumber) {
          // Ensure 13-digit format with leading zeros
          const formattedId = String(idNumber).padStart(13, '0');
          idNumbers.push(formattedId);
        }
      }

      if (idNumbers.length === 0) {
        throw new Error('No valid ID numbers found in Excel file');
      }

      progressCallback?.(30, `Processing ${idNumbers.length} ID numbers...`);

      // Process voter data with concurrency control
      const results = await this.processVoterDataConcurrently(
        idNumbers,
        wardNumber,
        (processed, total) => {
          const progress = 30 + Math.floor((processed / total) * 50);
          progressCallback?.(progress, `Processed ${processed}/${total} ID numbers...`);
        }
      );

      progressCallback?.(80, 'Generating output files...');

      // Generate output files
      const outputFiles = await this.generateOutputFiles(
        filePath,
        data,
        results,
        wardNumber,
        columnMapping
      );

      progressCallback?.(90, 'Calculating statistics...');

      // Calculate statistics
      const statistics = this.calculateStatistics(results, wardNumber, Date.now() - startTime);

      progressCallback?.(100, 'Processing completed successfully');

      // Get current electoral event context
      const electoralEvent = await this.getCurrentElectoralEventContext();

      // Clean up: Remove the original file after successful processing
      try {
        await fsPromises.unlink(filePath);
        console.log(`🗑️ Original file removed: ${filePath}`);
      } catch (cleanupError) {
        const errorMessage = cleanupError instanceof Error ? cleanupError.message : 'Unknown error';
        console.warn(`⚠️ Failed to remove original file: ${errorMessage}`);
        // Don't fail the entire process if cleanup fails
      }

      const result: ProcessingResult = {
        success: true,
        statistics,
        output_files: outputFiles
      };

      // Add electoral event context if available
      if (electoralEvent) {
        result.electoral_event_context = {
          event_id: electoralEvent.iec_event_id,
          event_type_id: electoralEvent.iec_event_type_id,
          event_description: electoralEvent.description,
          election_year: electoralEvent.election_year,
          is_municipal_election: true // Since we're getting municipal elections
        };
      }

      return result;

    } catch (error) {
      console.error('❌ Excel processing failed:', error);
      return {
        success: false,
        statistics: {
          total_members: 0,
          registered_voters: 0,
          not_registered: 0,
          deceased: 0,
          not_in_ward: 0,
          registered_in_ward: 0,
          processing_time: Date.now() - startTime,
          voting_station_counts: {}
        },
        output_files: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static createColumnMapping(headers: string[]): ColumnMapping {
    // Create mapping for expected column names
    const mapping: ColumnMapping = {
      firstnameIndex: -1,
      surnameIndex: -1,
      wardNumberIndex: -1,
      idNumberIndex: -1,
      cellNumberIndex: -1
    };

    // Find column indices by name (case-insensitive)
    headers.forEach((header, index) => {
      const headerLower = String(header).toLowerCase().trim();

      if (headerLower.includes('firstname') || headerLower.includes('first name')) {
        mapping.firstnameIndex = index;
      } else if (headerLower.includes('surname') || headerLower.includes('last name') || headerLower.includes('lastname')) {
        mapping.surnameIndex = index;
      } else if (headerLower.includes('ward') && headerLower.includes('number')) {
        mapping.wardNumberIndex = index;
      } else if (headerLower.includes('id') && headerLower.includes('number')) {
        mapping.idNumberIndex = index;
      } else if (headerLower.includes('cell') && headerLower.includes('number')) {
        mapping.cellNumberIndex = index;
      }
    });

    // Validate that we found the essential columns
    if (mapping.idNumberIndex === -1) {
      throw new Error('Could not find ID Number column in Excel file. Expected column names: "ID Number", "Firstname", "Surname", "Cell Number"');
    }

    console.log('📊 Column mapping found:', {
      'Firstname': mapping.firstnameIndex >= 0 ? headers[mapping.firstnameIndex] : 'NOT FOUND',
      'Surname': mapping.surnameIndex >= 0 ? headers[mapping.surnameIndex] : 'NOT FOUND',
      'Ward Number': mapping.wardNumberIndex >= 0 ? headers[mapping.wardNumberIndex] : 'NOT FOUND',
      'ID Number': mapping.idNumberIndex >= 0 ? headers[mapping.idNumberIndex] : 'NOT FOUND',
      'Cell Number': mapping.cellNumberIndex >= 0 ? headers[mapping.cellNumberIndex] : 'NOT FOUND'
    });

    return mapping;
  }

  private static async processVoterDataConcurrently(
    idNumbers: string[],
    wardNumber: number,
    progressCallback?: (processed: number, total: number) => void
  ): Promise<Map<string, VoterData | null>> {
    const results = new Map<string, VoterData | null>();
    const concurrency = 10; // Process 10 IDs concurrently
    let processed = 0;

    // Process in batches
    for (let i = 0; i < idNumbers.length; i += concurrency) {
      const batch = idNumbers.slice(i, i + concurrency);
      const promises = batch.map(id => this.fetchVoterData(id));
      
      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((result, index) => {
        const idNumber = batch[index];
        if (result.status === 'fulfilled') {
          results.set(idNumber, result.value);
        } else {
          results.set(idNumber, null);
          console.error(`Failed to process ID ${idNumber}:`, result.reason);
        }
        processed++;
        progressCallback?.(processed, idNumbers.length);
      });

      // Small delay between batches to avoid overwhelming the API
      if (i + concurrency < idNumbers.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  private static async generateOutputFiles(
    originalFilePath: string,
    originalData: any[][],
    voterResults: Map<string, VoterData | null>,
    wardNumber: number,
    columnMapping: ColumnMapping
  ): Promise<string[]> {
    const outputDir = path.join(path.dirname(originalFilePath), 'processed');
    await fsPromises.mkdir(outputDir, { recursive: true });

    const baseName = path.basename(originalFilePath, path.extname(originalFilePath));
    const outputFiles: string[] = [];

    // Create categorized voter records
    const voterCategories = this.categorizeVoters(originalData, voterResults, wardNumber, columnMapping);

    // Generate timestamp for unique file names
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    // Generate Excel file with multiple sheets
    const excelPath = await this.generateExcelFile(outputDir, baseName, voterCategories, originalData, timestamp);
    outputFiles.push(excelPath);

    // Generate PDF report
    const pdfPath = await this.generatePDFReport(voterCategories, wardNumber, outputDir, baseName, timestamp);
    outputFiles.push(pdfPath);

    return outputFiles;
  }

  private static categorizeVoters(
    originalData: any[][],
    voterResults: Map<string, VoterData | null>,
    wardNumber: number,
    columnMapping: ColumnMapping
  ): VoterCategory {
    const categories: VoterCategory = {
      RegisteredInWard: [],
      NotRegisteredInWard: [],
      NotRegisteredVoter: [],
      Deceased: []
    };

    // Process each row (skip header)
    for (let i = 1; i < originalData.length; i++) {
      const row = originalData[i];
      const idNumber = String(row[columnMapping.idNumberIndex] || '').padStart(13, '0');
      const voterData = voterResults.get(idNumber);

      // Extract member data from Excel row using column mapping
      const firstname = columnMapping.firstnameIndex >= 0 ? String(row[columnMapping.firstnameIndex] || '') : '';
      const surname = columnMapping.surnameIndex >= 0 ? String(row[columnMapping.surnameIndex] || '') : '';
      const name = `${firstname} ${surname}`.trim().toUpperCase();
      const cellNumber = columnMapping.cellNumberIndex >= 0 ? String(row[columnMapping.cellNumberIndex] || '').replace('.0', '') : '';

      const voterRecord: VoterRecord = {
        NAME: name || '',
        WARD_NUMBER: String(wardNumber),
        ID_NUMBER: idNumber,
        CELL_NUMBER: cellNumber || '',
        REGISTERED_VD: voterData?.voting_station || '',
        VD_NUMBER: voterData?.vd_number || '',
        SIGNATURE: '',
        NEW_CELL_NUM: '',
        PROVINCE: voterData?.province || '',
        MUNICIPALITY: voterData?.municipality || ''
      };

      // Categorize based on voter data
      if (voterData) {
        if (voterData.voting_station && !voterData.bRegistered) {
          // Has voting station but not registered = Deceased
          categories.Deceased.push(voterRecord);
        } else if (voterData.bRegistered && voterData.ward_id === wardNumber) {
          // Registered in the correct ward
          categories.RegisteredInWard.push(voterRecord);
        } else if (voterData.bRegistered && voterData.ward_id !== wardNumber) {
          // Registered but in different ward
          categories.NotRegisteredInWard.push(voterRecord);
        } else {
          // Not registered
          categories.NotRegisteredVoter.push(voterRecord);
        }
      } else {
        // No data returned from API = Deceased or API error
        categories.Deceased.push(voterRecord);
      }
    }

    // Sort RegisteredInWard and NotRegisteredInWard by voting station
    categories.RegisteredInWard.sort((a, b) =>
      (a.REGISTERED_VD || '').localeCompare(b.REGISTERED_VD || '')
    );
    categories.NotRegisteredInWard.sort((a, b) =>
      (a.REGISTERED_VD || '').localeCompare(b.REGISTERED_VD || '')
    );

    return categories;
  }

  private static async generateExcelFile(
    outputDir: string,
    baseName: string,
    categories: VoterCategory,
    originalData: any[][],
    timestamp?: string
  ): Promise<string> {
    const workbook = XLSX.utils.book_new();

    // Create main sheet with all data and status column
    const mainSheetData = [...originalData];

    // Add status column header
    if (mainSheetData[0]) {
      mainSheetData[0].push('Status', 'Voting Station', 'Province', 'Municipality', 'Address');
    }

    // Add status for each row
    for (let i = 1; i < mainSheetData.length; i++) {
      const row = mainSheetData[i];
      const idNumber = String(row[7] || '').padStart(13, '0');

      // Find which category this ID belongs to
      let status = 'Unknown';
      let votingStation = '';
      let province = '';
      let municipality = '';
      let address = '';

      const allRecords = [
        ...categories.RegisteredInWard.map(r => ({ ...r, status: 'Registered In Ward' })),
        ...categories.NotRegisteredInWard.map(r => ({ ...r, status: 'Not Registered In Ward' })),
        ...categories.NotRegisteredVoter.map(r => ({ ...r, status: 'Not Registered Voter' })),
        ...categories.Deceased.map(r => ({ ...r, status: 'Deceased' }))
      ];

      const record = allRecords.find(r => r.ID_NUMBER === idNumber);
      if (record) {
        status = record.status;
        votingStation = record.REGISTERED_VD;
        province = record.PROVINCE;
        municipality = record.MUNICIPALITY;
        address = `${record.PROVINCE} ${record.MUNICIPALITY}`.trim();
      }

      row.push(status, votingStation, province, municipality, address);
    }

    // Create main worksheet
    const mainWorksheet = XLSX.utils.aoa_to_sheet(mainSheetData);
    XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Main');

    // Create category sheets
    const sheetConfigs = [
      { name: 'RegisteredInWard', data: categories.RegisteredInWard, color: 'green' },
      { name: 'NotRegisteredInWard', data: categories.NotRegisteredInWard, color: 'blue' },
      { name: 'NotRegisteredVoter', data: categories.NotRegisteredVoter, color: 'red' },
      { name: 'Deceased', data: categories.Deceased, color: 'yellow' }
    ];

    sheetConfigs.forEach(({ name, data }) => {
      if (data.length > 0) {
        // Convert VoterRecord objects to array format
        const headers = ['NAME', 'WARD_NUMBER', 'ID_NUMBER', 'CELL_NUMBER', 'REGISTERED_VD', 'VD_NUMBER', 'SIGNATURE', 'NEW_CELL_NUM', 'PROVINCE', 'MUNICIPALITY'];
        const sheetData = [
          headers,
          ...data.map(record => [
            record.NAME,
            record.WARD_NUMBER,
            record.ID_NUMBER,
            record.CELL_NUMBER,
            record.REGISTERED_VD,
            record.VD_NUMBER,
            record.SIGNATURE,
            record.NEW_CELL_NUM,
            record.PROVINCE,
            record.MUNICIPALITY
          ])
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, name);
      }
    });

    // Save Excel file with retry logic for file locking issues
    const fileTimestamp = timestamp || new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const excelPath = path.join(outputDir, `${baseName}_processed_${fileTimestamp}.xlsx`);
    await this.writeExcelFileWithRetry(workbook, excelPath);

    console.log(`📊 Generated Excel file: ${excelPath}`);
    return excelPath;
  }

  private static async generatePDFReport(
    categories: VoterCategory,
    wardNumber: number,
    outputDir: string,
    baseName: string,
    timestamp?: string
  ): Promise<string> {
    const fileTimestamp = timestamp || new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const reportPath = path.join(outputDir, `${baseName}_Attendance_Register_${fileTimestamp}.pdf`);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 36, bottom: 54, left: 36, right: 36 }
        });

        const stream = fs.createWriteStream(reportPath);
        doc.pipe(stream);

        // Get statistics
        const registeredInWard = categories.RegisteredInWard.length;
        const notRegisteredInWard = categories.NotRegisteredInWard.length;
        const notRegistered = categories.NotRegisteredVoter.length;
        const deceased = categories.Deceased.length;
        const total = registeredInWard + notRegisteredInWard + notRegistered + deceased;
        const quorum = Math.floor(total / 2) + 1;

        // Get province and municipality from first registered voter
        const province = categories.RegisteredInWard[0]?.PROVINCE || 'Unknown';
        const municipality = categories.RegisteredInWard[0]?.MUNICIPALITY || 'Unknown';

        // Count unique voting stations
        const votingStations = new Set(
          categories.RegisteredInWard
            .map(voter => voter.REGISTERED_VD)
            .filter(station => station)
        );

        // Header
        doc.fontSize(16).font('Helvetica-Bold')
           .text('FORM A: ATTENDANCE REGISTER', { align: 'center' });

        doc.moveDown(0.5);

        // Draw separator line
        doc.moveTo(36, doc.y)
           .lineTo(doc.page.width - 36, doc.y)
           .stroke();

        doc.moveDown(0.5);

        // Header information in two columns
        const leftX = 36;
        const rightX = doc.page.width - 200;
        const startY = doc.y;

        // Left column
        doc.fontSize(10).font('Helvetica')
           .text(`PROVINCE: ${province}`, leftX, startY)
           .text(`TOTAL MEMBERSHIP IN GOOD STANDING: ${total}`, leftX, startY + 15)
           .text(`QUORUM: ${quorum}`, leftX, startY + 30)
           .text('DATE OF BPA/BGA:', leftX, startY + 45);

        // Right column
        doc.text(`SUB REGION: ${municipality}`, rightX, startY)
           .text(`WARD: ${wardNumber}`, rightX, startY + 15)
           .text('BPA: |_| BGA: |_|', rightX, startY + 30)
           .text(`TOTAL NUMBER OF VOTING STATIONS: ${votingStations.size}`, rightX, startY + 45);

        doc.y = startY + 70;
        doc.moveDown(1);

        // Group voters by voting station
        const votersByStation = this.groupVotersByStation(categories.RegisteredInWard);

        // Table headers
        const headers = ['NUM...', 'NAME', 'WARD NUMBER', 'ID NUMBER', 'CELL NUMBER', 'REGISTERED VD', 'SIGNATURE', 'NEW CELL NUM'];
        const colWidths = [40, 120, 80, 100, 80, 100, 80, 80];
        const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
        const startX = (doc.page.width - tableWidth) / 2;

        let currentY = doc.y;

        // Draw table headers
        doc.fontSize(8).font('Helvetica-Bold');
        let currentX = startX;
        headers.forEach((header, i) => {
          doc.rect(currentX, currentY, colWidths[i], 20)
             .fillAndStroke('#cccccc', '#000000')
             .fillColor('#000000')
             .text(header, currentX + 2, currentY + 6, { width: colWidths[i] - 4 });
          currentX += colWidths[i];
        });

        currentY += 20;
        doc.font('Helvetica');

        // Draw voter data grouped by voting station
        Object.entries(votersByStation).forEach(([station, voters]) => {
          // Check if we need a new page
          if (currentY > doc.page.height - 100) {
            this.addFooterToCurrentPage(doc, municipality, wardNumber);
            doc.addPage();
            currentY = 50;
          }

          // Voting station header
          doc.fontSize(9).font('Helvetica-Bold')
             .fillColor('#000000')
             .rect(startX, currentY, tableWidth, 15)
             .fillAndStroke('#e0e0e0', '#000000')
             .fillColor('#000000')
             .text(`Voting Station: ${station || 'Unknown'}`, startX + 2, currentY + 3);

          currentY += 15;

          // Draw voters for this station
          voters.forEach((voter, index) => {
            if (currentY > doc.page.height - 50) {
              this.addFooterToCurrentPage(doc, municipality, wardNumber);
              doc.addPage();
              currentY = 50;
            }

            doc.fontSize(8).font('Helvetica');
            const rowData = [
              String(index + 1),
              voter.NAME,
              voter.WARD_NUMBER,
              voter.ID_NUMBER,
              voter.CELL_NUMBER,
              voter.REGISTERED_VD,
              '', // Signature
              voter.NEW_CELL_NUM
            ];

            currentX = startX;
            rowData.forEach((data, i) => {
              doc.rect(currentX, currentY, colWidths[i], 15)
                 .stroke('#000000')
                 .fillColor('#000000')
                 .text(String(data), currentX + 2, currentY + 3, {
                   width: colWidths[i] - 4,
                   height: 12,
                   ellipsis: true
                 });
              currentX += colWidths[i];
            });

            currentY += 15;
          });

          // Voter count for this station
          doc.fontSize(8).font('Helvetica-Bold')
             .fillColor('#000000')
             .rect(startX, currentY, tableWidth, 15)
             .fillAndStroke('#ffff99', '#000000')
             .fillColor('#000000')
             .text(`Total Voters in ${station || 'Unknown'}: ${voters.length}`, startX + 2, currentY + 3);

          currentY += 20;
        });

        // Add "Not Registered In Ward" section if there are any
        if (categories.NotRegisteredInWard.length > 0) {
          if (currentY > doc.page.height - 150) {
            this.addFooterToCurrentPage(doc, municipality, wardNumber);
            doc.addPage();
            currentY = 50;
          }

          doc.moveDown(1);
          currentY = doc.y;

          doc.fontSize(12).font('Helvetica-Bold')
             .text('Not Registered In Ward Data', { align: 'center' });

          currentY = doc.y + 10;

          // Draw headers again
          doc.fontSize(8).font('Helvetica-Bold');
          currentX = startX;
          headers.forEach((header, i) => {
            doc.rect(currentX, currentY, colWidths[i], 20)
               .fillAndStroke('#cccccc', '#000000')
               .fillColor('#000000')
               .text(header, currentX + 2, currentY + 6, { width: colWidths[i] - 4 });
            currentX += colWidths[i];
          });

          currentY += 20;

          // Draw not registered in ward voters
          categories.NotRegisteredInWard.forEach((voter, index) => {
            if (currentY > doc.page.height - 50) {
              this.addFooterToCurrentPage(doc, municipality, wardNumber);
              doc.addPage();
              currentY = 50;
            }

            doc.fontSize(8).font('Helvetica');
            const rowData = [
              String(index + 1),
              voter.NAME,
              voter.WARD_NUMBER,
              voter.ID_NUMBER,
              voter.CELL_NUMBER,
              voter.REGISTERED_VD,
              '', // Signature
              voter.NEW_CELL_NUM
            ];

            currentX = startX;
            rowData.forEach((data, i) => {
              doc.rect(currentX, currentY, colWidths[i], 15)
                 .stroke('#000000')
                 .fillColor('#000000')
                 .text(String(data), currentX + 2, currentY + 3, {
                   width: colWidths[i] - 4,
                   height: 12,
                   ellipsis: true
                 });
              currentX += colWidths[i];
            });

            currentY += 15;
          });

          // Total count
          doc.fontSize(8).font('Helvetica-Bold')
             .fillColor('#000000')
             .rect(startX, currentY, tableWidth, 15)
             .fillAndStroke('#ffff99', '#000000')
             .fillColor('#000000')
             .text(`Total Not Registered in Ward Voters: ${categories.NotRegisteredInWard.length}`, startX + 2, currentY + 3);
        }

        // Add footer to current page
        this.addFooterToCurrentPage(doc, municipality, wardNumber);

        doc.end();

        stream.on('finish', () => {
          console.log(`📄 Generated PDF report: ${reportPath}`);
          resolve(reportPath);
        });

        stream.on('error', (error) => {
          console.error('❌ Error generating PDF:', error);
          reject(error);
        });

      } catch (error) {
        console.error('❌ Error creating PDF document:', error);
        reject(error);
      }
    });
  }

  private static groupVotersByStation(voters: VoterRecord[]): Record<string, VoterRecord[]> {
    const grouped: Record<string, VoterRecord[]> = {};

    voters.forEach(voter => {
      const station = voter.REGISTERED_VD || 'Unknown';
      if (!grouped[station]) {
        grouped[station] = [];
      }
      grouped[station].push(voter);
    });

    // Sort stations alphabetically
    const sortedGrouped: Record<string, VoterRecord[]> = {};
    Object.keys(grouped).sort().forEach(station => {
      sortedGrouped[station] = grouped[station];
    });

    return sortedGrouped;
  }

  private static calculateStatistics(
    results: Map<string, VoterData | null>,
    wardNumber: number,
    processingTime: number
  ): ProcessingResult['statistics'] {
    let registered_voters = 0;
    let not_registered = 0;
    let deceased = 0;
    let not_in_ward = 0;
    let registered_in_ward = 0;
    const voting_station_counts: Record<string, number> = {};

    results.forEach((voterData) => {
      if (voterData) {
        if (voterData.bRegistered) {
          registered_voters++;
          if (voterData.ward_id === wardNumber) {
            registered_in_ward++;
            // Count voting stations for registered in ward voters
            if (voterData.voting_station) {
              voting_station_counts[voterData.voting_station] =
                (voting_station_counts[voterData.voting_station] || 0) + 1;
            }
          } else {
            not_in_ward++;
          }
        } else {
          not_registered++;
        }
      } else {
        deceased++;
      }
    });

    return {
      total_members: results.size,
      registered_voters,
      not_registered,
      deceased,
      not_in_ward,
      registered_in_ward,
      processing_time: processingTime,
      voting_station_counts
    };
  }

  private static addFooterToCurrentPage(doc: any, municipality: string, wardNumber: number): void {
    const currentPageNumber = doc.bufferedPageRange().start + doc.bufferedPageRange().count;
    doc.fontSize(10).font('Helvetica')
       .text(`SUB REGION: ${municipality}`, 36, doc.page.height - 30)
       .text(`WARD: ${wardNumber}`, doc.page.width - 100, doc.page.height - 30)
       .text(`Page ${currentPageNumber}`, doc.page.width / 2 - 20, doc.page.height - 30);
  }

  private static async writeExcelFileWithRetry(workbook: any, filePath: string, maxRetries: number = 5): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if file exists and try to delete it first
        if (fs.existsSync(filePath)) {
          try {
            await fsPromises.unlink(filePath);
            console.log(`🗑️ Removed existing file: ${filePath}`);
          } catch (unlinkError: any) {
            if (unlinkError.code !== 'ENOENT') {
              console.warn(`⚠️ Could not remove existing file: ${unlinkError.message}`);
            }
          }
        }

        // Add timestamp to filename to avoid conflicts
        const timestamp = Date.now();
        const dir = path.dirname(filePath);
        const ext = path.extname(filePath);
        const baseName = path.basename(filePath, ext);
        const uniqueFilePath = path.join(dir, `${baseName}_${timestamp}${ext}`);

        // Write the file
        XLSX.writeFile(workbook, uniqueFilePath);

        // Rename to original name if successful
        if (fs.existsSync(uniqueFilePath)) {
          try {
            await fsPromises.rename(uniqueFilePath, filePath);
            console.log(`✅ Excel file written successfully: ${filePath}`);
            return;
          } catch (renameError: any) {
            // If rename fails, keep the unique filename
            console.log(`✅ Excel file written with unique name: ${uniqueFilePath}`);
            return;
          }
        }

      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed to write Excel file: ${error.message}`);

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await this.delay(waitTime);
        }
      }
    }

    throw new Error(`Failed to write Excel file after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
