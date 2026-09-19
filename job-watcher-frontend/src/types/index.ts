export interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  website_url?: string;
  careers_url?: string;
  ats_provider?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WatchProfile {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  companies?: WatchProfileCompany[];
  created_at: string;
  updated_at: string;
}

export interface WatchProfileCompany {
  id: string;
  watch_profile_id: string;
  company_id: string;
  career_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WatchRule {
  id: string;
  watch_profile_id: string;
  job_type?: string;
  role_keywords?: string[];
  location_keywords?: string[];
  include_keywords?: string[];
  exclude_keywords?: string[];
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  source: string;
  external_id?: string | null;
  fingerprint: string;
  title: string;
  description?: string | null;
  location?: string | null;
  job_type?: string | null;
  apply_url?: string | null;
  source_url?: string | null;
  posted_at?: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  matches?: JobMatchDetail[];
}

export interface JobMatchDetail {
  id: string;
  watch_profile_id: string;
  profile_name: string;
  matched: boolean;
  score: number;
  match_reason?: string | null;
  matched_at: string;
}

export interface JobMatch {
  id: string;
  job_id: string;
  watch_profile_id: string;
  status: string;
  matched_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  job_id: string;
  watch_profile_id: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed' | string;
  recipient?: string | null;
  message?: string | null;
  sent_at?: string | null;
  error_message?: string | null;
  created_at: string;
  job_title?: string | null;
  company_name?: string | null;
  watch_profile_name?: string | null;
  apply_url?: string | null;
  source_url?: string | null;
  match_reason?: string | null;
  match_score?: number | null;
}

export interface ScanRun {
  id: string;
  watch_profile_id: string;
  watch_profile_name?: string | null;
  status: 'completed' | 'running' | 'partial' | 'failed' | string;
  started_at: string;
  completed_at?: string | null;
  companies_checked: number;
  jobs_discovered: number;
  jobs_new: number;
  jobs_matched: number;
  notifications_sent: number;
  error_count: number;
  created_at: string;
}

export interface ScanError {
  id: string;
  scan_run_id: string;
  watch_profile_company_id?: string | null;
  company_name?: string | null;
  error_type: string;
  message?: string | null;
  details?: Record<string, any> | null;
  created_at: string;
}

export interface CompanyScanStatus {
  company_id: string;
  company_name: string;
  status: 'completed' | 'failed' | 'running' | string;
  error_type?: string | null;
  error_message?: string | null;
  career_url?: string | null;
}

export interface ScanDetail extends ScanRun {
  errors: ScanError[];
  company_statuses: CompanyScanStatus[];
}

export interface NotificationSummary {
  total: number;
  sent: number;
  pending: number;
  failed: number;
}

export interface DashboardSummary {
  active_watch_profiles: number;
  monitored_companies: number;
  available_jobs: number;
  matched_jobs: number;
  notifications: NotificationSummary;
  latest_scan?: ScanRun | null;
  schedule_info: string;
}
