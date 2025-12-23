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
  GetServerHost,
  SaveServerHost,
  GoogleLogin,
  GoogleCallback,
  SaveGoogleClientCredentials,
  HasGoogleCredentials,
  IsGoogleAuthenticated,
  BackupToDrive,
  RestoreFromDrive,
} from '../../wailsjs/go/backend/App';
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime';
import { Droplet, Globe, Info, Cloud, Check, Loader2, Save } from 'lucide-react';

export function Settings() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [waterEnabled, setWaterEnabled] = useState(true);
  const [waterInterval, setWaterInterval] = useState(60);
  const [customInterval, setCustomInterval] = useState('');
  const [useCustomInterval, setUseCustomInterval] = useState(false);
  const [appInfo, setAppInfo] = useState<any>(null);
  const [serverHost, setServerHost] = useState('');
  const [originalServerHost, setOriginalServerHost] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Google Drive State
  const [hasGoogleCreds, setHasGoogleCreds] = useState(false);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [showAuthCodeInput, setShowAuthCodeInput] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadSettings();
    loadAppInfo();
    loadServerSettings();
    checkGoogleStatus();
  }, []);

  const checkGoogleStatus = async () => {
    try {
      const hasCreds = await HasGoogleCredentials();
      setHasGoogleCreds(hasCreds);
      if (hasCreds) {
        const isAuth = await IsGoogleAuthenticated();
        setIsGoogleAuth(isAuth);
      }
    } catch (err) {
      console.error('Failed to check Google status:', err);
    }
  };

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

  const loadServerSettings = async () => {
    try {
      const host = await GetServerHost();
      if (host) {
        setServerHost(host);
        setOriginalServerHost(host);
      }
    } catch (err) {
      console.error('Failed to load server settings:', err);
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

  const handleSaveServerHost = async () => {
    setIsSaving(true);
    try {
      await SaveServerHost(serverHost);
      setOriginalServerHost(serverHost);
      toast({
        title: t('success'),
        description: t('server_host_saved'),
        variant: 'success',
      });
    } catch (err) {
      console.error('Failed to save server host:', err);
      toast({
        title: t('error'),
        description: t('failed_to_save_server_host'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
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

      {/* Zone Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <CardTitle>{t('server_host')}</CardTitle>
          </div>
          <CardDescription>{t('server_host_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="server-zone">{t('server')}</Label>
            <Input
              id="server-zone"
              placeholder="https://api.server.com"
              value={serverHost}
              onChange={(e) => setServerHost(e.target.value)}
            />
            <p className="text-[0.8rem] text-muted-foreground">
              {t('server_host_helper')}
            </p>
          </div>
          <Button
            onClick={handleSaveServerHost}
            disabled={serverHost === originalServerHost || isSaving}
          >
            {isSaving ? t('saving') : t('save')}
          </Button>
        </CardContent>
      </Card>

      {/* Google Drive Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Cloud className="h-5 w-5" />
            <CardTitle>Google Drive Sync</CardTitle>
          </div>
          <CardDescription>Backup and restore your data using Google Drive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasGoogleCreds ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md text-sm">
                To enable sync, you need to provide your Google Cloud Client ID and Secret.
                <br />
                1. Go to Google Cloud Console.
                <br />
                2. Create a specific project.
                <br />
                3. Create OAuth 2.0 Credentials (Desktop App).
              </div>
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="...apps.googleusercontent.com" />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} type="password" />
              </div>
              <Button onClick={async () => {
                try {
                  await SaveGoogleClientCredentials(clientId, clientSecret);
                  setHasGoogleCreds(true);
                  toast({ title: 'Success', description: 'Credentials saved', variant: 'success' });
                } catch (e) {
                  toast({ title: 'Error', description: 'Failed to save credentials', variant: 'destructive' });
                }
              }}>
                <Save className="mr-2 h-4 w-4" /> Save Credentials
              </Button>
            </div>
          ) : !isGoogleAuth ? (
            <div className="space-y-4">
              {!showAuthCodeInput ? (
                <Button onClick={async () => {
                  try {
                    const url = await GoogleLogin();
                    BrowserOpenURL(url);
                    setShowAuthCodeInput(true);
                  } catch (e) {
                    toast({ title: 'Error', description: 'Failed to start login', variant: 'destructive' });
                  }
                }}>
                  Connect to Google Drive
                </Button>
              ) : (
                <div className="space-y-2">
                  <Label>Paste Authorization Code</Label>
                  <Input value={authCode} onChange={(e) => setAuthCode(e.target.value)} placeholder="4/0..." />
                  <Button onClick={async () => {
                    try {
                      await GoogleCallback(authCode);
                      setIsGoogleAuth(true);
                      setShowAuthCodeInput(false);
                      toast({ title: 'Success', description: 'Connected successfully', variant: 'success' });
                    } catch (e) {
                      toast({ title: 'Error', description: 'Failed to verify code', variant: 'destructive' });
                    }
                  }}>
                    Verify Code
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center text-green-600">
                <Check className="mr-2 h-5 w-5" /> Connected to Google Drive
              </div>
              <div className="flex gap-4">
                <Button onClick={async () => {
                  setIsSyncing(true);
                  try {
                    await BackupToDrive();
                    toast({ title: 'Success', description: 'Backup completed', variant: 'success' });
                  } catch (e) {
                    toast({ title: 'Error', description: 'Backup failed', variant: 'destructive' });
                  } finally {
                    setIsSyncing(false);
                  }
                }} disabled={isSyncing}>
                  {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Backup to Drive
                </Button>
                <Button variant="outline" onClick={async () => {
                  if (!confirm('This will overwrite current data. Continue?')) return;
                  setIsSyncing(true);
                  try {
                    await RestoreFromDrive();
                    toast({ title: 'Success', description: 'Restore completed. Please restart app.', variant: 'success' });
                  } catch (e) {
                    toast({ title: 'Error', description: 'Restore failed', variant: 'destructive' });
                  } finally {
                    setIsSyncing(false);
                  }
                }} disabled={isSyncing}>
                  {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Restore from Drive
                </Button>
              </div>
            </div>
          )}
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



