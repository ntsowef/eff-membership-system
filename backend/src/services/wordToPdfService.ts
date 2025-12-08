import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

// Promisify exec for async/await
const execAsync = promisify(exec);

// Detect LibreOffice installation path
function getLibreOfficePath(): string | null {
  const possiblePaths = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/usr/bin/soffice',
    '/usr/bin/libreoffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice'
  ];

  for (const sofficePath of possiblePaths) {
    if (fs.existsSync(sofficePath)) {
      console.log(`✅ Found LibreOffice at: ${sofficePath}`);
      return sofficePath;
    }
  }

  console.warn('⚠️ LibreOffice not found at any default location');
  return null;
}

const LIBREOFFICE_PATH = getLibreOfficePath();

export class WordToPdfService {
  /**
   * Convert a Word document (.docx) to PDF format using LibreOffice
   * @param wordFilePath - Full path to the Word document
   * @param pdfFilePath - Full path where the PDF should be saved
   * @returns Promise<string> - Path to the generated PDF file
   */
  static async convertWordToPdf(
    wordFilePath: string,
    pdfFilePath: string
  ): Promise<string> {
    try {
      console.log('🔄 Starting Word to PDF conversion with LibreOffice...');
      console.log(`📄 Input Word file: ${wordFilePath}`);
      console.log(`📄 Output PDF file: ${pdfFilePath}`);

      // Check if Word file exists
      if (!fs.existsSync(wordFilePath)) {
        throw new Error(`Word file not found: ${wordFilePath}`);
      }

      // Ensure output directory exists
      const outputDir = path.dirname(pdfFilePath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // NOTE: This service is deprecated - use HtmlPdfService instead
      throw new Error('WordToPdfService is deprecated. Use HtmlPdfService for PDF generation.');
    } catch (error: any) {
      console.error('❌ Word to PDF conversion failed:', error);
      throw new Error(`Failed to convert Word to PDF: ${error.message}`);
    }
  }

  /**
   * Convert Word buffer to PDF buffer using LibreOffice command-line
   * Uses direct command-line invocation for better reliability on Windows
   * @param wordBuffer - Buffer containing Word document data
   * @param tempDir - Temporary directory for intermediate files
   * @returns Promise<Buffer> - Buffer containing PDF data
   */
  static async convertWordBufferToPdf(
    wordBuffer: Buffer,
    tempDir: string = path.join(process.cwd(), 'uploads', 'temp')
  ): Promise<Buffer> {
    let tempWordPath: string | null = null;
    let tempPdfPath: string | null = null;

    try {
      console.log('🔄 Converting Word buffer to PDF buffer with LibreOffice...');
      console.log(`📝 Input Word buffer size: ${wordBuffer.length} bytes`);

      // Check if LibreOffice is available
      if (!LIBREOFFICE_PATH) {
        throw new Error('LibreOffice is not installed or not found. Please install LibreOffice to enable PDF conversion.');
      }

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Create temporary Word file
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      tempWordPath = path.join(tempDir, `temp_word_${timestamp}_${randomSuffix}.docx`);
      tempPdfPath = path.join(tempDir, `temp_word_${timestamp}_${randomSuffix}.pdf`);

      console.log(`📝 Writing temporary Word file: ${tempWordPath}`);
      fs.writeFileSync(tempWordPath, wordBuffer);

      // Verify Word file was written
      if (!fs.existsSync(tempWordPath)) {
        throw new Error('Failed to write temporary Word file');
      }

      const wordStats = fs.statSync(tempWordPath);
      console.log(`✅ Temporary Word file created: ${wordStats.size} bytes`);

      // Convert using LibreOffice command-line
      // --headless: Run without GUI
      // --convert-to pdf: Convert to PDF format
      // --outdir: Output directory
      console.log('🔄 Converting Word to PDF with LibreOffice command-line...');

      const command = `"${LIBREOFFICE_PATH}" --headless --convert-to pdf --outdir "${tempDir}" "${tempWordPath}"`;
      console.log(`📝 Executing: ${command}`);

      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 second timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      if (stdout) console.log(`LibreOffice stdout: ${stdout}`);
      if (stderr) console.warn(`LibreOffice stderr: ${stderr}`);

      // Wait a moment for file system to sync
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if PDF was created
      if (!fs.existsSync(tempPdfPath)) {
        throw new Error(`PDF conversion failed - output file not created at ${tempPdfPath}`);
      }

      // Read the PDF file
      const pdfBuffer = fs.readFileSync(tempPdfPath);
      const pdfStats = fs.statSync(tempPdfPath);

      console.log(`✅ PDF buffer created, size: ${pdfBuffer.length} bytes (${pdfStats.size} bytes on disk)`);
      console.log('✅ Document orientation and formatting preserved');

      return pdfBuffer;
    } catch (error: any) {
      console.error('❌ Word buffer to PDF buffer conversion failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        tempWordPath,
        tempPdfPath,
        libreOfficePath: LIBREOFFICE_PATH
      });
      throw new Error(`PDF conversion failed: ${error.message}`);
    } finally {
      // Clean up temporary files
      try {
        if (tempWordPath && fs.existsSync(tempWordPath)) {
          fs.unlinkSync(tempWordPath);
          console.log(`🗑️ Cleaned up temporary Word file: ${tempWordPath}`);
        }
        if (tempPdfPath && fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath);
          console.log(`🗑️ Cleaned up temporary PDF file: ${tempPdfPath}`);
        }
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary files:', cleanupError);
      }
    }
  }

  /**
   * Generate Ward Attendance Register PDF by converting from Word
   * @param wardInfo - Ward information
   * @param members - Array of member data
   * @returns Promise<Buffer> - Buffer containing PDF data
   */
  static async generateWardAttendanceRegisterPDF(
    wardInfo: any,
    members: any[]
  ): Promise<Buffer> {
    try {
      console.log('🔄 Generating Ward Attendance Register PDF via Word conversion...');

      // Import WordDocumentService dynamically to avoid circular dependencies
      const { WordDocumentService } = require('./wordDocumentService');

      // Step 1: Generate Word document
      console.log('📝 Step 1: Generating Word document...');
      const wordBuffer = await WordDocumentService.generateWardAttendanceRegister(
        wardInfo,
        members
      );
      console.log(`✅ Word document generated, size: ${wordBuffer.length} bytes`);

      // Step 2: Convert Word to PDF
      console.log('🔄 Step 2: Converting Word to PDF...');
      const pdfBuffer = await this.convertWordBufferToPdf(wordBuffer);
      console.log(`✅ PDF conversion complete, size: ${pdfBuffer.length} bytes`);

      return pdfBuffer;
    } catch (error: any) {
      console.error('❌ Failed to generate Ward Attendance Register PDF:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }
}

