/**
 * Hyperbook Core Models
 * TypeScript types matching Mangle schema definitions
 * Excludes: audio, video, image types per requirements
 */

// Supported languages
export type Language = 'de' | 'en' | 'fr' | 'es' | 'it' | 'pt' | 'nl';

// Layout options
export type Layout = 'default' | 'wide' | 'standalone';

// Navigation visibility
export type PageNavigation = 'default' | 'hidden';
export type SectionNavigation = 'default' | 'hidden' | 'virtual' | 'page' | 'expanded';

// Page path information
export interface PagePath {
  directory: string;
  relative: string;
  absolute: string;
  href?: string;
  permalink?: string;
}

// Breadcrumb configuration
export interface BreadcrumbConfig {
  home?: string;
  separator?: string;
}

// Link types
export interface Link {
  label: string;
  icon?: string;
  href?: string;
  links?: Link[];
}

// Term for glossary
export interface Term {
  name: string;
  href: string;
}

// Glossary map
export type Glossary = Record<string, Term[]>;

// Page frontmatter
export interface HyperbookPageFrontmatter {
  name: string;
  title?: string;
  permaid?: string;
  lang?: Language;
  qrcode?: boolean;
  description?: string;
  keywords?: string[];
  scripts?: string[];
  styles?: string[];
  index?: number;
  hide?: boolean;
  toc?: boolean;
  next?: string;
  prev?: string;
  layout?: Layout;
  breadcrumb?: boolean | BreadcrumbConfig;
  navigation?: PageNavigation;
}

// Section frontmatter (does not extend PageFrontmatter due to navigation type difference)
export interface HyperbookSectionFrontmatter {
  name: string;
  title?: string;
  permaid?: string;
  lang?: Language;
  qrcode?: boolean;
  description?: string;
  keywords?: string[];
  scripts?: string[];
  styles?: string[];
  index?: number;
  hide?: boolean;
  toc?: boolean;
  next?: string;
  prev?: string;
  layout?: Layout;
  breadcrumb?: boolean | BreadcrumbConfig;
  virtual?: boolean;
  expanded?: boolean;
  navigation?: SectionNavigation;
}

// Full page
export interface HyperbookPage extends HyperbookPageFrontmatter {
  isEmpty?: boolean;
  href?: string;
  path?: PagePath;
  repo?: string;
}

// Section with nested pages
export interface HyperbookSection extends HyperbookSectionFrontmatter {
  isEmpty?: boolean;
  href?: string;
  pages: HyperbookPage[];
  sections: HyperbookSection[];
  repo?: string;
}

// Navigation structure
export interface Navigation {
  next?: HyperbookPage;
  previous?: HyperbookPage;
  current?: HyperbookPage;
  pages: HyperbookPage[];
  sections: HyperbookSection[];
  glossary: HyperbookPage[];
}

// Table of contents entry
export interface TocEntry {
  level: number;
  text: string;
  slug: string;
  children?: TocEntry[];
}

// Author information
export interface Author {
  name?: string;
  url?: string;
}

// Font configuration
export interface FontsConfig {
  heading?: string;
  body?: string;
  code?: string;
}

// Colors configuration
export interface ColorsConfig {
  brand?: string;
  brandDark?: string;
  brandText?: string;
  inverted?: boolean;
}

// Repository configuration
export interface RepoConfig {
  url: string;
  label?: string;
}

// Hyperbook JSON configuration
export interface HyperbookJson {
  name: string;
  description?: string;
  logo?: string;
  allowDangerousHtml?: boolean;
  trailingSlash?: boolean;
  importExport?: boolean;
  search?: boolean;
  qrcode?: boolean;
  toc?: boolean;
  llms?: boolean;
  breadcrumb?: boolean | BreadcrumbConfig;
  author?: Author;
  font?: string;
  fonts?: FontsConfig;
  scripts?: string[];
  styles?: string[];
  colors?: ColorsConfig;
  basePath?: string;
  license?: string;
  language?: Language;
  repo?: string | RepoConfig;
  links?: Link[];
}

// Book summary
export interface BookSummary {
  id: string;
  name: string;
  description?: string;
  language?: Language;
  basePath: string;
}

// Search result
export interface SearchResult {
  page: HyperbookPage;
  snippet: string;
  score: number;
}

// API response types
export interface ListBooksResponse {
  books: BookSummary[];
  total: number;
}

export interface GetNavigationResponse {
  navigation: Navigation;
  glossary: Glossary;
}

export interface GetPageResponse {
  page: HyperbookPage;
  content: string;
  toc?: TocEntry[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

// Health check
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthResponse {
  status: HealthStatus;
  service: {
    name: string;
    version: string;
    stack: string;
  };
  uptimeSeconds: number;
}

// Connection state (matching other console apps)
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
