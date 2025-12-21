#!/bin/bash
# Build script for Linux with static binary (CGO_ENABLED=0)

echo "Building Time Tracker for Linux..."

# Set environment variables for static build
export CGO_ENABLED=0
export GOOS=linux
export GOARCH=amd64

# Change to project root
cd ..

# Build the application
wails build -clean -platform linux/amd64 -ldflags "-s -w"

if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
    echo "Output: build/bin/time-tracker-desktop"

    # Display file size
    if [ -f "build/bin/time-tracker-desktop" ]; then
        filesize=$(du -h build/bin/time-tracker-desktop | cut -f1)
        echo "Binary size: $filesize"
    fi
else
    echo "Build failed!"
    exit 1
fi

