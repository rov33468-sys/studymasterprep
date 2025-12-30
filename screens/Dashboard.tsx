import React, { useState, useEffect } from 'react';
import { SubjectProgress, Exam, Task, Chapter, Attachment } from '../types';
import { storageService } from '../services/storage';
import { authService } from '../services/auth';

const COLORS = [
  { name: 'Indigo', class: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400', bg: 'bg-indigo-600', text: 'text-indigo-600 dark:text-indigo-400' },
  { name: 'Emerald', class: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400', bg: 'bg-emerald-600', text: 'text-emerald-600 dark:text-emerald-400' },
  { name: 'Orange', class: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400', bg: 'bg-orange-500', text: 'text-orange-500 dark:text-orange-400' },
  { name: 'Blue', class: 'text-primary bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400', bg: 'bg-primary', text: 'text-primary' },
  { name: 'Rose', class: 'text-rose-500 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400', bg: 'bg-rose-500', text: 'text-rose-500 dark:text-rose-400' },
  { name: 'Purple', class: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400', bg: 'bg-purple-600', text: 'text-purple-600 dark:text-purple-400' },
];

const ICONS = ['functions', 'science', 'calculate', 'menu_book', 'language', 'history', 'biotech', 'code', 'psychology', 'public'];

const DashboardScreen: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [userName, setUserName] = useState('Student');
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  
  // Stats State
  const [dailyGoal, setDailyGoal] = useState(6);
  const [todayStudyHours, setTodayStudyHours] = useState(0);
  
  // Attendance State
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [streakDays, setStreakDays] = useState(0);

  // Subject Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<SubjectProgress>({
    id: '',
    subject: '',
    chaptersLeft: 0,
    progress: 0,
    color: COLORS[0].class,
    icon: ICONS[0],
    chapters: [],
    attachments: []
  });
  
  // Task Detail Modal State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [noteInput, setNoteInput] = useState('');

  // Chapter Input State in Modal
  const [newChapterName, setNewChapterName] = useState('');

  // Exam Logic
  const [exams, setExams] = useState<Exam[]>([]);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examForm, setExamForm] = useState<Exam>({ id: '', title: '', date: '' });
  
  // Timer State
  const [activeSession, setActiveSession] = useState<{subject: string, time: number, isActive: boolean} | null>(null);

  useEffect(() => {
    // Init DB
    storageService.init();
    setSubjects(storageService.getSubjects());
    
    // Get User Name
    const user = authService.getUser();
    if (user) {
        setUserName(user.name.split(' ')[0]); // First name only
    }

    // Get Exams
    setExams(storageService.getExams());

    refreshTasks();
    
    // Attendance Init
    setAttendanceMarked(storageService.hasMarkedAttendanceToday());
    setStreakDays(storageService.getStreak());

    // Get Settings & Progress
    const settings = storageService.getSettings();
    setDailyGoal(settings.dailyGoal || 6);
    calculateTodayProgress();

  }, []);

  const refreshTasks = () => {
    const allTasks = storageService.getTasks();
    const sorted = allTasks
        .filter(t => !t.completed)
        .sort((a, b) => {
            const getVal = (d?: string) => {
                if(d === 'Today') return 0;
                if(d === 'Tomorrow') return 1;
                return new Date(d || '').getTime();
            };
            if (a.rawDate && b.rawDate) {
                return new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime();
            }
            return getVal(a.date) - getVal(b.date);
        })
        .slice(0, 3);
    setUpcomingTasks(sorted);
  };

  const calculateTodayProgress = () => {
      const logs = storageService.getLogs();
      const todayStr = new Date().toISOString().split('T')[0];
      const todayTotal = logs
        .filter(l => l.date === todayStr)
        .reduce((acc, curr) => acc + curr.duration, 0);
      setTodayStudyHours(parseFloat(todayTotal.toFixed(1)));
  };

  const handleMarkAttendance = () => {
      if (attendanceMarked) return;
      storageService.markAttendance();
      setAttendanceMarked(true);
      setStreakDays(storageService.getStreak()); // Update streak immediately
  };

  const getDaysRemaining = (dateStr: string) => {
    if (!dateStr) return 0;
    const targetDate = new Date(dateStr);
    const difference = targetDate.getTime() - new Date().getTime();
    const days = Math.ceil(difference / (1000 * 3600 * 24));
    return days > 0 ? days : 0;
  };

  // --- Task Details Logic ---
  const openTaskDetails = (task: Task) => {
      setSelectedTask(task);
      setNoteInput(task.description || '');
  };

  const saveTaskNote = () => {
      if (!selectedTask) return;
      
      const updatedTask: Task = {
          ...selectedTask,
          description: noteInput.trim()
      };
      
      storageService.saveTask(updatedTask);
      
      // Update local state
      refreshTasks();
      setSelectedTask(null);
  };

  const toggleTaskComplete = () => {
      if (!selectedTask) return;
      const updatedTask = { ...selectedTask, completed: !selectedTask.completed };
      storageService.saveTask(updatedTask);
      refreshTasks();
      setSelectedTask(updatedTask); // Keep modal open with updated state
  };

  // --- Exam Management ---
  const openExamModal = (exam?: Exam) => {
      if (exam) {
          setEditingExam(exam);
          setExamForm(exam);
      } else {
          setEditingExam(null);
          setExamForm({ id: '', title: '', date: '' });
      }
      setIsExamModalOpen(true);
  };

  const handleSaveExam = () => {
      if (!examForm.title || !examForm.date) return;
      
      const payload: Exam = {
          ...examForm,
          id: editingExam ? editingExam.id : Date.now().toString()
      };
      
      const updatedExams = storageService.saveExam(payload);
      setExams(updatedExams);
      setIsExamModalOpen(false);
  };

  const handleDeleteExam = () => {
      if (editingExam) {
          const updatedExams = storageService.deleteExam(editingExam.id);
          setExams(updatedExams);
          setIsExamModalOpen(false);
      }
  };

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (activeSession?.isActive) {
      interval = setInterval(() => {
        setActiveSession(prev => prev ? {...prev, time: prev.time + 1} : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession?.isActive]);

  const toggleSession = (subject: string) => {
    if (activeSession && activeSession.subject === subject) {
       setActiveSession({...activeSession, isActive: !activeSession.isActive});
    } else {
       setActiveSession({subject, time: 0, isActive: true});
    }
  };

  const stopSession = () => {
      if (activeSession && activeSession.time > 0) {
          const durationHours = parseFloat((activeSession.time / 3600).toFixed(2));
          if (durationHours > 0) {
              storageService.addLog({
                  subject: activeSession.subject,
                  duration: durationHours,
                  date: new Date().toISOString().split('T')[0]
              });
              calculateTodayProgress(); // Update progress bar immediately
          }
      }
      setActiveSession(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const openAddModal = () => {
    setEditingIndex(null);
    setFormData({ id: '', subject: '', chaptersLeft: 10, progress: 0, color: COLORS[0].class, icon: ICONS[0], chapters: [], attachments: [] });
    setNewChapterName('');
    setIsModalOpen(true);
  };

  const openEditModal = (index: number) => {
    setEditingIndex(index);
    setFormData({ 
        ...subjects[index],
        chapters: subjects[index].chapters || [],
        attachments: subjects[index].attachments || []
    });
    setNewChapterName('');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.subject.trim()) return;
    
    const subjectToSave = {
        ...formData,
        id: formData.id || Date.now().toString()
    };
    
    const updatedSubjects = storageService.saveSubject(subjectToSave);
    setSubjects(updatedSubjects);
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (editingIndex !== null) {
      const idToDelete = subjects[editingIndex].id;
      const updatedSubjects = storageService.deleteSubject(idToDelete);
      setSubjects(updatedSubjects);
      setIsModalOpen(false);
    }
  };

  // --- Chapter Management ---
  const addChapter = () => {
      if (!newChapterName.trim()) return;
      const newChapter: Chapter = {
          id: Date.now().toString(),
          name: newChapterName.trim(),
          isCompleted: false
      };
      
      const updatedChapters = [...(formData.chapters || []), newChapter];
      updateProgressFromChapters(updatedChapters);
      setNewChapterName('');
  };

  const toggleChapter = (chapterId: string) => {
      const updatedChapters = (formData.chapters || []).map(c => 
          c.id === chapterId ? { ...c, isCompleted: !c.isCompleted } : c
      );
      updateProgressFromChapters(updatedChapters);
  };

  const deleteChapter = (chapterId: string) => {
      const updatedChapters = (formData.chapters || []).filter(c => c.id !== chapterId);
      updateProgressFromChapters(updatedChapters);
  };

  const updateProgressFromChapters = (chapters: Chapter[]) => {
      const total = chapters.length;
      const completed = chapters.filter(c => c.isCompleted).length;
      
      // If we have chapters, auto-calculate progress
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
      const left = total - completed;

      setFormData(prev => ({
          ...prev,
          chapters: chapters,
          progress: total > 0 ? progress : prev.progress,
          chaptersLeft: total > 0 ? left : prev.chaptersLeft
      }));
  };

  // --- Notes Management ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 500 * 1024) {
          alert("File is too large for this local demo (Max 500KB).");
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
          const base64String = reader.result as string;
          const newAttachment: Attachment = {
              name: file.name,
              type: file.type,
              size: file.size,
              data: base64String
          };
          setFormData(prev => ({
              ...prev,
              attachments: [...(prev.attachments || []), newAttachment]
          }));
      };
      reader.readAsDataURL(file);
  };

  const removeAttachment = (index: number) => {
      setFormData(prev => ({
          ...prev,
          attachments: prev.attachments?.filter((_, i) => i !== index)
      }));
  };

  const getSubjectColorIcon = (subjectName: string) => {
     const sub = subjects.find(s => s.subject === subjectName);
     if (sub) {
         return {
             bg: sub.color.split(' ')[1],
             text: sub.color.split(' ')[0],
             icon: sub.icon
         };
     }
     return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400', icon: 'menu_book' };
  };

  const progressPercent = dailyGoal > 0 ? Math.min(100, Math.round((todayStudyHours / dailyGoal) * 100)) : 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto scrollbar-hide pb-24 relative transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden">
                <img src={`https://ui-avatars.com/api/?name=${userName}&background=4A90E2&color=fff`} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Good Morning,</p>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{userName}!</h2>
            </div>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">notifications</span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
        </button>
      </header>

      <main className="pt-6 space-y-6">
        
        {/* Exam Countdown Section */}
        <div className="pl-6">
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-6 px-6 scrollbar-hide">
                {exams.map((exam, index) => {
                    // Use alternating gradients for variety
                    const gradients = [
                        'from-[#4A90E2] to-[#357ABD]',
                        'from-[#FF8C42] to-[#FF5F1F]',
                        'from-[#50C878] to-[#2E8B57]',
                        'from-[#9B59B6] to-[#8E44AD]'
                    ];
                    const bgClass = gradients[index % gradients.length];
                    const daysLeft = getDaysRemaining(exam.date);
                    
                    return (
                        <div 
                            key={exam.id} 
                            className={`snap-center shrink-0 w-[85%] sm:w-[340px] relative overflow-hidden rounded-2xl bg-gradient-to-br ${bgClass} p-6 text-white shadow-lg shadow-blue-500/10 dark:shadow-none group`}
                        >
                            <div className="absolute right-0 top-0 h-full w-2/3 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="min-w-0 pr-2">
                                        <span className="inline-block px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-sm text-xs font-semibold mb-2 border border-white/10">Major Exam</span>
                                        <h3 className="text-2xl font-bold truncate">{exam.title}</h3>
                                        <p className="text-xs opacity-80 font-medium mt-0.5">{new Date(exam.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                                    </div>
                                    <button 
                                        onClick={() => openExamModal(exam)}
                                        className="bg-white/10 backdrop-blur-md p-2 rounded-xl hover:bg-white/20 transition-colors flex-shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">edit</span>
                                    </button>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold tracking-tight">{daysLeft}</span>
                                    <span className="text-lg font-medium opacity-90">Days Remaining</span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Add Exam Card */}
                <button 
                    onClick={() => openExamModal()}
                    className="snap-center shrink-0 w-[85%] sm:w-[340px] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-primary/50 hover:text-primary transition-all group"
                >
                    <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                        <span className="material-symbols-outlined text-3xl">add_task</span>
                    </div>
                    <span className="font-bold">Add Another Exam</span>
                </button>
            </div>
        </div>

        <div className="px-6 space-y-6">
            {/* Stats Row (With Interactive Attendance) */}
            <div className="grid grid-cols-2 gap-4">
                
                {/* Interactive Attendance Card */}
                <div 
                    onClick={handleMarkAttendance}
                    className={`p-4 rounded-2xl border shadow-sm dark:shadow-none flex flex-col gap-2 transition-all cursor-pointer select-none active:scale-95 ${
                        attendanceMarked 
                        ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' 
                        : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50 ring-2 ring-indigo-500/20 shadow-md animate-pulse'
                    }`}
                >
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span className={`material-symbols-outlined text-[20px] ${attendanceMarked ? 'text-orange-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            {attendanceMarked ? 'local_fire_department' : 'fingerprint'}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider">{attendanceMarked ? 'Streak' : 'Check-In'}</span>
                    </div>
                    <div>
                        <span className={`text-2xl font-bold ${attendanceMarked ? 'text-slate-900 dark:text-white' : 'text-indigo-700 dark:text-indigo-300'}`}>
                            {streakDays} Days
                        </span>
                        <p className={`text-xs font-medium mt-1 ${attendanceMarked ? 'text-emerald-500' : 'text-indigo-500 dark:text-indigo-400'}`}>
                            {attendanceMarked ? 'Great job!' : 'Tap to mark today'}
                        </p>
                    </div>
                </div>

                {/* Daily Hours Card (Dynamic) */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col gap-2">
                    <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[20px]">timer</span>
                            <span className="text-xs font-bold uppercase tracking-wider">Today</span>
                        </div>
                        <span className="text-xs font-bold text-primary">{progressPercent}%</span>
                    </div>
                    <div>
                        <span className="text-xl font-bold text-slate-900 dark:text-white">{todayStudyHours}<span className="text-sm text-slate-400 font-normal">/{dailyGoal} hrs</span></span>
                        <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subjects Grid */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your Subjects</h3>
                    <button className="text-sm font-semibold text-primary" onClick={() => setIsModalOpen(true)}>Manage</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {subjects.map((sub, idx) => (
                        <div 
                            key={sub.id} 
                            className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border transition-all relative overflow-hidden group text-left ${activeSession?.subject === sub.subject ? 'border-primary ring-2 ring-primary/20 shadow-lg' : 'border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none hover:border-primary/30'}`}
                        >
                            <div onClick={() => openEditModal(idx)} className="cursor-pointer">
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sub.color.split(' ')[1]} ${sub.color.split(' ')[0]}`}>
                                        <span className="material-symbols-outlined">{sub.icon}</span>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSession(sub.subject);
                                            }}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                                activeSession?.subject === sub.subject
                                                ? activeSession.isActive ? 'bg-primary text-white shadow-md shadow-blue-500/30' : 'bg-primary/10 text-primary'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-primary hover:text-white'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                {activeSession?.subject === sub.subject && activeSession.isActive ? 'pause' : 'play_arrow'}
                                            </span>
                                        </button>
                                        <span className={`text-xs font-bold ${sub.color.split(' ')[0]}`}>{sub.progress}%</span>
                                    </div>
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white truncate">{sub.subject}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {sub.chapters && sub.chapters.length > 0 ? `${sub.chaptersLeft} Chapters Left` : `${sub.chaptersLeft} Chapters left`}
                                </p>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800">
                                    <div className={`h-full ${sub.color.split(' ')[0].replace('text', 'bg')}`} style={{ width: `${sub.progress}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* Add Subject */}
                    <button 
                        onClick={openAddModal}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-slate-300 transition-all active:scale-[0.98]"
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <span className="material-symbols-outlined">add</span>
                        </div>
                        <span className="text-xs font-semibold">Add Subject</span>
                    </button>
                </div>
            </div>

            {/* Up Next List (Dynamic) */}
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Up Next</h3>
                <div className="space-y-3">
                    {upcomingTasks.length > 0 ? (
                        upcomingTasks.map(task => {
                            const style = getSubjectColorIcon(task.subject);
                            return (
                                <div 
                                    key={task.id} 
                                    onClick={() => openTaskDetails(task)}
                                    className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 pr-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none cursor-pointer active:scale-[0.99] transition-transform"
                                >
                                    <div className={`w-12 h-12 rounded-xl ${style.bg} flex items-center justify-center ${style.text}`}>
                                        <span className="material-symbols-outlined">{style.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-900 dark:text-white truncate">{task.title}</h4>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{task.subject} • {task.date || 'Coming up'}</p>
                                            {task.description && (
                                                <span className="material-symbols-outlined text-[12px] text-slate-400" title="Has Notes">description</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`w-2.5 h-2.5 rounded-full ${
                                        task.priority === 'High' ? 'bg-red-400' : task.priority === 'Medium' ? 'bg-primary' : 'bg-green-400'
                                    }`}></div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-center text-sm text-slate-500">
                            No upcoming tasks. Enjoy your free time!
                        </div>
                    )}
                </div>
            </div>
        </div>
      </main>

      {/* FAB */}
      <button 
        className={`fixed right-6 w-14 h-14 bg-primary rounded-full shadow-lg shadow-blue-500/40 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 ${activeSession ? 'bottom-44' : 'bottom-24'}`}
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* Active Session Sticky Bar */}
      {activeSession && (
        <div className="fixed bottom-[85px] left-4 right-4 sm:left-6 sm:right-6 bg-slate-900 dark:bg-slate-800 text-white p-4 rounded-2xl shadow-xl z-30 flex items-center justify-between animate-[slideUp_0.3s_ease-out]">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${activeSession.isActive ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {activeSession.isActive ? 'Focusing on' : 'Session Paused'}
                    </span>
                </div>
                <div className="flex items-baseline gap-3">
                     <span className="text-3xl font-mono font-bold tracking-widest leading-none text-white">{formatTime(activeSession.time)}</span>
                     <span className="text-sm font-medium text-slate-400 truncate max-w-[120px]">{activeSession.subject}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                 <button 
                    onClick={() => toggleSession(activeSession.subject)}
                    className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all shadow-lg"
                 >
                    <span className="material-symbols-outlined text-[28px] fill-current">
                        {activeSession.isActive ? 'pause' : 'play_arrow'}
                    </span>
                 </button>
                 <button 
                    onClick={stopSession}
                    className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-red-500 hover:text-white active:scale-95 transition-all border border-white/10"
                 >
                    <span className="material-symbols-outlined text-[24px]">stop</span>
                 </button>
            </div>
        </div>
      )}

      {/* Task Details & Notes Modal */}
      {selectedTask && (
        <>
            <div 
                className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] z-50 transition-opacity"
                onClick={() => setSelectedTask(null)}
            ></div>
            <div className="absolute bottom-0 left-0 w-full bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-8 z-50 shadow-2xl animate-[slideUp_0.3s_ease-out]">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className="inline-block px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-primary dark:text-blue-300 text-[10px] font-bold uppercase tracking-wide mb-2">
                            {selectedTask.subject}
                        </span>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                            {selectedTask.title}
                        </h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                            {selectedTask.time}
                        </p>
                    </div>
                    <button 
                        onClick={() => setSelectedTask(null)}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Notes Section */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex justify-between">
                            Short Notes
                            <span className="text-[10px] text-primary font-medium">Auto-saves on 'Done'</span>
                        </label>
                        <textarea 
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            placeholder="Add notes, reminders, or formulas for this task..."
                            className="w-full h-32 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-primary outline-none resize-none leading-relaxed"
                        />
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                        <button 
                            onClick={toggleTaskComplete}
                            className={`flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                selectedTask.completed 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200' 
                                : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                            }`}
                        >
                            <span className="material-symbols-outlined">{selectedTask.completed ? 'undo' : 'check_circle'}</span>
                            {selectedTask.completed ? 'Completed' : 'Mark Complete'}
                        </button>
                        <button 
                            onClick={saveTaskNote}
                            className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </>
      )}

      {/* Subject Management Modal */}
      {isModalOpen && (
        <>
            <div 
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] z-50 transition-opacity"
                onClick={() => setIsModalOpen(false)}
            ></div>
            <div className="absolute bottom-0 left-0 w-full bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-8 z-50 shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editingIndex !== null ? 'Edit Subject' : 'Add Subject'}</h3>
                    {editingIndex !== null && (
                        <button onClick={handleDelete} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full transition-colors">
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                    )}
                </div>
                
                <div className="space-y-6">
                    {/* Basic Info */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject Name</label>
                        <input 
                            type="text" 
                            value={formData.subject}
                            onChange={(e) => setFormData({...formData, subject: e.target.value})}
                            placeholder="e.g. Biology" 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none font-medium" 
                        />
                    </div>

                    {/* Chapter Management */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                             <label className="block text-xs font-bold text-slate-500 uppercase">Chapters & Topics</label>
                             <span className="text-[10px] text-primary font-bold">{formData.chapters?.filter(c => c.isCompleted).length}/{formData.chapters?.length} Done</span>
                        </div>
                        
                        {/* List of Chapters */}
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-3">
                            {(formData.chapters && formData.chapters.length > 0) ? (
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {formData.chapters.map((ch) => (
                                        <div key={ch.id} className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-slate-700/50 transition-colors">
                                            <button 
                                                onClick={() => toggleChapter(ch.id)}
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${ch.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800'}`}
                                            >
                                                {ch.isCompleted && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
                                            </button>
                                            <span className={`flex-1 text-sm font-medium ${ch.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{ch.name}</span>
                                            <button 
                                                onClick={() => deleteChapter(ch.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-xs text-slate-400 italic">
                                    No chapters added yet.
                                </div>
                            )}
                        </div>

                        {/* Add Chapter Input */}
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                placeholder="Add new chapter..."
                                value={newChapterName}
                                onChange={(e) => setNewChapterName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addChapter()}
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none dark:text-white"
                            />
                            <button 
                                onClick={addChapter}
                                className="bg-slate-900 dark:bg-slate-700 text-white rounded-xl px-4 font-bold text-sm shadow-md shadow-slate-900/10 active:scale-95 transition-transform"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Progress Manual Override (Only if no chapters) */}
                    {(!formData.chapters || formData.chapters.length === 0) && (
                        <div className="flex gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-900/30 animate-[fadeIn_0.3s_ease-out]">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase mb-1">Chapters Left</label>
                                <input 
                                    type="number" 
                                    value={formData.chaptersLeft}
                                    onChange={(e) => setFormData({...formData, chaptersLeft: parseInt(e.target.value) || 0})}
                                    className="w-full bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-900 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-yellow-400 outline-none" 
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase mb-1">Progress (%)</label>
                                <input 
                                    type="number" 
                                    min="0" max="100"
                                    value={formData.progress}
                                    onChange={(e) => setFormData({...formData, progress: parseInt(e.target.value) || 0})}
                                    className="w-full bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-900 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-yellow-400 outline-none" 
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* Notes / Attachments */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject Notes</label>
                        <div className="bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors relative cursor-pointer mb-3">
                            <input 
                                type="file" 
                                accept=".pdf,image/*,.doc,.docx"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center gap-1">
                                <span className="material-symbols-outlined text-slate-400">cloud_upload</span>
                                <span className="text-xs font-bold text-slate-500">Attach PDF / Images</span>
                            </div>
                        </div>
                        {formData.attachments && formData.attachments.length > 0 && (
                            <div className="space-y-2">
                                {formData.attachments.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="material-symbols-outlined text-sm text-red-400">description</span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <a 
                                                href={file.data}
                                                download={file.name}
                                                className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">download</span>
                                            </a>
                                            <button 
                                                onClick={() => removeAttachment(idx)}
                                                className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Styling */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Appearance</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2">
                            {COLORS.map((c) => (
                                <button 
                                    key={c.name}
                                    onClick={() => setFormData({...formData, color: c.class})}
                                    className={`w-8 h-8 rounded-full ${c.bg} flex-shrink-0 flex items-center justify-center transition-transform ${formData.color === c.class ? 'ring-2 ring-offset-2 ring-blue-100 scale-110' : 'opacity-70 hover:opacity-100'}`}
                                >
                                    {formData.color === c.class && <span className="material-symbols-outlined text-white text-sm">check</span>}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {ICONS.map((icon) => (
                                <button 
                                    key={icon}
                                    onClick={() => setFormData({...formData, icon: icon})}
                                    className={`w-8 h-8 rounded-lg border flex-shrink-0 flex items-center justify-center transition-colors ${formData.icon === icon ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">{icon}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleSave}
                        className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform mt-2"
                    >
                        {editingIndex !== null ? 'Save Changes' : 'Add Subject'}
                    </button>
                </div>
            </div>
        </>
      )}

      {/* Exam Configuration Modal */}
      {isExamModalOpen && (
        <>
            <div 
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] z-50 transition-opacity"
                onClick={() => setIsExamModalOpen(false)}
            ></div>
            <div className="absolute bottom-0 left-0 w-full bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-8 z-50 shadow-2xl animate-[slideUp_0.3s_ease-out]">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editingExam ? 'Edit Exam' : 'Add Exam'}</h3>
                    {editingExam && (
                        <button 
                            onClick={handleDeleteExam} 
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full transition-colors"
                        >
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                    )}
                </div>
                
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Exam Name</label>
                        <input 
                            type="text" 
                            value={examForm.title}
                            onChange={(e) => setExamForm({...examForm, title: e.target.value})}
                            placeholder="e.g. SAT Finals" 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none font-medium" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Exam Date</label>
                        <input 
                            type="date" 
                            value={examForm.date}
                            onChange={(e) => setExamForm({...examForm, date: e.target.value})}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none font-medium" 
                        />
                    </div>
                    
                    <button 
                        onClick={handleSaveExam}
                        className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform mt-2"
                    >
                        {editingExam ? 'Update Exam' : 'Create Exam'}
                    </button>
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default DashboardScreen;