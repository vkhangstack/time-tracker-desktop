package backend

import (
	"os"
	"path/filepath"
	"runtime"
)

// GetDataDir returns the platform-specific data directory
func GetDataDir() (string, error) {
	var baseDir string
	var err error

	switch runtime.GOOS {
	case "windows":
		// Windows: %APPDATA%\time-tracker
		baseDir = os.Getenv("APPDATA")
		if baseDir == "" {
			baseDir, err = os.UserConfigDir()
			if err != nil {
				return "", err
			}
		}
		baseDir = filepath.Join(baseDir, "time-tracker")
	case "darwin":
		// macOS: ~/Library/Application Support/time-tracker
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		baseDir = filepath.Join(home, "Library", "Application Support", "time-tracker")
	default:
		// Linux: ~/.time-tracker
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		baseDir = filepath.Join(home, ".time-tracker")
	}

	// Create directory if it doesn't exist
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return "", err
	}

	return baseDir, nil
}

// GetDatabasePath returns the full path to the SQLite database file
func GetDatabasePath() (string, error) {
	dataDir, err := GetDataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dataDir, "timetracker.db"), nil
}

// GetConfigPath returns the full path to the config file
func GetConfigPath() (string, error) {
	dataDir, err := GetDataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dataDir, "config.json"), nil
}
