import { Client, GatewayIntentBits } from 'discord.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from '../shared/database.js';
import { creditCommand } from './commands/credit.js';
import { forceAircodeCommand } from './commands/force-aircode.js';
import { balanceCommand } from './commands/balance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, '../../config.json');
let config;

try {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('❌ Config file not found! Please copy config.json.example to config.json and configure it.');
  process.exit(1);
}

class AirCodesBot {
  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
    });

    this.channel = null;
    this.scheduleTimeout = null;
    this.todayCodeGenerated = false;
    this.commands = new Map();
    this.sevenAMTimeout = null;
    this.nextScheduledTime = null; 

    this.setupCommands();
    this.setupEvents();
  }

  setupCommands() {
    this.commands.set('credit', creditCommand);
    this.commands.set('force-aircode', forceAircodeCommand);
    this.commands.set('balance', balanceCommand);
  }

  setupEvents() {
    this.client.once('ready', () => {
      console.log(`✅ Bot ready! Logged in as ${this.client.user.tag}`);
      this.registerCommands();
      this.setupChannel();
      this.checkTodayCode();
      this.scheduleNextCode();
      this.startCodeCleanup();
      this.schedule7AMCleanup();
    });

    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const user = interaction.user;
      const command = interaction.commandName;
      console.log(`🎮 Command used: /${command} by ${user.username}#${user.discriminator} (${user.id})`);

      if (config.discord.serverId && interaction.guildId !== config.discord.serverId) {
        console.log(`🚫 Security: Command /${command} blocked - wrong server (${interaction.guildId} != ${config.discord.serverId})`);
        await interaction.reply({ 
          content: '❌ This bot can only be used in the authorized server.', 
          ephemeral: true
        });
        return;
      }

      const adminCommands = ['credit', 'force-aircode'];
      if (adminCommands.includes(command) && !interaction.member.permissions.has('Administrator')) {
        console.log(`❌ Access denied: ${user.username} lacks admin permissions for /${command}`);
        await interaction.reply({ 
          content: '❌ You need administrator permissions to use this command.', 
          ephemeral: true
        });
        return;
      }

      const commandHandler = this.commands.get(interaction.commandName);
      if (commandHandler) {
        try {
          await commandHandler.execute(interaction, this);
        } catch (error) {
          console.error(`❌ Command /${command} failed for ${user.username}:`, error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
              content: '❌ An error occurred while executing the command.', 
              ephemeral: true
            });
          }
        }
      }
    });
  }

  async registerCommands() {
    try {
      console.log('🔄 Refreshing application (/) commands...');
      const commandData = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());
      await this.client.application.commands.set(commandData);
    } catch (error) {
      console.error('Failed to reload commands:', error);
    }
  }

  async setupChannel() {
    try {
      const channel = await this.client.channels.fetch(config.discord.channelId);
      if (channel?.isTextBased()) {
        this.channel = channel;
        console.log(`📢 Connected to channel: ${this.channel.name}`);
      }
    } catch (error) {
      console.error('Failed to setup channel:', error);
    }
  }

  generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < config.codes.codeLength; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateCoinValue() {
    const min = config.coins.minValue;
    const max = config.coins.maxValue;
    const value = Math.random() * (max - min) + min;
    return Math.round(value * 100) / 100;
  }

  isWithinScheduleHours() {
    const now = new Date();
    const currentHour = now.getHours();
    const { start, end } = config.codes.scheduleHours;
    return currentHour >= start && currentHour < end;
  }

  async checkTodayCode() {
    const today = new Date().toDateString();
    const todayCode = await db.getTodayCode(today);
    
    if (todayCode) {
      this.todayCodeGenerated = true;
      console.log(`📋 Today's code already generated: ${todayCode.code}`);
    }

    const lastGenerationDate = await db.getBotState('last_generation_date');
    const todayString = new Date().toDateString();
    
    if (lastGenerationDate === todayString) {
      this.todayCodeGenerated = true;
      console.log(`🔄 Bot restarted - code already generated today, waiting for tomorrow`);
    }

    const storedNextTime = await db.getBotState('next_scheduled_time');
    if (storedNextTime) {
      const nextTime = new Date(storedNextTime);
      const now = new Date();
      
      if (nextTime > now) {
        this.nextScheduledTime = nextTime;
        console.log(`🔄 Restored scheduled time from database: ${nextTime.toLocaleString()}`);
      }
    }
  }

  getNextScheduledTime() {
    if (this.nextScheduledTime && this.nextScheduledTime > new Date()) {
      return this.nextScheduledTime;
    }

    const now = new Date();
    const { start, end } = config.codes.scheduleHours;

    if (this.todayCodeGenerated) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const randomHour = Math.floor(Math.random() * (end - start)) + start;
      const randomMinute = Math.floor(Math.random() * 60);
      const randomSecond = Math.floor(Math.random() * 60);
      tomorrow.setHours(randomHour, randomMinute, randomSecond, 0);
      this.nextScheduledTime = tomorrow;
      return tomorrow;
    }

    if (this.isWithinScheduleHours()) {
      const randomDelay = Math.floor(Math.random() * (4 * 60 * 1000)) + 60 * 1000;
      const nextTime = new Date(now.getTime() + randomDelay);
      console.log(`⏰ Within schedule hours, scheduling soon: ${nextTime.toLocaleString()}`);
      this.nextScheduledTime = nextTime;
      return nextTime;
    }

    const next = new Date(now);
    if (now.getHours() >= end) next.setDate(now.getDate() + 1);
    const randomHour = Math.floor(Math.random() * (end - start)) + start;
    const randomMinute = Math.floor(Math.random() * 60);
    const randomSecond = Math.floor(Math.random() * 60);
    next.setHours(randomHour, randomMinute, randomSecond, 0);
    console.log(`⏰ Outside schedule hours, scheduling for: ${next.toLocaleString()}`);
    this.nextScheduledTime = next;
    return next;
  }

  async generateCode(forced = false) {
    if (!this.channel) {
      console.log('❌ No channel configured for code generation');
      throw new Error('No channel configured for code generation');
    }

    if (!forced && (!this.isWithinScheduleHours() || this.todayCodeGenerated)) {
      if (this.todayCodeGenerated) {
        console.log('⏰ Today\'s code already generated, skipping');
      } else {
        console.log(`⏰ Outside schedule hours (${config.codes.scheduleHours.start}h-${config.codes.scheduleHours.end}h), skipping code generation`);
      }
      this.scheduleNextCode();
      return;
    }

    const code = this.generateRandomCode();
    const today = new Date().toDateString();

    try {
      if (forced) {
        await db.deactivateOldCodes();
        console.log('🗑️ Old codes deactivated for force generation');
      } else {
        await db.deactivateOldCodes();
      }

      await db.createCode({
        id: Date.now().toString(),
        code,
        maxSlots: config.codes.maxSlots,
        dateCreated: today
      });

      await db.setBotState('last_generation_date', today);

      let mentionText = '@everyone';
      if (config.discord.mentionRoleId && config.discord.mentionRoleId.trim()) {
        mentionText = `<@&${config.discord.mentionRoleId}>`;
      }

      const embed = {
        title: 'A new code is available!',
        url: config.discord.redeemUrl,
        description: `The new code is \`${code}\``,
        color: 0x5865F2,
        footer: { 
          text: `AirCodes by faydonK • ${new Date().toLocaleString('en-US', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`
        }
      };

      await this.channel.send({ content: mentionText, embeds: [embed] });

      if (forced) {
        console.log(`📋 FORCED code generated.`);
        
        if (!this.todayCodeGenerated) {
          this.todayCodeGenerated = true;
        }
        
        if (this.scheduleTimeout) {
          clearTimeout(this.scheduleTimeout);
        }
        
        const now = new Date();
        if (this.nextScheduledTime && this.nextScheduledTime.toDateString() === now.toDateString()) {
          console.log('🔄 Force generation cancelled today\'s timer, rescheduling for tomorrow');
          this.nextScheduledTime = null; 
          this.scheduleNextCode();
        }
      } else {
        console.log(`📋 Code generated: ${code}`);
        this.todayCodeGenerated = true;
        this.scheduleNextCode();
      }

    } catch (error) {
      console.error('Failed to generate code:', error);
      throw error;
    }
  }

  async scheduleNextCode() {
    if (this.scheduleTimeout) {
      clearTimeout(this.scheduleTimeout);
    }

    const nextTime = this.getNextScheduledTime();
    const delay = nextTime.getTime() - Date.now();

    await db.setBotState('next_scheduled_time', nextTime.toISOString());

    console.log(`⏰ Next code scheduled for: ${nextTime.toLocaleString()} (in ${Math.round(delay / 1000 / 60)} minutes)`);

    this.scheduleTimeout = setTimeout(async () => {
      this.todayCodeGenerated = false;
      this.nextScheduledTime = null; 
      if (this.isWithinScheduleHours()) {
        await this.generateCode();
      } else {
        console.log('⏱️ Skipped generation: outside of schedule hours');
        this.scheduleNextCode();
      }
    }, delay);
  }

  schedule7AMCleanup() {
    const now = new Date();
    const next7AM = new Date();
    
    next7AM.setHours(7, 0, 0, 0);
    
    if (now.getHours() >= 7) {
      next7AM.setDate(next7AM.getDate() + 1);
    }
    
    const delay = next7AM.getTime() - now.getTime();
    console.log(`🕰️ Next 7 AM cleanup scheduled for: ${next7AM.toLocaleString()}`);
    
    this.sevenAMTimeout = setTimeout(async () => {
      console.log('🕰️ Running 7 AM cleanup - deactivating unused codes');
      try {
        await db.deactivateUnusedCodesAt7AM();
      } catch (error) {
        console.error('7 AM cleanup error:', error);
      }
      
      this.schedule7AMCleanup();
    }, delay);
  }

  startCodeCleanup() {
    setInterval(async () => {
      try {
        await db.deactivateOldCodes();
      } catch (error) {
        console.error('Code cleanup error:', error);
      }
    }, 60 * 60 * 1000);
  }

  async start() {
    try {
      await this.client.login(config.discord.token);
    } catch (error) {
      console.error('Failed to start bot:', error);
    }
  }
}

const bot = new AirCodesBot();
bot.start();

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  db.close();
  process.exit(0);
});