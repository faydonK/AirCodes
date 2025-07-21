import { SlashCommandBuilder } from 'discord.js';
import { db } from '../../shared/database.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const config = JSON.parse(readFileSync(join(__dirname, '../../../config.json'), 'utf8'));

export const balanceCommand = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your balance or someone else\'s balance')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check balance for (optional)')
        .setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const requestingUser = interaction.user;

    console.log(`🎮 Command used: /balance by ${requestingUser.username}#${requestingUser.discriminator} (${requestingUser.id})`);
    
    if (targetUser.id !== requestingUser.id) {
      console.log(`💰 Balance check: ${requestingUser.username} checking ${targetUser.username}'s balance`);
    }

    try {
      await interaction.deferReply();

      let user = await db.getUser(targetUser.id);
      
      if (!user) {
        user = await db.createUser({
          discordId: targetUser.id,
          username: targetUser.username,
          discriminator: targetUser.discriminator,
          avatar: targetUser.avatar
        });
        console.log(`👤 Created new user for balance check: ${targetUser.username}#${targetUser.discriminator}`);
      }

      const coinName = config.coins.name || 'Coins';
      const message = `💰 ${targetUser.username}'s balance: ${user.coins.toLocaleString()} ${coinName}`;

      console.log(`✅ Balance displayed: ${targetUser.username} has ${user.coins} ${coinName}`);

      await interaction.editReply({ content: message });

    } catch (error) {
      console.error(`❌ Balance command failed for ${requestingUser.username}:`, error);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: '❌ Failed to retrieve balance information.' 
        });
      } else {
        await interaction.reply({ 
          content: '❌ Failed to retrieve balance information.', 
          ephemeral: true
        });
      }
    }
  }
};