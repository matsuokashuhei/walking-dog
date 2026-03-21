#!/bin/bash
# Start virtual framebuffer for headed browser mode
Xvfb :99 -screen 0 1280x720x24 &

# Start VNC server (no password - local development only)
x11vnc -display :99 -forever -nopw -quiet &

exec tail -f /dev/null
