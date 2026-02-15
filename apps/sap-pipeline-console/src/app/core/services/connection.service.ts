import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { ConnectionState, ServiceInfo, PipelineConfig } from '../models/pipeline.model';
import { PipelineService } from './pipeline.service';

const STORAGE_KEY = 'sap-pipeline-config';

/**
 * Service for managing connection state to the SAP Pipeline backend
 */
@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  private pipelineService = inject(PipelineService);

  private stateSubject = new BehaviorSubject<ConnectionState>('disconnected');
  private errorSubject = new BehaviorSubject<string>('');
  private serviceInfoSubject = new BehaviorSubject<ServiceInfo | null>(null);

  /** Observable of the current connection state */
  readonly state$ = this.stateSubject.asObservable();

  /** Observable of the last connection error */
  readonly error$ = this.errorSubject.asObservable();

  /** Observable of the service info (from health check) */
  readonly serviceInfo$ = this.serviceInfoSubject.asObservable();

  constructor() {
    // Load saved configuration on startup
    this.loadSavedConfig();
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.stateSubject.getValue();
  }

  /**
   * Get last error message
   */
  getError(): string {
    return this.errorSubject.getValue();
  }

  /**
   * Get service info
   */
  getServiceInfo(): ServiceInfo | null {
    return this.serviceInfoSubject.getValue();
  }

  /**
   * Check health of the SAP Pipeline service
   */
  checkHealth(): void {
    this.stateSubject.next('connecting');
    this.errorSubject.next('');

    this.pipelineService.checkHealth().pipe(
      tap(response => {
        if (response.status === 'ok') {
          this.stateSubject.next('connected');
          this.serviceInfoSubject.next({
            status: response.status,
            service: response.service,
            stack: response.stack
          });
        } else {
          this.stateSubject.next('error');
          this.errorSubject.next('Service returned non-ok status');
        }
      }),
      catchError(error => {
        this.stateSubject.next('error');
        this.errorSubject.next(error.message || 'Connection failed');
        this.serviceInfoSubject.next(null);
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Update connection configuration
   */
  updateConfig(config: Partial<PipelineConfig>): void {
    this.pipelineService.setConfig(config);
    this.saveConfig();
    // Re-check connection with new config
    this.checkHealth();
  }

  /**
   * Get current configuration
   */
  getConfig(): PipelineConfig {
    return this.pipelineService.getConfig();
  }

  /**
   * Disconnect (reset state)
   */
  disconnect(): void {
    this.stateSubject.next('disconnected');
    this.serviceInfoSubject.next(null);
    this.errorSubject.next('');
  }

  /**
   * Retry connection
   */
  retry(): void {
    this.checkHealth();
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    try {
      const config = this.pipelineService.getConfig();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('[ConnectionService] Failed to save config:', error);
    }
  }

  /**
   * Load saved configuration from localStorage
   */
  private loadSavedConfig(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const config = JSON.parse(saved) as Partial<PipelineConfig>;
        this.pipelineService.setConfig(config);
      }
    } catch (error) {
      console.warn('[ConnectionService] Failed to load saved config:', error);
    }
  }
}