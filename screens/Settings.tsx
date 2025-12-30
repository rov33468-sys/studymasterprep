import React, { useState, useEffect } from 'react';
import { authService } from '../services/auth';
import { storageService } from '../services/storage';
import { notificationService } from '../services/notification';
import { User } from '../types';

interface SettingsScreenProps {
  onLogout: () => void;
  onBack?: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout, onBack }) => {
  const [user, setUser] = useState<User | null>(null);
  
  // Settings State
  const [settings, setSettings] = useState({
      dailyGoal: 6,
      darkMode: false,
      notifications: true
  });

  // Edit Profile Modal State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    // Load User
    const currentUser = authService.getUser();
    setUser(currentUser);
    if (currentUser) {
        setEditName(currentUser.name);
    }

    // Load Settings
    const storedSettings = storageService.getSettings();
    setSettings(storedSettings);
    
    // Apply Dark Mode initial state (just for visual logic, Tailwind needs class on html)
    if (storedSettings.darkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleSettingChange = async (key: string, value: any) => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      storageService.saveSettings(newSettings);

      if (key === 'darkMode') {
          if (value) document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
      }

      if (key === 'notifications' && value === true) {
          const granted = await notificationService.requestPermission();
          if (!granted) {
              alert("Please enable notifications in your browser settings to receive alerts.");
          }
      }
  };

  const saveProfile = (e: React.FormEvent) => {
      e.preventDefault();
      if (editName.trim()) {
          const success = authService.updateUser(editName.trim());
          if (success) {
              setUser(authService.getUser());
              setShowEditProfile(false);
          } else {
              alert("Failed to update profile.");
          }
      }
  };

  const handleExport = () => {
      const dataStr = storageService.exportData();
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `study_master_backup_${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
  };

  const handleClearData = () => {
      if (window.confirm("Are you sure? This will delete ALL your tasks, subjects, logs, and account data locally. This cannot be undone.")) {
          storageService.clearAllData();
          onLogout(); // Force logout/reload
          window.location.reload(); // Hard reload to reset app state
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <header className="px-6 py-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center relative transition-colors">
         {onBack && (
            <button 
                onClick={onBack}
                className="absolute left-6 w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
                <span className="material-symbols-outlined">arrow_back</span>
            </button>
         )}
         <h1 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide px-4 pt-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none relative overflow-hidden mb-8 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 dark:bg-primary/10 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>
            
            <div className="flex flex-col items-center relative z-10">
                <div className="relative mb-3">
                    <div className="w-24 h-24 rounded-full p-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                        <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=4A90E2&color=fff`} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    </div>
                    <button 
                        onClick={() => setShowEditProfile(true)}
                        className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full shadow-md hover:bg-primary-dark transition-colors"
                    >
                        <span className="material-symbols-outlined text-[16px] block">edit</span>
                    </button>
                </div>
                
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name || 'Guest User'}</h2>
                        <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Pro</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{user?.email}</p>
                    <p className="text-xs font-semibold text-primary mt-1">Targeting JEE Advanced 2025</p>
                </div>

                <button 
                    onClick={() => setShowEditProfile(true)}
                    className="mt-5 w-full py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                >
                    Edit Profile Details
                </button>
            </div>
        </div>

        {/* Study Goals Section */}
        <div className="mb-6">
            <h3 className="px-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Study Goals</h3>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden p-5 transition-colors">
                <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined">flag</span>
                         </div>
                         <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Daily Target</p>
                            <p className="text-[10px] text-slate-400 font-medium">Set your daily study hours</p>
                         </div>
                    </div>
                    <div className="flex items-baseline">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{settings.dailyGoal}</span>
                        <span className="text-xs text-slate-400 font-medium ml-1">hrs</span>
                    </div>
                </div>
                
                <input 
                    type="range" 
                    min="1" 
                    max="16" 
                    step="0.5" 
                    value={settings.dailyGoal} 
                    onChange={(e) => handleSettingChange('dailyGoal', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold px-0.5 uppercase tracking-wide">
                    <span>1 hr</span>
                    <span>16 hrs</span>
                </div>
            </div>
        </div>

        {/* Preferences Section */}
        <div className="mb-6">
            <h3 className="px-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Preferences</h3>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
                <div className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => handleSettingChange('darkMode', !settings.darkMode)}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">dark_mode</span></div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">Dark Mode</span>
                    </div>
                    <button 
                        className={`w-11 h-6 rounded-full relative transition-colors pointer-events-none ${settings.darkMode ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.darkMode ? 'translate-x-5' : 'translate-x-0'}`}></span>
                    </button>
                </div>
                 <div className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => handleSettingChange('notifications', !settings.notifications)}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">notifications</span></div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">Notifications</span>
                    </div>
                     <button 
                        className={`w-11 h-6 rounded-full relative transition-colors pointer-events-none ${settings.notifications ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.notifications ? 'translate-x-5' : 'translate-x-0'}`}></span>
                    </button>
                </div>
            </div>
        </div>

         {/* Data Section */}
        <div className="mb-6">
            <h3 className="px-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Data & Storage</h3>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
                <div onClick={handleExport} className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">table_view</span></div>
                        <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">Export Progress</p>
                            <p className="text-[10px] text-slate-400">Download as JSON</p>
                        </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">download</span>
                </div>
                 <div onClick={handleClearData} className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 transition-colors"><span className="material-symbols-outlined text-[20px]">delete_forever</span></div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">Clear All Data</span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium group-hover:text-rose-400">Reset App</span>
                </div>
            </div>
        </div>

         {/* Support Section */}
        <div className="mb-8">
            <h3 className="px-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Support</h3>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
                <div className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-500 flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">help</span></div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">Help Center</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">chevron_right</span>
                </div>
                 <div className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">chat_bubble</span></div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">Send Feedback</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">chevron_right</span>
                </div>
            </div>
        </div>
        
        <button 
            onClick={onLogout}
            className="w-full py-3.5 bg-white dark:bg-slate-900 text-rose-500 font-semibold rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm mb-6 flex items-center justify-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors"
        >
            <span className="material-symbols-outlined">logout</span>
            Log Out
        </button>
        
        <p className="text-center text-xs text-slate-300 pb-4">StudyApp v1.0.3</p>

      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <>
            <div 
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] z-50 transition-opacity"
                onClick={() => setShowEditProfile(false)}
            ></div>
            <div className="absolute bottom-0 left-0 w-full bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-8 z-50 shadow-2xl animate-[slideUp_0.3s_ease-out]">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Edit Profile</h3>
                
                <form onSubmit={saveProfile} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Name</label>
                        <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Enter your name"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none font-medium" 
                            autoFocus
                        />
                    </div>
                    
                    <button 
                        type="submit"
                        className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform mt-2"
                    >
                        Save Changes
                    </button>
                </form>
            </div>
        </>
      )}
    </div>
  );
};

export default SettingsScreen;