<p align="center">
  <a href="https://aircodes.net">
  <img src="https://raw.githubusercontent.com/aircodes-net/.github/main/assets/Icon-AirCodes.png" alt="Icon AirCodes" width="180" />
  </a>
</p>

<h1 align="center">AirCodes</h1>
<h3 align="center">AirCodes is an open-source Discord coin system with code generation, web interface, and user management.</h3> 


## 📋 Requirements

  

- Node.js 18+

- npm or yarn

- Discord Bot configured

- SQLite3
 

## 🔧 Setup Guide

  

### 1. Clone + Install Dependencies

  

```bash

git  clone  https://github.com/faydonK/AirCodes.git

cd  aircodes

npm  i

```

  

### 2. Create a New Discord Bot

  

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)

2. Click **"New Application"**

3. Enter a name (e.g. `AirCodes`) and click **Create**

  

4. 📷Get token bot here:

<img  src="https://i.imgur.com/nHThppt.png"  alt="Get Token Screenshot"  width="600px">

  

5. 📷Get bot client information here:

<img  src="https://i.imgur.com/Nx3rRX0.png"  alt="Get Client Information Screenshot"  width="600px">

  

6. 📷Enter redirect URL here:

<img  src="https://i.imgur.com/nW24Oz1.png"  alt="Change Redirect URL Screenshot"  width="600px">

  

7. Invite the bot to your server with permissions:

-  `Send Messages`

-  `Use Slash Commands`

-  `Read Message History`

-  `Mention @everyone, @here, and All Roles`

  

### 3. Configure the Application

  

**Copy the configuration file:**

```bash

cp  config.json.example  config.json

```

  

**Edit `config.json` with your settings:**

```json

{
  "discord": {
    "token": "YOUR_BOT_TOKEN",
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "serverId": "YOUR_SERVER_ID",
    "channelId": "DISCORD_CHANNEL_ID",
    "mentionRoleId": "ROLE_ID_TO_MENTION" 
    "redeemUrl": "https://yourdomain.com/redeem"
    "inviteLink": "https://discord.gg/your-invite",
  },
  "coins": {
    "name": "",
    "minValue": 10.00,
    "maxValue": 100.00
  },
  "codes": {
    "maxSlots": 10,
    "codeLength": 8,
    "scheduleHours": {
      "start": 8,
      "end": 20
    }
  },
  "server": {
    "name": "", 
    "sessionSecret": "change-this-random-character--NEVER-SHARE"
  }
}

```

  

**Configuration Details:**

-  `serverId`: Your Discord server ID (for security - commands only work in this server)

-  `mentionRoleId`: Role to mention when codes are generated (leave empty for @everyone)

-  `channelId`: Channel where codes will be posted

-  `sessionSecret`: Generate a random secret for sessions

  

### 4. Initialize Database

  

**Start the application once to create database tables:**

```bash

npm  run  dev

```

  

This will:

- Create the `database/` directory

- Initialize `database.db` with all required tables

- Set proper file permissions automatically

  

**Database tables created:**

-  `users` - Discord users and their coins

-  `codes` - Generated codes with slots

-  `code_redemptions` - Redemption history

-  `bot_state` - Bot state tracking

  ---

## 🌐 Production Deployment

### Nginx Deployment

**1. Install Nginx:**
```bash
sudo apt update
sudo apt install nginx
```

**2. Build the application:**
```bash
npm run build
```

**3. Create web directory and copy files:**
```bash
sudo mkdir -p /var/www/aircodes/public
sudo cp -r dist/public/* /var/www/aircodes/public/
sudo chown -R www-data:www-data /var/www/aircodes
```

**4. Create Nginx configuration:**
```bash
sudo nano /etc/nginx/sites-available/aircodes
```

```nginx
upstream aircodes_backend {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name your-domain.com;  # or your server IP
    
    root /var/www/aircodes/public;
    index index.html;
    
    location /api/ {
        proxy_pass http://aircodes_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /auth/ {
        proxy_pass http://aircodes_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location ~ ^/(discord|invite|i)$ {
        proxy_pass http://aircodes_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**5. Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/aircodes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**6. Start services with PM2:**

### Install PM2

```bash
npm install -g pm2
```
### Start backend
```bash
pm2 start npm --name "aircodes-backend" -- start
```

### Start bot
```bash
pm2 start npm --name "aircodes-bot" -- run start:bot
```

### Save PM2 configuration
```bash
pm2 save
```

### Setup PM2 to start on boot
```bash
pm2 startup
```

**PM2 Management Commands:**
```bash
# View running processes
pm2 list

# View logs
pm2 logs aircodes-backend
pm2 logs aircodes-bot

# Restart services
pm2 restart aircodes-backend
pm2 restart aircodes-bot

# Stop services
pm2 stop aircodes-backend
pm2 stop aircodes-bot

# Delete services
pm2 delete aircodes-backend
pm2 delete aircodes-bot
```
---
### SSL Certificate Setup (Let's Encrypt)

**1. Install Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
```

**2. Obtain SSL certificate:**
```bash
sudo certbot --nginx -d your-domain.com
```

**3. Certbot will automatically:**
- Obtain the certificate
- Update your Nginx configuration
- Set up automatic renewal

**4. Test automatic renewal:**
```bash
sudo certbot renew --dry-run
```

---
## 🎮 Discord Commands

  

### `/balance [user]`

Check your balance or someone else's balance

### `/credit <user> <action> <amount>` (Admin Only)

Add or remove coins from a user

### `/force-aircode` (Admin Only)

Force generate a code outside of schedule hours

  

## 🗄️ Database Management

  

The SQLite database is automatically created at `database/database.db`.

  

**Manual database access:**

```bash

# Install sqlite3 CLI

sudo  apt  install  sqlite3  # Ubuntu/Debian

brew  install  sqlite3  # macOS

  

# Access database

sqlite3  database/database.db

  

# Useful commands

.tables  # List tables

SELECT  *  FROM  users; # View all users

SELECT  *  FROM  codes; # View all codes

UPDATE  users  SET  coins  =  500  WHERE  discord_id  =  'USER_ID';

.quit  # Exit

```

  

**⏰Note: Database permissions**

The application automatically sets proper permissions (`666`) for the database file. If you encounter write errors, manually run:

```bash

chmod  666  database/database.db

```

  

## 🔧 Available Scripts

  

```bash

# Development (localhost only)

npm  run  dev  # Backend + Frontend dev servers

npm  run  dev:server  # Backend only

npm  run  dev:web  # Frontend only (Vite)

npm  run  start:bot  # Production + Dev bot

  

# Production (publicly accessible)

npm  run  build  # Build web interface

npm  start  # Production server

npm  run  start:bot  # Production + Dev bot

```

## 🌐 URL Shortcuts

We've added a Discord invite shortcut to make it easy to create custom invite :)

-  `/discord`

-  `/invite`

-  `/i` 

<small>*If `inviteLink` is empty in config, these URLs show a 404 page.*</small>
 

## 🤝 Contributing

  

Contributions are welcome! and for help you, we make a **Developpement mode** for front-end and back-end!  

**For local development and testing:**

```bash

# Terminal 1: Start backend + frontend

npm  run  dev

  

# Terminal 2: Start Discord bot

npm  run  start:bot

```

  

**Access:**

-  **Frontend**: http://127.0.0.1:5173 (Vite dev server)

-  **Backend API**: http://127.0.0.1:3000 (Express server)

-  **Dev Mode**: http://127.0.0.1:5173/dev/home (bypasses Discord auth)

  

## 📄 License

  

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

  

---

  

**🎉 AirCodes is now ready to use!**

  

<small>👉 For support or questions, please open an [issue](https://github.com/faydonK/AirCodes/issues).
