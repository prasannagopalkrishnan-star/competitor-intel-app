export type SignalType =
  | 'product_launch'
  | 'funding'
  | 'leadership_change'
  | 'earnings_report'
  | 'social_media'
  | 'blog_post'
  | 'other';

export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface Competitor {
  id: string;
  user_id: string;
  name: string;
  website?: string;
  rss_feeds?: string[];
  created_at: string;
  updated_at: string;
}

export interface Signal {
  id: string;
  competitor_id: string;
  user_id: string;
  title: string;
  summary: string;
  signal_type: SignalType;
  sentiment?: Sentiment;
  source_url: string;
  source_name?: string;
  is_high_priority: boolean;
  published_at?: string;
  created_at: string;
  notified_at?: string;
  content_hash?: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  signal_types: SignalType[];
  delivery_email: boolean;
  delivery_dashboard: boolean;
  check_frequency_hours: number;
  email_digest_frequency_hours: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  content?: string;
}
