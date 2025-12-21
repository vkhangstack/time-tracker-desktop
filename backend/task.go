package backend

import (
	"time"
)

// Task represents a task that can be associated with Pomodoro sessions
type Task struct {
	ID          int64      `json:"id"`
	UserID      int64      `json:"user_id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Completed   bool       `json:"completed"`
	CreatedAt   time.Time  `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// PomodoroSession represents a completed Pomodoro session
type PomodoroSession struct {
	ID          int64     `json:"id"`
	UserID      int64     `json:"user_id"`
	TaskID      *int64    `json:"task_id,omitempty"`
	Duration    int       `json:"duration"` // Duration in minutes
	StartedAt   time.Time `json:"started_at"`
	CompletedAt time.Time `json:"completed_at"`
}

// TimerState represents the current state of the Pomodoro timer
type TimerState struct {
	IsRunning     bool      `json:"is_running"`
	IsPaused      bool      `json:"is_paused"`
	Duration      int       `json:"duration"`       // Total duration in seconds
	TimeRemaining int       `json:"time_remaining"` // Remaining time in seconds
	TaskID        *int64    `json:"task_id,omitempty"`
	StartedAt     time.Time `json:"started_at,omitempty"`
}

// WaterReminderSettings represents water reminder configuration
type WaterReminderSettings struct {
	Enabled            bool      `json:"enabled"`
	IntervalMins       int       `json:"interval_mins"`                  // Interval in minutes (preset or custom)
	CustomIntervalMins *int      `json:"custom_interval_mins,omitempty"` // Optional custom interval
	LastReminder       time.Time `json:"last_reminder"`
}
