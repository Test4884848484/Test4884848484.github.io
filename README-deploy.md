# Copilot AI Web — Деплой

## Структура проекта

```
сервер (46.173.27.68):
  /root/copilot-bot/          ← существующий бот
    tg_bot.py
    selenium_bot.py
    db_storage.py
    md_formatter.py
    bot_data.db
  /root/copilot-web/          ← новая папка
    api.py                    ← FastAPI бэкенд

GitHub Pages:
  index.html                  ← фронтенд (статика)
```

---

## 1. Настройка бэкенда на сервере

### Установка зависимостей
```bash
pip3 install fastapi uvicorn python-multipart
```

### Копируем файлы
```bash
mkdir /root/copilot-web
# скопируй api.py в /root/copilot-web/api.py
```

### Правим api.py — указываем свой GitHub Pages URL
```python
# В файле api.py найди строку:
allow_origins=[
    "https://YOUR_GITHUB_USERNAME.github.io",  # ← сюда свой URL
    ...
]
```

### Тест запуска
```bash
cd /root/copilot-web
python3 -m uvicorn api:app --host 127.0.0.1 --port 8001
# Открой http://46.173.27.68:8001/health — должно вернуть {"status":"ok"}
```

---

## 2. Nginx — выносим API на порт 8443

Текущий сайт работает на 443. Добавляем API на 8443.

```bash
# Проверь что 8443 свободен
sudo ss -tlnp | grep 8443

# Скопируй nginx конфиг
sudo cp nginx-copilot-api.conf /etc/nginx/sites-available/copilot-api
sudo ln -s /etc/nginx/sites-available/copilot-api /etc/nginx/sites-enabled/copilot-api

# Получи/обнови SSL сертификат (если ещё нет для этого домена)
sudo certbot certonly --webroot -w /var/www/html -d 46-173-27-68.sslip.io
# или если уже есть:
# сертификат уже работает для 46-173-27-68.sslip.io через текущий сайт

sudo nginx -t && sudo systemctl reload nginx
```

### Альтернатива без nginx (HTTP)
```bash
# Запусти напрямую на 8001 (но GitHub Pages не сможет обращаться по HTTP!)
python3 -m uvicorn api:app --host 0.0.0.0 --port 8001
```

---

## 3. Systemd — автозапуск

```bash
sudo cp copilot-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable copilot-api
sudo systemctl start copilot-api
sudo systemctl status copilot-api
```

---

## 4. GitHub Pages — фронтенд

### Создаём репозиторий
1. Создай репозиторий на GitHub: `YOUR_USERNAME/YOUR_USERNAME.github.io`
2. (или любой репо → Settings → Pages → Deploy from branch `main`)

### Правим index.html
```javascript
// Найди строку в index.html:
const API = 'https://46-173-27-68.sslip.io:8443';
// Замени на свой URL бэкенда
```

### Деплой
```bash
git init
git add index.html
git commit -m "init"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_USERNAME.github.io.git
git push -u origin main
```

Сайт будет доступен по адресу: `https://YOUR_USERNAME.github.io`

---

## 5. Проверка

```bash
# 1. Проверка API (с сервера)
curl http://127.0.0.1:8001/health

# 2. Проверка через nginx (снаружи)
curl https://46-173-27-68.sslip.io:8443/health

# 3. Проверка CORS (с GitHub Pages)
# Открой DevTools на сайте, введи код, смотри Network tab
```

---

## 6. Firewall

```bash
# Открыть порт 8443
sudo ufw allow 8443/tcp
sudo ufw reload
```

---

## Архитектура запроса

```
Пользователь → GitHub Pages (index.html)
     ↓ HTTPS (fetch)
46-173-27-68.sslip.io:8443 (nginx)
     ↓ proxy_pass
127.0.0.1:8001 (FastAPI / api.py)
     ↓ import
selenium_bot.py → Edge browser → GitHub Copilot
     ↓
     ответ AI обратно по цепочке
```
