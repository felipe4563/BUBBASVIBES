#!/bin/bash
# Script de actualización — ejecutar en el VPS desde /home/ubuntu/SISTEMAS/SOLOCARNESTROPICAL
# Uso: bash deploy/deploy.sh

set -e
cd /home/ubuntu/SISTEMAS/SOLOCARNESTROPICALES

echo "==> Obteniendo cambios..."
# Proteger archivos de entorno locales para que el pull no falle
git update-index --skip-worktree frontend/.env 2>/dev/null || true
git update-index --skip-worktree backend/.env  2>/dev/null || true
git pull origin main

echo "==> Instalando dependencias del backend..."
cd backend && npm install --omit=dev && cd ..

echo "==> Construyendo frontend..."
cd frontend && npm install && npm run build && cd ..

echo "==> Reiniciando servicio..."
pm2 reload scarnestropicales-api

echo "==> Recargando Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "Despliegue completado"
pm2 status scarnestropicales-api