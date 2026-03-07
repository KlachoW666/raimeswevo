# WEVOX Auto — Telegram Mini App

Telegram Web App для авто-трейдинга: пополнение USDT, обмен на WEVOX, рефералы.  
Домен: **https://wevox.ru** (или WEVOX.RU).

## Структура

- **promt/frontend** — Mini App (React + Vite)
- **promt/backend** — API (Node.js, Express, SQLite)
- **promt/landing** — лендинг
- **install.sh** — скрипт установки на Ubuntu 24.04

## Деплой на VPS (Ubuntu 24.04)

1. На сервере выполните (от root или через sudo):
   ```bash
   curl -sL -o install.sh https://raw.githubusercontent.com/KlachoW666/raimeswevo/master/install.sh
   chmod +x install.sh
   sudo ./install.sh
   ```
   Или клонируйте репозиторий и запустите `./install.sh` из корня.

2. Скрипт:
   - Ставит Node.js 20, Nginx, PM2, UFW
   - Клонирует этот репозиторий в `/var/www/miniapp`
   - Собирает frontend, запускает backend (порт 3001) **через PM2** — приложение всегда включено: перезапуск при падении и автозапуск при перезагрузке сервера
   - Настраивает Nginx для домена и HTTPS

3. Переменные (при необходимости):
   - `DOMAIN=wevox.ru` — домен (по умолчанию wevox.ru)
   - `SERVER_IP=91.219.151.56` — IP сервера (по умолчанию)
   - `BACKEND_PORT=3001` — порт API

4. В BotFather укажите URL Mini App: **https://wevox.ru/miniapp**
   - В Telegram откройте @BotFather → **My Bots** → выберите бота (например @wevoautobot) → **Bot Settings** → **Menu Button** → **Configure menu button** → введите URL: `https://wevox.ru/miniapp` (без слэша в конце). Без этого при переходе по ссылке вида `t.me/wevoautobot/app?startapp=...` будет ошибка **«Веб-приложение не найдено»**.

**Если при переходе по ссылке пишет «Веб-приложение не найдено»:**
- Проверьте в BotFather, что у бота в **Menu Button** указан именно ваш домен: `https://wevox.ru/miniapp` (или ваш домен вместо wevox.ru).
- Откройте в браузере `https://wevox.ru/miniapp` — должна открываться страница приложения (не 404). Если 404 — пересоберите frontend на сервере (`cd /var/www/miniapp/promt/frontend && npm run build`) и проверьте Nginx.

**Почему «Подключение не защищено» / ERR_SSL_VERSION_OR_CIPHER_MISMATCH — и как пофиксить**

Telegram не открывает сайт, пока не удаётся согласовать защищённое соединение (протокол TLS и набор шифров). Другие приложения открываются мгновенно, потому что у них настроен доверенный сертификат и современный SSL. Сделайте два шага **на сервере**:

1. **Получить сертификат Let's Encrypt** (обязательно; самоподписанный сертификат Telegram не принимает):
   ```bash
   sudo certbot --nginx -d wevox.ru -d www.wevox.ru --agree-tos -m admin@wevox.ru
   ```
   DNS для `wevox.ru` и `www.wevox.ru` должен указывать на IP вашего сервера. Если certbot уже делал сертификат — шаг можно пропустить.

2. **Подставить современные шифры в Nginx** (чтобы не было ERR_SSL_VERSION_OR_CIPHER_MISMATCH). Либо заново применить конфиг из репозитория (в нём уже прописаны нужные ciphers):
   ```bash
   cd /var/www/miniapp && sudo ./install.sh
   ```
   Либо вручную: откройте `/etc/nginx/sites-available/miniapp` и в каждом блоке `listen 443 ssl` убедитесь, что есть:
   - `ssl_protocols TLSv1.2 TLSv1.3;`
   - `ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;`
   - `ssl_prefer_server_ciphers on;`
   Затем проверка и перезагрузка:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

После этого откройте приложение в Telegram снова — соединение должно устанавливаться, как у других приложений.

**Бот и рассылки:** создайте файл `promt/backend/.env` и добавьте строку:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
   ```
   (токен из @BotFather). После перезапуска backend (pm2 restart wevox-api) рассылки из админки будут работать. Если рассылка выдаёт ошибку — в ответе API приходит поле `errorDetail` (например: «bot can't initiate conversation» значит пользователь ещё не нажал /start у бота).

**Команда /start у бота:** чтобы при нажатии /start бот присылал приветствие, нужно один раз настроить webhook (подставьте свой домен и токен):
   ```
   curl "https://api.telegram.org/bot<ВАШ_ТОКЕН>/setWebhook?url=https://wevox.ru/api/telegram-webhook"
   ```
   Убедитесь, что в Nginx проксируется не только `/api/`, но и именно этот путь; при необходимости добавьте в конфиг location для `/api/telegram-webhook`. После этого при отправке /start бот будет отвечать информацией о приложении.

**Важно:** В репозитории [raimeswevo](https://github.com/KlachoW666/raimeswevo) используется ветка **master**. install.sh клонирует и обновляет именно её (`origin/master`).

**Backend всегда включён (PM2):** API запускается через PM2 с автоперезапуском при сбое и автозапуском при загрузке сервера. Проверить: `pm2 list`, логи: `pm2 logs wevox-api`, перезапуск вручную: `pm2 restart wevox-api`.

**Проверка API после деплоя:** из корня репозитория выполните `cd promt/backend && npm run check-api`. Для продакшена задайте `BASE_URL=https://wevox.ru` (или ваш домен). При необходимости укажите `USER_ID` и `ADMIN_USER_ID` для проверки эндпоинтов с авторизацией.

**CI / автоматическая проверка:** в репозитории настроен GitHub Actions workflow `.github/workflows/api-check.yml`: при push/PR в `main` поднимается backend, выполняется сценарий проверки (health, zyphex/rate; при заданных `USER_ID`/`ADMIN_USER_ID` — также wallet и users). Скрипт `promt/backend/scripts/check-api.mjs` выходит с кодом 1 при ошибке (удобно для CI). Запуск тех же проверок локально: `cd promt/backend && npm test` (или `npm run check-api`).

## Диагностика: приложение не открывается / «загрузка» / «сервер недоступен»

Проверьте по шагам **на сервере**:

1. **Backend запущен:** `pm2 list` — должен быть процесс `wevox-api`. Если нет: `cd /var/www/miniapp/promt/backend && PORT=3001 pm2 start server.js --name wevox-api` и `pm2 save`.
2. **API отвечает:** `curl -s https://wevox.ru/api/health` — ответ `{"ok":true}`. Если ошибка или таймаут — проверьте Nginx (location /api/ проксирует на порт 3001) и что backend слушает 3001.
3. **Frontend собран и раздаётся:** `ls /var/www/miniapp/promt/frontend/dist/index.html` и `ls /var/www/miniapp/promt/frontend/dist/assets/` — файлы должны быть. Откройте в браузере `https://wevox.ru/miniapp/` — должна открыться приложение, не 404. Если 404: `cd /var/www/miniapp/promt/frontend && npm run build`, затем перезагрузите Nginx.
4. **Сборка с явным доменом (если с телефона не грузится):** на сервере пересоберите frontend с переменной окружения: `cd /var/www/miniapp/promt/frontend && VITE_APP_URL=https://wevox.ru npm run build`. Затем перезапустите Nginx при необходимости.

В Telegram: если видите «Сервер недоступен» — backend не отвечает (шаги 1–2). Если бесконечная «Загрузка…» — не открылся JS или API (шаги 2–4).

## Локальная разработка

- **Backend:** `cd promt/backend && npm install && npm run dev` (порт 3001 по умолчанию)
- **Frontend:** `cd promt/frontend && npm install && npm run dev` (Vite, порт 5173)
- **Landing:** откройте `promt/landing/index.html` в браузере или раздайте через любой HTTP-сервер


