export enum Screen {
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  TASKS = 'TASKS',
  PLANNER = 'PLANNER',
  PROGRESS = 'PROGRESS',
  SETTINGS = 'SETTINGS',
}

export interface Attachment {
  name: string;
  type: string; // e.g., 'application/pdf'
  data: string; // Base64 string
  size: number;
}

export interface Chapter {
  id: string;
  name: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string; // New field for text notes
  subject: string;
  time: string;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  date?: string; // Display string like "Today" or YYYY-MM-DD
  rawDate?: string; // ISO string for sorting
  tag?: string;
  attachments?: Attachment[];
  recurrence?: {
    frequency: 'Daily' | 'Weekly' | 'Monthly';
    endDate?: string;
  };
}

export interface SubjectProgress {
  id: string;
  subject: string;
  chaptersLeft: number;
  progress: number;
  color: string;
  icon: string;
  chapters?: Chapter[];
  attachments?: Attachment[];
}

export interface StudyLog {
  id: string;
  subject: string;
  duration: number; // in hours
  date: string; // ISO Date string YYYY-MM-DD
  timestamp: number;
}

export interface Exam {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  color?: string; // Optional color theme for the card
}

export interface User {
  email: string;
  name: string;
  joinedDate: string;
}