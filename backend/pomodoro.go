package backend

import (
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// PomodoroTimer manages the Pomodoro timer state
type PomodoroTimer struct {
	state    *TimerState
	ticker   *time.Ticker
	stopChan chan bool
	mutex    sync.RWMutex
	app      *App
}

// NewPomodoroTimer creates a new PomodoroTimer
func NewPomodoroTimer(app *App) *PomodoroTimer {
	return &PomodoroTimer{
		state: &TimerState{
			IsRunning:     false,
			IsPaused:      false,
			Duration:      0,
			TimeRemaining: 0,
		},
		app: app,
	}
}

// Start starts the Pomodoro timer
func (pt *PomodoroTimer) Start(durationMinutes int, taskID *int64) error {
	pt.mutex.Lock()
	defer pt.mutex.Unlock()

	if pt.state.IsRunning {
		return nil
	}

	pt.state.IsRunning = true
	pt.state.IsPaused = false
	pt.state.Duration = durationMinutes * 60
	pt.state.TimeRemaining = durationMinutes * 60
	pt.state.TaskID = taskID
	pt.state.StartedAt = time.Now()

	pt.stopChan = make(chan bool)
	pt.ticker = time.NewTicker(1 * time.Second)

	go pt.run()

	return nil
}

// run is the main timer loop
func (pt *PomodoroTimer) run() {
	for {
		select {
		case <-pt.ticker.C:
			pt.mutex.Lock()
			if !pt.state.IsPaused {
				pt.state.TimeRemaining--
				if pt.state.TimeRemaining <= 0 {
					pt.mutex.Unlock()
					pt.complete()
					return
				}
			}
			pt.mutex.Unlock()
		case <-pt.stopChan:
			return
		}
	}
}

// complete handles timer completion
func (pt *PomodoroTimer) complete() {
	pt.mutex.Lock()
	defer pt.mutex.Unlock()

	pt.ticker.Stop()
	pt.state.IsRunning = false
	pt.state.IsPaused = false

	// Emit timer complete event
	if pt.app.ctx != nil {
		runtime.EventsEmit(pt.app.ctx, "timer:complete")
	}
}

// Pause pauses the timer
func (pt *PomodoroTimer) Pause() {
	pt.mutex.Lock()
	defer pt.mutex.Unlock()

	if pt.state.IsRunning {
		pt.state.IsPaused = true
	}
}

// Resume resumes the timer
func (pt *PomodoroTimer) Resume() {
	pt.mutex.Lock()
	defer pt.mutex.Unlock()

	if pt.state.IsRunning {
		pt.state.IsPaused = false
	}
}

// Stop stops the timer
func (pt *PomodoroTimer) Stop() {
	pt.mutex.Lock()
	defer pt.mutex.Unlock()

	if pt.state.IsRunning {
		pt.ticker.Stop()
		pt.stopChan <- true
		pt.state.IsRunning = false
		pt.state.IsPaused = false
		pt.state.TimeRemaining = 0
	}
}

// GetState returns the current timer state
func (pt *PomodoroTimer) GetState() TimerState {
	pt.mutex.RLock()
	defer pt.mutex.RUnlock()
	return *pt.state
}
