#!/bin/bash
# Script de actualización con Docker — ejecutar en el VPS desde /home/ubuntu/SISTEMAS/CODECULINARY
# Requiere: docker, docker compose plugin, y un archivo .env (ver .env.example) en la raíz del proyecto
# Uso: bash deploy/deploy-docker.sh

set -e
cd /home/ubuntu/SISTEMAS/CODECULINARY

echo "==> Obteniendo cambios..."
git pull origin main

echo "==> Reconstruyendo y levantando contenedores..."
docker compose up -d --build

echo "==> Estado de los contenedores..."
docker compose ps
