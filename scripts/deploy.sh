#!/bin/bash
set -e

echo "Starting deployment of Content Factory..."

# Move to root
cd /opt/apps/content-factory

# Pull latest changes
echo "Pulling from Git..."
git pull origin main

# Update Backend
echo "Updating Backend..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt --quiet
# Future: alembic upgrade head
cd ..

# Update Frontend
echo "Updating Frontend..."
cd frontend
npm install --silent
npm run build
cd ..

# Restart Services
echo "Restarting Systemd Services..."
sudo systemctl restart content-factory
sudo systemctl restart scheduler-worker
sudo systemctl restart upload-worker

# Health Check Verification
echo "Verifying Health Check..."
sleep 2
curl -f -s http://localhost:8000/api/health || { echo "Health Check FAILED!"; exit 1; }

echo "Deployment Successful!"
