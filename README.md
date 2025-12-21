# README

# Time Tracker

A cross-platform Pomodoro timer and task tracker desktop application with water reminder functionality. Built with [Wails](https://wails.io/), Go, and React with TypeScript.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)

## Features

- ✨ **Pomodoro Timer** - Customizable timer with 25/45/60 minute presets
- 📋 **Task Management** - Create, edit, complete, and delete tasks
- 📊 **Reports** - View your productivity statistics and session history
- 💧 **Water Reminder** - Configurable reminders to stay hydrated (30/60/90 minute presets + custom 1-1440 minute intervals)
- 🌍 **Multi-Language Support** - 6 languages: English, Spanish, French, German, Japanese, Vietnamese
- 🔐 **User Authentication** - Secure registration and login with bcrypt password hashing
- 🗄️ **Local Data Storage** - SQLite database with platform-specific paths
- 🔔 **System Tray** - Minimize to tray and continue running in background
- 🎨 **Modern UI** - Built with shadcn/ui component library and Tailwind CSS
- 🚀 **Static Binaries** - No external dependencies (CGO_ENABLED=0)
- 🪶 **Lightweight** - Optimized for small binary size

## Tech Stack

- **Backend**: Go 1.23+ with Wails v2
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: SQLite (pure Go via modernc.org/sqlite)
- **ID Generation**: Snowflake algorithm (Twitter-style distributed IDs)
- **Authentication**: bcrypt password hashing
- **i18n**: react-i18next
- **Icons**: Lucide React

## Prerequisites

- Go 1.23 or later
- Node.js 16 or later
- Wails CLI v2.x

### Installing Wails

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

## Installation

### Clone and Install Dependencies

```bash
git clone https://github.com/vkhangstack/time-tracker-desktop.git
cd time-tracker-desktop
wails doctor  # Verify installation
```

### Development Mode

```bash
wails dev
```

This will start the application in development mode with hot reload for both frontend and backend.

## Building

### Build for Windows

```powershell
.\build-windows.ps1
```

Binary output: `build\bin\time-tracker-desktop.exe`

### Build for Linux

```bash
chmod +x build-linux.sh
./build-linux.sh
```

Binary output: `build/bin/time-tracker-desktop`

### Build for All Platforms

```bash
chmod +x build-all.sh
./build-all.sh
```

All binaries are built with `CGO_ENABLED=0` for fully static, portable executables.

## Installation Scripts

### Windows

```powershell
# After building
.\install-windows.ps1
```

This installs the application to:
- Executable: `%LOCALAPPDATA%\Programs\TimeTracker`
- Data: `%APPDATA%\time-tracker`
- Start Menu shortcut created

### Linux

```bash
# After building
chmod +x install-linux.sh
./install-linux.sh
```

This installs the application to:
- Executable: `/usr/local/bin/time-tracker`
- Data: `~/.time-tracker`
- Desktop entry created in `~/.local/share/applications`

## Data Storage Locations

### Windows
- **Data Directory**: `%APPDATA%\time-tracker`
- **Database**: `%APPDATA%\time-tracker\timetracker.db`

### Linux
- **Data Directory**: `~/.time-tracker`
- **Database**: `~/.time-tracker/timetracker.db`

### macOS
- **Data Directory**: `~/Library/Application Support/time-tracker`
- **Database**: `~/Library/Application Support/time-tracker/timetracker.db`

## Usage

### First Time Setup

1. Launch the application
2. Create an account with username, email, and password
3. Login with your credentials

### Using the Pomodoro Timer

1. Navigate to the **Timer** tab
2. Select a duration (25/45/60 minutes)
3. Optionally select a task to associate with the session
4. Click **Start** to begin the timer
5. Use **Pause/Resume** or **Stop** as needed
6. When the timer completes, the session is automatically saved

### Managing Tasks

1. Navigate to the **Tasks** tab
2. Click **Add Task** to create a new task
3. Enter title and optional description
4. Check the checkbox to mark tasks as complete
5. Click the trash icon to delete tasks

### Viewing Reports

1. Navigate to the **Reports** tab
2. Select a date range
3. Click **Generate Report** to view statistics:
   - Total Pomodoro sessions
   - Total time spent (hours and minutes)
   - Sessions per task

### Water Reminders

1. Navigate to the **Settings** tab
2. Enable **Water Reminder**
3. Select reminder interval:
   - **Preset**: Click 30, 60, or 90 minute buttons
   - **Custom**: Check "Custom Interval" and enter 1-1440 minutes
4. Click **Save**
5. You'll receive periodic reminders to drink water

### Changing Language

1. Navigate to the **Settings** tab
2. Select your preferred language
3. The UI will update immediately

## Architecture

### Backend (Go)

- `main.go` - Application entry point
- `app.go` - Main app logic and API methods
- `user.go` - User model and authentication
- `task.go` - Task and session models
- `storage.go` - SQLite database operations
- `pomodoro.go` - Timer logic and state management
- `reminder.go` - Water reminder functionality
- `cache.go` - In-memory caching service
- `snowflake.go` - Distributed ID generation
- `paths.go` - Platform-specific file paths
- `tray.go` - System tray integration

### Frontend (React + TypeScript)

- `App.tsx` - Root component with authentication routing
- `components/Login.tsx` - Login form
- `components/Register.tsx` - Registration form
- `components/MainApp.tsx` - Main application layout
- `components/PomodoroTimer.tsx` - Timer interface
- `components/TaskList.tsx` - Task management
- `components/Reports.tsx` - Statistics dashboard
- `components/Settings.tsx` - Settings and about
- `components/ui/` - shadcn/ui components
- `i18n.ts` - Internationalization configuration
- `locales/` - Translation files for 6 languages

## Security

- Passwords are hashed using bcrypt with default cost (10)
- User sessions are managed in-memory with cache expiry
- No sensitive data is stored in plain text
- Database uses per-user isolation with foreign keys

## Performance Optimizations

- In-memory caching for frequently accessed data
- Static binary builds with no external dependencies
- Stripped debug symbols (`-ldflags="-s -w"`)
- Tree-shaking and minification for frontend
- Lazy loading for components
- Small binary size (~15-25MB depending on platform)

## Troubleshooting

### "Failed to initialize storage"
- Check that the data directory is writable
- Verify SQLite database file permissions

### "User not found" after login
- Clear the cache and restart the application
- Check database integrity

### Timer not starting
- Ensure no other timer is running
- Check application logs for errors

### Build fails with CGO errors
- Ensure `CGO_ENABLED=0` is set
- Use pure Go dependencies (modernc.org/sqlite)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**vkhangstack**
- Email: phamvankhang.tvi@gmail.com
- GitHub: [@vkhangstack](https://github.com/vkhangstack)

## Acknowledgments

- [Wails](https://wails.io/) - Go + Web frontend framework
- [shadcn/ui](https://ui.shadcn.com/) - Re-usable components built with Radix UI and Tailwind CSS
- [Lucide](https://lucide.dev/) - Beautiful & consistent icons
- [modernc.org/sqlite](https://gitlab.com/cznic/sqlite) - Pure Go SQLite implementation
- [Snowflake](https://github.com/bwmarrin/snowflake) - Distributed ID generation

## Roadmap

- [ ] Dark mode support
- [ ] Break timer (short/long breaks)
- [ ] Desktop notifications enhancement
- [ ] Export reports to CSV/PDF
- [ ] Cloud sync (optional)
- [ ] Custom sound alerts
- [ ] Statistics charts and visualizations
- [ ] Auto-start on system boot
- [ ] Multiple timer profiles

---

Made with ❤️ by vkhangstack
