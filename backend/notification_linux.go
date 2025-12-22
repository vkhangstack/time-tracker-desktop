package backend

import (
	"os/exec"
)

func (app *App) PushNotification(notification *Notification) error {
	// Use notify-send on Linux if available
	if path, err := exec.LookPath("notify-send"); err == nil {
		cmd := exec.Command(path, notification.Title, notification.Message)
		// Set app name if the flag is supported, though simpler usage is usually just TITLE BODY
		// To be safe with basic notify-send:
		return cmd.Run()
	}
	// Fallback or ignore if no notification daemon found
	return nil
}
