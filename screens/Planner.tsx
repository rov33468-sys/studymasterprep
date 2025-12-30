import React, { useState, useEffect } from 'react';
import { Task, Exam } from '../types';
import { storageService } from '../services/storage';
import { notificationService } from '../services/notification';

interface PlannerScreenProps {
  onBack?: () => void;
}

const PlannerScreen: React.FC<PlannerScreenProps> = ({ onBack }) => {
  const [view, setView] = useState<'Month' | 'Week'>('Month'); 
  
  // Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  
  // Task Detail Modal State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [noteInput, setNoteInput] = useState('');

  // Reminder State
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const [reminderConfig, setReminderConfig] = useState({
    enabled: true,
    frequency: 'Daily',
    time: '08:00',
    days: ['M', 'W', 'F']
  });

  useEffect(() => {
    storageService.init();
    setTasks(storageService.getTasks());
    setExams(storageService.getExams());
    
    // Load saved reminder config
    const savedConfig = storageService.getReminderConfig();
    setReminderConfig(savedConfig);
    setRemindersEnabled(savedConfig.enabled);
  }, []);

  const saveConfig = (newConfig: any) => {
      setReminderConfig(newConfig);
      storageService.saveReminderConfig(newConfig);
  };

  const handleToggleReminders = async () => {
      const newState = !remindersEnabled;
      setRemindersEnabled(newState);
      saveConfig({ ...reminderConfig, enabled: newState });

      if (newState) {
          const granted = await notificationService.requestPermission();
          if (!granted) {
              alert("Please enable notifications in your browser settings to receive alerts.");
          }
      }
  };

  // --- Task Detail & Notes Logic ---
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
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      setSelectedTask(null);
  };

  const toggleTaskComplete = () => {
      if (!selectedTask) return;
      const updatedTask = { ...selectedTask, completed: !selectedTask.completed };
      storageService.saveTask(updatedTask);
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      setSelectedTask(updatedTask); // Keep modal open with updated state
  };

  // --- Calendar Logic ---
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const getEventsForDay = (day: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = checkDate.toDateString(); 
    
    const dayTasks = tasks.filter(t => {
        if (!t.rawDate) return false;
        return new Date(t.rawDate).toDateString() === dateStr;
    });

    const dayExams = exams.filter(e => {
        return new Date(e.date).toDateString() === dateStr;
    });

    return { tasks: dayTasks, exams: dayExams, hasEvent: dayTasks.length > 0 || dayExams.length > 0 };
  };

  const daysInCurrentMonth = getDaysInMonth(currentDate);
  const startDay = getFirstDayOfMonth(currentDate);
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getSelectedDayEvents = () => {
     const dateStr = selectedDate.toDateString();
     
     const selectedTasks = tasks.filter(t => {
         if (!t.rawDate) return false;
         return new Date(t.rawDate).toDateString() === dateStr;
     });

     const selectedExams = exams.filter(e => {
         return new Date(e.date).toDateString() === dateStr;
     });

     return { tasks: selectedTasks, exams: selectedExams };
  };

  const { tasks: timelineTasks, exams: timelineExams } = getSelectedDayEvents();

  const formatMonthYear = (date: Date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const formatTimeDisplay = (time: string) => {
    if (!time) return '';
    if (time.includes('AM') || time.includes('PM')) return time; 
    const [h, m] = time.split(':');
    let hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${m} ${ampm}`;
  };

  const getReminderSubtitle = () => {
      if (!remindersEnabled) return 'Disabled';
      if (reminderConfig.frequency === 'Daily') return `Every day at ${formatTimeDisplay(reminderConfig.time)}`;
      if (reminderConfig.days.length === 0) return 'No days selected';
      if (reminderConfig.days.length === 7) return `Every day at ${formatTimeDisplay(reminderConfig.time)}`;
      return `${reminderConfig.days.join(', ')} • ${formatTimeDisplay(reminderConfig.time)}`;
  };

  const toggleDay = (day: string) => {
      const currentDays = reminderConfig.days || [];
      const newDays = currentDays.includes(day) 
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day];
      
      saveConfig({ ...reminderConfig, days: newDays });
  };
  
  const weekDayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative transition-colors">
      <header className="px-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
         <button 
            onClick={onBack}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${onBack ? 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300' : 'text-slate-900 dark:text-white cursor-default'}`}
         >
            <span className="material-symbols-outlined">{onBack ? 'arrow_back' : 'calendar_month'}</span>
         </button>
         <h2 className="text-lg font-bold text-slate-900 dark:text-white">Study Planner</h2>
         <div className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
            <span className="material-symbols-outlined">settings</span>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        {/* Toggle */}
        <div className="px-4 py-4 bg-white dark:bg-slate-900">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex">
                <button 
                    onClick={() => setView('Month')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'Month' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    Month
                </button>
                <button 
                    onClick={() => setView('Week')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'Week' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    Week
                </button>
            </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white dark:bg-slate-900 px-4 pb-6 border-b border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex items-center justify-between mb-4 px-2">
                <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><span className="material-symbols-outlined">chevron_left</span></button>
                <span className="text-base font-bold text-slate-900 dark:text-white">{formatMonthYear(currentDate)}</span>
                <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
            
            <div className="grid grid-cols-7 gap-y-3 text-center">
                {weekDays.map((d, i) => <div key={i} className="text-[11px] font-bold text-slate-400 uppercase">{d}</div>)}
                
                {/* Empty placeholders */}
                {Array.from({ length: startDay }).map((_, i) => (
                    <div key={`empty-${i}`}></div>
                ))}
                
                {/* Days */}
                {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                    const day = i + 1;
                    const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const isSelected = isSameDay(thisDate, selectedDate);
                    const isToday = isSameDay(thisDate, new Date());
                    const { hasEvent, exams: dayExams } = getEventsForDay(day);
                    
                    const dotColor = dayExams.length > 0 ? 'bg-red-400' : 'bg-primary';

                    return (
                        <div key={day} className="flex justify-center relative">
                            <button 
                                onClick={() => setSelectedDate(thisDate)}
                                className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-all ${
                                    isSelected 
                                    ? 'bg-primary text-white shadow-md shadow-blue-500/30 scale-105' 
                                    : isToday 
                                        ? 'bg-slate-100 dark:bg-slate-800 text-primary font-bold'
                                        : 'text-slate-900 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                {day}
                            </button>
                            {hasEvent && !isSelected && <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${dotColor}`}></span>}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Reminders Toggle & Settings */}
        <div className="px-4 py-4">
            <div 
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => setShowReminderSettings(true)}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${remindersEnabled ? 'bg-blue-50 dark:bg-blue-900/30 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <span className="material-symbols-outlined">notifications_active</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">Study Reminders</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{getReminderSubtitle()}</p>
                    </div>
                </div>
                {/* Toggle Switch */}
                <div 
                    className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors ${remindersEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggleReminders();
                    }}
                >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${remindersEnabled ? 'right-1' : 'left-1'}`}></div>
                </div>
            </div>
        </div>

        {/* Timeline */}
        <div className="px-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isSameDay(selectedDate, new Date()) ? "Today's Schedule" : `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Schedule`}
                </h3>
            </div>

            <div className="space-y-0">
                {timelineExams.map((exam) => (
                    <div key={exam.id} className="flex gap-4 mb-4">
                        <div className="flex flex-col items-center pt-1 w-12 shrink-0">
                             <span className="text-[10px] font-bold text-red-500 uppercase">EXAM</span>
                            <div className="w-px h-full bg-slate-200 dark:bg-slate-700 mt-2"></div>
                        </div>
                         <div className="flex-1 pb-2">
                             <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4 rounded-xl shadow-lg shadow-orange-500/20 dark:shadow-none text-white">
                                <h4 className="font-bold text-lg">{exam.title}</h4>
                                <p className="text-xs opacity-90 mt-1">Major Exam • Good Luck!</p>
                             </div>
                         </div>
                    </div>
                ))}

                {timelineTasks.map((task) => (
                    <div 
                        key={task.id} 
                        className="flex gap-4 cursor-pointer active:scale-[0.99] transition-transform"
                        onClick={() => openTaskDetails(task)}
                    >
                        <div className="flex flex-col items-center pt-1 w-12 shrink-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{formatTimeDisplay(task.time).split(' ')[0]}</span>
                            <span className="text-[10px] text-slate-400">{formatTimeDisplay(task.time).split(' ')[1]}</span>
                            <div className="w-px h-full bg-slate-200 dark:bg-slate-700 mt-2 min-h-[40px]"></div>
                        </div>
                        <div className="flex-1 pb-6">
                            <div className={`bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 shadow-sm dark:shadow-none relative group hover:shadow-md transition-all ${task.priority === 'High' ? 'border-l-red-500' : task.priority === 'Medium' ? 'border-l-primary' : 'border-l-emerald-500'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                                task.priority === 'High' ? 'bg-red-50 dark:bg-red-900/30 text-red-500' : 'bg-blue-50 dark:bg-blue-900/30 text-primary'
                                            }`}>
                                                {task.subject}
                                            </span>
                                            {task.completed && (
                                                <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[10px]">check</span> Done
                                                </span>
                                            )}
                                        </div>
                                        <h4 className={`font-bold text-slate-900 dark:text-white ${task.completed ? 'line-through text-slate-400' : ''}`}>{task.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{task.tag ? task.tag : 'Study Session'}</p>
                                            {task.description && (
                                                <span className="flex items-center gap-0.5 text-slate-400 dark:text-slate-500">
                                                    <span className="material-symbols-outlined text-[14px]">description</span>
                                                    <span className="text-[10px] font-semibold">Notes</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">chevron_right</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {timelineTasks.length === 0 && timelineExams.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                             <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">event_busy</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">No events for this day</p>
                        <p className="text-xs text-slate-400">Enjoy your free time or add a task!</p>
                    </div>
                )}
            </div>
        </div>
      </div>
       <button 
         onClick={() => setShowReminderSettings(true)}
         className="absolute bottom-24 right-6 w-14 h-14 bg-primary rounded-full shadow-lg shadow-blue-500/40 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
       >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

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

      {/* Reminder Config Modal */}
      {showReminderSettings && (
        <>
            <div 
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] z-50 transition-opacity"
                onClick={() => setShowReminderSettings(false)}
            ></div>
            <div className="absolute bottom-0 left-0 w-full bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-8 z-50 shadow-2xl animate-[slideUp_0.3s_ease-out]">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Reminder Settings</h3>
                     <div 
                        className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors ${remindersEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                        onClick={handleToggleReminders}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${remindersEnabled ? 'right-1' : 'left-1'}`}></div>
                    </div>
                </div>

                <div className={`space-y-6 ${!remindersEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    {/* Frequency */}
                    <div className="bg-slate-50 dark:bg-slate-800 p-1 rounded-xl flex">
                        {['Daily', 'Weekly'].map(f => (
                            <button
                                key={f}
                                onClick={() => saveConfig({...reminderConfig, frequency: f as any})}
                                className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${reminderConfig.frequency === f ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-slate-400'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Time Picker */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Time</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400">schedule</span>
                            <input 
                                type="time"
                                value={reminderConfig.time}
                                onChange={(e) => saveConfig({...reminderConfig, time: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 dark:text-white font-bold focus:ring-1 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>

                    {/* Days Selector (Only for Weekly) */}
                    {reminderConfig.frequency === 'Weekly' && (
                        <div className="animate-[fadeIn_0.2s_ease-out]">
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Repeats On</label>
                             <div className="flex justify-between">
                                {weekDayLabels.map((day, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => toggleDay(day)}
                                        className={`w-10 h-10 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                                            reminderConfig.days.includes(day) 
                                            ? 'bg-primary text-white shadow-md shadow-blue-500/30' 
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                             </div>
                        </div>
                    )}
                </div>

                <button 
                    onClick={() => setShowReminderSettings(false)}
                    className="w-full bg-slate-900 dark:bg-slate-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-900/10 active:scale-[0.98] transition-transform mt-8"
                >
                    Done
                </button>
            </div>
        </>
      )}
    </div>
  );
};

export default PlannerScreen;