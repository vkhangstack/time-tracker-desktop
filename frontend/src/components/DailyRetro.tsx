import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Check, ChevronLeft, ChevronRight, Save, Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import { GetDailySummary, SaveDailyRetro } from '../../wailsjs/go/backend/App';

export function DailyRetro() {
    const { t } = useTranslation();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [summary, setSummary] = useState<any>(null);
    const [retroNotes, setRetroNotes] = useState('');
    const [planNotes, setPlanNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const formattedDate = format(currentDate, 'yyyy-MM-dd');

    useEffect(() => {
        loadData();
    }, [currentDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await GetDailySummary(formattedDate);
            setSummary(data);
            if (data.retro) {
                setRetroNotes(data.retro.retro_notes || '');
                setPlanNotes(data.retro.plan_notes || '');
            } else {
                setRetroNotes('');
                setPlanNotes('');
            }
        } catch (err) {
            console.error('Failed to load daily summary:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await SaveDailyRetro(formattedDate, retroNotes, planNotes);
            // Reload to ensure we have the latest state
            await loadData();
        } catch (err) {
            console.error('Failed to save retro:', err);
        } finally {
            setSaving(false);
        }
    };

    const navigateDate = (days: number) => {
        const newDate = days > 0 ? addDays(currentDate, days) : subDays(currentDate, Math.abs(days));
        setCurrentDate(newDate);
    };

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Date Navigation Header */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <Button variant="ghost" size="sm" onClick={() => navigateDate(-1)}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-lg font-semibold text-gray-900">
                        {format(currentDate, 'EEEE, MMMM d, yyyy')}
                    </span>
                    {format(new Date(), 'yyyy-MM-dd') === formattedDate && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            {t('today')}
                        </span>
                    )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigateDate(1)}>
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Daily Review */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xl flex items-center">
                                <Check className="mr-2 h-5 w-5 text-green-500" />
                                {t('daily_review_title')}
                            </CardTitle>
                            <CardDescription>{t('daily_review_subtitle')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-gray-50 rounded-lg p-4 mb-4 flex items-center justify-between border border-gray-100">
                                <div className="flex items-center text-gray-600">
                                    <Clock className="h-5 w-5 mr-2 text-indigo-500" />
                                    <span className="font-medium">{t('total_focus_time')}</span>
                                </div>
                                <span className="text-2xl font-bold text-indigo-600">
                                    {loading ? '...' : formatDuration(summary?.total_focus_time || 0)}
                                </span>
                            </div>

                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                {loading ? (
                                    <div className="text-center py-8 text-gray-400">{t('loading')}...</div>
                                ) : summary?.completed_tasks && summary.completed_tasks.length > 0 ? (
                                    summary.completed_tasks.map((task: any) => (
                                        <div key={task.id} className="flex items-start p-3 bg-white rounded-md border border-gray-100 shadow-sm">
                                            <Check className="h-4 w-4 mt-1 mr-3 text-green-500 shrink-0" />
                                            <div>
                                                <p className="font-medium text-gray-800">{task.title}</p>
                                                {task.description && <p className="text-xs text-gray-500 mt-1">{task.description}</p>}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 flex flex-col items-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                                        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                                        <p>{t('no_tasks_completed_today')}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Retro & Plan */}
                <div className="space-y-6">
                    <Card className="h-full flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-xl text-indigo-700">{t('retrospective')}</CardTitle>
                                    <CardDescription>{t('retro_instructions')}</CardDescription>
                                </div>
                                <Button onClick={handleSave} disabled={saving} className={saving ? 'opacity-70' : ''}>
                                    <Save className="h-4 w-4 mr-4" />
                                    {saving ? t('saving') : t('save_changes')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('retro_question_1')}
                                </label>
                                <textarea
                                    className="w-full min-h-[150px] p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y text-sm"
                                    placeholder={t('retro_placeholder_1')}
                                    value={retroNotes}
                                    onChange={(e) => setRetroNotes(e.target.value)}
                                />
                            </div>

                            <div className="pt-2 border-t border-gray-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                                    {t('plan_for_tomorrow')}
                                </label>
                                <textarea
                                    className="w-full min-h-[150px] p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y text-sm"
                                    placeholder={t('plan_placeholder')}
                                    value={planNotes}
                                    onChange={(e) => setPlanNotes(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
