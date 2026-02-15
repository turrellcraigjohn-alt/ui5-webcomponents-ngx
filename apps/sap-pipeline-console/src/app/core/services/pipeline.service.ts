import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  HealthResponse,
  ModelsResponse,
  PipelineConfig
} from '../models/pipeline.model';

const DEFAULT_CONFIG: PipelineConfig = {
  baseUrl: 'http://localhost:8088',
  model: 'sap-orchestrator-v1',
  timeout: 30000
};

/**
 * Service for communicating with the SAP Pipeline backend
 * Uses OpenAI-compliant API format
 */
@Injectable({
  providedIn: 'root'
})
export class PipelineService {
  private http = inject(HttpClient);
  private config: PipelineConfig = { ...DEFAULT_CONFIG };

  /**
   * Update the service configuration
   */
  setConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): PipelineConfig {
    return { ...this.config };
  }

  /**
   * Check service health
   */
  checkHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.config.baseUrl}/health`).pipe(
      catchError(error => this.handleError('Health check failed', error))
    );
  }

  /**
   * Get available models
   */
  getModels(): Observable<ModelsResponse> {
    return this.http.get<ModelsResponse>(`${this.config.baseUrl}/v1/models`).pipe(
      catchError(error => this.handleError('Failed to fetch models', error))
    );
  }

  /**
   * Send a chat completion request
   * This is the primary method for interacting with the SAP Pipeline backend
   */
  sendChatCompletion(userMessage: string): Observable<ChatCompletionResponse> {
    const request: ChatCompletionRequest = {
      model: this.config.model,
      messages: [
        { role: 'user', content: userMessage }
      ]
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<ChatCompletionResponse>(
      `${this.config.baseUrl}/v1/chat/completions`,
      request,
      { headers }
    ).pipe(
      catchError(error => this.handleError('Chat completion failed', error))
    );
  }

  /**
   * Extract the assistant's response content from a chat completion
   */
  extractResponseContent(response: ChatCompletionResponse): string {
    if (response.choices && response.choices.length > 0) {
      return response.choices[0].message.content;
    }
    return '';
  }

  // ============================================================================
  // Intent-based convenience methods
  // ============================================================================

  /**
   * List deployments
   */
  listDeployments(): Observable<string> {
    return this.sendChatCompletion('deployment status').pipe(
      map(response => this.extractResponseContent(response))
    );
  }

  /**
   * Create a deployment
   */
  createDeployment(scenarioId: string, configurationId: string): Observable<string> {
    const message = `create deployment for scenario ${scenarioId} with configuration ${configurationId}`;
    return this.sendChatCompletion(message).pipe(
      map(response => this.extractResponseContent(response))
    );
  }

  /**
   * List executions
   */
  listExecutions(): Observable<string> {
    return this.sendChatCompletion('list executions').pipe(
      map(response => this.extractResponseContent(response))
    );
  }

  /**
   * Run an execution
   */
  runExecution(scenarioId: string, configurationId: string): Observable<string> {
    const message = `execute scenario ${scenarioId} with configuration ${configurationId}`;
    return this.sendChatCompletion(message).pipe(
      map(response => this.extractResponseContent(response))
    );
  }

  /**
   * Start a pipeline
   */
  startPipeline(pipelineName: string): Observable<string> {
    return this.sendChatCompletion(`start pipeline ${pipelineName}`).pipe(
      map(response => this.extractResponseContent(response))
    );
  }

  /**
   * List scenarios
   */
  listScenarios(): Observable<string> {
    return this.sendChatCompletion('list scenarios').pipe(
      map(response => this.extractResponseContent(response))
    );
  }

  /**
   * Show scenarios (detailed)
   */
  showScenarios(): Observable<string> {
    return this.sendChatCompletion('show scenarios').pipe(
      map(response => this.extractResponseContent(response))
    );
  }

  /**
   * Perform grounding / vector search
   */
  groundingSearch(query: string): Observable<string> {
    return this.sendChatCompletion(`vector search ${query}`).pipe(
      map(response => this.extractResponseContent(response))
    );
  }

  /**
   * Retrieve documents for grounding
   */
  retrieveDocuments(query: string): Observable<string> {
    return this.sendChatCompletion(`retrieve documents ${query}`).pipe(
      map(response => this.extractResponseContent(response))
    );
  }

  /**
   * Check grounding status
   */
  checkGroundingStatus(): Observable<string> {
    return this.sendChatCompletion('grounding status').pipe(
      map(response => this.extractResponseContent(response))
    );
  }

  // ============================================================================
  // Error handling
  // ============================================================================

  private handleError(context: string, error: unknown): Observable<never> {
    let message = context;

    if (error instanceof Error) {
      message = `${context}: ${error.message}`;
    } else if (typeof error === 'object' && error !== null) {
      const errorObj = error as { error?: { message?: string }; message?: string; status?: number };
      if (errorObj.error?.message) {
        message = `${context}: ${errorObj.error.message}`;
      } else if (errorObj.message) {
        message = `${context}: ${errorObj.message}`;
      } else if (errorObj.status) {
        message = `${context}: HTTP ${errorObj.status}`;
      }
    }

    console.error('[PipelineService]', message, error);
    return throwError(() => new Error(message));
  }
}