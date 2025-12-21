#!/bin/bash
# Installation script for Linux

echo "Installing Time Tracker..."

# Define installation paths
INSTALL_PATH="/usr/local/bin"
DATA_PATH="$HOME/.time-tracker"
DESKTOP_PATH="$HOME/.local/share/applications"

# Change to project root
cd ..

# Check if binary exists
if [ ! -f "build/bin/time-tracker-desktop" ]; then
    echo "Error: Executable not found. Please run build-linux.sh first."
    exit 1
fi

# Create data directory
echo "Creating data directory..."
mkdir -p "$DATA_PATH"

# Copy executable (requires sudo for /usr/local/bin)
echo "Installing executable to $INSTALL_PATH..."
if [ "$EUID" -eq 0 ]; then
    # Running as root
    cp build/bin/time-tracker-desktop "$INSTALL_PATH/time-tracker"
    chmod +x "$INSTALL_PATH/time-tracker"
else
    # Not root, use sudo
    sudo cp build/bin/time-tracker-desktop "$INSTALL_PATH/time-tracker"
    sudo chmod +x "$INSTALL_PATH/time-tracker"
fi

# Create desktop entry
echo "Creating desktop entry..."
mkdir -p "$DESKTOP_PATH"
cat > "$DESKTOP_PATH/time-tracker.desktop" <<EOL
[Desktop Entry]
Version=1.0
Type=Application
Name=Time Tracker
Comment=Pomodoro Timer and Task Tracker
Exec=time-tracker
Icon=accessories-clock
Terminal=false
Categories=Utility;Office;
EOL

chmod +x "$DESKTOP_PATH/time-tracker.desktop"

echo "Installation completed successfully!"
echo "Installation path: $INSTALL_PATH/time-tracker"
echo "Data path: $DATA_PATH"
echo "You can now launch Time Tracker from your application menu or run 'time-tracker' from terminal"

