export interface Notification {
  id: string;
  userId: string; // The recipient's UID
  type: 'run_verified' | 'run_rejected' | 'new_pending_run' | 'system';
  title: string;
  message: string;
  link?: string; // Optional URL to navigate to
  read: boolean;
  createdAt: string; // ISO date string
  metadata?: Record<string, any>; // Any extra data like runId
}

