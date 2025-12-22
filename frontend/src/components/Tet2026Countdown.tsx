import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

import { Button } from './ui/button';
import { Sparkles } from 'lucide-react';

export function Tet2026Countdown() {
    const { t } = useTranslation();
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });
    const [currentWish, setCurrentWish] = useState<string>('');

    useEffect(() => {
        // Tet 2026 Target Date: February 17, 2026 00:00:00 (Vietnam Time / GMT+7)
        // Using simple date string parsing which defaults to local time if no timezone specified,
        // or we can be explicit. Let's assume the user wants it relative to their system time
        // or specifically Vietnam time? The prompt implies "Tet", so Vietnam time is appropriate,
        // but usually these run on local system time. Let's target Feb 17, 2026 00:00:00 local time for simplicity first.
        const targetDate = new Date('2026-02-17T00:00:00');

        const calculateTimeLeft = () => {
            const difference = +targetDate - +new Date();
            let newTimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

            if (difference > 0) {
                newTimeLeft = {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                };
            }

            setTimeLeft(newTimeLeft);
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleGetWish = () => {
        const wishes = t('tet_wishes', { returnObjects: true });
        if (Array.isArray(wishes) && wishes.length > 0) {
            const randomIndex = Math.floor(Math.random() * wishes.length);
            setCurrentWish(wishes[randomIndex]);
        }
    };

    return (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
            <Card className="col-span-1 bg-red-50 border-red-200">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center text-red-700">
                        🐎 {t('tet_2026_countdown_title')} 🐎
                    </CardTitle>
                    <p className="text-center text-red-500 font-semibold text-xl">
                        {t('year_of_the_horse')}
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mt-8">
                        <div className="flex flex-col p-4 bg-white rounded-lg shadow-sm border border-red-100">
                            <span className="text-4xl font-bold text-red-600">{timeLeft.days}</span>
                            <span className="text-gray-600 font-medium">{t('label_days')}</span>
                        </div>
                        <div className="flex flex-col p-4 bg-white rounded-lg shadow-sm border border-red-100">
                            <span className="text-4xl font-bold text-red-600">{timeLeft.hours}</span>
                            <span className="text-gray-600 font-medium">{t('label_hours')}</span>
                        </div>
                        <div className="flex flex-col p-4 bg-white rounded-lg shadow-sm border border-red-100">
                            <span className="text-4xl font-bold text-red-600">{timeLeft.minutes}</span>
                            <span className="text-gray-600 font-medium">{t('label_minutes')}</span>
                        </div>
                        <div className="flex flex-col p-4 bg-white rounded-lg shadow-sm border border-red-100">
                            <span className="text-4xl font-bold text-red-600">{timeLeft.seconds}</span>
                            <span className="text-gray-600 font-medium">{t('label_seconds')}</span>
                        </div>
                    </div>
                    <div className="text-center mt-12 text-red-400 text-sm">
                        {t('tet_date_2026')}
                    </div>

                    <div className="mt-8 flex flex-col items-center gap-4">
                        <Button
                            onClick={handleGetWish}
                            className="bg-red-600 hover:bg-red-700 text-white border-red-800"
                            size="lg"
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            {t('get_wish')}
                        </Button>

                        {currentWish && (
                            <div className="mt-4 p-6 bg-yellow-50 rounded-xl border-2 border-yellow-200 animate-in fade-in zoom-in duration-300 max-w-lg mx-auto">
                                <h3 className="text-sm uppercase tracking-wide text-yellow-800 mb-2 font-semibold">
                                    {t('your_wish_for_year')}
                                </h3>
                                <p className="text-xl font-medium text-red-800 italic">
                                    "{currentWish}"
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
