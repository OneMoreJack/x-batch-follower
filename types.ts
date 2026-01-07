
export interface Account {
  id: string;
  username: string;
  url: string;
  selected: boolean;
  status: 'pending' | 'processing' | 'success' | 'skipped' | 'failed';
  error?: string;
}

export interface TaskStats {
  success: number;
  skipped: number;
  failed: number;
  total: number;
}

export enum MessageType {
  START_TASK = 'START_TASK',
  STOP_TASK = 'STOP_TASK',
  UPDATE_PROGRESS = 'UPDATE_PROGRESS',
  TASK_COMPLETE = 'TASK_COMPLETE',
  EXTRACT_ACCOUNTS = 'EXTRACT_ACCOUNTS',
  ACCOUNTS_EXTRACTED = 'ACCOUNTS_EXTRACTED'
}
