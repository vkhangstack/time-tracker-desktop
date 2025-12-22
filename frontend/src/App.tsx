import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { MainApp } from './components/MainApp';
import { Toaster } from './components/Toaster';
import { Loading } from './components/Loading';
import { GetCurrentUser, RestoreSession } from '../wailsjs/go/backend/App';
import { EventsOn } from '../wailsjs/runtime/runtime';

const SESSION_KEY = 'time-tracker-token';

function App() {
  const { i18n } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    // Try to restore session on app start
    const restoreUserSession = async () => {
      try {
        // First check if backend has current user
        const currentUser = await GetCurrentUser();
        setUser(currentUser);
        if (currentUser?.language_preference) {
          i18n.changeLanguage(currentUser.language_preference);
        }
        // Save to localStorage for next time
        if (currentUser?.token) {
          localStorage.setItem(SESSION_KEY, currentUser.token);
        }
      } catch (err) {
        console.log('Backend has no current user:', err);
        // Backend has no current user, try to restore from localStorage
        const token = localStorage.getItem(SESSION_KEY);
        console.log('Found token in localStorage:', token ? 'Yes' : 'No');

        if (token) {
          try {
            console.log('Attempting to restore session with token...');
            const restoredUser = await RestoreSession(token);
            console.log('Session restored successfully:', restoredUser.username);
            setUser(restoredUser);
            if (restoredUser?.language_preference) {
              i18n.changeLanguage(restoredUser.language_preference);
              localStorage.setItem('i18nextLng', restoredUser.language_preference);
            }
          } catch (err) {
            console.error('Failed to restore session:', err);
            // Clear invalid session
            localStorage.removeItem(SESSION_KEY);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    EventsOn('water:reminder', () => {
      console.log('Time to drink water!');
    });

    restoreUserSession();
  }, [i18n]);

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    if (loggedInUser?.language_preference) {
      i18n.changeLanguage(loggedInUser.language_preference);
      localStorage.setItem('i18nextLng', loggedInUser.language_preference);
    }
    // Save session to localStorage
    if (loggedInUser?.token) {
      localStorage.setItem(SESSION_KEY, loggedInUser.token);
    }
  };

  const handleLogout = () => {
    setUser(null);
    // Clear session from localStorage
    localStorage.removeItem(SESSION_KEY);
  };

  if (loading) {
    return (
      <Loading text={i18n.t('loading')} />
    );
  }

  if (!user) {
    return (
      <>
        {showRegister ? (
          <Register
            onSuccess={handleLoginSuccess}
            onSwitchToLogin={() => setShowRegister(false)}
          />
        ) : (
          <Login
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setShowRegister(true)}
          />
        )}
        <Toaster />
      </>
    );
  }

  return (
    <>
      <MainApp user={user} onLogout={handleLogout} />
      <Toaster />
    </>
  );
}

export default App;



