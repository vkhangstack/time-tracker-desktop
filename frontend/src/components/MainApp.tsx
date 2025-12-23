import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PomodoroTimer } from './PomodoroTimer';
import { TaskList } from './TaskList';
import { Reports } from './Reports';
import { Settings } from './Settings';
import { Tet2026Countdown } from './Tet2026Countdown';
import { DailyRetro } from './DailyRetro';
import { Logout as LogoutAPI } from '../../wailsjs/go/backend/App';
import { Timer, ListTodo, BarChart3, Settings as SettingsIcon, LogOut, Calendar, ClipboardCheck } from 'lucide-react';
import { Button } from './ui/button';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';

interface MainAppProps {
  user: any;
  onLogout: () => void;
}

export function MainApp({ user, onLogout }: MainAppProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'timer' | 'tasks' | 'reports' | 'settings' | 'tet2026' | 'review'>('timer');


  useEffect(() => {
    EventsOff('show:about');
    EventsOn('show:about', () => {
      console.log('show:about event received in MainApp');
      setActiveTab("settings");
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    });
  },[])


  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('time-tracker-token');
      await LogoutAPI(token || "");
      onLogout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-primary">{t('app_name')}</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {user.username}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('logout')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('timer')}
              className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${activeTab === 'timer'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <Timer className="h-5 w-5" />
              <span className="font-medium">{t('timer')}</span>
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${activeTab === 'tasks'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <ListTodo className="h-5 w-5" />
              <span className="font-medium">{t('tasks')}</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${activeTab === 'reports'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="font-medium">{t('reports')}</span>
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${activeTab === 'review'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <ClipboardCheck className="h-5 w-5" />
              <span className="font-medium">{t('daily_review')}</span>
            </button>
            <button
              onClick={() => setActiveTab('tet2026')}
              className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${activeTab === 'tet2026'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <Calendar className="h-5 w-5" />
              <span className="font-medium">{t('tet_2026')}</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${activeTab === 'settings'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <SettingsIcon className="h-5 w-5" />
              <span className="font-medium">{t('settings')}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'timer' && <PomodoroTimer />}
        {activeTab === 'tasks' && <TaskList />}
        {activeTab === 'reports' && <Reports />}
        {activeTab === 'review' && <DailyRetro />}
        {activeTab === 'tet2026' && <Tet2026Countdown />}
        {activeTab === 'settings' && <Settings />}
      </main>

     
    </div>
  );
}
