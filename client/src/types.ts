// client/src/types.ts — shared types (mirrored from backend src/lib/types.ts)

export type UserRole = 'barista' | 'judge' | 'host' | 'sponsor' | 'audience' | 'admin';
export type ContestStatus = 'draft' | 'published' | 'open' | 'review' | 'judging' | 'finalized' | 'archived';
export type SubmissionStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
export type VoteSelection = 'left' | 'right';

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

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  profileId?: string;
  displayName?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}
