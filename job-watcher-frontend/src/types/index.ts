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
  title: string;
  url: string;
  location?: string;
  department?: string;
  is_active: boolean;
  first_seen_at: string;
  last_seen_at: string;
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
  job_match_id: string;
  status: string;
  sent_at?: string;
  created_at: string;
}

export interface ScanRun {
  id: string;
  company_id: string;
  status: string;
  jobs_found: number;
  jobs_added: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}
