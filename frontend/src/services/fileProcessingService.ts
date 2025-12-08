import { io, Socket } from 'socket.io-client';
import { api } from '../lib/api';
import type { FileProcessingJob, QueueStatus } from '../types/fileProcessing';
import { devLog } from '../utils/logger';

export class FileProcessingService {
  private static instance: FileProcessingService;
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): FileProcessingService {
    if (!FileProcessingService.instance) {
      FileProcessingService.instance = new FileProcessingService();
    }
    return FileProcessingService.instance;
  }

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
    this.socket = io(wsUrl, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      devLog('🔌 Connected to file processing service');
      this.isConnected = true;
      this.socket?.emit('subscribe_file_processing');
      this.emit('connected', { connected: true });
    });

    this.socket.on('disconnect', () => {
      devLog('🔌 Disconnected from file processing service');
      this.isConnected = false;
      this.emit('disconnected', { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      this.emit('connection_error', { error: error.message });
    });

    // File processing events
    this.socket.on('file_queued', (data) => {
      devLog('📄 File queued:', data);
      this.emit('file_queued', data);
    });

    this.socket.on('job_started', (data) => {
      devLog('🔄 Job started:', data);
      this.emit('job_started', data);
    });

    this.socket.on('job_progress', (data) => {
      devLog('📊 Job progress:', data);
      this.emit('job_progress', data);
    });

    this.socket.on('job_completed', (data) => {
      devLog('✅ Job completed:', data);
      this.emit('job_completed', data);
    });

    this.socket.on('job_failed', (data) => {
      devLog('❌ Job failed:', data);
      this.emit('job_failed', data);
    });

    this.socket.on('job_cancelled', (data) => {
      devLog('⏹️ Job cancelled:', data);
      this.emit('job_cancelled', data);
    });

    this.socket.on('queue_status', (data) => {
      this.emit('queue_status', data);
    });

    this.socket.on('job_history', (data) => {
      this.emit('job_history', data);
    });
  }

  async uploadFile(file: File, wardNumber?: number): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (wardNumber) {
      formData.append('ward_number', wardNumber.toString());
    }

    const response = await fetch('/api/v1/file-processing/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getQueueStatus(): Promise<QueueStatus> {
    const response = await api.get('/file-processing/queue/status');
    // Backend wraps response in { success: true, data: {...} } format
    return response.data.data || response.data;
  }

  async getJobHistory(limit?: number): Promise<FileProcessingJob[]> {
    const response = await api.get('/file-processing/jobs', {
      params: { limit }
    });
    // Backend wraps response in { success: true, data: [...] } format
    return response.data.data || response.data;
  }

  async getJobDetails(jobId: string): Promise<FileProcessingJob> {
    const response = await api.get(`/file-processing/jobs/${jobId}`);
    return response.data;
  }

  async cancelJob(jobId: string): Promise<any> {
    const response = await api.post(`/file-processing/jobs/${jobId}/cancel`);
    return response.data;
  }

  downloadFile(jobId: string, fileName: string): void {
    const url = `/api/v1/file-processing/download/${jobId}/${fileName}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  requestQueueStatus(): void {
    this.socket?.emit('get_queue_status');
  }

  requestJobHistory(limit?: number): void {
    this.socket?.emit('get_job_history', { limit });
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} callback:`, error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Utility methods for file validation
  static validateExcelFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];

    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: 'Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'
      };
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds maximum limit of 50MB.'
      };
    }

    return { valid: true };
  }

  static extractWardNumber(fileName: string): number | null {
    const wardMatch = fileName.toUpperCase().match(/WARD[_\s]*(\d+)/);
    return wardMatch ? parseInt(wardMatch[1]) : null;
  }
}
