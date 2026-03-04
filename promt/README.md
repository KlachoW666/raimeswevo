# Zyphex Mini App

Telegram Mini App: кошелёк, обмен USDT → ZYPHEX, рефералы, админ-панель.

## Стек

- **Frontend:** React, Vite, TypeScript, Zustand, Tailwind
- **Backend:** Node.js, Express, SQLite (better-sqlite3)
- **Деплой:** Nginx, pm2 (см. корневой `install.sh` / `start.sh`)

Папка `Zyphex/` в корне репозитория не используется при деплое и не нужна для работы этого приложения.

## Локальный запуск

### Backend

```bash
cd promt/backend
cp .env.example .env   # при наличии
npm install
npm run dev
```

API: http://localhost:3001 (или порт из `PORT` в `.env`).

### Frontend

```bash
cd promt/frontend
npm install
npm run dev
```

Фронт проксирует `/api` на backend (см. `vite.config.ts`).

### Переменные окружения (backend)

В `promt/backend/.env`:

- `PORT` — порт API (по умолчанию 3000)
- `DB_PATH` — путь к SQLite (по умолчанию `./data/zyphex.db`)
- `ADMIN_IDS` — список Telegram User ID админов через запятую
- `ADMIN_WALLET_TON`, `ADMIN_WALLET_BSC`, … — адреса кошельков для мониторинга депозитов
- `TELEGRAM_BOT_TOKEN` — токен бота для рассылки из админки
- `BOT_USERNAME` — имя бота для реф-ссылки (по умолчанию ZyphexAutotraidingBot)
- `SUPPORT_USERNAME` — username поддержки в Telegram без «@»; ссылка кнопки «Поддержка» в шапке: `t.me/SUPPORT_USERNAME`. Если не задан, кнопка не показывается.

Для сборки фронта с кастомным контактом поддержки: `VITE_SUPPORT_USERNAME=...` (при билде).

## Проверка API

```bash
cd promt/backend
npm run check-api
# С опцией: USER_ID=tg_123 ADMIN_USER_ID=tg_456 npm run check-api
```

## Продакшен

На сервере используется корневой `install.sh` (первый запуск) и `start.sh` (обновление и перезапуск). Домен и VPS задаются в `install.sh` (zyphex.ru, 188.127.230.83).
