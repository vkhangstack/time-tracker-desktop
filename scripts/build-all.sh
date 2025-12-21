#!/bin/bash
# Build script for all platforms

echo "Building Time Tracker for all platforms..."

# Change to project root
cd ..

# Windows
echo "Building for Windows..."
export CGO_ENABLED=0
export GOOS=windows
export GOARCH=amd64
wails build -clean -platform windows/amd64 -ldflags "-s -w"

# Linux
echo "Building for Linux..."
export GOOS=linux
export GOARCH=amd64
wails build -platform linux/amd64 -ldflags "-s -w"

# macOS
echo "Building for macOS..."
export GOOS=darwin
export GOARCH=amd64
wails build -platform darwin/amd64 -ldflags "-s -w"

echo "All builds completed!"
echo "Outputs in: build/bin/"

