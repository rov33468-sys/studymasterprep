import React from 'react';
import { Screen } from '../types';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { screen: Screen.DASHBOARD, icon: 'home', label: 'Home' },
    { screen: Screen.TASKS, icon: 'check_circle', label: 'Tasks' }, // Adding Tasks as a main tab
    { screen: Screen.PLANNER, icon: 'calendar_month', label: 'Planner' },
    { screen: Screen.PROGRESS, icon: 'bar_chart', label: 'Stats' },
    { screen: Screen.SETTINGS, icon: 'person', label: 'Profile' },
  ];

  return (
    <nav className="flex-none bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pb-safe pt-2 z-50 relative transition-colors">
      <div className="flex justify-around items-center h-[60px] px-2">
        {navItems.map((item) => {
          const isActive = currentScreen === item.screen;
          return (
            <button
              key={item.screen}
              onClick={() => onNavigate(item.screen)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <span className={`material-symbols-outlined text-[24px] ${isActive ? 'filled' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;