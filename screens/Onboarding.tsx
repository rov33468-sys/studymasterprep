import React, { useState } from 'react';
import { authService } from '../services/auth';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));

    if (isLogin) {
      const result = authService.login(formData.email, formData.password);
      if (result.success) {
        onComplete();
      } else {
        setError(result.message || 'Login failed');
      }
    } else {
      if (!formData.name.trim()) {
        setError('Name is required');
        setLoading(false);
        return;
      }
      const result = authService.register(formData.name, formData.email, formData.password);
      if (result.success) {
        onComplete();
      } else {
        setError(result.message || 'Registration failed');
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[55%] bg-gradient-to-b from-blue-50 to-white z-0"></div>

      {/* Content Container */}
      <div className="flex-1 flex flex-col z-10 overflow-y-auto">
        {/* Illustration Area */}
        <div className="flex-1 flex flex-col items-center justify-end pb-6 px-6 pt-12">
             <div 
                className="w-full max-w-[280px] aspect-square mb-4 animate-[fadeIn_0.5s_ease-out]"
             >
                <img 
                    src="https://illustrations.popsy.co/amber/student-going-to-school.svg" 
                    alt="Studying Illustration" 
                    className="w-full h-full object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
                />
             </div>
             <h1 className="text-3xl font-bold text-slate-900 text-center leading-tight mb-2">
                StudyMaster
            </h1>
            <p className="text-slate-500 text-center text-sm px-8">
                Your personal AI-powered study planner and progress tracker.
            </p>
        </div>

        {/* Form Area */}
        <div className="bg-white rounded-t-[32px] px-8 pt-6 pb-12 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
            
            <div className="flex items-center justify-center mb-8">
                <div className="bg-slate-100 p-1 rounded-xl flex w-full max-w-xs">
                    <button 
                        onClick={() => { setIsLogin(true); setError(''); }}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={() => { setIsLogin(false); setError(''); }}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                    >
                        Sign Up
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                    <div className="animate-[slideDown_0.3s_ease-out]">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Full Name</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400">person</span>
                            <input 
                                type="text" 
                                required={!isLogin}
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="e.g. Rahul Sharma"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Email Address</label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400">mail</span>
                        <input 
                            type="email" 
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="student@example.com"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Password</label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400">lock</span>
                        <input 
                            type="password" 
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            placeholder="••••••••"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-500 text-xs font-medium animate-[fadeIn_0.3s_ease-out]">
                        <span className="material-symbols-outlined text-[16px]">error</span>
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold rounded-xl py-4 mt-2 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <span>{isLogin ? 'Login to Continue' : 'Create Account'}</span>
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </>
                    )}
                </button>
            </form>
            
            <p className="text-center text-xs text-slate-400 mt-6">
                {isLogin ? "Don't have an account?" : "Already have an account?"} 
                <span 
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    className="text-primary font-bold cursor-pointer hover:underline ml-1"
                >
                    {isLogin ? 'Sign Up' : 'Log In'}
                </span>
            </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;