import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PomodoroTimer } from './PomodoroTimer';
import { TaskList } from './TaskList';
import { Reports } from './Reports';
import { Settings } from './Settings';
import { Logout as LogoutAPI } from '../../wailsjs/go/backend/App';
import { Timer, ListTodo, BarChart3, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { Button } from './ui/button';

interface MainAppProps {
  user: any;
  onLogout: () => void;
}

export function MainApp({ user, onLogout }: MainAppProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'timer' | 'tasks' | 'reports' | 'settings'>('timer');

  const handleLogout = async () => {
    try {
      await LogoutAPI();
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
              className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${
                activeTab === 'timer'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Timer className="h-5 w-5" />
              <span className="font-medium">{t('timer')}</span>
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${
                activeTab === 'tasks'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListTodo className="h-5 w-5" />
              <span className="font-medium">{t('tasks')}</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${
                activeTab === 'reports'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="font-medium">{t('reports')}</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${
                activeTab === 'settings'
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
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}



