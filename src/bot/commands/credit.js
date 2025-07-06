import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../shared/database.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const config = JSON.parse(readFileSync(join(__dirname, '../../../config.json'), 'utf8'));

export const creditCommand = {
  data: new SlashCommandBuilder()
    .setName('credit')
    .setDescription('Add or remove coins from a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to modify coins for')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Action to perform')
        .setRequired(true)
        .addChoices(
          { name: 'Add coins', value: 'add' },
          { name: 'Remove coins', value: 'remove' }
        ))
    .addNumberOption(option =>
      option.setName('amount')
        .setDescription('Amount of coins')
        .setRequired(true)
        .setMinValue(0.01))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const action = interaction.options.getString('action');
    const amount = interaction.options.getNumber('amount');

    console.log(`🎮 Command used: /credit by ${interaction.user.username}#${interaction.user.discriminator} (${interaction.user.id})`);
    console.log(`💰 Credit command: ${action} ${amount} coins ${action === 'add' ? 'to' : 'from'} ${targetUser.username} by ${interaction.user.username}`);

    try {
      await interaction.deferReply({ ephemeral: true });

      let user = await db.getUser(targetUser.id);
      
      if (!user) {
        user = await db.createUser({
          discordId: targetUser.id,
          username: targetUser.username,
          discriminator: targetUser.discriminator,
          avatar: targetUser.avatar
        });
        console.log(`👤 Created new user: ${targetUser.username}#${targetUser.discriminator}`);
      }

      let finalAmount;
      let newBalance;

      if (action === 'add') {
        finalAmount = amount;
        newBalance = user.coins + amount;
      } else {
        if (user.coins < amount) {
          finalAmount = -user.coins; 
          newBalance = 0;
          console.log(`💰 Credit: ${targetUser.username} had ${user.coins} coins, tried to remove ${amount}, setting to 0`);
        } else {
          finalAmount = -amount;
          newBalance = user.coins - amount;
        }
      }

      await db.updateUserCoins(targetUser.id, finalAmount);
      
      const coinName = config.coins.name || 'Coins';
      const actionText = action === 'add' ? 'added' : 'removed';
      const preposition = action === 'add' ? 'to' : 'from';
      const actualAmount = action === 'remove' && user.coins < amount ? user.coins : amount;

      console.log(`✅ Credit successful: ${targetUser.username} now has ${newBalance} ${coinName}`);

      await interaction.editReply({
        content: `✅ Successfully ${actionText} ${actualAmount.toLocaleString()} ${coinName} ${preposition} ${targetUser.username}.\nNew balance: ${newBalance.toLocaleString()} ${coinName}`
      });

    } catch (error) {
      console.error(`❌ Credit command failed for ${interaction.user.username}:`, error);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: '❌ Failed to update user coins.' 
        });
      } else {
        await interaction.reply({ 
          content: '❌ Failed to update user coins.', 
          ephemeral: true
        });
      }
    }
  }
};