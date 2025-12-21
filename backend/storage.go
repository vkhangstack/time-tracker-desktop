package backend

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// Storage handles all database operations
type Storage struct {
	db *sql.DB
}

// retryOnBusy retries a database operation if it fails with SQLITE_BUSY
func retryOnBusy(operation func() error, maxRetries int) error {
	var err error
	for i := 0; i < maxRetries; i++ {
		err = operation()
		if err == nil {
			return nil
		}
		// Check if error is SQLITE_BUSY
		if strings.Contains(err.Error(), "database is locked") ||
			strings.Contains(err.Error(), "SQLITE_BUSY") {
			// Wait before retrying (exponential backoff)
			time.Sleep(time.Duration(50*(i+1)) * time.Millisecond)
			continue
		}
		// If it's not a busy error, return immediately
		return err
	}
	return err
}

// NewStorage creates a new Storage instance
func NewStorage() (*Storage, error) {
	dbPath, err := GetDatabasePath()
	if err != nil {
		return nil, err
	}

	// Add connection parameters to prevent database locked errors
	dbPath += "?_busy_timeout=5000&_journal_mode=WAL&_synchronous=NORMAL"

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	// Configure connection pool
	db.SetMaxOpenConns(1) // SQLite works best with single connection
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(time.Hour)

	// Enable WAL mode for better concurrency
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		return nil, fmt.Errorf("failed to enable WAL mode: %v", err)
	}

	// Set busy timeout
	if _, err := db.Exec("PRAGMA busy_timeout=5000;"); err != nil {
		return nil, fmt.Errorf("failed to set busy timeout: %v", err)
	}

	storage := &Storage{db: db}
	if err := storage.initTables(); err != nil {
		return nil, err
	}

	// Run migrations
	if err := storage.runMigrations(); err != nil {
		return nil, err
	}

	return storage, nil
}

// initTables creates all necessary database tables
func (s *Storage) initTables() error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		language_preference TEXT DEFAULT 'en',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS tasks (
		id INTEGER PRIMARY KEY,
		user_id INTEGER NOT NULL,
		title TEXT NOT NULL,
		description TEXT,
		completed BOOLEAN DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		completed_at DATETIME,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);

	CREATE TABLE IF NOT EXISTS pomodoro_sessions (
		id INTEGER PRIMARY KEY,
		user_id INTEGER NOT NULL,
		task_id INTEGER,
		duration INTEGER NOT NULL,
		started_at DATETIME NOT NULL,
		completed_at DATETIME NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users(id),
		FOREIGN KEY (task_id) REFERENCES tasks(id)
	);

	CREATE TABLE IF NOT EXISTS water_reminders (
		user_id INTEGER PRIMARY KEY,
		enabled BOOLEAN DEFAULT 1,
		interval_mins INTEGER DEFAULT 60,
		custom_interval_mins INTEGER,
		last_reminder DATETIME,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);
	`

	_, err := s.db.Exec(schema)
	return err
}

// runMigrations handles database schema migrations
func (s *Storage) runMigrations() error {
	// Migration 1: Add custom_interval_mins column to water_reminders table
	// Check if column exists
	var columnExists bool
	query := `SELECT COUNT(*) FROM pragma_table_info('water_reminders') WHERE name='custom_interval_mins'`
	err := s.db.QueryRow(query).Scan(&columnExists)
	if err != nil {
		return fmt.Errorf("failed to check for custom_interval_mins column: %v", err)
	}

	// Add column if it doesn't exist
	if !columnExists {
		_, err := s.db.Exec(`ALTER TABLE water_reminders ADD COLUMN custom_interval_mins INTEGER`)
		if err != nil {
			return fmt.Errorf("failed to add custom_interval_mins column: %v", err)
		}
	}

	return nil
}

// CreateUser creates a new user
func (s *Storage) CreateUser(user *User) error {
	return retryOnBusy(func() error {
		query := `INSERT INTO users (id, username, email, password_hash, language_preference, created_at) 
				  VALUES (?, ?, ?, ?, ?, ?)`
		_, err := s.db.Exec(query, user.ID, user.Username, user.Email, user.PasswordHash,
			user.LanguagePreference, user.CreatedAt)
		return err
	}, 3)
}

// GetUserByUsername retrieves a user by username
func (s *Storage) GetUserByUsername(username string) (*User, error) {
	query := `SELECT id, username, email, password_hash, language_preference, created_at 
	          FROM users WHERE username = ?`
	user := &User{}
	err := s.db.QueryRow(query, username).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.LanguagePreference, &user.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	return user, err
}

// GetUserByID retrieves a user by ID
func (s *Storage) GetUserByID(id int64) (*User, error) {
	query := `SELECT id, username, email, password_hash, language_preference, created_at 
	          FROM users WHERE id = ?`
	user := &User{}
	err := s.db.QueryRow(query, id).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.LanguagePreference, &user.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	return user, err
}

// GetUserByEmail retrieves a user by email
func (s *Storage) GetUserByEmail(email string) (*User, error) {
	query := `SELECT id, username, email, password_hash, language_preference, created_at 
	          FROM users WHERE email = ?`
	user := &User{}
	err := s.db.QueryRow(query, email).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.LanguagePreference, &user.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	return user, err
}

// UpdateUserLanguage updates user's language preference
func (s *Storage) UpdateUserLanguage(userID int64, language string) error {
	return retryOnBusy(func() error {
		query := `UPDATE users SET language_preference = ? WHERE id = ?`
		_, err := s.db.Exec(query, language, userID)
		return err
	}, 3)
}

// CreateTask creates a new task
func (s *Storage) CreateTask(task *Task) error {
	return retryOnBusy(func() error {
		query := `INSERT INTO tasks (id, user_id, title, description, completed, created_at) 
				  VALUES (?, ?, ?, ?, ?, ?)`
		_, err := s.db.Exec(query, task.ID, task.UserID, task.Title, task.Description,
			task.Completed, task.CreatedAt)
		return err
	}, 3)
}

// GetTasks retrieves all tasks for a user
func (s *Storage) GetTasks(userID int64) ([]Task, error) {
	query := `SELECT id, user_id, title, description, completed, created_at, completed_at 
	          FROM tasks WHERE user_id = ? ORDER BY created_at DESC`
	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var task Task
		err := rows.Scan(&task.ID, &task.UserID, &task.Title, &task.Description,
			&task.Completed, &task.CreatedAt, &task.CompletedAt)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, task)
	}
	return tasks, nil
}

// UpdateTask updates a task
func (s *Storage) UpdateTask(task *Task) error {
	return retryOnBusy(func() error {
		query := `UPDATE tasks SET title = ?, description = ?, completed = ?, completed_at = ? 
				  WHERE id = ? AND user_id = ?`
		_, err := s.db.Exec(query, task.Title, task.Description, task.Completed,
			task.CompletedAt, task.ID, task.UserID)
		return err
	}, 3)
}

// DeleteTask deletes a task
func (s *Storage) DeleteTask(taskID, userID int64) error {
	return retryOnBusy(func() error {
		query := `DELETE FROM tasks WHERE id = ? AND user_id = ?`
		_, err := s.db.Exec(query, taskID, userID)
		return err
	}, 3)
}

// CreatePomodoroSession creates a new Pomodoro session
func (s *Storage) CreatePomodoroSession(session *PomodoroSession) error {
	return retryOnBusy(func() error {
		query := `INSERT INTO pomodoro_sessions (id, user_id, task_id, duration, started_at, completed_at) 
				  VALUES (?, ?, ?, ?, ?, ?)`
		_, err := s.db.Exec(query, session.ID, session.UserID, session.TaskID, session.Duration,
			session.StartedAt, session.CompletedAt)
		return err
	}, 3)
}

// GetSessions retrieves Pomodoro sessions for a user within a date range
func (s *Storage) GetSessions(userID int64, startDate, endDate time.Time) ([]PomodoroSession, error) {
	query := `SELECT id, user_id, task_id, duration, started_at, completed_at 
	          FROM pomodoro_sessions 
	          WHERE user_id = ? AND completed_at BETWEEN ? AND ?
	          ORDER BY completed_at DESC`
	rows, err := s.db.Query(query, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []PomodoroSession
	for rows.Next() {
		var session PomodoroSession
		err := rows.Scan(&session.ID, &session.UserID, &session.TaskID, &session.Duration,
			&session.StartedAt, &session.CompletedAt)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}
	return sessions, nil
}

// GetWaterReminderSettings retrieves water reminder settings for a user
func (s *Storage) GetWaterReminderSettings(userID int64) (*WaterReminderSettings, error) {
	query := `SELECT enabled, interval_mins, custom_interval_mins, last_reminder FROM water_reminders WHERE user_id = ?`
	settings := &WaterReminderSettings{}
	err := s.db.QueryRow(query, userID).Scan(&settings.Enabled, &settings.IntervalMins, &settings.CustomIntervalMins, &settings.LastReminder)
	if err == sql.ErrNoRows {
		// Return default settings if not found
		return &WaterReminderSettings{
			Enabled:      true,
			IntervalMins: 60,
			LastReminder: time.Now(),
		}, nil
	}
	return settings, err
}

// SaveWaterReminderSettings saves water reminder settings for a user
func (s *Storage) SaveWaterReminderSettings(userID int64, settings *WaterReminderSettings) error {
	return retryOnBusy(func() error {
		query := `INSERT OR REPLACE INTO water_reminders (user_id, enabled, interval_mins, custom_interval_mins, last_reminder) 
				  VALUES (?, ?, ?, ?, ?)`
		_, err := s.db.Exec(query, userID, settings.Enabled, settings.IntervalMins, settings.CustomIntervalMins, settings.LastReminder)
		return err
	}, 3)
}

// Close closes the database connection
func (s *Storage) Close() error {
	return s.db.Close()
}
