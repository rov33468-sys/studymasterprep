import React, { useState, useEffect } from 'react';
import { Screen } from './types';
import OnboardingScreen from './screens/Onboarding';
import DashboardScreen from './screens/Dashboard';
import TasksScreen from './screens/Tasks';
import PlannerScreen from './screens/Planner';
import ProgressScreen from './screens/Progress';
import SettingsScreen from './screens/Settings';
import BottomNav from './components/BottomNav';
import { authService } from './services/auth';
import { storageService } from './services/storage';
import { notificationService } from './services/notification';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.ONBOARDING);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check for existing session
    const isAuth = authService.isAuthenticated();
    if (isAuth) {
      setCurrentScreen(Screen.DASHBOARD);
    }
    
    // Apply dark mode preference on load
    const settings = storageService.getSettings();
    if (settings.darkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // Initialize Notification Checker
    const intervalId = setInterval(() => {
        notificationService.check();
    }, 30000); // Check every 30 seconds

    setIsInitialized(true);

    return () => clearInterval(intervalId);
  }, []);

  const handleLogout = () => {
      authService.logout();
      setCurrentScreen(Screen.ONBOARDING);
  };

  const goHome = () => setCurrentScreen(Screen.DASHBOARD);

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.ONBOARDING:
        return <OnboardingScreen onComplete={() => setCurrentScreen(Screen.DASHBOARD)} />;
      case Screen.DASHBOARD:
        return <DashboardScreen />;
      case Screen.TASKS:
        return <TasksScreen onBack={goHome} />;
      case Screen.PLANNER:
        return <PlannerScreen onBack={goHome} />;
      case Screen.PROGRESS:
        return <ProgressScreen onBack={goHome} />;
      case Screen.SETTINGS:
        return <SettingsScreen onBack={goHome} onLogout={handleLogout} />;
      default:
        return <DashboardScreen />;
    }
  };

  if (!isInitialized) return null; // or a loading spinner

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col bg-slate-50 dark:bg-slate-950 shadow-2xl overflow-hidden relative sm:border sm:border-gray-200 dark:sm:border-slate-800 sm:rounded-[32px] sm:my-4 sm:h-[900px]">
      <div className="flex-1 overflow-hidden relative">
        {renderScreen()}
      </div>
      {currentScreen !== Screen.ONBOARDING && (
        <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} />
      )}
    </div>
  );
};

export default App;