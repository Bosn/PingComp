export type Lead = {
  id: number; name: string; region?: string; city?: string; vertical: string; source: string;
  tidb_potential_score: number | null; tidb_potential_reason: string; lead_status: string; owner: string;
  manual_locked: number; creator?: string; created_at?: string; updated_at?: string; funding?: string; linkedin?: string;
  emails?: string | null;
  latest_news?: string; manual_note?: string; tags?: string; source_confidence?: number | null; enrich_status?: string;
};

export type DashboardPayload = {
  total: number; locked: number; avgScore: number;
  statusRows: Array<{ lead_status: string; c: number }>;
  topRows: Array<Pick<Lead, 'id' | 'name' | 'tidb_potential_score' | 'lead_status' | 'manual_locked'>>;
  dailyTrend?: Array<{ d: string; c: number }>;
  scoreBuckets?: Array<{ bucket: string; c: number }>;
  enrichRows?: Array<{ enrich_status: string; c: number }>;
};

export type EnrichJob = { id: number; lead_id: number; status: string; attempts: number; last_error?: string; updated_at?: string; name?: string; enrich_status?: string; };
export type EnrichPayload = { rows: EnrichJob[]; stats: { pending: number; running: number; done_count: number; failed: number } };

export type Interview = {
  id: number;
  lead_id: number;
  title: string;
  interview_date: string;
  channel: string;
  interviewer?: string | null;
  company?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  summary?: string | null;
  pain_points?: string | null;
  current_solution?: string | null;
  requirements?: string | null;
  objections_risks?: string | null;
  next_steps?: string | null;
  tags?: string | null;
  transcript_html?: string | null;
  transcript_plain?: string | null;
  created_at?: string;
  created_by?: string | null;
  updated_at?: string;
  updated_by?: string | null;
  deleted_at?: string | null;
};

export type OutreachEmailSend = {
  id?: number;
  lead_id: number;
  email: string;
  sent_at: string;
  subject?: string | null;
  sender?: string | null;
  content?: string | null;
  batch_recipients?: string[];
  batch_recipient_count?: number;
};

export type ChartPayload = { type: 'pie' | 'line' | 'bar'; title?: string; labels: string[]; values: number[] };
export type ChatTurn = { role: 'user' | 'assistant'; text: string; rows?: Lead[]; chart?: ChartPayload };
export type AgentSession = { id: string; name: string; updatedAt: number; turns: ChatTurn[] };

export type SavedView = {
  name: string;
  q: string;
  minScore: number;
  status: string | null;
  region: string;
  lockedOnly: boolean;
};

export type Lang = 'zh' | 'en';

export type SortKey = 'id' | 'name' | 'score' | 'lead_status' | 'owner' | 'vertical' | 'created_at' | 'updated_at';
