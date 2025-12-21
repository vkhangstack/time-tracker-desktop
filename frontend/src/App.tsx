import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { MainApp } from './components/MainApp';
import { Toaster } from './components/Toaster';
import { GetCurrentUser, RestoreSession } from '../wailsjs/go/backend/App';

const SESSION_KEY = 'time-tracker-session';

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
        if (currentUser?.id) {
          localStorage.setItem(SESSION_KEY, currentUser.id.toString());
        }
      } catch {
        // Backend has no current user, try to restore from localStorage
        const savedUserId = localStorage.getItem(SESSION_KEY);
        if (savedUserId) {
          try {
            const restoredUser = await RestoreSession(parseInt(savedUserId));
            setUser(restoredUser);
            if (restoredUser?.language_preference) {
              i18n.changeLanguage(restoredUser.language_preference);
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

    restoreUserSession();
  }, [i18n]);

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    if (loggedInUser?.language_preference) {
      i18n.changeLanguage(loggedInUser.language_preference);
    }
    // Save session to localStorage
    if (loggedInUser?.id) {
      localStorage.setItem(SESSION_KEY, loggedInUser.id.toString());
    }
  };

  const handleLogout = () => {
    setUser(null);
    // Clear session from localStorage
    localStorage.removeItem(SESSION_KEY);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
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



