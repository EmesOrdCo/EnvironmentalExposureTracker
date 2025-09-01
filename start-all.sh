#!/bin/bash

# Environmental Exposure Tracker - Start All Services
echo "🚀 Starting Environmental Exposure Tracker..."
echo ""

# Get the local IP address
LOCAL_IP=$(ifconfig | grep -E "inet.*broadcast" | awk '{print $2}' | head -1)
echo "📱 Your local IP address: $LOCAL_IP"
echo "🔧 Backend will be accessible at: http://$LOCAL_IP:3000"
echo ""

# Start backend server in background
echo "⚡ Starting backend server..."
cd backend
nohup node server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend server started (PID: $BACKEND_PID)"

# Wait a moment for backend to start
sleep 3

# Check if backend is running
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
fi

# Go back to main directory
cd ..

# Start Expo development server
echo ""
echo "📱 Starting Expo development server..."
echo "📱 Scan the QR code with Expo Go app on your mobile device"
echo ""

npx expo start

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    echo "✅ Services stopped"
}

# Set trap to cleanup on script exit
trap cleanup EXIT
