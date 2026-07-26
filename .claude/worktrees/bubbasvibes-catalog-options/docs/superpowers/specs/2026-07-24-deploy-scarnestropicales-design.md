# Despliegue de scarnestropicales.codewave.com.bo (sin Docker)

## Contexto

El proyecto (backend Node/Express + frontend React/Vite + MariaDB) es una adaptación de
un sistema previo ("salybrasas") que ya corre en el mismo VPS vía PM2 + nginx nativo +
certbot. Se descartó dockerizar (decisión explícita del usuario); este despliegue sigue
el mismo patrón que salybrasas: proceso Node bajo PM2, frontend estático servido por
nginx, MariaDB nativo del VPS (no en contenedor).

El usuario proporcionó la configuración real de nginx en producción para
`salybrasas.codewave.com.bo` (`/etc/nginx/sites-available/salybrasas.codewave.com.bo`),
que sirve de plantilla exacta a adaptar.

## Arquitectura

- **Backend**: proceso PM2 `scarnestropicales-api`, puerto **3008** (salybrasas ya usa 3007),
  corriendo `backend/src/server.js` con `NODE_ENV=production`.
- **Frontend**: build estático de Vite (`frontend/dist`), servido directamente por nginx
  nativo del host (`root` apuntando a esa carpeta), sin proceso propio.
- **Base de datos**: MariaDB nativo del VPS (mismo servidor que usa salybrasas, instancia
  compartida, bases de datos separadas). Nueva base `bd_scarnestropicales` y usuario
  dedicado `scarnestropicales_user` con contraseña fuerte generada — no root, no vacía
  como en desarrollo. Se importa `bd/bd_solocarnestropicales.sql` (estructura completa +
  seed de `roles`, `permisos`, `usuarios` ya con hashes bcrypt reales).
- **Nginx**: nuevo server block `deploy/nginx.conf` (reemplaza el existente en el repo,
  que era de salybrasas) con `server_name scarnestropicales.codewave.com.bo`, calcado de
  la plantilla real de salybrasas:
  - `root` → `/home/ubuntu/SISTEMAS/SOLOCARNESTROPICAL/frontend/dist`
  - `location /uploads/` → alias a `/home/ubuntu/SISTEMAS/SOLOCARNESTROPICAL/backend/uploads/`
  - `location /socket.io/`, `/webhooks`, `/api` → `proxy_pass http://localhost:3008`
  - Bloque SSL (443, certbot) y redirect 80→443 se añaden automáticamente al correr
    `certbot --nginx -d scarnestropicales.codewave.com.bo` en el VPS (no se escriben a
    mano; certbot reescribe el archivo in-place, igual que hizo con salybrasas).
- **PM2**: nuevo `ecosystem.config.cjs` en la raíz (reemplaza el actual, que apunta a
  `salybrasas-api`), app `scarnestropicales-api`, `cwd` y rutas de logs propias
  (`/home/ubuntu/logs/scarnestropicales-*.log`).

## Variables de entorno (producción)

`backend/.env` en el VPS (no se versiona, se crea manualmente ahí, igual que hoy):
- `PORT=3008`
- `DB_HOST=localhost`, `DB_NAME=bd_scarnestropicales`, `DB_USER=scarnestropicales_user`,
  `DB_PASS=<generada>`
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — 64 chars aleatorios (`openssl rand -hex 32`),
  distintos entre sí y de los de desarrollo (actualmente `secretas`/`secretas_refresh`,
  inválidos para producción)
- `NODE_ENV=production`
- `CORS_ORIGIN=https://scarnestropicales.codewave.com.bo`
- `ADMIN_PASSWORD=<generada>` — distinta de `admin123` (valor de desarrollo)
- `CODEPAY_*` — el usuario debe reemplazar las claves de sandbox actuales
  (`pk_test2_...`, `sk_test2_...`) por las claves reales de producción de CodePay;
  `CODEPAY_WEBHOOK_URL=https://scarnestropicales.codewave.com.bo/webhooks/codepay`

`frontend/.env.production` (sí se versiona, no tiene secretos):
- `VITE_API_URL=https://scarnestropicales.codewave.com.bo/api/v1`

Se genera un `backend/.env.production.example` documentando cada variable sin valores
reales, análogo al que ya existe (que hoy trae valores leftover de salybrasas).

## Despliegue

1. `git init` en el repo local (hoy no es un repositorio git), commit inicial, push a un
   remoto (GitHub/GitLab) que el usuario configure.
2. En el VPS: `git clone <remoto> /home/ubuntu/SISTEMAS/SOLOCARNESTROPICAL`.
3. Crear base y usuario en el MariaDB nativo del VPS, importar el dump.
4. Crear `backend/.env` en el VPS con los valores de producción (paso manual, no versionado).
5. `cd backend && npm install --omit=dev`; `cd frontend && npm install && npm run build`.
6. `pm2 start ecosystem.config.cjs --env production && pm2 save`.
7. Instalar `deploy/nginx.conf` en `/etc/nginx/sites-available/scarnestropicales.codewave.com.bo`,
   `ln -s` a `sites-enabled`, `nginx -t && systemctl reload nginx`.
8. `certbot --nginx -d scarnestropicales.codewave.com.bo` (añade el bloque SSL y el
   redirect automáticamente).
9. Actualizaciones futuras: `deploy/deploy.sh` (adaptado del de salybrasas — mismo flujo:
   `git pull`, reinstalar deps, rebuild frontend, `pm2 reload`, `nginx reload`).

## Fuera de alcance

- No se toca la configuración ni el proceso PM2 de salybrasas.
- No se automatiza la creación de la base de datos / usuario MariaDB ni la ejecución de
  `certbot` — son pasos manuales documentados en `deploy/deploy.sh` y este spec, porque
  requieren acceso interactivo al VPS (contraseñas, confirmación de certbot) que no se
  puede scriptear de forma segura sin supervisión.
- No hay CI/CD; el despliegue es manual vía SSH siguiendo los pasos de arriba.
- `print-agent` no se despliega en el VPS (corre local en las máquinas cliente).
