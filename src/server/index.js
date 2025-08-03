import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from '../shared/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, '../../config.json');

if (!existsSync(configPath)) {
  console.error('❌ Config file not found! Please copy config.json.example to config.json and configure it.');
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const isDevelopment = process.env.NODE_ENV === 'development';

const app = express();

app.set('trust proxy', 1);

app.use(cors({
  origin: isDevelopment ? 'http://127.0.0.1:5173' : false,
  credentials: true
}));
app.use(express.json());

if (!isDevelopment) {
  app.use(express.static(join(__dirname, '../../dist/public')));
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100 
});
app.use('/api', limiter);

app.use(session({
  secret: config.server.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 48 * 60 * 60 * 1000 } 
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new DiscordStrategy({
  clientID: config.discord.clientId,
  clientSecret: config.discord.clientSecret,
  callbackURL: '/auth/discord/callback',
  scope: ['identify']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await db.getUser(profile.id);
    
    if (!user) {
      user = await db.createUser({
        discordId: profile.id,
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar
      });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.discordId);
});

passport.deserializeUser(async (discordId, done) => {
  try {
    const user = await db.getUser(discordId);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

async function sendDiscordNotification(user, coinsEarned, codeData, coinName) {
  try {
    const { Client, GatewayIntentBits } = await import('discord.js');
    
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
    });

    await client.login(config.discord.token);
    
    const channel = await client.channels.fetch(config.discord.channelId);
    if (channel?.isTextBased()) {
      const message = `[${codeData.usedSlots + 1}/${codeData.maxSlots}] | ${user.username} earned ${coinsEarned} ${coinName}!`;
      
      await channel.send(message);
    }
    
    await client.destroy();
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
  }
}

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', 
  passport.authenticate('discord', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) console.error(err);
    res.redirect('/');
  });
});

app.get('/api/user', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  res.json(req.user);
});

app.get('/api/config', (req, res) => {
  res.json({
    serverName: config.server.name || '',
    coinName: config.coins.name || 'Coins'
  });
});

app.post('/api/redeem', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { code } = req.body;
  const user = req.user;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Invalid code' });
  }

  try {
    const codeData = await db.getCode(code.toUpperCase());
    
    if (!codeData) {
      return res.status(404).json({ error: 'Code not found or expired' });
    }

    if (codeData.usedSlots >= codeData.maxSlots) {
      return res.status(400).json({ error: 'Code is fully redeemed' });
    }

    const min = config.coins.minValue;
    const max = config.coins.maxValue;
    const coinsEarned = Math.round((Math.random() * (max - min) + min) * 100) / 100;

    const redeemed = await db.redeemCode(codeData.id, user.discordId, coinsEarned);
    
    if (!redeemed) {
      return res.status(400).json({ error: 'Code already redeemed by you' });
    }

    await db.updateUserCoins(user.discordId, coinsEarned);
    
    const updatedUser = await db.getUser(user.discordId);
    const coinName = config.coins.name || 'Coins';
    

    sendDiscordNotification(user, coinsEarned, codeData, coinName);
    
    res.json({ 
      success: true, 
      coins: coinsEarned,
      coinName: coinName,
      totalCoins: updatedUser?.coins || 0
    });
  } catch (error) {
    console.error('Redeem error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

if (config.discord.inviteLink && config.discord.inviteLink.trim() !== '') {
  app.get('/discord', (req, res) => res.redirect(config.discord.inviteLink));
  app.get('/invite', (req, res) => res.redirect(config.discord.inviteLink));
  app.get('/i', (req, res) => res.redirect(config.discord.inviteLink));
} else {
  app.get(['/discord', '/invite', '/i'], (req, res) => {
    if (!isDevelopment) {
      res.redirect('/404');
    } else {
      res.status(404).json({ error: 'Discord invite link not configured' });
    }
  });
}

// Rate limiter for catch-all route serving index.html
const catchAllLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.get('*', catchAllLimiter, (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  if (!isDevelopment) {
    res.sendFile(join(__dirname, '../../dist/public/index.html'));
  } else {
    res.status(404).json({ error: 'Route not found - use Vite dev server for frontend' });
  }
});

const host = isDevelopment ? '127.0.0.1' : '0.0.0.0';
const port = 3000;

app.listen(port, host, () => {
  if (isDevelopment) {
    console.log(`🔧 DEV SERVER: http://${host}:${port} (API only)`);
    console.log(`🌐 FRONTEND: http://127.0.0.1:5173 (Vite dev server)`);
    console.log('🔒 Development mode: Servers bound to localhost only');
  } else {
    console.log('🌐 Ready for public access');
  }
});