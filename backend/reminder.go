package backend

import (
	"sync"
	"time"

	"log"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// WaterReminder manages water reminder notifications
type WaterReminder struct {
	settings  *WaterReminderSettings
	ticker    *time.Ticker
	stopChan  chan bool
	isRunning bool
	mutex     sync.RWMutex
	app       *App
	userID    int64
}

// NewWaterReminder creates a new WaterReminder
func NewWaterReminder(app *App) *WaterReminder {
	return &WaterReminder{
		settings: &WaterReminderSettings{
			Enabled:      false,
			IntervalMins: 60,
			LastReminder: time.Now(),
		},
		app:       app,
		isRunning: false,
	}
}

// Start starts the water reminder
func (wr *WaterReminder) Start(userID int64, settings *WaterReminderSettings) {
	wr.mutex.Lock()
	defer wr.mutex.Unlock()

	if wr.isRunning {
		wr.stop()
	}

	if !settings.Enabled {
		return
	}

	wr.userID = userID
	wr.settings = settings
	wr.isRunning = true
	wr.stopChan = make(chan bool)
	wr.ticker = time.NewTicker(time.Duration(settings.IntervalMins) * time.Minute)

	go wr.run()
}

// run is the main reminder loop
func (wr *WaterReminder) run() {
	for {
		select {
		case <-wr.ticker.C:
			wr.notify()
		case <-wr.stopChan:
			return
		}
	}
}

// notify sends a water reminder notification
func (wr *WaterReminder) notify() {
	wr.mutex.Lock()
	wr.settings.LastReminder = time.Now()
	wr.mutex.Unlock()

	// Save last reminder time
	if wr.app.storage != nil {
		wr.app.storage.SaveWaterReminderSettings(wr.userID, wr.settings)
	}

	// Emit water reminder event
	if wr.app.ctx != nil {
		runtime.EventsEmit(wr.app.ctx, "water:reminder")

		err := wr.app.PushNotification(&Notification{
			AppID:   "Time Tracker",
			Title:   "Water Reminder",
			Message: "It's time to drink water!",
		})

		if err != nil {
			log.Fatalf("push toast error: %v", err)
		}
	}
}

// Stop stops the water reminder
func (wr *WaterReminder) Stop() {
	wr.mutex.Lock()
	defer wr.mutex.Unlock()
	wr.stop()
}

// stop stops the water reminder (internal, no lock)
func (wr *WaterReminder) stop() {
	if wr.isRunning {
		wr.ticker.Stop()
		wr.stopChan <- true
		wr.isRunning = false
	}
}

// UpdateSettings updates the reminder settings
func (wr *WaterReminder) UpdateSettings(settings *WaterReminderSettings) {
	wr.mutex.Lock()
	defer wr.mutex.Unlock()

	wr.settings = settings

	// Restart with new settings if enabled
	if wr.isRunning {
		wr.stop()
	}

	if settings.Enabled {
		wr.mutex.Unlock()
		wr.Start(wr.userID, settings)
		wr.mutex.Lock()
	}
}

// GetSettings returns current settings
func (wr *WaterReminder) GetSettings() WaterReminderSettings {
	wr.mutex.RLock()
	defer wr.mutex.RUnlock()
	return *wr.settings
}
