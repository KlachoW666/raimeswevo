# Техническое задание: ZYPHEX TRAIDING BOT — Telegram MiniApp

## 1. Общее описание продукта

### 1.1 Назначение
Telegram MiniApp (WebApp) для автоматической торговли криптовалютами. Бот совершает сделки на криптовалютных парах в реальном времени, пользователь пополняет баланс в USDT через различные сети и наблюдает за результатами. Приложение работает внутри Telegram через WebApp API.

### 1.2 Название
**ZYPHEX TRAIDING BOT** (`@ZYPHEXAUTOTRAIDINGBOT`)

### 1.3 Целевая аудитория
Пользователи Telegram, желающие пассивно зарабатывать на криптовалютной торговле через автоматизированного бота.

### 1.4 Платформа
- Telegram Bot API + Telegram WebApp (MiniApp)
- Запуск через кнопку бота или прямую ссылку `t.me/YourBot/app`

### 1.5 Языки интерфейса
- Русский (по умолчанию)
- English

---

## 2. Архитектура приложения

### 2.1 Общая архитектура

```
┌─────────────────────────────────────────────────┐
│                  Telegram Client                 │
│              (WebApp / MiniApp iframe)           │
├─────────────────────────────────────────────────┤
│                Frontend (SPA)                    │
│         React / Vue + Tailwind CSS              │
│         Тёмная тема, мобильная вёрстка          │
├─────────────────────────────────────────────────┤
│                  API Gateway                     │
│            REST API / WebSocket                  │
├──────────┬──────────┬───────────┬───────────────┤
│  Auth    │ Wallet   │ Trading   │  Referral     │
│ Service  │ Service  │ Engine    │  Service      │
├──────────┴──────────┴───────────┴───────────────┤
│              Database (PostgreSQL)               │
│              Cache (Redis)                       │
├─────────────────────────────────────────────────┤
│          Blockchain Integrations                 │
│   TON · BSC · TRC · SOL · BTC · ETH             │
└─────────────────────────────────────────────────┘
```

### 2.2 Стек технологий

| Слой | Технологии |
|------|-----------|
| **Frontend** | React 18+ / Vue 3, TypeScript, Tailwind CSS, Telegram WebApp SDK |
| **Backend** | Node.js (NestJS) или Python (FastAPI) |
| **База данных** | PostgreSQL (основная), Redis (кэш, сессии, real-time данные) |
| **WebSocket** | Socket.IO или нативные WS для live-данных сделок |
| **Telegram Bot** | Telegraf.js / Aiogram (Python) |
| **Блокчейн** | ethers.js, @solana/web3.js, tronweb, tonweb, bitcoinjs-lib |
| **Инфраструктура** | Docker, Nginx, Let's Encrypt |

---

## 3. Функциональные модули

### 3.1 Модуль аутентификации

#### 3.1.1 Экран входа (PIN-код)
**Экран:** Ввод PIN-кода при запуске приложения.

**Элементы UI:**
- Иконка замка (зелёная, анимированная)
- Заголовок: «Введите PIN»
- Подзаголовок: «Введите PIN для входа в приложение.»
- Поле ввода PIN-кода (текстовое поле, тип password, placeholder: «Пин-код»)
- Кнопка «Войти» (зелёная, полная ширина)
- Переключатель языка EN | RU (верхний правый угол)

**Логика:**
- При первом запуске — создание PIN (4–6 цифр) с подтверждением
- При повторном запуске — ввод существующего PIN
- Максимум 5 попыток ввода, затем блокировка на 15 минут
- Аутентификация через Telegram WebApp `initData` (проверка подписи на бэкенде)
- PIN хранится в виде хеша (bcrypt) на сервере
- ID пользователя формируется как `tg_{telegram_user_id}` (пример: `tg_6976131338`)

**API:**
```
POST /api/auth/login
Body: { pin: string, initData: string }
Response: { token: string, user: UserObject }

POST /api/auth/register
Body: { pin: string, confirmPin: string, initData: string }
Response: { token: string, user: UserObject }
```

---

### 3.2 Модуль «Главная» (Сделки / Live)

#### 3.2.1 Лента сделок в реальном времени
**Таб навигации:** «Главная» (иконка сетки)

**Элементы UI:**
- Хедер: логотип «Zyphex Traiding» + баланс (`БАЛАНС $X.XX`)
- Заголовок секции: «Сделки» + бейдж «Live» (зелёный, анимированный пульс)
- Таблица сделок с колонками:
  - **ВРЕМЯ** — формат `HH:MM:SS`
  - **ПАРА** — тикер криптовалюты (ALGO, ROSE, BCH, LTC, LINK, APT, BNB, ATOM, AAVE и др.)
  - **P&L** — результат сделки:
    - Зелёный цвет и `+` для прибыльных
    - Красный цвет и `-` для убыточных
    - Формат: `+0.9095` (количество монет) + `ROSE ($0.0107)` (в USD)
- Список скроллируемый, новые сделки появляются сверху

#### 3.2.2 Блок «Скорость»
**Элементы UI:**
- Иконка молнии (зелёная)
- Заголовок: «Скорость»
- Две метрики в ряд:
  - **Задержка:** `~800 нс` / `~834 нс` (наносекунды), подпись: «Исполнение до 1 мкс»
  - **Исполнений:** `0` / `2`, подпись: «За сессию»
- Строка внизу: «Средняя скорость исполнения ~789 нс»

**WebSocket события:**
```typescript
// Подписка на live-сделки
interface TradeEvent {
  time: string;        // "09:40:12"
  pair: string;        // "ALGO"
  pnl: number;         // -0.1729
  pnlUsd: number;      // -0.0153
  ticker: string;      // "ALGO"
}

// Подписка на метрики скорости
interface SpeedMetrics {
  latencyNs: number;    // ~800
  executionsSession: number; // 0
  avgExecutionNs: number;   // ~789
}
```

**API:**
```
WS /ws/trades — стрим сделок в реальном времени
WS /ws/metrics — стрим метрик скорости
GET /api/trades/recent — последние N сделок (fallback)
```

---

### 3.3 Модуль «Кошелёк»

#### 3.3.1 Экран баланса
**Таб навигации:** «Кошелёк» (иконка бумажника)

**Элементы UI:**
- Заголовок: «Доступный баланс»
- Сумма крупным шрифтом: `$0,00 USD`
- Строка прогноза: «Ожид. в день от сделок: ~$0,00 (~5%)» (иконка тренда)
- Две кнопки в ряд:
  - «Пополнить» (зелёная обводка, иконка стрелки внутрь)
  - «Вывести» (серая обводка, иконка стрелки наружу)
- Секция «Баланс по сетям» — сетка 2×3:
  - TON: `$0,00 USDT`
  - BSC: `$0,00 USDT`
  - TRC: `$0,00 USDT`
  - SOL: `$0,00 USDT`
  - BTC: `$0,00 USDT`
  - ETH: `$0,00 USDT`

#### 3.3.2 Экран пополнения (Deposit)
**Элементы UI:**
- Заголовок: набор сетей «BSC · TRC · SOL · BTC · ETH · TON»
- Кнопка закрытия (×)
- Переключатель сетей: `TON | BSC | TRC | SOL | BTC | ETH` (таб-кнопки)
- Название сети: «TON · THE OPEN NETWORK»
- Текст: «Сканируйте для пополнения»
- QR-код (генерируется для адреса кошелька выбранной сети)
- Секция «Адрес для пополнения»:
  - Адрес кошелька (моноширинный шрифт, обрезанный)
  - Кнопка «Копировать» (зелёная)

**Логика:**
- Для каждого пользователя генерируется уникальный депозитный адрес для каждой сети
- QR-код содержит адрес кошелька
- Мониторинг входящих транзакций через блокчейн-ноды / сервисы
- При подтверждении транзакции — зачисление на баланс в USDT (по текущему курсу)

**API:**
```
GET /api/wallet/deposit-address?network=TON
Response: {
  address: string,
  network: string,
  networkFullName: string,
  qrCodeUrl: string
}
```

#### 3.3.3 Экран вывода (Withdraw)
**Элементы UI:**
- Заголовок: «Вывести» + кнопка закрытия (×)
- Подзаголовок: «BSC · TRC · SOL · BTC · ETH · TON»
- Секция «Выберите сеть»: таб-кнопки `TON | BSC | TRC | SOL | BTC | ETH`
- Поле «Сумма (USD)»:
  - Input с placeholder `0.00`
  - Подпись: «Доступно: $0,00 USDT»
  - Подпись: «Мин $50 · макс $1 000 в день»
  - Подпись: «Осталось сегодня: $1 000,00»
  - Ссылка «Макс» (зелёная) — заполняет поле максимальной суммой
- Поле «Адрес кошелька (ETH/TON/...)»:
  - Input с placeholder `0x ...` (зависит от сети)
- Кнопки:
  - «Отмена» (серая)
  - «Вывести» (зелёная)

**Валидация:**
- Минимальная сумма: $50
- Максимальная сумма в день: $1 000
- Проверка формата адреса в зависимости от выбранной сети
- Проверка достаточности баланса

**API:**
```
POST /api/wallet/withdraw
Body: {
  network: "ETH" | "TON" | "BSC" | "TRC" | "SOL" | "BTC",
  amount: number,
  address: string
}
Response: {
  transactionId: string,
  status: "pending",
  estimatedTime: string
}

GET /api/wallet/withdraw-limits
Response: {
  minAmount: 50,
  maxDailyAmount: 1000,
  remainingToday: 1000
}
```

**API кошелька (общее):**
```
GET /api/wallet/balance
Response: {
  totalUsd: number,
  estimatedDailyIncome: number,
  estimatedDailyPercent: number,
  balanceByNetwork: {
    TON: number,
    BSC: number,
    TRC: number,
    SOL: number,
    BTC: number,
    ETH: number
  }
}
```

---

### 3.4 Модуль «Рефералы»

#### 3.4.1 Экран реферальной программы
**Таб навигации:** «Рефералы» (иконка людей с +)

**Элементы UI:**
- Хедер: логотип + баланс
- Секция «Ваша реферальная ссылка»:
  - Ссылка: `https://t.me/YourBot/app?startapp=V37DEPE2`
  - Кнопка «Копировать» (зелёная)
  - Текст: «Ваш код: **V37DEPE2**»
- Секция «Приглашённые»:
  - Число: `0`
  - Подпись: «Перешли по вашей ссылке»
- Секция «Заработано с рефералов»:
  - Сумма: `+$0.00`
  - Подпись: «5% от пополнений рефералов»
- Информационный блок (тултип / карточка внизу):
  - **Как это работает:** «Поделитесь реферальной ссылкой. Когда человек перейдёт по ней, зарегистрируется и пополнит баланс — вы получите 5% от суммы пополнения в USDT на свой баланс автоматически.»

**Логика:**
- Генерация уникального реферального кода (6–8 символов, alphanumeric)
- Формирование deeplink: `https://t.me/{botUsername}/app?startapp={refCode}`
- При регистрации нового пользователя через реферальную ссылку — привязка к рефереру
- При каждом пополнении реферала — начисление 5% рефереру автоматически
- Копирование ссылки через Telegram WebApp `navigator.clipboard` или `Telegram.WebApp.openTelegramLink`

**API:**
```
GET /api/referral/info
Response: {
  refCode: string,
  refLink: string,
  invitedCount: number,
  totalEarned: number
}

GET /api/referral/history
Response: {
  referrals: [{
    date: string,
    amount: number,
    fromUser: string (masked)
  }]
}
```

---

### 3.5 Модуль «Статистика»

#### 3.5.1 Экран статистики P&L
**Таб навигации:** «Статистика» (иконка графика)

**Элементы UI:**
- Хедер: логотип + баланс
- Заголовок: «Статистика»
- Подзаголовок: «Прибыль за день, неделю и месяц»
- Секция «ПРИБЫЛЬ И УБЫТОК ПО ПЕРИОДАМ»:
  - Карточка «P&L за сегодня»:
    - Сумма: `+$0,00`
    - Подпись: «За 0 сделку(и) сегодня»
    - Иконка календаря (справа)
  - Карточка «P&L за неделю»:
    - Сумма: `+$0,00`
    - Подпись: «За 7 дней · 0 сделок»
    - Иконка графика (справа)
  - Карточка «P&L за месяц»:
    - Сумма: `+$0,00` (подразумевается, обрезано на скриншоте)
    - Иконка тренда (справа)
- Секция «РЕЗУЛЬТАТИВНОСТЬ»:
  - Иконка процента
  - **Винрейт:** `0.0%`
  - Подпись: «0 в плюс / 0 всего»

**API:**
```
GET /api/stats/pnl
Response: {
  today: {
    pnl: number,
    tradesCount: number
  },
  week: {
    pnl: number,
    tradesCount: number,
    days: 7
  },
  month: {
    pnl: number,
    tradesCount: number
  },
  performance: {
    winRate: number,      // 0.0 - 100.0
    profitTrades: number,
    totalTrades: number
  }
}
```

---

### 3.6 Модуль «Настройки»

#### 3.6.1 Аккаунт
**Таб навигации:** «Настройки» (иконка шестерёнки)

**Элементы UI:**
- Хедер: логотип + баланс
- Секция «Аккаунт»:
  - **ID пользователя:** `tg_6976131338` (только чтение)
  - Кнопка «Изменить PIN»

#### 3.6.2 Режим бота
**Элементы UI:**
- Заголовок: «Режим бота»
- Три карточки-переключателя (radio select):
  1. **Безопасный** (иконка щита):
     - Описание: «Меньший риск, небольшие позиции»
  2. **Сбалансированный** (иконка весов, выбран по умолчанию, зелёная рамка):
     - Описание: «Умеренный риск и доход»
  3. **Высокая прибыль** (иконка тренда вверх):
     - Описание: «Выше риск, выше потенциальная прибыль»

#### 3.6.3 Язык
**Элементы UI:**
- Заголовок: «Язык» (иконка глобуса)
- Два таба: `English | Русский` (активный — зелёная кнопка)

#### 3.6.4 Опасные действия
**Элементы UI:**
- Текст: «Сбросить баланс до начальной суммы (очищает историю сделок).»
- Кнопка «Сбросить баланс до $0» (зелёная обводка, иконка сброса)
- Кнопка «Выход» (красная обводка, иконка выхода)

**API:**
```
GET /api/settings
Response: {
  userId: string,
  botMode: "safe" | "balanced" | "aggressive",
  language: "en" | "ru"
}

PUT /api/settings/bot-mode
Body: { mode: "safe" | "balanced" | "aggressive" }

PUT /api/settings/language
Body: { language: "en" | "ru" }

POST /api/settings/change-pin
Body: { oldPin: string, newPin: string, confirmNewPin: string }

POST /api/settings/reset-balance
Body: { confirmPin: string }

POST /api/auth/logout
```

---

## 4. Навигация

### 4.1 Нижний таб-бар (Bottom Navigation)
Фиксированный в нижней части экрана, 5 табов:

| Позиция | Название | Иконка | Роут |
|---------|----------|--------|------|
| 1 | Главная | Сетка (4 квадрата) | `/` |
| 2 | Кошелёк | Бумажник | `/wallet` |
| 3 | Рефералы | Люди + | `/referrals` |
| 4 | Статистика | График | `/stats` |
| 5 | Настройки | Шестерёнка | `/settings` |

- Активный таб: зелёная иконка + зелёный текст, фоновая подсветка
- Неактивные табы: серый цвет

### 4.2 Хедер (Header)
Присутствует на всех экранах (кроме PIN-экрана):
- Логотип: зелёная буква «A» в круге + текст «Zyphex Traiding»
- Баланс справа: `БАЛАНС $X.XX` (зелёный)

### 4.3 Модальные окна
- Пополнение (Deposit) — модал поверх экрана кошелька
- Вывод (Withdraw) — модал поверх экрана кошелька
- Кнопка закрытия (×) в правом верхнем углу модала

---

## 5. Дизайн-система

### 5.1 Цветовая палитра

| Назначение | Цвет | HEX |
|-----------|------|-----|
| Основной фон | Тёмно-синий/чёрный | `#0D1117` |
| Фон карточек | Тёмно-серый | `#161B22` |
| Фон инпутов | Тёмный | `#1C2333` |
| Акцент (основной) | Зелёный | `#00D26A` |
| Прибыль / позитив | Зелёный | `#00D26A` |
| Убыток / негатив | Красный | `#FF4444` |
| Текст основной | Белый | `#FFFFFF` |
| Текст вторичный | Серый | `#8B949E` |
| Обводка карточек | Серый | `#30363D` |
| Бейдж Live | Зелёный | `#00D26A` (с пульсацией) |

### 5.2 Типографика

| Элемент | Размер | Вес | Стиль |
|---------|--------|-----|-------|
| Баланс (крупный) | 32px | Bold | Моноширинный |
| Суммы P&L | 24px | Bold | Моноширинный |
| Заголовки секций | 18px | Semibold | Sans-serif |
| Основной текст | 14px | Regular | Sans-serif |
| Подписи | 12px | Regular | Sans-serif, серый |
| Моноширинные данные | 14px | Medium | Mono (адреса, числа) |

**Шрифты:** Inter (основной), JetBrains Mono / SF Mono (цифры, адреса)

### 5.3 Компоненты

#### Кнопки
- **Primary (зелёная заливка):** фон `#00D26A`, текст чёрный, border-radius 12px
- **Secondary (обводка):** прозрачный фон, обводка `#30363D`, текст белый
- **Danger (красная обводка):** прозрачный фон, обводка `#FF4444`, текст красный
- **Tab-кнопка (активная):** фон `#00D26A`, текст чёрный, скруглённая
- **Tab-кнопка (неактивная):** фон `#1C2333`, текст серый

#### Карточки
- Фон: `#161B22`
- Border: `1px solid #30363D`
- Border-radius: `16px`
- Padding: `16px`
- Выбранная: border цвета `#00D26A`

#### Инпуты
- Фон: `#1C2333`
- Border-radius: `12px`
- Placeholder: серый текст
- Фокус: обводка `#00D26A`

---

## 6. Модель данных (Database Schema)

### 6.1 Таблица `users`
```sql
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  telegram_id     BIGINT UNIQUE NOT NULL,
  user_code       VARCHAR(20) NOT NULL,       -- "tg_6976131338"
  pin_hash        VARCHAR(255) NOT NULL,
  ref_code        VARCHAR(10) UNIQUE NOT NULL, -- "V37DEPE2"
  referred_by     INTEGER REFERENCES users(id),
  bot_mode        VARCHAR(20) DEFAULT 'balanced', -- safe | balanced | aggressive
  language        VARCHAR(5) DEFAULT 'ru',
  balance_usdt    DECIMAL(18,8) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### 6.2 Таблица `wallets`
```sql
CREATE TABLE wallets (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  network         VARCHAR(10) NOT NULL,       -- TON, BSC, TRC, SOL, BTC, ETH
  address         VARCHAR(255) NOT NULL,
  balance_usdt    DECIMAL(18,8) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, network)
);
```

### 6.3 Таблица `transactions`
```sql
CREATE TABLE transactions (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  type            VARCHAR(20) NOT NULL,       -- deposit | withdraw | referral_bonus
  network         VARCHAR(10),
  amount_usdt     DECIMAL(18,8) NOT NULL,
  address         VARCHAR(255),
  tx_hash         VARCHAR(255),
  status          VARCHAR(20) DEFAULT 'pending', -- pending | confirmed | failed
  created_at      TIMESTAMP DEFAULT NOW(),
  confirmed_at    TIMESTAMP
);
```

### 6.4 Таблица `trades`
```sql
CREATE TABLE trades (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  pair            VARCHAR(20) NOT NULL,        -- "ALGO", "ROSE", "BCH"
  pnl_amount      DECIMAL(18,8) NOT NULL,      -- +0.9095 / -0.1729
  pnl_usd         DECIMAL(18,8) NOT NULL,      -- $0.0107
  executed_at     TIMESTAMP DEFAULT NOW(),
  latency_ns      INTEGER                      -- ~800
);
```

### 6.5 Таблица `referral_earnings`
```sql
CREATE TABLE referral_earnings (
  id              SERIAL PRIMARY KEY,
  referrer_id     INTEGER REFERENCES users(id),
  referred_id     INTEGER REFERENCES users(id),
  deposit_amount  DECIMAL(18,8) NOT NULL,
  bonus_amount    DECIMAL(18,8) NOT NULL,      -- 5% от deposit_amount
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### 6.6 Таблица `withdrawal_limits`
```sql
CREATE TABLE withdrawal_limits (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  date            DATE NOT NULL,
  withdrawn_today DECIMAL(18,8) DEFAULT 0,
  UNIQUE(user_id, date)
);
```

---

## 7. API Specification (сводная)

### 7.1 Аутентификация
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/api/auth/register` | Регистрация + создание PIN |
| POST | `/api/auth/login` | Вход по PIN |
| POST | `/api/auth/logout` | Выход |

### 7.2 Кошелёк
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/wallet/balance` | Общий баланс + по сетям |
| GET | `/api/wallet/deposit-address?network=` | Адрес для пополнения |
| POST | `/api/wallet/withdraw` | Создание заявки на вывод |
| GET | `/api/wallet/withdraw-limits` | Лимиты вывода |
| GET | `/api/wallet/transactions` | История транзакций |

### 7.3 Торговля
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/trades/recent` | Недавние сделки |
| WS | `/ws/trades` | Live-стрим сделок |
| WS | `/ws/metrics` | Live-метрики скорости |

### 7.4 Статистика
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/stats/pnl` | P&L по периодам + винрейт |

### 7.5 Рефералы
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/referral/info` | Реферальная информация |
| GET | `/api/referral/history` | История начислений |

### 7.6 Настройки
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/settings` | Получить настройки |
| PUT | `/api/settings/bot-mode` | Изменить режим бота |
| PUT | `/api/settings/language` | Изменить язык |
| POST | `/api/settings/change-pin` | Сменить PIN |
| POST | `/api/settings/reset-balance` | Сбросить баланс |

---

## 8. Интеграция с Telegram

### 8.1 Telegram Bot
- Команда `/start` — приветствие + кнопка запуска WebApp
- Параметр `startapp` — обработка реферальных кодов
- Inline-кнопка открытия MiniApp

### 8.2 Telegram WebApp SDK
```javascript
const tg = window.Telegram.WebApp;

// Инициализация
tg.ready();
tg.expand();

// Данные пользователя
const initData = tg.initData;        // для проверки на бэкенде
const user = tg.initDataUnsafe.user; // { id, first_name, username, ... }

// Тема
const colorScheme = tg.colorScheme;  // "dark" (основной режим)

// Haptic feedback
tg.HapticFeedback.impactOccurred("medium");

// Закрытие
tg.close();
```

### 8.3 Верификация initData на бэкенде
```javascript
const crypto = require('crypto');

function verifyTelegramWebAppData(initData, botToken) {
  const secret = crypto.createHmac('sha256', 'WebAppData')
    .update(botToken).digest();
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  const sorted = [...params.entries()].sort().map(([k, v]) => `${k}=${v}`).join('\n');
  const computed = crypto.createHmac('sha256', secret)
    .update(sorted).digest('hex');
  return computed === hash;
}
```

---

## 9. Безопасность

### 9.1 Аутентификация и авторизация
- Проверка `initData` Telegram на каждом запросе
- JWT токены с коротким TTL (15 мин) + refresh token
- PIN хранится как bcrypt hash
- Rate limiting: 5 попыток PIN за 15 минут

### 9.2 Финансовые операции
- Все суммы хранятся в `DECIMAL(18,8)` (не float)
- Дневной лимит вывода: $1 000
- Минимальный вывод: $50
- Подтверждение вывода PIN-кодом
- Валидация адреса кошелька по формату сети
- Логирование всех финансовых операций

### 9.3 Сетевая безопасность
- HTTPS только
- CORS ограничен доменом WebApp
- Защита от SQL injection (parameterized queries)
- Input sanitization на всех эндпоинтах

---

## 10. Локализация (i18n)

### 10.1 Поддерживаемые языки
- `ru` — Русский (по умолчанию)
- `en` — English

### 10.2 Структура переводов
```json
{
  "ru": {
    "nav.home": "Главная",
    "nav.wallet": "Кошелёк",
    "nav.referrals": "Рефералы",
    "nav.stats": "Статистика",
    "nav.settings": "Настройки",
    "auth.enterPin": "Введите PIN",
    "auth.enterPinDesc": "Введите PIN для входа в приложение.",
    "auth.pinPlaceholder": "Пин-код",
    "auth.login": "Войти",
    "wallet.balance": "Доступный баланс",
    "wallet.deposit": "Пополнить",
    "wallet.withdraw": "Вывести",
    "wallet.networkBalance": "Баланс по сетям",
    "wallet.expectedDaily": "Ожид. в день от сделок",
    "withdraw.amount": "Сумма (USD)",
    "withdraw.available": "Доступно",
    "withdraw.min": "Мин $50 · макс $1 000 в день",
    "withdraw.remaining": "Осталось сегодня",
    "withdraw.max": "Макс",
    "withdraw.address": "Адрес кошелька",
    "withdraw.cancel": "Отмена",
    "withdraw.submit": "Вывести",
    "trades.title": "Сделки",
    "trades.live": "Live",
    "trades.time": "ВРЕМЯ",
    "trades.pair": "ПАРА",
    "speed.title": "Скорость",
    "speed.latency": "Задержка",
    "speed.executions": "Исполнений",
    "speed.perSession": "За сессию",
    "speed.avgSpeed": "Средняя скорость исполнения",
    "stats.title": "Статистика",
    "stats.pnlToday": "P&L за сегодня",
    "stats.pnlWeek": "P&L за неделю",
    "stats.pnlMonth": "P&L за месяц",
    "stats.winRate": "Винрейт",
    "stats.profitOf": "в плюс",
    "stats.totalOf": "всего",
    "referral.yourLink": "Ваша реферальная ссылка",
    "referral.copy": "Копировать",
    "referral.yourCode": "Ваш код",
    "referral.invited": "Приглашённые",
    "referral.followedLink": "Перешли по вашей ссылке",
    "referral.earned": "Заработано с рефералов",
    "referral.percent": "5% от пополнений рефералов",
    "settings.account": "Аккаунт",
    "settings.userId": "ID пользователя",
    "settings.changePin": "Изменить PIN",
    "settings.botMode": "Режим бота",
    "settings.safe": "Безопасный",
    "settings.safeDesc": "Меньший риск, небольшие позиции",
    "settings.balanced": "Сбалансированный",
    "settings.balancedDesc": "Умеренный риск и доход",
    "settings.aggressive": "Высокая прибыль",
    "settings.aggressiveDesc": "Выше риск, выше потенциальная прибыль",
    "settings.language": "Язык",
    "settings.reset": "Сбросить баланс до $0",
    "settings.resetDesc": "Сбросить баланс до начальной суммы (очищает историю сделок).",
    "settings.logout": "Выход"
  }
}
```

---

## 11. Поддерживаемые блокчейн-сети

| Сеть | Тикер | Стандарт токена | Формат адреса |
|------|-------|-----------------|---------------|
| The Open Network | TON | Jetton USDT | `UQ...` / `EQ...` |
| BNB Smart Chain | BSC | BEP-20 USDT | `0x...` (42 символа) |
| Tron | TRC | TRC-20 USDT | `T...` (34 символа) |
| Solana | SOL | SPL USDT | Base58, 32-44 символа |
| Bitcoin | BTC | BTC (native) | `bc1...` / `1...` / `3...` |
| Ethereum | ETH | ERC-20 USDT | `0x...` (42 символа) |

---

## 12. Нефункциональные требования

### 12.1 Производительность
- Время загрузки WebApp: < 2 секунды
- Задержка WebSocket сообщений: < 100 мс
- API response time: < 200 мс (95-й перцентиль)
- Поддержка до 10 000 одновременных пользователей

### 12.2 Надёжность
- Uptime: 99.9%
- Автоматический reconnect WebSocket при обрыве
- Graceful degradation при недоступности WS (fallback на polling)
- Резервное копирование БД каждые 6 часов

### 12.3 Мобильная оптимизация
- Полностью адаптивный дизайн под мобильные устройства
- Viewport ширина: 320px — 430px (основной диапазон)
- Поддержка safe-area-inset (для iPhone с notch)
- Smooth scrolling, touch-friendly элементы (min tap target 44px)
- Нативная подложка Telegram WebApp

### 12.4 Совместимость
- Telegram для iOS 16+
- Telegram для Android 8+
- Telegram Desktop (Windows, macOS, Linux)

---

## 13. Структура проекта (Frontend)

```
src/
├── App.tsx
├── main.tsx
├── types/
│   ├── user.ts
│   ├── wallet.ts
│   ├── trade.ts
│   └── settings.ts
├── api/
│   ├── client.ts           # Axios/fetch wrapper с JWT
│   ├── auth.ts
│   ├── wallet.ts
│   ├── trades.ts
│   ├── stats.ts
│   ├── referral.ts
│   └── settings.ts
├── hooks/
│   ├── useTelegram.ts       # Telegram WebApp SDK hook
│   ├── useWebSocket.ts      # WS подключение для live-данных
│   ├── useAuth.ts
│   └── useBalance.ts
├── store/                   # Zustand / Redux
│   ├── authStore.ts
│   ├── walletStore.ts
│   └── settingsStore.ts
├── i18n/
│   ├── ru.json
│   └── en.json
├── components/
│   ├── Layout/
│   │   ├── Header.tsx
│   │   ├── BottomNav.tsx
│   │   └── PageContainer.tsx
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── TabSelector.tsx
│   │   ├── Modal.tsx
│   │   └── Badge.tsx
│   └── features/
│       ├── TradeRow.tsx
│       ├── SpeedMetrics.tsx
│       ├── NetworkSelector.tsx
│       ├── QRCode.tsx
│       ├── PnlCard.tsx
│       ├── WinRateDisplay.tsx
│       └── BotModeSelector.tsx
├── pages/
│   ├── AuthPage.tsx
│   ├── HomePage.tsx
│   ├── WalletPage.tsx
│   ├── DepositModal.tsx
│   ├── WithdrawModal.tsx
│   ├── ReferralPage.tsx
│   ├── StatsPage.tsx
│   └── SettingsPage.tsx
└── utils/
    ├── formatCurrency.ts
    ├── validateAddress.ts
    └── clipboard.ts
```

---

## 14. Футер

На всех экранах внизу, под навигацией:
- Текст: `@ZYPHEXAUTOTRAIDINGBOT` (серый, мелкий шрифт, по центру)

---

## 15. MVP Roadmap

### Фаза 1 — Core (2–3 недели)
- [ ] Telegram Bot + WebApp запуск
- [ ] Аутентификация (PIN + initData)
- [ ] UI: Все 5 табов навигации
- [ ] UI: Хедер с балансом
- [ ] Страница настроек (режим бота, язык, PIN)

### Фаза 2 — Кошелёк (2–3 недели)
- [ ] Генерация депозитных адресов (TON, ETH как минимум)
- [ ] QR-код для депозита
- [ ] Мониторинг входящих транзакций
- [ ] Форма вывода средств
- [ ] Баланс по сетям

### Фаза 3 — Торговля + Live (2 недели)
- [ ] WebSocket стрим сделок
- [ ] Live-лента на главной странице
- [ ] Метрики скорости
- [ ] Интеграция режимов бота с торговым движком

### Фаза 4 — Статистика + Рефералы (1–2 недели)
- [ ] P&L статистика по периодам
- [ ] Винрейт
- [ ] Реферальная система (генерация кода, deeplink)
- [ ] Начисление 5% бонусов

### Фаза 5 — Полировка (1 неделя)
- [ ] Полная локализация EN/RU
- [ ] Анимации и переходы
- [ ] Тестирование на всех платформах
- [ ] Оптимизация производительности