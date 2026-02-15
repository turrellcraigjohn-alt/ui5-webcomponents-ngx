/**
 * Connection state types for the SAP Pipeline service
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Health check response from /health endpoint
 */
export interface HealthResponse {
  status: 'ok' | 'error';
  service: string;
  stack: string;
}

/**
 * Model information from /v1/models endpoint
 */
export interface ModelInfo {
  id: string;
  object: string;
  owned_by: string;
}

export interface ModelsResponse {
  object: string;
  data: ModelInfo[];
}

/**
 * OpenAI-compatible chat message
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Chat completion request
 */
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * Chat completion response
 */
export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: ChatCompletionUsage;
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: {
    message: string;
    type: string;
    param: string | null;
    code: string;
  };
}

/**
 * SAP AI Core Deployment
 */
export interface Deployment {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'STOPPED' | 'FAILED' | 'UNKNOWN';
  scenarioId: string;
  configurationId: string;
  createdAt: string;
  modifiedAt: string;
  targetStatus?: string;
}

/**
 * SAP AI Core Execution
 */
export interface Execution {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STOPPED' | 'UNKNOWN';
  scenarioId: string;
  configurationId: string;
  createdAt: string;
  modifiedAt: string;
  startedAt?: string;
  completedAt?: string;
  outputArtifacts?: string[];
}

/**
 * SAP AI Core Scenario
 */
export interface Scenario {
  id: string;
  name: string;
  description?: string;
  labels?: Record<string, string>;
  createdAt: string;
  modifiedAt: string;
}

/**
 * Grounding / Vector Search Query
 */
export interface GroundingQuery {
  query: string;
  topK?: number;
  threshold?: number;
  filters?: Record<string, string>;
}

/**
 * Grounding / Vector Search Result
 */
export interface GroundingResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface GroundingResponse {
  query: string;
  results: GroundingResult[];
  totalResults: number;
}

/**
 * Pipeline connection configuration
 */
export interface PipelineConfig {
  baseUrl: string;
  model: string;
  timeout: number;
}

/**
 * Service information (from health check)
 */
export interface ServiceInfo {
  status: string;
  service: string;
  stack: string;
}