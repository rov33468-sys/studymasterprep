import React, { useState, useEffect } from 'react';
import { Task, Attachment } from '../types';
import { storageService } from '../services/storage';

interface TasksScreenProps {
  onBack?: () => void;
}

const TasksScreen: React.FC<TasksScreenProps> = ({ onBack }) => {
  const [showNewTask, setShowNewTask] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortByPriority, setSortByPriority] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Data from DB
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    // Initialize DB if needed
    storageService.init();
    // Fetch data
    setTasks(storageService.getTasks());
  }, []);

  const [newTaskData, setNewTaskData] = useState<Partial<Task>>({
    title: '',
    description: '',
    subject: 'Biology',
    priority: 'Medium',
    date: '',
    time: '10:00',
    tag: '',
    attachments: [],
    recurrence: { frequency: 'Daily', endDate: '' }
  });
  
  const [isRecurring, setIsRecurring] = useState(false);

  // Helper to convert 12h to 24h
  const convertTo24Hour = (time12h?: string) => {
    if (!time12h) return '10:00';
    if (!time12h.includes('AM') && !time12h.includes('PM')) return '10:00';
    
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') {
      hours = '00';
    }
    if (modifier === 'PM') {
      hours = (parseInt(hours, 10) + 12).toString();
    }
    return `${hours.padStart(2, '0')}:${minutes}`;
  };

  // Helper 24h to 12h
  const convertTo12Hour = (time24h: string) => {
    if (!time24h) return '10:00 AM';
    const [hours, minutes] = time24h.split(':');
    let h = parseInt(hours, 10);
    const modifier = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${modifier}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Limit size to ~500KB to prevent localStorage crash
      if (file.size > 500 * 1024) {
          alert("File is too large for this local demo (Max 500KB). Please select a smaller file.");
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
          
          setNewTaskData(prev => ({
              ...prev,
              attachments: [...(prev.attachments || []), newAttachment]
          }));
      };
      reader.readAsDataURL(file);
  };

  const removeAttachment = (index: number) => {
      setNewTaskData(prev => ({
          ...prev,
          attachments: prev.attachments?.filter((_, i) => i !== index)
      }));
  };

  const handleSaveTask = () => {
    if (!newTaskData.title) return;
    
    let dateStr = 'Today';
    let rawDateStr = new Date().toISOString();

    // Logic to determine date string for display
    if (newTaskData.date) {
        const inputDate = new Date(newTaskData.date + 'T00:00:00'); 
        rawDateStr = inputDate.toISOString();
        const todayDate = new Date();
        todayDate.setHours(0,0,0,0);
        
        const tomorrowDate = new Date(todayDate);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);

        if (inputDate.getTime() === todayDate.getTime()) {
            dateStr = 'Today';
        } else if (inputDate.getTime() === tomorrowDate.getTime()) {
            dateStr = 'Tomorrow';
        } else {
            dateStr = inputDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    } else if (editingTaskId) {
        // Keep original date if not edited
        const original = tasks.find(t => t.id === editingTaskId);
        if (original) {
            dateStr = original.date || 'Today';
            rawDateStr = original.rawDate || new Date().toISOString();
        }
    }
    
    const taskPayload: Task = {
      id: editingTaskId || Date.now().toString(),
      title: newTaskData.title!,
      description: newTaskData.description || '',
      subject: newTaskData.subject || 'General',
      priority: newTaskData.priority as 'High'|'Medium'|'Low',
      time: convertTo12Hour(newTaskData.time || '10:00'),
      date: dateStr,
      rawDate: rawDateStr,
      completed: editingTaskId ? tasks.find(t => t.id === editingTaskId)?.completed || false : false,
      tag: (newTaskData.tag || 'GENERAL').toUpperCase(),
      attachments: newTaskData.attachments || [],
      recurrence: isRecurring ? {
          frequency: newTaskData.recurrence?.frequency || 'Daily',
          endDate: newTaskData.recurrence?.endDate
      } : undefined
    };

    // Save to DB
    const updatedTasks = storageService.saveTask(taskPayload);
    setTasks(updatedTasks);
    
    // Update selected task view if open
    if (selectedTask && editingTaskId === selectedTask.id) {
        setSelectedTask(taskPayload);
    }

    closeForm();
  };

  const closeForm = () => {
      setShowNewTask(false);
      setEditingTaskId(null);
      setNewTaskData({
        title: '',
        description: '',
        subject: 'Biology',
        priority: 'Medium',
        date: '',
        time: '10:00',
        tag: '',
        attachments: [],
        recurrence: { frequency: 'Daily', endDate: '' }
      });
      setIsRecurring(false);
  };

  const handleDeleteTask = (id: string) => {
      const updatedTasks = storageService.deleteTask(id);
      setTasks(updatedTasks);
      setSelectedTask(null);
  };

  const openEditForm = (task: Task) => {
    setEditingTaskId(task.id);
    
    // Reverse engineer date string to YYYY-MM-DD for input
    let formDate = '';
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (task.date === 'Today') {
        const offset = now.getTimezoneOffset();
        const local = new Date(now.getTime() - (offset*60*1000));
        formDate = local.toISOString().split('T')[0];
    } else if (task.date === 'Tomorrow') {
        const tmrw = new Date(now);
        tmrw.setDate(tmrw.getDate() + 1);
        const offset = tmrw.getTimezoneOffset();
        const local = new Date(tmrw.getTime() - (offset*60*1000));
        formDate = local.toISOString().split('T')[0];
    } else if (task.date) {
         const d = new Date(`${task.date} ${currentYear}`);
         if (!isNaN(d.getTime())) {
             const offset = d.getTimezoneOffset();
             const local = new Date(d.getTime() - (offset*60*1000));
             formDate = local.toISOString().split('T')[0];
         }
    }

    setNewTaskData({
        title: task.title,
        description: task.description || '',
        subject: task.subject,
        priority: task.priority,
        date: formDate,
        time: convertTo24Hour(task.time),
        tag: task.tag,
        attachments: task.attachments || [],
        recurrence: task.recurrence || { frequency: 'Daily', endDate: '' }
    });
    setIsRecurring(!!task.recurrence);
    // Don't close selected task, just open form on top or close selected?
    // Let's close selected task detail to show form clearly
    setSelectedTask(null);
    setShowNewTask(true);
  };

  const toggleComplete = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
        const updatedTask = { ...task, completed: !task.completed };
        const updatedList = storageService.saveTask(updatedTask);
        setTasks(updatedList);
        
        if (selectedTask && selectedTask.id === id) {
            setSelectedTask(updatedTask);
        }
    }
  };

  // Logic
  const filterOptions = ['All', 'High', 'Medium', 'Low'];
  
  const getFilteredTasks = () => {
    return tasks.filter(t => {
        const matchesFilter = activeFilter === 'All' || t.priority === activeFilter;
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = t.title.toLowerCase().includes(searchLower) || 
                              (t.tag && t.tag.toLowerCase().includes(searchLower));
        return matchesFilter && matchesSearch;
    });
  };

  const getSortedTasks = (filtered: Task[]) => {
    if (!sortByPriority) return filtered;
    
    const priorityWeight = { High: 3, Medium: 2, Low: 1 };
    return [...filtered].sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
  };

  const processedTasks = getSortedTasks(getFilteredTasks());
  
  const todayTasks = processedTasks.filter(t => t.date === 'Today');
  const tomorrowTasks = processedTasks.filter(t => t.date === 'Tomorrow');
  const upcomingTasks = processedTasks.filter(t => t.date !== 'Today' && t.date !== 'Tomorrow');

  const getPriorityColor = (p: string) => {
      switch(p) {
          case 'High': return 'bg-red-400 ring-4 ring-red-100 dark:ring-red-900/30';
          case 'Medium': return 'bg-primary ring-4 ring-blue-100 dark:ring-blue-900/30';
          case 'Low': return 'bg-accent ring-4 ring-green-100 dark:ring-green-900/30';
          default: return 'bg-slate-300';
      }
  };

  const getSubjectColor = (subject: string) => {
      const map: Record<string, string> = {
          'Physics': 'bg-blue-50 dark:bg-blue-900/30 text-primary dark:text-blue-300',
          'Mathematics': 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300',
          'Chemistry': 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300',
          'English': 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
      };
      return map[subject] || 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
  };

  const renderTask = (task: Task) => (
    <div 
        key={task.id} 
        onClick={() => setSelectedTask(task)}
        className={`bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-800 flex items-center gap-4 group active:scale-[0.99] transition-all cursor-pointer ${task.completed ? 'opacity-60' : ''}`}
    >
        <button 
            onClick={(e) => { e.stopPropagation(); toggleComplete(task.id); }}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${task.completed ? 'bg-accent border-accent' : 'border-slate-300 dark:border-slate-600 hover:border-primary'}`}
        >
            {task.completed && <span className="material-symbols-outlined text-white text-[16px] font-bold">check</span>}
        </button>
        <div className="flex-1">
            <h4 className={`font-bold text-slate-900 dark:text-white ${task.completed ? 'line-through text-slate-500' : ''}`}>{task.title}</h4>
            <div className="flex items-center gap-2 mt-1">
                {task.tag && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getSubjectColor(task.subject)}`}>{task.tag}</span>
                )}
                <span className={`text-xs ${task.completed ? 'text-slate-300' : 'text-slate-400'}`}>• {task.date === 'Today' || task.date === 'Tomorrow' ? task.time : task.date}</span>
                {task.attachments && task.attachments.length > 0 && (
                     <span className="flex items-center gap-0.5 text-slate-400">
                         <span className="material-symbols-outlined text-[14px]">attach_file</span>
                         <span className="text-[10px] font-bold">{task.attachments.length}</span>
                     </span>
                )}
            </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} title={`${task.priority} Priority`}></div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative transition-colors">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 bg-white dark:bg-slate-900 sticky top-0 z-20 shadow-sm dark:shadow-none dark:border-b dark:border-slate-800 transition-colors">
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
                {onBack && (
                    <button 
                        onClick={onBack}
                        className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                )}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Schedule</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage your tasks & priorities</p>
                </div>
            </div>
            <button className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-accent rounded-full ring-2 ring-white dark:ring-slate-900"></span>
            </button>
        </div>
        
        <div className="flex gap-2">
             {/* Search */}
            <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-3.5 text-slate-400">search</span>
                <input 
                    type="text" 
                    placeholder="Search tasks..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder-slate-400"
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                )}
            </div>
            {/* Sort Toggle */}
            <button 
                onClick={() => setSortByPriority(!sortByPriority)}
                className={`px-4 rounded-xl flex items-center gap-2 text-sm font-semibold transition-colors ${sortByPriority ? 'bg-primary text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700'}`}
            >
                <span className="material-symbols-outlined text-[20px]">sort</span>
                <span className="hidden sm:inline">Priority</span>
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 pb-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-[152px] z-10 pt-2 transition-colors">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {filterOptions.map((filter) => (
                <button 
                    key={filter} 
                    onClick={() => setActiveFilter(filter)}
                    className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        activeFilter === filter 
                        ? 'bg-primary text-white shadow-md shadow-blue-500/20' 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                    {filter}
                </button>
            ))}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-24 scrollbar-hide">
        {todayTasks.length > 0 && (
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Today</h3>
                <div className="space-y-3">
                    {todayTasks.map(renderTask)}
                </div>
            </div>
        )}

        {tomorrowTasks.length > 0 && (
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 mt-2">Tomorrow</h3>
                <div className="space-y-3">
                    {tomorrowTasks.map(renderTask)}
                </div>
            </div>
        )}
        
        {upcomingTasks.length > 0 && (
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 mt-2">Upcoming</h3>
                <div className="space-y-3">
                    {upcomingTasks.map(renderTask)}
                </div>
            </div>
        )}
        
        {processedTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-300 dark:text-slate-600">
                    <span className="material-symbols-outlined text-3xl">inbox</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">{searchQuery ? 'No matching tasks found' : 'No tasks found'}</p>
            </div>
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={() => setShowNewTask(true)}
        className="absolute bottom-6 right-6 z-20 w-14 h-14 bg-primary rounded-full shadow-lg shadow-blue-500/40 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* Task Details Modal */}
      {selectedTask && (
        <>
           <div 
                className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] z-40 transition-opacity"
                onClick={() => setSelectedTask(null)}
            ></div>
            <div className="absolute bottom-0 left-0 w-full bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-8 z-50 shadow-2xl animate-[slideUp_0.3s_ease-out]">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                        <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide mb-2 ${getSubjectColor(selectedTask.subject)}`}>
                            {selectedTask.subject}
                        </span>
                        <h2 className={`text-2xl font-bold text-slate-900 dark:text-white leading-tight ${selectedTask.completed ? 'line-through text-slate-400' : ''}`}>
                            {selectedTask.title}
                        </h2>
                    </div>
                    <button 
                        onClick={() => setSelectedTask(null)}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <div className="space-y-5">
                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Due Date</p>
                            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                                <span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
                                <span className="text-sm font-semibold">{selectedTask.date}</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Time</p>
                            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                                <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                                <span className="text-sm font-semibold">{selectedTask.time}</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                             <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Priority</p>
                             <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${getPriorityColor(selectedTask.priority).split(' ')[0]}`}></div>
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{selectedTask.priority}</span>
                             </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                             <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Recurrence</p>
                             <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                                <span className="material-symbols-outlined text-[18px] text-slate-400">repeat</span>
                                <span className="text-sm font-semibold">{selectedTask.recurrence?.frequency || 'None'}</span>
                             </div>
                        </div>
                    </div>

                    {/* Description */}
                    {selectedTask.description && (
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                             <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Notes</p>
                             <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedTask.description}</p>
                        </div>
                    )}

                    {/* Attachments Section (In Details) */}
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Attached Files</p>
                        {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
                            <div className="space-y-2">
                                {selectedTask.attachments.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center shrink-0">
                                                 <span className="material-symbols-outlined">picture_as_pdf</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{file.name}</p>
                                                <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </div>
                                        <a 
                                            href={file.data} 
                                            download={file.name}
                                            className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-primary flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-600"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">download</span>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-slate-400 italic">No notes attached.</div>
                        )}
                    </div>

                    {/* Tag */}
                    {selectedTask.tag && (
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Tag</p>
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800">
                                <span className="material-symbols-outlined text-[14px] mr-1.5">label</span>
                                {selectedTask.tag}
                            </span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-8">
                    <button 
                        onClick={() => toggleComplete(selectedTask.id)}
                        className={`flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                            selectedTask.completed 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200' 
                            : 'bg-primary text-white shadow-lg shadow-blue-500/20'
                        }`}
                    >
                        <span className="material-symbols-outlined">{selectedTask.completed ? 'undo' : 'check_circle'}</span>
                        {selectedTask.completed ? 'Mark Incomplete' : 'Mark Complete'}
                    </button>
                    <button 
                        onClick={() => openEditForm(selectedTask)}
                        className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button 
                         onClick={() => handleDeleteTask(selectedTask.id)}
                         className="w-14 h-14 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <span className="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>
        </>
      )}

      {/* New/Edit Task Bottom Sheet */}
      {showNewTask && (
        <>
            <div 
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] z-30 transition-opacity"
                onClick={closeForm}
            ></div>
            <div className="absolute bottom-0 left-0 w-full bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-8 z-40 shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{editingTaskId ? 'Edit Task' : 'New Task'}</h3>
                
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleSaveTask(); }}>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Title</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Biology Final" 
                            value={newTaskData.title}
                            onChange={(e) => setNewTaskData({...newTaskData, title: e.target.value})}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none" 
                        />
                    </div>
                    
                    {/* Description Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notes / Description</label>
                        <textarea 
                            placeholder="Add details about this task..." 
                            value={newTaskData.description || ''}
                            onChange={(e) => setNewTaskData({...newTaskData, description: e.target.value})}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none min-h-[100px] resize-none text-sm" 
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Due Date</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-3 text-slate-400 z-10">calendar_today</span>
                                <input 
                                    type="date" 
                                    value={newTaskData.date}
                                    onChange={(e) => setNewTaskData({...newTaskData, date: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none relative" 
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Time</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-3 text-slate-400 z-10">schedule</span>
                                <input 
                                    type="time" 
                                    value={newTaskData.time}
                                    onChange={(e) => setNewTaskData({...newTaskData, time: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none relative" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400">expand_more</span>
                                <select 
                                    value={newTaskData.subject}
                                    onChange={(e) => setNewTaskData({...newTaskData, subject: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none appearance-none"
                                >
                                    <option>Biology</option>
                                    <option>Physics</option>
                                    <option>Math</option>
                                    <option>Chemistry</option>
                                    <option>English</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tag</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Exam" 
                                value={newTaskData.tag}
                                onChange={(e) => setNewTaskData({...newTaskData, tag: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none" 
                            />
                        </div>
                    </div>

                    {/* Attachments Upload */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Attach Note (PDF/Img)</label>
                        <div className="bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors relative cursor-pointer">
                            <input 
                                type="file" 
                                accept=".pdf,image/*,.doc,.docx"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center gap-1">
                                <span className="material-symbols-outlined text-slate-400">cloud_upload</span>
                                <span className="text-xs font-bold text-slate-500">Tap to upload PDF</span>
                            </div>
                        </div>
                        {/* File List */}
                        {newTaskData.attachments && newTaskData.attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {newTaskData.attachments.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="material-symbols-outlined text-sm text-red-500">picture_as_pdf</span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => removeAttachment(idx)}
                                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recurrence Toggle */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isRecurring ? 'bg-primary text-white' : 'bg-white dark:bg-slate-700 text-slate-400 border border-slate-200 dark:border-slate-600'}`}>
                                <span className="material-symbols-outlined text-[18px]">repeat</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Repeat Task</h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">Create recurring copies</p>
                            </div>
                        </div>
                        <div 
                            className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${isRecurring ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                            onClick={() => setIsRecurring(!isRecurring)}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                    </div>

                    {/* Recurrence Options */}
                    {isRecurring && (
                        <div className="flex gap-4 animate-[fadeIn_0.3s_ease-out]">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Frequency</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400">expand_more</span>
                                    <select 
                                        value={newTaskData.recurrence?.frequency || 'Daily'}
                                        onChange={(e) => setNewTaskData({...newTaskData, recurrence: { ...newTaskData.recurrence, frequency: e.target.value as any }})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none appearance-none"
                                    >
                                        <option>Daily</option>
                                        <option>Weekly</option>
                                        <option>Monthly</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">End Date</label>
                                <input 
                                    type="date" 
                                    value={newTaskData.recurrence?.endDate || ''}
                                    onChange={(e) => setNewTaskData({...newTaskData, recurrence: { ...newTaskData.recurrence!, endDate: e.target.value }})}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none" 
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Priority</label>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            {['Low', 'Medium', 'High'].map((p) => (
                                <button 
                                    key={p} 
                                    type="button" 
                                    onClick={() => setNewTaskData({...newTaskData, priority: p as any})}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${newTaskData.priority === p ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        type="button" 
                        onClick={handleSaveTask}
                        className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform mt-2"
                    >
                        {editingTaskId ? 'Save Changes' : 'Create Task'}
                    </button>
                </form>
            </div>
        </>
      )}
    </div>
  );
};

export default TasksScreen;