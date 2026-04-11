#!/bin/bash
# Quick Start Script for AI Attendance System

echo "🚀 Starting AI-Powered Attendance System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if MongoDB is running
echo -e "${BLUE}Checking MongoDB...${NC}"
if ! command -v mongod &> /dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB not found. Please install MongoDB or ensure mongod is in PATH.${NC}"
else
    echo -e "${GREEN}✓ MongoDB found${NC}"
fi

# Check if Node.js is installed
echo -e "${BLUE}Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Please install Node.js.${NC}"
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js $NODE_VERSION${NC}"
fi

# Check if Python is installed
echo -e "${BLUE}Checking Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Python3 not found. Please install Python 3.9+.${NC}"
    exit 1
else
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ $PYTHON_VERSION${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}Starting Services...${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Create directories for logs if they don't exist
mkdir -p logs

# Function to start service in background
start_service() {
    local SERVICE_NAME=$1
    local START_COMMAND=$2
    local LOG_FILE="logs/${SERVICE_NAME}.log"
    
    echo -e "${BLUE}Starting ${SERVICE_NAME}...${NC}"
    eval "$START_COMMAND" > "$LOG_FILE" 2>&1 &
    sleep 2
    echo -e "${GREEN}✓ ${SERVICE_NAME} started (logs: $LOG_FILE)${NC}"
}

# Install dependencies if needed
echo -e "${BLUE}Checking and installing dependencies...${NC}"

echo "Backend dependencies..."
cd backend && npm install --silent && cd ..
echo -e "${GREEN}✓ Backend dependencies ready${NC}"

echo "Frontend dependencies..."
cd frontend && npm install --silent && cd ..
echo -e "${GREEN}✓ Frontend dependencies ready${NC}"

echo "AI Service dependencies..."
cd ai-service && pip install -q -r requirements.txt && cd ..
echo -e "${GREEN}✓ AI Service dependencies ready${NC}"

echo ""

# Start services
start_service "MongoDB" "mongod"
start_service "AI Service" "cd ai-service && python3 app.py"
start_service "Backend" "cd backend && npm start"
start_service "Frontend" "cd frontend && npm run dev"

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All services started!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "📍 Service URLs:"
echo -e "  ${BLUE}Frontend:${NC}   http://localhost:5173"
echo -e "  ${BLUE}Backend API:${NC}  https://ai-attentance.onrender.com"
echo -e "  ${BLUE}AI Service:${NC}   http://localhost:8000"
echo -e "  ${BLUE}MongoDB:${NC}      mongodb://localhost:27017"
echo ""
echo "📋 Log files:"
echo -e "  View logs in ${BLUE}logs/${NC} directory"
echo ""
echo "🛑 To stop all services: Press Ctrl+C"
echo ""

# Keep script running
wait
