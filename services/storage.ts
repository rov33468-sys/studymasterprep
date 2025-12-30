import { Task, SubjectProgress, StudyLog, Exam } from '../types';

const STORAGE_KEYS = {
  TASKS: 'study_master_tasks',
  SUBJECTS: 'study_master_subjects',
  LOGS: 'study_master_logs',
  USER: 'study_master_user', // Used for settings like goals, theme
  EXAMS: 'study_master_exams',
  OLD_EXAM: 'study_master_exam', 
  ATTENDANCE: 'study_master_attendance',
  INIT: 'study_master_initialized',
  REMINDER_CONFIG: 'study_master_reminder_config'
};

// Initial Seed Data (acts as default migration)
const INITIAL_SUBJECTS: SubjectProgress[] = [
  { 
    id: '1', 
    subject: 'Physics', 
    chaptersLeft: 2, 
    progress: 60, 
    color: 'text-indigo-600 bg-indigo-50', 
    icon: 'functions',
    chapters: [
      { id: 'c1', name: 'Kinematics', isCompleted: true },
      { id: 'c2', name: 'Laws of Motion', isCompleted: true },
      { id: 'c3', name: 'Thermodynamics', isCompleted: true },
      { id: 'c4', name: 'Electromagnetism', isCompleted: false },
      { id: 'c5', name: 'Quantum Physics', isCompleted: false },
    ],
    attachments: []
  },
  { 
    id: '2', 
    subject: 'Chemistry', 
    chaptersLeft: 18, 
    progress: 40, 
    color: 'text-emerald-600 bg-emerald-50', 
    icon: 'science',
    chapters: [],
    attachments: [] 
  },
  { 
    id: '3', 
    subject: 'Mathematics', 
    chaptersLeft: 5, 
    progress: 82, 
    color: 'text-orange-500 bg-orange-50', 
    icon: 'calculate',
    chapters: [],
    attachments: []
  },
];

const INITIAL_TASKS: Task[] = [
    { id: '1', title: 'Physics Mock Test', subject: 'Physics', time: '10:00 AM', priority: 'High', completed: false, date: 'Today', rawDate: new Date().toISOString(), tag: 'JEE PREP' },
    { id: '2', title: 'Math Chapter 4 Revision', subject: 'Mathematics', time: '2:00 PM', priority: 'Medium', completed: false, date: 'Today', rawDate: new Date().toISOString(), tag: 'BOARDS' },
    { id: '3', title: 'Chemistry Lab Record', subject: 'Chemistry', time: '12:00 PM', priority: 'Low', completed: false, date: 'Tomorrow', rawDate: new Date(Date.now() + 86400000).toISOString(), tag: 'SCHOOL' },
];

const INITIAL_LOGS: StudyLog[] = [
    { id: '1', subject: 'Physics', duration: 1.5, date: new Date().toISOString().split('T')[0], timestamp: Date.now() - 86400000 },
    { id: '2', subject: 'Mathematics', duration: 2, date: new Date().toISOString().split('T')[0], timestamp: Date.now() }
];

const INITIAL_EXAMS: Exam[] = [
    {
        id: '1',
        title: 'JEE Main 2025',
        date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 45 days from now
    }
];

// Helper to handle local storage access
const get = <T>(key: string, fallback: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    console.error('Error reading from storage', e);
    return fallback;
  }
};

const set = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error writing to storage', e);
  }
};

export const storageService = {
  // --- Initialization ---
  init: () => {
    if (!localStorage.getItem(STORAGE_KEYS.INIT)) {
      set(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
      set(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      set(STORAGE_KEYS.LOGS, INITIAL_LOGS);
      
      const today = new Date();
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
      const dayBefore = new Date(today); dayBefore.setDate(today.getDate() - 2);
      set(STORAGE_KEYS.ATTENDANCE, [yesterday.toISOString().split('T')[0], dayBefore.toISOString().split('T')[0]]);
      
      set(STORAGE_KEYS.INIT, 'true');
    }

    // MIGRATION: Check if old single exam exists and migrate to array
    const oldExam = localStorage.getItem(STORAGE_KEYS.OLD_EXAM);
    const newExams = localStorage.getItem(STORAGE_KEYS.EXAMS);
    
    if (oldExam && !newExams) {
        try {
            const parsed = JSON.parse(oldExam);
            const migrated: Exam[] = [{
                id: 'migrated_1',
                title: parsed.examName || 'Exam',
                date: parsed.date || new Date().toISOString().split('T')[0]
            }];
            set(STORAGE_KEYS.EXAMS, migrated);
            localStorage.removeItem(STORAGE_KEYS.OLD_EXAM);
        } catch (e) {
            set(STORAGE_KEYS.EXAMS, INITIAL_EXAMS);
        }
    } else if (!newExams) {
        set(STORAGE_KEYS.EXAMS, INITIAL_EXAMS);
    }
  },

  // --- Tasks ---
  getTasks: (): Task[] => get(STORAGE_KEYS.TASKS, []),
  
  saveTask: (task: Task) => {
    const tasks = get<Task[]>(STORAGE_KEYS.TASKS, []);
    const existingIndex = tasks.findIndex(t => t.id === task.id);
    
    if (existingIndex >= 0) {
      tasks[existingIndex] = task;
    } else {
      tasks.unshift(task);
    }
    set(STORAGE_KEYS.TASKS, tasks);
    return tasks;
  },

  deleteTask: (taskId: string) => {
    const tasks = get<Task[]>(STORAGE_KEYS.TASKS, []);
    const newTasks = tasks.filter(t => t.id !== taskId);
    set(STORAGE_KEYS.TASKS, newTasks);
    return newTasks;
  },

  // --- Subjects ---
  getSubjects: (): SubjectProgress[] => get(STORAGE_KEYS.SUBJECTS, []),

  saveSubject: (subject: SubjectProgress) => {
    const subjects = get<SubjectProgress[]>(STORAGE_KEYS.SUBJECTS, []);
    const existingIndex = subjects.findIndex(s => s.id === subject.id);

    if (existingIndex >= 0) {
      subjects[existingIndex] = subject;
    } else {
      subjects.push(subject);
    }
    set(STORAGE_KEYS.SUBJECTS, subjects);
    return subjects;
  },

  deleteSubject: (id: string) => {
    const subjects = get<SubjectProgress[]>(STORAGE_KEYS.SUBJECTS, []);
    const newSubjects = subjects.filter(s => s.id !== id);
    set(STORAGE_KEYS.SUBJECTS, newSubjects);
    return newSubjects;
  },

  // --- Study Logs ---
  getLogs: (): StudyLog[] => get(STORAGE_KEYS.LOGS, []),

  addLog: (log: Omit<StudyLog, 'id' | 'timestamp'>) => {
    const logs = get<StudyLog[]>(STORAGE_KEYS.LOGS, []);
    const newLog: StudyLog = {
      ...log,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    logs.push(newLog);
    set(STORAGE_KEYS.LOGS, logs);
    return logs;
  },
  
  // --- User Settings ---
  // Returns object with dailyGoal (default 6), darkMode, etc.
  getSettings: () => {
      const stored = get<any>(STORAGE_KEYS.USER, {});
      return { 
          dailyGoal: stored.dailyGoal || 6, 
          darkMode: stored.darkMode || false, 
          notifications: stored.notifications !== undefined ? stored.notifications : true 
      };
  },
  
  saveSettings: (settings: any) => {
      set(STORAGE_KEYS.USER, settings);
  },

  // --- Reminder Settings ---
  getReminderConfig: () => {
    return get(STORAGE_KEYS.REMINDER_CONFIG, {
        enabled: true,
        frequency: 'Daily',
        time: '09:00',
        days: ['M', 'T', 'W', 'T', 'F']
    });
  },

  saveReminderConfig: (config: any) => {
    set(STORAGE_KEYS.REMINDER_CONFIG, config);
  },

  // --- Exam Settings ---
  getExams: (): Exam[] => get(STORAGE_KEYS.EXAMS, INITIAL_EXAMS),

  saveExam: (exam: Exam) => {
      const exams = get<Exam[]>(STORAGE_KEYS.EXAMS, []);
      const index = exams.findIndex(e => e.id === exam.id);
      if (index >= 0) {
          exams[index] = exam;
      } else {
          exams.push(exam);
      }
      set(STORAGE_KEYS.EXAMS, exams);
      return exams;
  },

  deleteExam: (id: string) => {
      const exams = get<Exam[]>(STORAGE_KEYS.EXAMS, []);
      const newExams = exams.filter(e => e.id !== id);
      set(STORAGE_KEYS.EXAMS, newExams);
      return newExams;
  },

  // --- Attendance ---
  getAttendance: (): string[] => get(STORAGE_KEYS.ATTENDANCE, []),

  markAttendance: () => {
      const dates = get<string[]>(STORAGE_KEYS.ATTENDANCE, []);
      const today = new Date().toISOString().split('T')[0];
      if (!dates.includes(today)) {
          dates.push(today);
          set(STORAGE_KEYS.ATTENDANCE, dates);
      }
      return dates;
  },

  hasMarkedAttendanceToday: (): boolean => {
      const dates = get<string[]>(STORAGE_KEYS.ATTENDANCE, []);
      const today = new Date().toISOString().split('T')[0];
      return dates.includes(today);
  },

  getStreak: (): number => {
      const dates = get<string[]>(STORAGE_KEYS.ATTENDANCE, []);
      const sortedDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      if (sortedDates.length === 0) return 0;

      const today = new Date().toISOString().split('T')[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split('T')[0];

      const lastEntry = sortedDates[0];

      if (lastEntry !== today && lastEntry !== yesterday) {
          return 0;
      }

      let streak = 1;
      let currentDateStr = lastEntry;

      for (let i = 1; i < sortedDates.length; i++) {
          const prevDateStr = sortedDates[i];
          const current = new Date(currentDateStr);
          const prev = new Date(prevDateStr);
          
          current.setHours(0,0,0,0);
          prev.setHours(0,0,0,0);

          const diffTime = Math.abs(current.getTime() - prev.getTime());
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
          
          if (diffDays === 1) {
              streak++;
              currentDateStr = prevDateStr;
          } else {
              break;
          }
      }
      return streak;
  },

  // --- Data Management ---
  exportData: () => {
      const data = {
          user: get(STORAGE_KEYS.USER, {}),
          tasks: get(STORAGE_KEYS.TASKS, []),
          subjects: get(STORAGE_KEYS.SUBJECTS, []),
          logs: get(STORAGE_KEYS.LOGS, []),
          exams: get(STORAGE_KEYS.EXAMS, []),
          attendance: get(STORAGE_KEYS.ATTENDANCE, []),
          reminderConfig: get(STORAGE_KEYS.REMINDER_CONFIG, {})
      };
      return JSON.stringify(data, null, 2);
  },

  clearAllData: () => {
      localStorage.clear();
  }
};