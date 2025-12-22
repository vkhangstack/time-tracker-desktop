package backend

import (
	"context"
	"fmt"
	"log"
	"os/exec"
	"runtime"
	"time"
)

// App struct
type App struct {
	ctx           context.Context
	storage       *Storage
	cache         *Cache
	currentUser   *User
	pomodoroTimer *PomodoroTimer
	waterReminder *WaterReminder
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize Snowflake ID generator
	if err := InitSnowflake(1); err != nil {
		fmt.Printf("Failed to initialize Snowflake: %v\n", err)
	}

	// Initialize storage
	storage, err := NewStorage()
	if err != nil {
		fmt.Printf("Failed to initialize storage: %v\n", err)
	}
	a.storage = storage

	// Initialize cache
	a.cache = NewCache()

	// Initialize Pomodoro timer
	a.pomodoroTimer = NewPomodoroTimer(a)

	// Initialize water reminder
	a.waterReminder = NewWaterReminder(a)
}

// shutdown is called when the app is closing
func (a *App) Shutdown(_ context.Context) {
	if a.storage != nil {
		_ = a.storage.Close()
	}
	if a.pomodoroTimer != nil {
		a.pomodoroTimer.Stop()
	}
	if a.waterReminder != nil {
		a.waterReminder.Stop()
	}
}

// ========== Authentication Methods ==========

// Register creates a new user account
func (a *App) Register(username, email, password string) error {
	// Check if user already exists
	if _, err := a.storage.GetUserByUsername(username); err == nil {
		return fmt.Errorf("username already exists")
	}
	if _, err := a.storage.GetUserByEmail(email); err == nil {
		return fmt.Errorf("email already exists")
	}

	// Hash password
	passwordHash, err := HashPassword(password)
	if err != nil {
		return err
	}

	// Create user
	user := &User{
		ID:                 GenerateID(),
		Username:           username,
		Email:              email,
		PasswordHash:       passwordHash,
		LanguagePreference: "en",
		CreatedAt:          time.Now(),
	}

	if err := a.storage.CreateUser(user); err != nil {
		return err
	}

	return nil
}

// Login authenticates a user
func (a *App) Login(username, password string) (*User, error) {
	user, err := a.storage.GetUserByUsername(username)
	if err != nil {
		return nil, fmt.Errorf("invalid username or password")
	}

	if !CheckPassword(user.PasswordHash, password) {
		return nil, fmt.Errorf("invalid username or password")
	}

	// Generate session token
	token, err := GenerateToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %v", err)
	}

	// Save session (expires in 30 days)
	session := &Session{
		Token:     token,
		UserID:    user.ID,
		ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
		CreatedAt: time.Now(),
	}
	if err := a.storage.CreateSession(session); err != nil {
		return nil, fmt.Errorf("failed to save session: %v", err)
	}

	// Set current user
	a.currentUser = user

	// Cache user data
	a.cache.SetWithExpiry(fmt.Sprintf("user:%d", user.ID), user, 24*time.Hour)

	// Load water reminder settings
	settings, err := a.storage.GetWaterReminderSettings(user.ID)
	if err == nil {
		a.waterReminder.Start(user.ID, settings)
	}

	// Return user without password hash, with token
	user.PasswordHash = ""
	user.Token = token
	return user, nil
}

// GetCurrentUser returns the current logged-in user
func (a *App) GetCurrentUser() (*User, error) {
	if a.currentUser == nil {
		return nil, fmt.Errorf("no user logged in")
	}

	// Return user without password hash
	user := *a.currentUser
	user.PasswordHash = ""
	return &user, nil
}

// Logout logs out the current user
func (a *App) Logout(token string) error {
	// Delete session from DB
	if token != "" {
		_ = a.storage.DeleteSession(token)
	}

	if a.currentUser == nil {
		return nil
	}

	// Stop water reminder
	if a.waterReminder != nil {
		a.waterReminder.Stop()
	}

	// Clear cache
	a.cache.Delete(fmt.Sprintf("user:%d", a.currentUser.ID))

	// Clear current user
	a.currentUser = nil

	return nil
}

// RestoreSession restores a user session by token
func (a *App) RestoreSession(token string) (*User, error) {
	// Clean up expired sessions first
	_ = a.storage.DeleteExpiredSessions()

	fmt.Printf("Restoring session with token: %s\n", token)

	// Validate token
	session, err := a.storage.GetSession(token)
	if err != nil {
		fmt.Printf("Session lookup failed: %v\n", err)
		return nil, fmt.Errorf("invalid session")
	}

	// Check expiration
	if time.Now().After(session.ExpiresAt) {
		fmt.Printf("Session expired. ExpiresAt: %v, Now: %v\n", session.ExpiresAt, time.Now())
		_ = a.storage.DeleteSession(token)
		return nil, fmt.Errorf("session expired")
	}

	// Get user from database
	user, err := a.storage.GetUserByID(session.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	// Set current user
	a.currentUser = user

	// Cache user data
	a.cache.SetWithExpiry(fmt.Sprintf("user:%d", user.ID), user, 24*time.Hour)

	// Load water reminder settings
	settings, err := a.storage.GetWaterReminderSettings(user.ID)
	if err == nil && settings.Enabled {
		a.waterReminder.Start(user.ID, settings)
	}

	// Return user without password hash
	userCopy := *user
	userCopy.PasswordHash = ""
	userCopy.Token = token
	return &userCopy, nil
}

// SetLanguage updates the user's language preference
func (a *App) SetLanguage(language string) error {
	if a.currentUser == nil {
		return fmt.Errorf("no user logged in")
	}

	if err := a.storage.UpdateUserLanguage(a.currentUser.ID, language); err != nil {
		return err
	}

	a.currentUser.LanguagePreference = language
	a.cache.Delete(fmt.Sprintf("user:%d", a.currentUser.ID))

	return nil
}

// GetLanguage returns the current user's language preference
func (a *App) GetLanguage() string {
	if a.currentUser != nil {
		return a.currentUser.LanguagePreference
	}
	return "en"
}

// ========== Task Methods ==========

// CreateTask creates a new task
func (a *App) CreateTask(title, description string) (*Task, error) {
	if a.currentUser == nil {
		return nil, fmt.Errorf("no user logged in")
	}

	task := &Task{
		ID:          GenerateID(),
		UserID:      a.currentUser.ID,
		Title:       title,
		Description: description,
		Completed:   false,
		CreatedAt:   time.Now(),
	}

	if err := a.storage.CreateTask(task); err != nil {
		return nil, err
	}

	// Invalidate cache
	a.cache.Delete(fmt.Sprintf("tasks:%d", a.currentUser.ID))

	return task, nil
}

// GetTasks returns all tasks for the current user
func (a *App) GetTasks() ([]Task, error) {
	if a.currentUser == nil {
		return nil, fmt.Errorf("no user logged in")
	}

	// Check cache
	cacheKey := fmt.Sprintf("tasks:%d", a.currentUser.ID)
	if cached, ok := a.cache.Get(cacheKey); ok {
		return cached.([]Task), nil
	}

	tasks, err := a.storage.GetTasks(a.currentUser.ID)
	if err != nil {
		return nil, err
	}

	// Cache tasks
	a.cache.SetWithExpiry(cacheKey, tasks, 5*time.Minute)

	return tasks, nil
}

// UpdateTask updates a task
func (a *App) UpdateTask(taskID int64, title, description string, completed bool) error {
	if a.currentUser == nil {
		return fmt.Errorf("no user logged in")
	}

	task := &Task{
		ID:          taskID,
		UserID:      a.currentUser.ID,
		Title:       title,
		Description: description,
		Completed:   completed,
	}

	if completed && task.CompletedAt == nil {
		now := time.Now()
		task.CompletedAt = &now
	}

	if err := a.storage.UpdateTask(task); err != nil {
		return err
	}

	// Invalidate cache
	a.cache.Delete(fmt.Sprintf("tasks:%d", a.currentUser.ID))

	return nil
}

// DeleteTask deletes a task
func (a *App) DeleteTask(taskID int64) error {
	if a.currentUser == nil {
		return fmt.Errorf("no user logged in")
	}

	if err := a.storage.DeleteTask(taskID, a.currentUser.ID); err != nil {
		return err
	}

	// Invalidate cache
	a.cache.Delete(fmt.Sprintf("tasks:%d", a.currentUser.ID))

	return nil
}

// ========== Pomodoro Timer Methods ==========

// StartPomodoro starts a Pomodoro timer
func (a *App) StartPomodoro(durationMinutes int, taskID *int64) error {
	if a.currentUser == nil {
		return fmt.Errorf("no user logged in")
	}

	return a.pomodoroTimer.Start(durationMinutes, taskID)
}

// PausePomodoro pauses the Pomodoro timer
func (a *App) PausePomodoro() {
	a.pomodoroTimer.Pause()
}

// ResumePomodoro resumes the Pomodoro timer
func (a *App) ResumePomodoro() {
	a.pomodoroTimer.Resume()
}

// StopPomodoro stops the Pomodoro timer
func (a *App) StopPomodoro() {
	a.pomodoroTimer.Stop()
}

// GetTimerState returns the current timer state
func (a *App) GetTimerState() TimerState {
	return a.pomodoroTimer.GetState()
}

// CompletePomodoro saves a completed Pomodoro session
func (a *App) CompletePomodoro(durationMinutes int, taskID *int64) error {
	if a.currentUser == nil {
		return fmt.Errorf("no user logged in")
	}

	now := time.Now()
	session := &PomodoroSession{
		ID:          GenerateID(),
		UserID:      a.currentUser.ID,
		TaskID:      taskID,
		Duration:    durationMinutes,
		StartedAt:   now.Add(-time.Duration(durationMinutes) * time.Minute),
		CompletedAt: now,
	}

	if err := a.storage.CreatePomodoroSession(session); err != nil {
		return err
	}

	// Invalidate sessions cache
	a.cache.Delete(fmt.Sprintf("sessions:%d", a.currentUser.ID))

	return nil
}

// ========== Reporting Methods ==========

// GetSessions returns Pomodoro sessions within a date range
func (a *App) GetSessions(startDate, endDate string) ([]PomodoroSession, error) {
	if a.currentUser == nil {
		return nil, fmt.Errorf("no user logged in")
	}

	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return nil, err
	}

	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return nil, err
	}
	// Set end to end of day
	end = end.Add(24 * time.Hour).Add(-1 * time.Second)

	sessions, err := a.storage.GetSessions(a.currentUser.ID, start, end)
	if err != nil {
		return nil, err
	}

	return sessions, nil
}

// GetReport generates a report for the current user
func (a *App) GetReport(startDate, endDate string) (map[string]interface{}, error) {
	sessions, err := a.GetSessions(startDate, endDate)
	if err != nil {
		return nil, err
	}

	totalSessions := len(sessions)
	totalMinutes := 0
	taskCounts := make(map[int64]int)

	for _, session := range sessions {
		totalMinutes += session.Duration
		if session.TaskID != nil {
			taskCounts[*session.TaskID]++
		}
	}

	report := map[string]interface{}{
		"total_sessions": totalSessions,
		"total_minutes":  totalMinutes,
		"total_hours":    float64(totalMinutes) / 60.0,
		"task_counts":    taskCounts,
	}

	return report, nil
}

// ========== Water Reminder Methods ==========

// GetWaterReminderSettings returns water reminder settings
func (a *App) GetWaterReminderSettings() (*WaterReminderSettings, error) {
	if a.currentUser == nil {
		return nil, fmt.Errorf("no user logged in")
	}

	return a.storage.GetWaterReminderSettings(a.currentUser.ID)
}

// SaveWaterReminderSettings saves water reminder settings
func (a *App) SaveWaterReminderSettings(enabled bool, intervalMins int, customIntervalMins *int) error {
	if a.currentUser == nil {
		return fmt.Errorf("no user logged in")
	}

	// If custom interval is provided and valid, use it
	actualInterval := intervalMins
	if customIntervalMins != nil && *customIntervalMins > 0 {
		actualInterval = *customIntervalMins
	}

	settings := &WaterReminderSettings{
		Enabled:            enabled,
		IntervalMins:       actualInterval,
		CustomIntervalMins: customIntervalMins,
		LastReminder:       time.Now(),
	}

	if err := a.storage.SaveWaterReminderSettings(a.currentUser.ID, settings); err != nil {
		log.Print(err.Error())
		return err
	}

	// Update reminder
	if enabled {
		a.waterReminder.Start(a.currentUser.ID, settings)
	} else {
		a.waterReminder.Stop()
	}

	return nil
}

// ========== App Info Methods ==========

// GetAppInfo returns application information
func (a *App) GetAppInfo() map[string]interface{} {
	return map[string]interface{}{
		"name":        "Time Tracker",
		"version":     "1.0.0",
		"author":      "Pham Van Khang",
		"email":       "phamvankhang.tvi@gmail.com",
		"description": "Pomodoro timer and task tracker with water reminder",
		"license":     "MIT",
		"repository":  "https://github.com/vkhangstack/time-tracker-desktop",
	}
}

// ========== Daily Retro Methods ==========

// DailySummary represents a summary of the day
type DailySummary struct {
	Date           string      `json:"date"`
	CompletedTasks []Task      `json:"completed_tasks"`
	TotalFocusTime int         `json:"total_focus_time"` // in minutes
	Retro          *DailyRetro `json:"retro,omitempty"`
}

// GetDailyRetro returns the daily retro for a specific date
func (a *App) GetUserDailyRetro(date string) (*DailyRetro, error) {
	if a.currentUser == nil {
		return nil, fmt.Errorf("no user logged in")
	}
	return a.storage.GetDailyRetro(a.currentUser.ID, date)
}

// SaveDailyRetro saves the daily retro
func (a *App) SaveDailyRetro(date, retroNotes, planNotes string) error {
	if a.currentUser == nil {
		return fmt.Errorf("no user logged in")
	}

	// Check if exists first to preserve ID if updating
	existing, _ := a.storage.GetDailyRetro(a.currentUser.ID, date)

	now := time.Now()
	retro := &DailyRetro{
		UserID:     a.currentUser.ID,
		Date:       date,
		RetroNotes: retroNotes,
		PlanNotes:  planNotes,
		UpdatedAt:  now,
	}

	if existing != nil {
		retro.ID = existing.ID
		retro.CreatedAt = existing.CreatedAt
	} else {
		retro.ID = GenerateID()
		retro.CreatedAt = now
	}

	return a.storage.SaveDailyRetro(retro)
}

// GetDailySummary returns a summary for the day including tasks, focus time, and retro
func (a *App) GetDailySummary(date string) (*DailySummary, error) {
	if a.currentUser == nil {
		return nil, fmt.Errorf("no user logged in")
	}

	// Get completed tasks
	tasks, err := a.storage.GetCompletedTasksForDate(a.currentUser.ID, date)
	if err != nil {
		return nil, err
	}

	// Get focus time (sum of pomodoro sessions completed on this date)
	// We need a helper for this or reuse GetSessions but with specific times
	// For simplicity, let's use GetSessions with start/end of day
	startTime, _ := time.Parse("2006-01-02", date)
	endTime := startTime.Add(24 * time.Hour).Add(-1 * time.Second)

	sessions, err := a.storage.GetSessions(a.currentUser.ID, startTime, endTime)
	if err != nil {
		return nil, err
	}

	totalFocusTime := 0
	for _, s := range sessions {
		totalFocusTime += s.Duration
	}

	// Get retro
	retro, err := a.storage.GetDailyRetro(a.currentUser.ID, date)
	if err != nil {
		// Log error but continue
		fmt.Printf("Error fetching retro: %v\n", err)
	}

	return &DailySummary{
		Date:           date,
		CompletedTasks: tasks,
		TotalFocusTime: totalFocusTime,
		Retro:          retro,
	}, nil
}

// ========= Utility Methods ==========
// LockScreen executes the platform screen-lock command.
func (a *App) LockScreen() error {
	switch runtime.GOOS {
	case "windows":
		// Locks current session on Windows. [web:42][web:50][web:54]
		cmd := exec.Command("rundll32.exe", "user32.dll,LockWorkStation")
		return cmd.Run()

	case "linux":
		// Try common desktop commands; adjust for your target DE. [web:43][web:47][web:51]
		// Example: GNOME screensaver / GNOME Shell
		cmd := exec.Command("bash", "-c",
			`if command -v gnome-screensaver-command >/dev/null 2>&1; then
			   gnome-screensaver-command --lock
			 elif command -v loginctl >/dev/null 2>&1; then
			   loginctl lock-session
			 elif command -v xdg-screensaver >/dev/null 2>&1; then
			   xdg-screensaver lock
			 else
			   exit 1
			 fi`)
		return cmd.Run()
	case "darwin":
		// Locks screen on macOS. [web:44][web:48][web:52]
		cmd := exec.Command("pmset", "displaysleepnow")
		return cmd.Run()

	default:
		return nil
	}
}

// Ping is a simple method to test connectivity
func (a *App) Ping() string {
	return "pong"
}
