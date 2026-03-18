// User roles matching product spec
export type UserRole = 'barista' | 'judge' | 'host' | 'sponsor' | 'audience' | 'admin';

// Contest lifecycle from product spec
export type ContestStatus = 'draft' | 'published' | 'open' | 'review' | 'judging' | 'finalized' | 'archived';

// Submission status
export type SubmissionStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';

// Battle/vote
export type VoteSelection = 'left' | 'right';

// Scoring - from component-schema.xml
export interface CriterionScore {
  criterionId: string;
  score: number; // 0-6 scale
  weight: number;
}

export interface ScoringWeights {
  judges: number;   // e.g. 50
  peer: number;     // e.g. 30
  audience: number; // e.g. 20
}

// Session/Auth
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  profileId?: string;
  displayName?: string;
}

// Layout zones from component-schema conventions
export type LayoutZone = 'topBar' | 'header' | 'body' | 'stickyFooter' | 'modal' | 'bottomSheet' | 'emptyState' | 'errorState';

// Component types from component-schema conventions
export type ComponentType = 'text' | 'button' | 'input' | 'textarea' | 'select' | 'multiSelect' | 'toggle' | 'tabBar' | 'card' | 'list' | 'media' | 'badge' | 'stat' | 'progress' | 'alert' | 'sheet' | 'modal' | 'chip' | 'carousel';

// Global events from component-schema
export type AppEvent = 'auth.login.success' | 'auth.register.success' | 'battle.vote.success' | 'submission.created' | 'submission.approved' | 'results.published' | 'filters.apply' | 'filters.reset';

// API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pagination
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}
