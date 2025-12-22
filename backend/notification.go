package backend

import (
	"github.com/go-toast/toast"
)

type Notification struct {
	AppID   string
	Title   string
	Message string
}

func (app *App) PushNotification(notification *Notification) error {
	toastNotification := toast.Notification{
		AppID:   notification.AppID,   // Tên app hiển thị trong toast
		Title:   notification.Title,   // Tiêu đề
		Message: notification.Message, // Nội dung
		// Icon: "C:/path/to/icon.ico",// (tuỳ chọn) icon 64x64
		// ActivationArguments: "myapp://order/1234", // (tuỳ chọn) deep link
	}

	if err := toastNotification.Push(); err != nil {
		return err
	}

	return nil
}
