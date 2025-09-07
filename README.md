# 🚀 Funding Arbitrage Bot - Backend

Серверная часть для мониторинга и арбитража funding rates между биржами Extended и Hyperliquid с поддержкой Telegram Mini App.

> 📅 **Проект зародился 24 августа 2025 года** как личная инициатива для участия в конкурсе от команды [cp0x](https://t.me/c/1639919522/35731/39936) и [Extended](https://app.extended.exchange/)

## 🔗 Связанные репозитории

- **Frontend (Telegram Mini App)**: [funding-frontend](https://github.com/hmmrfll/funding-frontend)
- **Backend (API Server)**: [funding-backend](https://github.com/hmmrfll/funding-backend) *(текущий репозиторий)*

## 🛠️ Технологический стек

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Telegram Bot API](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)

## 🏗️ Архитектура

- **Telegram Mini App** - Единственная точка доступа для пользователей
- **RESTful API** - Express.js сервер для обработки запросов от Mini App
- **Real-time мониторинг** - Автоматический сбор данных с бирж каждые 30 секунд
- **PostgreSQL** - Основная база данных с автоинициализацией
- **Telegram Bot** - Уведомления и интеграция с Mini App
- **Модульная архитектура** - Разделение на слои (storage, service, REST API)
- **Cron Jobs** - Автоматический сбор данных с бирж Extended и Hyperliquid

## 🚀 Быстрый старт с Docker

### Предварительные требования

- ![Docker](https://img.shields.io/badge/Docker-20.10+-2496ED?style=flat&logo=docker&logoColor=white)
- ![Docker Compose](https://img.shields.io/badge/Docker_Compose-1.29+-2496ED?style=flat&logo=docker&logoColor=white)
- Telegram Bot Token (получить у [@BotFather](https://t.me/botfather))
- **HTTPS туннель** для `SERVER_URL` и `MINI_APP_URL`

### 🌐 Настройка HTTPS туннеля

Поскольку Telegram Mini App требует HTTPS соединения, `localhost` не подойдет. Используйте один из способов:

**Вариант 1: ngrok**
```bash
# Установите ngrok: https://ngrok.com/
# Запустите туннель для backend
ngrok http 3000

# Скопируйте HTTPS URL (например: https://abc123.ngrok.io)
```

**Вариант 2: Cloudflare Tunnel**
```bash
# Установите cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/
# Запустите туннель
cloudflared tunnel --url http://localhost:3000

# Скопируйте HTTPS URL из вывода команды
```

### Установка и запуск

1. **Клонируйте репозиторий**
```bash
git clone https://github.com/your-username/funding-arbitrage-backend.git
cd funding-arbitrage-backend
```

2. **Настройте переменные окружения**
```bash
cp .env.example .env
```

Отредактируйте `.env` файл:
```env
# Telegram Bot (ОБЯЗАТЕЛЬНО)
BOT_TOKEN=your_bot_token_here

# HTTPS URLs (ОБЯЗАТЕЛЬНО) - используйте ngrok или cloudflared
SERVER_URL=https://abc123.ngrok.io
MINI_APP_URL=https://your-mini-app-domain.com

# PostgreSQL
PG_USER=postgres
PG_HOST=db
PG_DATABASE=funding
PG_PASSWORD=your_secure_password
PG_PORT=5432
PG_CONTAINER_NAME=psql-funding

# Backend
BACKEND_PORT=3000
BACKEND_HOST=0.0.0.0
BACKEND_CONTAINER_NAME=api-funding
```

> ⚠️ **Важно**: `SERVER_URL` и `MINI_APP_URL` должны быть HTTPS ссылками. Локальные `http://localhost` не будут работать с Telegram Mini App.

3. **Запустите приложение**
```bash
docker-compose up -d
```

4. **Проверьте статус**
```bash
docker-compose ps
curl https://your-ngrok-url.ngrok.io/health
```

### 🛠️ Разработка без Docker

```bash
# Установка зависимостей
npm install

# Настройка базы данных (требует локальный PostgreSQL)
npm run db:create
npm run migrate

# Запуск в режиме разработки
npm run dev

# Запуск продакшен версии
npm start
```

## 🗂️ Структура проекта

```
├── cmd/                    # Конфигурация и запуск
│   ├── main.js            # Главный файл приложения
│   ├── config.js          # Конфигурация
│   ├── db.js              # Менеджер базы данных
│   └── scheduler.js       # Планировщик задач
├── internal/              # Основная логика
│   ├── arbitrage/         # Арбитражная логика
│   ├── dashboard/         # Аналитика
│   ├── gateways/          # Внешние API
│   │   ├── extended/      # Extended Exchange API
│   │   ├── hyperliquid/   # Hyperliquid API
│   │   └── telegram/      # Telegram Bot
│   ├── notifications/     # Система уведомлений
│   ├── user/             # Управление пользователями
│   ├── resthttp/         # REST API endpoints
│   └── shared/           # Общие компоненты
│       ├── logger/       # Логирование
│       └── middleware/   # Middleware (авторизация)
├── migrations/           # Миграции БД
│   └── init.sql         # Начальная схема
├── docker-compose.yml   # Docker конфигурация
└── package.json         # Зависимости Node.js
```

## 🔄 Автоматизация

### Cron Jobs

Система автоматически выполняет следующие задачи:

- **Каждые 30 секунд**: Сбор funding rates с Extended и Hyperliquid
- **Каждые 30 секунд**: Поиск арбитражных возможностей
- **По событиям**: Отправка уведомлений при превышении порогов

### Поддерживаемые биржи

- **Extended Exchange** - API: `api.starknet.extended.exchange`
- **Hyperliquid** - API: `api.hyperliquid.xyz`

## 🗺️ Дорожная карта

> 🌟 **Open Source проект!** Каждый желающий может внести свой вклад в развитие. Проект родился благодаря личной инициативе для участия в конкурсе от команды [cp0x](https://t.me/c/1639919522/35731/39936) и [Extended](https://app.extended.exchange/). Присоединяйтесь к разработке! 🚀

<table>
<tr>
<td width="25%">

### ✅ **MVP v1.0**
**Текущая версия**

- [x] 📱 Telegram Mini App
- [x] 📊 Мониторинг funding rates
- [x] 🚀 REST API
- [x] 🔔 Telegram уведомления
- [x] 🗄️ PostgreSQL БД
- [x] 🐳 Docker контейнеризация
- [x] ⏰ Real-time обновления

</td>
<td width="25%">

### 🔄 **v1.1**
**В разработке**

- [ ] 📈 Расширенная аналитика
- [ ] 📊 Графики и чарты
- [ ] 📄 Экспорт данных
- [ ] 🎯 Автоматическое открытие позиций
- [ ] 🔗 Полная интеграция с HP & Extended
- [ ] ⚡ Реальное исполнение сделок

</td>
<td width="25%">

### 🚀 **v1.2**
**Планируется**

- [ ] 🏦 Новые биржи (Binance, OKX)
- [ ] 💳 Интеграция кошельков
- [ ] 💰 PnL статистика
- [ ] 🔐 Расширенная безопасность
- [ ] 🍪 Работа с куки и браузером
- [ ] 🔑 Multi-auth (Twitter/Gmail/Discord)
- [ ] 🌐 Мультиплатформенность

</td>
<td width="25%">

### 🌟 **v2.0**
**Будущее**

- [ ] 🔄 Spot арбитраж
- [ ] 🌐 DeFi интеграция
- [ ] 👥 Социальные функции
- [ ] 💎 Премиум подписка
- [ ] 🌍 Мультиязычность
- [ ] 🤖 AI-powered стратегии

</td>
</tr>
</table>

## 📞 Поддержка

- **Канал разработчика**: [@vm4sto](https://t.me/vm4sto)
- **Контакт разработчика**: [@hmmrfll](https://t.me/hmmrfll)

## 📄 Лицензия

MIT License - подробности в файле [LICENSE](LICENSE)

---

<div align="center">
  <strong>Создано специально для Telegram Mini App экосистемы</strong><br>
  <em>Мониторинг funding rates в одном приложении 📱</em><br><br>

  ![Open Source Love](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red?style=flat)
  ![Community Driven](https://img.shields.io/badge/Community-Driven-blue?style=flat)
  ![cp0x Competition](https://img.shields.io/badge/cp0x-Competition%20Entry-purple?style=flat)
  ![Extended Exchange](https://img.shields.io/badge/Extended-Exchange-orange?style=flat)
</div>
