# Despliegue scarnestropicales.codewave.com.bo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el repo listo (config de PM2, nginx y variables de entorno) para desplegar `scarnestropicales.codewave.com.bo` en el VPS, siguiendo exactamente el patrón ya usado para `salybrasas.codewave.com.bo`, sin Docker.

**Architecture:** Backend Node/Express bajo PM2 en el puerto 3008, frontend Vite compilado y servido como estático por nginx nativo, MariaDB nativo del VPS con base/usuario dedicados. Ver `docs/superpowers/specs/2026-07-24-deploy-scarnestropicales-design.md` para el diseño completo.

**Tech Stack:** Node.js/Express, PM2, nginx, MariaDB, Vite/React.

## Global Constraints

- Puerto backend: **3008** (salybrasas ya ocupa 3007).
- Dominio: `scarnestropicales.codewave.com.bo`.
- Ruta en el VPS: `/home/ubuntu/SISTEMAS/SOLOCARNESTROPICAL`.
- No se toca nada de la config de salybrasas en el VPS.
- Ningún secreto real (passwords, JWT secrets) se escribe en archivos versionados — solo en `backend/.env` del VPS, que no se commitea.

---

### Task 1: Inicializar el repositorio git

**Files:**
- Create: `.git/` (via `git init`)
- Verify: `.gitignore` (raíz, ya existe — no requiere cambios, ya ignora `node_modules/`, `backend/uploads/*` y print-agent salvo `agent.js`)

**Interfaces:**
- Produces: repo git local con un commit inicial, listo para añadir un remoto en tareas posteriores.

- [ ] **Step 1: Inicializar git**

```bash
cd "c:\Users\ASUS\OneDrive\Escritorio\TODO\SISTEMAS\SOLOCARNESTROPICAL"
git init
```

- [ ] **Step 2: Verificar qué se va a trackear (confirmar que no se cuelan .env ni node_modules)**

```bash
git add -A -n
```

Expected: la lista no debe incluir `backend/.env`, `frontend/.env` (si existe con secretos), `node_modules/`, `backend/uploads/*` (excepto `.gitkeep`), ni `print-agent/*` (excepto `agent.js`).

Si aparece algo indebido, detente y ajusta `.gitignore` antes de continuar (no hacer `git add -A` real todavía).

- [ ] **Step 3: Stage y commit inicial**

```bash
git add -A
git commit -m "chore: commit inicial del proyecto solocarnestropicales"
```

- [ ] **Step 4: Verificar**

```bash
git log --oneline
git status
```

Expected: un commit listado, working tree limpio.

---

### Task 2: Actualizar `ecosystem.config.cjs` para scarnestropicales

**Files:**
- Modify: `ecosystem.config.cjs`

**Interfaces:**
- Consumes: nada (config standalone de PM2).
- Produces: definición del proceso PM2 `scarnestropicales-api` que usan Task 4 (deploy.sh) y el spec de setup (Task 7).

- [ ] **Step 1: Reemplazar el contenido completo**

```javascript
module.exports = {
  apps: [
    {
      name: 'scarnestropicales-api',
      script: './backend/src/server.js',
      cwd: '/home/ubuntu/SISTEMAS/SOLOCARNESTROPICAL',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3008,
      },
      error_file: '/home/ubuntu/logs/scarnestropicales-error.log',
      out_file: '/home/ubuntu/logs/scarnestropicales-out.log',
      time: true,
    },
  ],
};
```

- [ ] **Step 2: Verificar sintaxis válida**

```bash
node -e "console.log(require('./ecosystem.config.cjs').apps[0].name)"
```

Expected: imprime `scarnestropicales-api` sin errores.

- [ ] **Step 3: Commit**

```bash
git add ecosystem.config.cjs
git commit -m "deploy: configurar PM2 para scarnestropicales (puerto 3008)"
```

---

### Task 3: Actualizar `deploy/nginx.conf` para el dominio y las rutas de scarnestropicales

**Files:**
- Modify: `deploy/nginx.conf`

**Interfaces:**
- Consumes: puerto 3008 definido en Task 2.
- Produces: server block base que se copiará a `/etc/nginx/sites-available/` en el VPS (documentado en Task 7); certbot añadirá el bloque SSL automáticamente ahí, no en este archivo del repo.

- [ ] **Step 1: Reemplazar el contenido completo**

```nginx
server {
    listen 80;
    server_name scarnestropicales.codewave.com.bo;

    root /home/ubuntu/SISTEMAS/SOLOCARNESTROPICAL/frontend/dist;
    index index.html index.htm;

    client_max_body_size 10M;

    # Frontend SPA
    location / {
        try_files $uri /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires 0;
    }

    # Assets del build (Vite genera hashes — se pueden cachear)
    location ~* \.(js|css|woff2?|png|svg|ico|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Service Worker nunca se cachea
    location = /sw.js {
        expires off;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Archivos subidos (logos, imágenes de productos)
    location ^~ /uploads/ {
        alias /home/ubuntu/SISTEMAS/SOLOCARNESTROPICAL/backend/uploads/;
        autoindex off;
        access_log off;
        add_header Cache-Control "public, max-age=2592000";
    }

    # WebSocket (Socket.IO)
    location /socket.io/ {
        proxy_pass http://localhost:3008;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Webhooks (ej. CodePay) → backend Node.js
    location /webhooks {
        proxy_pass http://localhost:3008;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # API → backend Node.js
    location /api {
        proxy_pass http://localhost:3008;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

- [ ] **Step 2: Verificar que no quedó ninguna referencia a salybrasas ni al puerto 3007**

```bash
grep -in "salybrasas\|3007" deploy/nginx.conf
```

Expected: sin resultados (exit code 1 de grep).

- [ ] **Step 3: Commit**

```bash
git add deploy/nginx.conf
git commit -m "deploy: nginx server block para scarnestropicales.codewave.com.bo"
```

---

### Task 4: Actualizar `deploy/deploy.sh` para la ruta y el proceso PM2 de scarnestropicales

**Files:**
- Modify: `deploy/deploy.sh`

**Interfaces:**
- Consumes: nombre de proceso PM2 `scarnestropicales-api` (Task 2), ruta `/home/ubuntu/SISTEMAS/SOLOCARNESTROPICAL`.
- Produces: script de actualización a correr en el VPS en cada despliegue posterior al inicial.

- [ ] **Step 1: Reemplazar el contenido completo**

```bash
#!/bin/bash
# Script de actualización — ejecutar en el VPS desde /home/ubuntu/SISTEMAS/SOLOCARNESTROPICAL
# Uso: bash deploy/deploy.sh

set -e
cd /home/ubuntu/SISTEMAS/SOLOCARNESTROPICAL

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
```

- [ ] **Step 2: Verificar que el script mantiene permisos de ejecución**

```bash
ls -la deploy/deploy.sh
```

Expected: el bit ejecutable sigue presente (`-rwxr-xr-x`), Git ya lo trackea así desde el archivo original.

- [ ] **Step 3: Commit**

```bash
git add deploy/deploy.sh
git commit -m "deploy: adaptar deploy.sh a scarnestropicales"
```

---

### Task 5: Actualizar `backend/.env.production.example`

**Files:**
- Modify: `backend/.env.production.example`

**Interfaces:**
- Produces: plantilla de referencia (sin secretos reales) que Task 7 usa para armar el `.env` real en el VPS.

- [ ] **Step 1: Reemplazar el contenido completo**

```
PORT=3008
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bd_scarnestropicales
DB_USER=scarnestropicales_user
DB_PASS=CAMBIA_ESTA_PASSWORD_FUERTE
JWT_SECRET=CAMBIA_ESTO_POR_64_CHARS_ALEATORIOS
JWT_REFRESH_SECRET=CAMBIA_ESTO_POR_64_CHARS_ALEATORIOS_DIFERENTE
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
CORS_ORIGIN=https://scarnestropicales.codewave.com.bo
ADMIN_PASSWORD=CAMBIA_ESTA_PASSWORD_ADMIN_FUERTE
CODEPAY_SANDBOX=false
CODEPAY_API_URL=https://payapi.codewave.com.bo/api
CODEPAY_PUBLIC_KEY=CAMBIA_POR_TU_CLAVE_PUBLICA_DE_PRODUCCION
CODEPAY_SECRET_KEY=CAMBIA_POR_TU_CLAVE_SECRETA_DE_PRODUCCION
CODEPAY_NOTIFICATION_SECRET=CAMBIA_POR_TU_WEBHOOK_SECRET_DE_PRODUCCION
CODEPAY_WEBHOOK_URL=https://scarnestropicales.codewave.com.bo/webhooks/codepay
```

- [ ] **Step 2: Commit**

```bash
git add backend/.env.production.example
git commit -m "deploy: plantilla de env de produccion para scarnestropicales"
```

---

### Task 6: Actualizar `frontend/.env.production`

**Files:**
- Modify: `frontend/.env.production`

**Interfaces:**
- Produces: `VITE_API_URL` horneado en el build de Vite que corre `deploy.sh` (Task 4) en el VPS.

- [ ] **Step 1: Reemplazar el contenido**

```
VITE_API_URL=https://scarnestropicales.codewave.com.bo/api/v1
```

- [ ] **Step 2: Build local de verificación (confirma que Vite hornea la URL correcta)**

```bash
cd frontend
npm run build
grep -c "scarnestropicales.codewave.com.bo" dist/assets/*.js
```

Expected: build sin errores, y al menos una coincidencia de la nueva URL en algún chunk JS del `dist/`.

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/.env.production
git commit -m "deploy: apuntar VITE_API_URL a scarnestropicales"
```

---

### Task 7: Documentar los pasos manuales de setup inicial en el VPS

**Files:**
- Create: `deploy/SETUP-VPS.md`

**Interfaces:**
- Consumes: nombres/puertos definidos en Tasks 2–6 (`bd_scarnestropicales`, `scarnestropicales_user`, puerto 3008, ruta `/home/ubuntu/SISTEMAS/SOLOCARNESTROPICAL`).
- Produces: guía de referencia para el despliegue inicial (una sola vez); las actualizaciones posteriores usan `deploy/deploy.sh` (Task 4).

- [ ] **Step 1: Crear el archivo con los pasos completos**

```markdown
# Setup inicial en el VPS — scarnestropicales.codewave.com.bo

Pasos manuales de una sola vez. Para actualizaciones posteriores usa `deploy/deploy.sh`.

## 1. Clonar el repo

\`\`\`bash
cd /home/ubuntu/SISTEMAS
git clone <URL_DEL_REMOTO> SOLOCARNESTROPICAL
cd SOLOCARNESTROPICAL
\`\`\`

## 2. Crear base de datos y usuario en MariaDB

\`\`\`bash
sudo mysql -u root -p
\`\`\`

\`\`\`sql
CREATE DATABASE bd_scarnestropicales CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'scarnestropicales_user'@'localhost' IDENTIFIED BY 'REEMPLAZA_CON_PASSWORD_FUERTE';
GRANT ALL PRIVILEGES ON bd_scarnestropicales.* TO 'scarnestropicales_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
\`\`\`

Importar la estructura + seed (roles, permisos, usuario admin):

\`\`\`bash
mysql -u scarnestropicales_user -p bd_scarnestropicales < bd/bd_solocarnestropicales.sql
\`\`\`

## 3. Generar secretos y crear `backend/.env`

\`\`\`bash
openssl rand -hex 32   # usar para JWT_SECRET
openssl rand -hex 32   # usar para JWT_REFRESH_SECRET (uno distinto)
\`\`\`

\`\`\`bash
cp backend/.env.production.example backend/.env
nano backend/.env   # completar DB_PASS, JWT_SECRET, JWT_REFRESH_SECRET,
                     # ADMIN_PASSWORD y las claves CODEPAY_* reales de producción
\`\`\`

## 4. Instalar dependencias y compilar

\`\`\`bash
cd backend && npm install --omit=dev && cd ..
cd frontend && npm install && npm run build && cd ..
\`\`\`

## 5. Arrancar con PM2

\`\`\`bash
pm2 start ecosystem.config.cjs --env production
pm2 save
\`\`\`

Verificar:

\`\`\`bash
curl http://localhost:3008/api/v1/salud
# Esperado: {"ok":true,"datos":"API restaurante funcionando"}
\`\`\`

## 6. Configurar nginx

\`\`\`bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/scarnestropicales.codewave.com.bo
sudo ln -s /etc/nginx/sites-available/scarnestropicales.codewave.com.bo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
\`\`\`

## 7. Emitir certificado SSL

\`\`\`bash
sudo certbot --nginx -d scarnestropicales.codewave.com.bo
\`\`\`

Certbot reescribe automáticamente `/etc/nginx/sites-available/scarnestropicales.codewave.com.bo`
añadiendo el bloque `listen 443 ssl` y el redirect 80→443 — no hace falta tocarlo a mano.

## 8. Verificación final

\`\`\`bash
curl -I https://scarnestropicales.codewave.com.bo
curl https://scarnestropicales.codewave.com.bo/api/v1/salud
\`\`\`

Expected: HTTP 200 en ambos, certificado válido.
```

- [ ] **Step 2: Commit**

```bash
git add deploy/SETUP-VPS.md
git commit -m "docs: guia de setup inicial en VPS para scarnestropicales"
```

---

### Task 8: Verificación final local

**Files:**
- No crea ni modifica archivos — solo verificación.

- [ ] **Step 1: Confirmar que no queda ninguna referencia residual a salybrasas o al puerto 3007 en los archivos de deploy**

```bash
grep -rin "salybrasas\|3007" ecosystem.config.cjs deploy/
```

Expected: sin resultados.

- [ ] **Step 2: Confirmar historial de commits limpio y ordenado**

```bash
git log --oneline
```

Expected: 7 commits (Tasks 1–7), mensajes descriptivos, sin archivos de secretos incluidos (`git show --stat` de cada uno no debe listar `backend/.env`).

- [ ] **Step 3: Confirmar que el build de frontend generado en Task 6 sigue reflejando la config correcta**

```bash
cd frontend
grep -o "https://scarnestropicales[^\"']*" dist/assets/*.js | sort -u
```

Expected: solo aparece `https://scarnestropicales.codewave.com.bo/api/v1`, ninguna referencia a `salybrasas` ni a `localhost`.
