import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '../hooks/use-toast';
import { Plus, Check, Trash2 } from 'lucide-react';
import {
  CreateTask,
  GetTasks,
  UpdateTask,
  DeleteTask,
} from '../../wailsjs/go/backend/App';

export function TaskList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const taskList = await GetTasks();
      setTasks(taskList || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await CreateTask(newTaskTitle, newTaskDescription);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setShowAddForm(false);
      loadTasks();
      toast({
        title: t('success'),
        description: t('task_created'),
        variant: 'success',
      });
    } catch (err) {
      console.error('Failed to create task:', err);
      toast({
        title: t('error'),
        description: t('error'),
        variant: 'destructive',
      });
    }
  };

  const handleToggleComplete = async (task: any) => {
    try {
      await UpdateTask(task.id, task.title, task.description, !task.completed);
      loadTasks();
      toast({
        title: t('success'),
        description: task.completed ? t('task_updated') : t('task_completed'),
        variant: 'success',
      });
    } catch (err) {
      console.error('Failed to update task:', err);
      toast({
        title: t('error'),
        description: t('error'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm(t('delete_task') + '?')) return;

    try {
      await DeleteTask(taskId);
      loadTasks();
      toast({
        title: t('success'),
        description: t('task_deleted'),
        variant: 'success',
      });
    } catch (err) {
      console.error('Failed to delete task:', err);
      toast({
        title: t('error'),
        description: t('error'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('tasks')}</h2>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('add_task')}
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('add_task')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t('task_title')}</Label>
                <Input
                  id="title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t('task_description')}</Label>
                <Input
                  id="description"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{t('save')}</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  {t('cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>{t('no_tasks')}</p>
              <p className="text-sm mt-2">{t('create_first_task')}</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className={task.completed ? 'opacity-60' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <button
                      onClick={() => handleToggleComplete(task)}
                      className={`mt-1 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                        task.completed
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground hover:border-primary'
                      }`}
                    >
                      {task.completed && <Check className="h-4 w-4" />}
                    </button>
                    <div className="flex-1">
                      <h3 className={`font-medium ${task.completed ? 'line-through' : ''}`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}



