import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '../hooks/use-toast';
import {
  GetWaterReminderSettings,
  SaveWaterReminderSettings,
  SetLanguage,
  GetAppInfo,
} from '../../wailsjs/go/backend/App';
import { Droplet, Globe, Info } from 'lucide-react';

export function Settings() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [waterEnabled, setWaterEnabled] = useState(true);
  const [waterInterval, setWaterInterval] = useState(60);
  const [customInterval, setCustomInterval] = useState('');
  const [useCustomInterval, setUseCustomInterval] = useState(false);
  const [appInfo, setAppInfo] = useState<any>(null);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    loadSettings();
    loadAppInfo();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await GetWaterReminderSettings();
      setWaterEnabled(settings.enabled);

      // Check if using custom interval
      if (settings.custom_interval_mins && settings.custom_interval_mins > 0) {
        setUseCustomInterval(true);
        setCustomInterval(settings.custom_interval_mins.toString());
        setWaterInterval(settings.custom_interval_mins);
      } else {
        setWaterInterval(settings.interval_mins);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const loadAppInfo = async () => {
    try {
      const info = await GetAppInfo();
      setAppInfo(info);
    } catch (err) {
      console.error('Failed to load app info:', err);
    }
  };

  const handleSaveWaterSettings = async () => {
    try {
      let intervalToSave = waterInterval;
      let customIntervalToSave: number | null = null;

      if (useCustomInterval) {
        if (!customInterval || customInterval.trim() === '') {
          toast({
            title: t('error'),
            description: t('custom_interval_required'),
            variant: 'destructive',
          });
          return;
        }

        const customValue = parseInt(customInterval);
        if (isNaN(customValue) || customValue < 1 || customValue > 1440) {
          toast({
            title: t('error'),
            description: t('custom_interval_range'),
            variant: 'destructive',
          });
          return;
        }

        intervalToSave = customValue;
        customIntervalToSave = customValue;
      }

      await SaveWaterReminderSettings(waterEnabled, intervalToSave, customIntervalToSave);
      toast({
        title: t('success'),
        description: t('settings_saved'),
        variant: 'success',
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast({
        title: t('error'),
        description: t('failed_to_save_settings'),
        variant: 'destructive',
      });
    }
  };

  const handleChangeLanguage = async (lang: string) => {
    try {
      await SetLanguage(lang);
      i18n.changeLanguage(lang);
      localStorage.setItem('i18nextLng', lang);
      toast({
        title: t('success'),
        description: t('language_changed'),
        variant: 'success',
      });
    } catch (err) {
      console.error('Failed to change language:', err);
      toast({
        title: t('error'),
        description: t('failed_to_change_language'),
        variant: 'destructive',
      });
    }
  };

  const languages = [
    { code: 'en', name: t('english') },
    { code: 'es', name: t('spanish') },
    { code: 'fr', name: t('french') },
    { code: 'de', name: t('german') },
    { code: 'ja', name: t('japanese') },
    { code: 'vi', name: t('vietnamese') },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Language Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <CardTitle>{t('language')}</CardTitle>
          </div>
          <CardDescription>Select your preferred language</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {languages.map((lang) => (
              <Button
                key={lang.code}
                variant={i18n.language === lang.code ? 'default' : 'outline'}
                onClick={() => handleChangeLanguage(lang.code)}
              >
                {lang.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Water Reminder Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Droplet className="h-5 w-5" />
            <CardTitle>{t('water_reminder')}</CardTitle>
          </div>
          <CardDescription>{t('water_reminder_text')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="water-enabled">{t('water_reminder_enabled')}</Label>
            <button
              id="water-enabled"
              onClick={() => setWaterEnabled(!waterEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${waterEnabled ? 'bg-primary' : 'bg-gray-200'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${waterEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          {waterEnabled && (
            <>
              <div className="space-y-2">
                <Label>{t('reminder_interval')}</Label>
                <div className="flex gap-2">
                  {[30, 60, 90].map((mins) => (
                    <Button
                      key={mins}
                      variant={waterInterval === mins && !useCustomInterval ? 'default' : 'outline'}
                      onClick={() => {
                        setWaterInterval(mins);
                        setUseCustomInterval(false);
                      }}
                      className="flex-1"
                    >
                      {mins} {t('minutes')}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="use-custom"
                    checked={useCustomInterval}
                    onChange={(e) => setUseCustomInterval(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="use-custom">{t('custom_interval')}</Label>
                </div>
                {useCustomInterval && (
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      min="1"
                      max="1440"
                      value={customInterval}
                      onChange={(e) => {
                        setCustomInterval(e.target.value);
                        setWaterInterval(parseInt(e.target.value) || 60);
                      }}
                      placeholder="Enter minutes"
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">{t('minutes')}</span>
                  </div>
                )}
              </div>
            </>
          )}

          <Button onClick={handleSaveWaterSettings}>{t('save')}</Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <CardTitle>{t('about')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {appInfo && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">{t('app_name')}:</span> {appInfo.name}
              </div>
              <div>
                <span className="font-semibold">{t('version')}:</span> {appInfo.version}
              </div>
              <div>
                <span className="font-semibold">{t('author')}:</span> {appInfo.author}
              </div>
              <div>
                <span className="font-semibold">{t('description')}:</span> {appInfo.description}
              </div>
              {appInfo.repository && (
                <div>
                  <span className="font-semibold">{t('repository')}:</span>{' '}
                  <a
                    href={appInfo.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {appInfo.repository}
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



