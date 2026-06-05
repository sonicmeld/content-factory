#!/bin/bash
set -e

echo "Starting Initial Setup of Content Factory..."

# Ensure running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo ./setup.sh)"
  exit 1
fi

# Install dependencies
apt-get update
apt-get install -y python3 python3-venv python3-pip nginx git curl

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Setup Directories
mkdir -p /opt/apps/content-factory
mkdir -p /data/shared-assets
mkdir -p /data/temp

# Setup .env
if [ ! -f "/opt/apps/content-factory/backend/.env" ]; then
    cp /opt/apps/content-factory/backend/.env.example /opt/apps/content-factory/backend/.env
    echo ".env created from .env.example. Please configure it."
fi

# Setup Systemd
cp /opt/apps/content-factory/scripts/content-factory.service /etc/systemd/system/
cp /opt/apps/content-factory/scripts/scheduler-worker.service /etc/systemd/system/
cp /opt/apps/content-factory/scripts/upload-worker.service /etc/systemd/system/

systemctl daemon-reload
systemctl enable content-factory scheduler-worker upload-worker

# Setup Nginx
cp /opt/apps/content-factory/config/nginx.conf /etc/nginx/sites-available/content-factory
ln -sf /etc/nginx/sites-available/content-factory /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

systemctl restart nginx

echo "Setup Complete! Please configure /opt/apps/content-factory/backend/.env and then run deploy.sh"
