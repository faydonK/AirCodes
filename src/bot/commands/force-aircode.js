import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export const forceAircodeCommand = {
  data: new SlashCommandBuilder()
    .setName('force-aircode')
    .setDescription('Force generate a code outside of schedule hours')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, bot) {
    const user = interaction.user;
    console.log(`🎮 Command used: /force-aircode by ${user.username}#${user.discriminator} (${user.id})`);
    console.log(`🔧 Force aircode command executed by ${user.username}#${user.discriminator}`);

    try {
      await interaction.deferReply({ ephemeral: true });

      await bot.generateCode(true);
      
      console.log(`✅ Force aircode successful by ${user.username}`);
      await interaction.editReply({
        content: `✅ Code generated successfully! Check the Discord channel.`
      });
      
    } catch (error) {
      console.error(`❌ Force aircode failed for ${user.username}:`, error);
      
      let msg = `❌ Failed to generate code: ${error.message || error}`;
      if (error.code === "SQLITE_CONSTRAINT") {
        msg += "\n> Database insertion problem: check database configuration.";
      }
      
      await interaction.editReply({
        content: msg
      });
    }
  }
};