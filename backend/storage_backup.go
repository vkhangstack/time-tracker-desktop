package backend

import (
	"encoding/json"
	"fmt"
	"time"
)

// BackupData represents the structure of the backup file
type BackupData struct {
	Version        string                      `json:"version"`
	Timestamp      time.Time                   `json:"timestamp"`
	Users          []User                      `json:"users"`
	Tasks          []Task                      `json:"tasks"`
	Sessions       []PomodoroSession           `json:"pomodoro_sessions"` // Renamed from PomodoroSessions to match likely JSON key preference or keep simple
	DailyRetros    []DailyRetro                `json:"daily_retros"`
	WaterReminders []UserWaterReminderSettings `json:"water_reminders"`
}

// UserWaterReminderSettings wraps settings with user ID for export
type UserWaterReminderSettings struct {
	UserID   int64                 `json:"user_id"`
	Settings WaterReminderSettings `json:"settings"`
}

// ExportJSON exports all data to a JSON byte slice
func (s *Storage) ExportJSON() ([]byte, error) {
	backup := BackupData{
		Version:   "1.0",
		Timestamp: time.Now(),
	}

	// 1. Get all users
	users, err := s.getAllUsers()
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %v", err)
	}
	backup.Users = users

	// 2. Get data for each user
	for _, user := range users {
		// Tasks
		tasks, err := s.GetTasks(user.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get tasks for user %d: %v", user.ID, err)
		}
		backup.Tasks = append(backup.Tasks, tasks...)

		// Pomodoro Sessions
		// We need all sessions, GetSessions filters by date.
		// Let's add a helper or just query raw here.
		userSessions, err := s.getAllSessionsForUser(user.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get sessions for user %d: %v", user.ID, err)
		}
		backup.Sessions = append(backup.Sessions, userSessions...)

		// Daily Retros
		userRetros, err := s.getAllRetrosForUser(user.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get retros for user %d: %v", user.ID, err)
		}
		backup.DailyRetros = append(backup.DailyRetros, userRetros...)

		// Water Reminder Settings
		settings, err := s.GetWaterReminderSettings(user.ID)
		if err != nil {
			// If error is no rows, that's fine, skip.
			// But GetWaterReminderSettings returns default if no rows.
			// Ideally we only save if explicit?
			// Let's just save whatever we get.
		}
		backup.WaterReminders = append(backup.WaterReminders, UserWaterReminderSettings{
			UserID:   user.ID,
			Settings: *settings,
		})
	}

	return json.MarshalIndent(backup, "", "  ")
}

// ImportJSON imports data from a JSON byte slice
func (s *Storage) ImportJSON(data []byte) error {
	var backup BackupData
	if err := json.Unmarshal(data, &backup); err != nil {
		return fmt.Errorf("failed to parse backup data: %v", err)
	}

	// Begin transaction
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Restore Users
	stmtUser, err := tx.Prepare(`INSERT OR REPLACE INTO users (id, username, email, password_hash, language_preference, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmtUser.Close()
	for _, u := range backup.Users {
		_, err = stmtUser.Exec(u.ID, u.Username, u.Email, u.PasswordHash, u.LanguagePreference, u.CreatedAt)
		if err != nil {
			return fmt.Errorf("failed to restore user %s: %v", u.Username, err)
		}
	}

	// Restore Tasks
	stmtTask, err := tx.Prepare(`INSERT OR REPLACE INTO tasks (id, user_id, title, description, completed, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmtTask.Close()
	for _, t := range backup.Tasks {
		var completedAt interface{}
		if t.CompletedAt != nil {
			completedAt = t.CompletedAt.Format(time.RFC3339)
		}
		_, err = stmtTask.Exec(t.ID, t.UserID, t.Title, t.Description, t.Completed, t.CreatedAt.Format(time.RFC3339), completedAt)
		if err != nil {
			return fmt.Errorf("failed to restore task %d: %v", t.ID, err)
		}
	}

	// Restore Pomodoro Sessions
	stmtSession, err := tx.Prepare(`INSERT OR REPLACE INTO pomodoro_sessions (id, user_id, task_id, duration, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmtSession.Close()
	for _, ps := range backup.Sessions {
		_, err = stmtSession.Exec(ps.ID, ps.UserID, ps.TaskID, ps.Duration, ps.StartedAt, ps.CompletedAt)
		if err != nil {
			return fmt.Errorf("failed to restore session %d: %v", ps.ID, err)
		}
	}

	// Restore Daily Retros
	stmtRetro, err := tx.Prepare(`INSERT OR REPLACE INTO daily_retros (id, user_id, date, retro_notes, plan_notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmtRetro.Close()
	for _, dr := range backup.DailyRetros {
		_, err = stmtRetro.Exec(dr.ID, dr.UserID, dr.Date, dr.RetroNotes, dr.PlanNotes, dr.CreatedAt, dr.UpdatedAt)
		if err != nil {
			return fmt.Errorf("failed to restore retro %d: %v", dr.ID, err)
		}
	}

	// Restore Water Reminders
	stmtWater, err := tx.Prepare(`INSERT OR REPLACE INTO water_reminders (user_id, enabled, interval_mins, custom_interval_mins, last_reminder) VALUES (?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmtWater.Close()
	for _, wr := range backup.WaterReminders {
		_, err = stmtWater.Exec(wr.UserID, wr.Settings.Enabled, wr.Settings.IntervalMins, wr.Settings.CustomIntervalMins, wr.Settings.LastReminder)
		if err != nil {
			return fmt.Errorf("failed to restore water reminder for user %d: %v", wr.UserID, err)
		}
	}

	return tx.Commit()
}

// Helper methods for Export (since they are not in storage.go)

func (s *Storage) getAllUsers() ([]User, error) {
	query := `SELECT id, username, email, password_hash, language_preference, created_at FROM users`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.LanguagePreference, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

func (s *Storage) getAllSessionsForUser(userID int64) ([]PomodoroSession, error) {
	query := `SELECT id, user_id, task_id, duration, started_at, completed_at FROM pomodoro_sessions WHERE user_id = ?`
	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []PomodoroSession
	for rows.Next() {
		var s PomodoroSession
		if err := rows.Scan(&s.ID, &s.UserID, &s.TaskID, &s.Duration, &s.StartedAt, &s.CompletedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

func (s *Storage) getAllRetrosForUser(userID int64) ([]DailyRetro, error) {
	query := `SELECT id, user_id, date, retro_notes, plan_notes, created_at, updated_at FROM daily_retros WHERE user_id = ?`
	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var retros []DailyRetro
	for rows.Next() {
		var r DailyRetro
		if err := rows.Scan(&r.ID, &r.UserID, &r.Date, &r.RetroNotes, &r.PlanNotes, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		retros = append(retros, r)
	}
	return retros, nil
}
