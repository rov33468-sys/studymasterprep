import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { storageService } from '../services/storage';
import { SubjectProgress, StudyLog } from '../types';

interface ProgressScreenProps {
  onBack?: () => void;
}

const ProgressScreen: React.FC<ProgressScreenProps> = ({ onBack }) => {
  const [pieData, setPieData] = useState([
    { name: 'Completed', value: 0 },
    { name: 'Remaining', value: 100 },
  ]);
  const pieColors = ['#4A90E2', '#E2E8F0']; // Dynamic colors usually better handled via CSS variables but staying simple

  const [barData, setBarData] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'This Week' | 'Last Week' | 'Month'>('This Week');

  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  
  const [logData, setLogData] = useState({
    subject: '',
    duration: '',
    date: new Date().toISOString().split('T')[0]
  });

  const calculateAchievements = (logs: StudyLog[], currentSubjects: SubjectProgress[]) => {
      // 1. Streak
      const streak = storageService.getStreak();
      
      // 2. Early Bird (Logged a session created between 4 AM and 9 AM local time)
      const hasEarlyMorningLog = logs.some(l => {
          const date = new Date(l.timestamp);
          const hour = date.getHours();
          return hour >= 4 && hour < 9;
      });

      // 3. Weekend Warrior (Study on Sat or Sun)
      const hasWeekendLog = logs.some(l => {
          const day = new Date(l.date).getDay();
          return day === 0 || day === 6; // 0 is Sun, 6 is Sat
      });

      // 4. Subject Master (Any subject > 90% progress)
      const hasMasteredSubject = currentSubjects.some(s => s.progress >= 90);

      return [
        { 
            icon: 'local_fire_department', 
            color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-100 dark:border-orange-900/50', 
            title: '7-Day Streak', 
            status: streak >= 7 ? 'Active' : `${streak}/7 Days`, 
            statusColor: streak >= 7 ? 'text-accent' : 'text-slate-400',
            opacity: streak >= 7 ? '' : 'opacity-60 grayscale'
        },
        { 
            icon: 'wb_twilight', 
            color: 'text-primary dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-100 dark:border-blue-900/50', 
            title: 'Early Bird', 
            status: hasEarlyMorningLog ? 'Unlocked' : 'Locked', 
            statusColor: hasEarlyMorningLog ? 'text-accent' : 'text-slate-400',
            opacity: hasEarlyMorningLog ? '' : 'opacity-60 grayscale'
        },
        { 
            icon: 'swords', 
            color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-100 dark:border-indigo-900/50', 
            title: 'Weekend Warrior', 
            status: hasWeekendLog ? 'Unlocked' : 'Locked', 
            statusColor: hasWeekendLog ? 'text-accent' : 'text-slate-400',
            opacity: hasWeekendLog ? '' : 'opacity-60 grayscale'
        },
        { 
            icon: 'psychology', 
            color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-100 dark:border-emerald-900/50', 
            title: 'Subject Master', 
            status: hasMasteredSubject ? 'Unlocked' : 'In Progress', 
            statusColor: hasMasteredSubject ? 'text-accent' : 'text-slate-400',
            opacity: hasMasteredSubject ? '' : 'opacity-60 grayscale'
        }
      ];
  };

  // Calculate stats from DB
  const refreshStats = () => {
      const dbSubjects = storageService.getSubjects();
      setSubjects(dbSubjects);
      const dbLogs = storageService.getLogs();

      // Achievements
      setAchievements(calculateAchievements(dbLogs, dbSubjects));

      // 1. Calculate Overall Readiness (Pie Chart) - Avg of subject progress
      if (dbSubjects.length > 0) {
          const totalProgress = dbSubjects.reduce((acc, sub) => acc + sub.progress, 0);
          const avgProgress = Math.round(totalProgress / dbSubjects.length);
          setPieData([
              { name: 'Completed', value: avgProgress },
              { name: 'Remaining', value: 100 - avgProgress }
          ]);
      }

      // 2. Calculate Bar Data based on Period
      let newBarData: any[] = [];
      const today = new Date();
      
      if (selectedPeriod === 'This Week') {
          // Current Week (Sunday to Saturday)
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
          startOfWeek.setHours(0,0,0,0);
          
          const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
          newBarData = days.map((label, idx) => {
             const d = new Date(startOfWeek);
             d.setDate(startOfWeek.getDate() + idx);
             const dateStr = d.toISOString().split('T')[0];
             
             const dailyTotal = dbLogs
                .filter(l => l.date === dateStr)
                .reduce((acc, curr) => acc + curr.duration, 0);

             return {
                 day: label,
                 actual: dailyTotal,
                 fill: idx === today.getDay() ? '#50C878' : '#4A90E2'
             };
          });

      } else if (selectedPeriod === 'Last Week') {
           const startOfLastWeek = new Date(today);
           startOfLastWeek.setDate(today.getDate() - today.getDay() - 7); // Previous Sunday
           startOfLastWeek.setHours(0,0,0,0);

           const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
           newBarData = days.map((label, idx) => {
             const d = new Date(startOfLastWeek);
             d.setDate(startOfLastWeek.getDate() + idx);
             const dateStr = d.toISOString().split('T')[0];
             
             const dailyTotal = dbLogs
                .filter(l => l.date === dateStr)
                .reduce((acc, curr) => acc + curr.duration, 0);

             return {
                 day: label,
                 actual: dailyTotal,
                 fill: '#94a3b8' // Grey for past
             };
          });

      } else if (selectedPeriod === 'Month') {
          // Aggregate by last 4 weeks
          for (let i=3; i>=0; i--) {
              const startDay = new Date(today);
              startDay.setDate(today.getDate() - (i * 7) - today.getDay()); 
              startDay.setHours(0,0,0,0);
              
              const endDay = new Date(startDay);
              endDay.setDate(startDay.getDate() + 6);
              endDay.setHours(23,59,59,999);
              
              const weeklyTotal = dbLogs.filter(l => {
                  const ld = new Date(l.date);
                  return ld >= startDay && ld <= endDay;
              }).reduce((acc, c) => acc + c.duration, 0);

              newBarData.push({
                  day: i === 0 ? 'Current' : `-${i} Wk`,
                  actual: weeklyTotal,
                  fill: i === 0 ? '#4A90E2' : '#94a3b8'
              });
          }
      }
      setBarData(newBarData);

      // 3. Calculate Weekly Stats List (Filtered to Last 7 Days rolling)
      const last7DaysStart = new Date();
      last7DaysStart.setDate(today.getDate() - 7);
      
      const statsMap: Record<string, number> = {};
      dbLogs.forEach(log => {
          if (new Date(log.date) >= last7DaysStart) {
            if (!statsMap[log.subject]) statsMap[log.subject] = 0;
            statsMap[log.subject] += log.duration;
          }
      });

      const statsList = dbSubjects.map(sub => ({
          sub: sub.subject,
          hrs: statsMap[sub.subject] || 0,
          progress: sub.progress,
          color: sub.color.split(' ')[0], // Text color
          bg: sub.color.split(' ')[1], // Bg color
          icon: sub.icon
      })).sort((a, b) => b.hrs - a.hrs); // Sort by most studied
      
      setWeeklyStats(statsList);
      
      // Init log modal default subject
      if (dbSubjects.length > 0 && !logData.subject) {
          setLogData(prev => ({ ...prev, subject: dbSubjects[0].subject }));
      }
  };

  useEffect(() => {
      storageService.init();
      refreshStats();
  }, [selectedPeriod]);

  const handleSaveLog = () => {
    const hours = parseFloat(logData.duration);
    if (!hours || hours <= 0 || !logData.subject) return;

    storageService.addLog({
        subject: logData.subject,
        duration: hours,
        date: logData.date
    });

    refreshStats();
    setIsLogModalOpen(false);
    setLogData(prev => ({
        ...prev,
        duration: '',
    }));
  };

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white text-xs p-2 rounded-lg shadow-xl">
          <p className="font-bold">{`${label} : ${payload[0].value} hrs`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative transition-colors">
      {/* Header */}
      <div className="px-6 py-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between transition-colors">
         <div className="flex items-center gap-3">
            {onBack && (
                <button 
                    onClick={onBack}
                    className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
            )}
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Progress Tracker</h1>
         </div>
         <button className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">settings</span>
         </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide p-6 space-y-6">
        {/* Intro */}
        <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Statistics</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track your consistency and improvement</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {['This Week', 'Last Week', 'Month'].map((period) => (
                <button 
                    key={period}
                    onClick={() => setSelectedPeriod(period as any)}
                    className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
                        selectedPeriod === period 
                        ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-lg shadow-slate-900/20' 
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                    {selectedPeriod === period && <span className="material-symbols-outlined text-[18px]">calendar_today</span>}
                    {period}
                </button>
            ))}
        </div>

        {/* Exam Readiness */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col sm:flex-row items-center gap-6 transition-colors">
            <div className="relative w-32 h-32 shrink-0">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={10}
                    >
                        {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                        ))}
                    </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{pieData[0].value}%</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Readiness</span>
                </div>
            </div>
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Exam Readiness</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                    {pieData[0].value > 70 ? "You're doing great! Keep it up." : "Consistent study is key to success."}
                </p>
                <button 
                    onClick={() => setIsAnalysisModalOpen(true)}
                    className="bg-primary text-white text-xs font-bold py-2 px-4 rounded-lg shadow-md shadow-blue-500/20 active:scale-[0.98] transition-transform"
                >
                    View Detailed Analysis
                </button>
            </div>
        </div>

        {/* Study Hours */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none transition-colors">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Study Hours</h3>
                <div className="flex gap-3 text-xs font-medium">
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><span className="w-2 h-2 rounded-full bg-primary"></span> Actual</div>
                    {/* Goal could be dynamic based on settings, removed static Goal marker for cleaner look */}
                </div>
            </div>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} barCategoryGap={10}>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                        <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#1e293b10'}} />
                        <Bar dataKey="actual" radius={[4, 4, 0, 0]}>
                            {barData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill || '#4A90E2'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Achievements */}
        <div>
            <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Achievements</h3>
                {/* <button className="text-xs font-bold text-primary">View All</button> */}
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                {achievements.map((badge, idx) => (
                    <div key={idx} className={`flex flex-col items-center gap-2 shrink-0 w-24 ${badge.opacity || ''}`}>
                        <div className={`w-16 h-16 rounded-full ${badge.bg} border-2 ${badge.border} flex items-center justify-center shadow-sm transition-transform hover:scale-105`}>
                            <span className={`material-symbols-outlined text-3xl ${badge.color}`}>{badge.icon}</span>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{badge.title}</p>
                            <p className={`text-[10px] font-medium ${badge.statusColor}`}>{badge.status}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Weekly Stats List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden transition-colors">
            <div className="px-5 py-4 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white">Weekly Breakdown</h3>
                <span className="text-xs text-slate-400 font-medium">Last 7 Days</span>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {weeklyStats.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${item.bg.includes('bg-slate') ? 'bg-slate-100 dark:bg-slate-800' : item.bg} flex items-center justify-center ${item.color}`}>
                                <span className="material-symbols-outlined">{item.icon}</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{item.sub}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{item.hrs.toFixed(1)} hrs studied</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className={`text-sm font-bold ${item.progress >= 70 ? 'text-accent' : item.progress >= 40 ? 'text-orange-500' : 'text-slate-400'}`}>
                                {item.progress}%
                             </p>
                             <p className="text-[10px] text-slate-400 uppercase font-medium">Covered</p>
                        </div>
                    </div>
                ))}
                {weeklyStats.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm">No study logs in the last 7 days.</div>
                )}
            </div>
        </div>
      </div>
      
       {/* FAB */}
       <button 
        onClick={() => setIsLogModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary rounded-full shadow-lg shadow-blue-500/40 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* Log Session Modal */}
      {isLogModalOpen && (
        <>
            <div 
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-50 transition-opacity"
                onClick={() => setIsLogModalOpen(false)}
            ></div>
            <div className="fixed bottom-0 left-0 w-full max-w-md mx-auto right-0 bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-8 z-50 shadow-2xl animate-[slideUp_0.3s_ease-out]">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Log Study Session</h3>
                
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400">expand_more</span>
                            <select 
                                value={logData.subject}
                                onChange={(e) => setLogData({...logData, subject: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none appearance-none font-medium"
                            >
                                {subjects.map(s => (
                                    <option key={s.id} value={s.subject}>{s.subject}</option>
                                ))}
                                {subjects.length === 0 && <option>No subjects found</option>}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Duration (Hours)</label>
                             <input 
                                type="number" 
                                step="0.5"
                                placeholder="e.g. 1.5"
                                value={logData.duration}
                                onChange={(e) => setLogData({...logData, duration: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none" 
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Date</label>
                            <input 
                                type="date" 
                                value={logData.date}
                                onChange={(e) => setLogData({...logData, date: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none" 
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleSaveLog}
                        className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform mt-2"
                    >
                        Log Session
                    </button>
                </div>
            </div>
        </>
      )}

      {/* Analysis Modal */}
      {isAnalysisModalOpen && (
         <>
            <div 
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-50 transition-opacity"
                onClick={() => setIsAnalysisModalOpen(false)}
            ></div>
            <div className="fixed bottom-0 left-0 w-full max-w-md mx-auto right-0 bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-8 z-50 shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[85vh] overflow-y-auto">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Subject Proficiency</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Based on completion progress</p>

                <div className="space-y-4">
                    {subjects.sort((a,b) => a.progress - b.progress).map((sub) => (
                        <div key={sub.id} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                             <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                     <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">{sub.icon}</span>
                                     <span className="font-bold text-slate-900 dark:text-white">{sub.subject}</span>
                                </div>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{sub.progress}%</span>
                             </div>
                             <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                 <div 
                                    className={`h-full rounded-full ${sub.progress < 40 ? 'bg-red-400' : sub.progress < 80 ? 'bg-primary' : 'bg-emerald-500'}`} 
                                    style={{width: `${sub.progress}%`}}
                                ></div>
                             </div>
                             <p className="text-xs text-slate-400 mt-2 text-right">
                                {sub.progress < 40 ? 'Needs Attention' : sub.progress < 80 ? 'On Track' : 'Mastered'}
                             </p>
                        </div>
                    ))}
                    {subjects.length === 0 && <p className="text-center text-slate-400">No subjects added yet.</p>}
                </div>

                <button 
                    onClick={() => setIsAnalysisModalOpen(false)}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold py-3.5 rounded-xl mt-6"
                >
                    Close
                </button>
            </div>
         </>
      )}
    </div>
  );
};

export default ProgressScreen;