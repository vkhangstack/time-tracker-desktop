import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { useToast } from '../hooks/use-toast';
import {
  StartPomodoro,
  PausePomodoro,
  ResumePomodoro,
  StopPomodoro,
  GetTimerState,
  CompletePomodoro,
  GetTasks,
    LockScreen
} from '../../wailsjs/go/backend/App';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { WindowShow } from '../../wailsjs/runtime/runtime';
import { Play, Pause, Square } from 'lucide-react';

export function PomodoroTimer() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [duration, setDuration] = useState(15);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [timerState, setTimerState] = useState<any>({
    is_running: false,
    is_paused: false,
    time_remaining: 0,
    duration: 0
  });
  const [audio] = useState(() => {
    const audio = new Audio();
    // Using a simple notification sound (you can replace with custom audio file)
    audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE';
    audio.volume = 0.5;
    return audio;
  });

  useEffect(() => {
    loadTasks();
    updateTimerState();

    const interval = setInterval(() => {
      if (timerState.is_running) {
        updateTimerState();
      }
    }, 1000);

    // Listen for timer complete event
    EventsOn('timer:complete', () => {
      handleTimerComplete();
      LockScreen();
    });

    return () => clearInterval(interval);
  }, [timerState.is_running]);

  const loadTasks = async () => {
    try {
      const taskList = await GetTasks();
      setTasks(taskList || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  const updateTimerState = async () => {
    try {
      const state = await GetTimerState();
      setTimerState(state);
    } catch (err) {
      console.error('Failed to get timer state:', err);
    }
  };

  const handleTimerComplete = async () => {
    try {
      await CompletePomodoro(duration, selectedTask || null);

      // Play notification sound
      try {
        await audio.play();
      } catch (err) {
        console.error('Failed to play audio:', err);
      }

      // Show window (bring to front) temporarily disabled
      // try {
      //   WindowShow();
      // } catch (err) {
      //   console.error('Failed to show window:', err);
      // }

      // Show toast notification
      toast({
        title: t('timer_complete'),
        description: t('timer_complete_message'),
        variant: 'success',
      });

      updateTimerState();
    } catch (err) {
      console.error('Failed to save session:', err);
      toast({
        title: t('error'),
        description: t('error') + err?.toString(),
        variant: 'destructive',
      });
    }
  };

  const handleStart = async () => {
    try {
      await StartPomodoro(duration, selectedTask || null);
      updateTimerState();
      toast({
        title: t('success'),
        description: t('pomodoro_started'),
        variant: 'success',
      });
    } catch (err) {
      console.error('Failed to start timer:', err);
      toast({
        title: t('error'),
        description: t('error'),
        variant: 'destructive',
      });
    }
  };

  const handlePause = async () => {
    try {
      if (timerState.is_paused) {
        await ResumePomodoro();
        updateTimerState();
        // No toast for resume to avoid spam
      } else {
        await PausePomodoro();
        updateTimerState();
        toast({
          title: t('success'),
          description: t('pomodoro_paused'),
        });
      }
    } catch (err) {
      console.error('Failed to pause/resume timer:', err);
      toast({
        title: t('error'),
        description: t('error'),
        variant: 'destructive',
      });
    }
  };

  const handleStop = async () => {
    try {
      await StopPomodoro();
      updateTimerState();
      toast({
        title: t('success'),
        description: t('pomodoro_stopped'),
      });
    } catch (err) {
      console.error('Failed to stop timer:', err);
      toast({
        title: t('error'),
        description: t('error'),
        variant: 'destructive',
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = timerState.duration > 0
    ? ((timerState.duration - timerState.time_remaining) / timerState.duration) * 100
    : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">{t('pomodoro_duration')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="relative">
            <div className="w-64 h-64 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 120}`}
                  strokeDashoffset={`${2 * Math.PI * 120 * (1 - progressPercent / 100)}`}
                  className="text-primary transition-all duration-1000"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-bold">
                    {timerState.is_running ? formatTime(timerState.time_remaining) : formatTime(duration * 60)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {timerState.is_paused ? t('pause') : t('time_remaining')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls when timer is not running */}
          {!timerState.is_running && (
            <>
              <div className="space-y-2">
                <Label>{t('pomodoro_duration')}</Label>
                <div className="flex gap-2">
                  {[1, 15, 25, 45, 60].map((mins) => (
                    <Button
                      key={mins}
                      variant={duration === mins ? 'default' : 'outline'}
                      onClick={() => setDuration(mins)}
                      className="flex-1"
                    >
                      {mins} {t('minutes')}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('select_task')}</Label>
                <select
                  value={selectedTask || ''}
                  onChange={(e) => setSelectedTask(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t('no_task')}</option>
                  {tasks.filter(t => !t.completed).map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Timer Controls */}
          <div className="flex justify-center gap-4">
            {!timerState.is_running ? (
              <Button onClick={handleStart} size="lg" className="w-32">
                <Play className="mr-2 h-5 w-5" />
                {t('start')}
              </Button>
            ) : (
              <>
                <Button onClick={handlePause} size="lg" variant="secondary" className="w-32">
                  <Pause className="mr-2 h-5 w-5" />
                  {timerState.is_paused ? t('resume') : t('pause')}
                </Button>
                <Button onClick={handleStop} size="lg" variant="destructive" className="w-32">
                  <Square className="mr-2 h-5 w-5" />
                  {t('stop')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



