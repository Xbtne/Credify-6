const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  AttachmentBuilder
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stock')
    .setDescription('Broadcast live inventory and stock status')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((opt) =>
      opt
        .setName('header')
        .setDescription('Custom 1st product header (leave empty to broadcast default live stock)')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('amount')
        .setDescription('Custom 1st product stock quantity (e.g. 10k, 8000, 300)')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('second_header')
        .setDescription('Custom 2nd product header (optional)')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('second_amount')
        .setDescription('Custom 2nd product stock quantity (optional)')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('third_header')
        .setDescription('Custom 3rd product header (optional)')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('third_amount')
        .setDescription('Custom 3rd product stock quantity (optional)')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('price_rate')
        .setDescription('Rate / Price per unit (e.g. $1.50)')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('notes')
        .setDescription('Custom order notes (default: Purchase Ticket to Order)')
        .setRequired(false)
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to post stock update (defaults to current)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    const header1 = interaction.options.getString('header');
    const amount1 = interaction.options.getString('amount');
    const header2 = interaction.options.getString('second_header');
    const amount2 = interaction.options.getString('second_amount');
    const header3 = interaction.options.getString('third_header');
    const amount3 = interaction.options.getString('third_amount');
    const priceRate = interaction.options.getString('price_rate');
    const notes = interaction.options.getString('notes');
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    const bannerPath = path.join(__dirname, '../../../assets/stock_banner.png');
    const files = [];

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle('💎 CREDIFY • LIVE STOCK')
      .setDescription('*Purchase Ticket to Order*\n')
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: `${config.footerText} • Live Inventory Feed` });

    if (fs.existsSync(bannerPath)) {
      const bannerAttachment = new AttachmentBuilder(bannerPath, { name: 'stock_banner.png' });
      embed.setImage('attachment://stock_banner.png');
      files.push(bannerAttachment);
    }

    // Helper for formatting stock badge
    const formatStock = (val) => {
      const lower = val.toLowerCase();
      if (lower.includes('out') || lower === '0' || lower.includes('empty')) {
        return `🔴 ${val}`;
      }
      return `🟢 ${val}`;
    };

    if (header1 && amount1) {
      // Custom user input
      let field1Val = `> 📦 **Current Stock:** ${formatStock(amount1)}`;
      if (priceRate) field1Val += `\n> 💵 **Rate/Price:** \`${priceRate}\``;

      embed.addFields({
        name: `💠 ${header1.toUpperCase()}`,
        value: field1Val,
        inline: false
      });

      if (header2 && amount2) {
        embed.addFields({
          name: `💠 ${header2.toUpperCase()}`,
          value: `> 📦 **Current Stock:** ${formatStock(amount2)}`,
          inline: false
        });
      }

      if (header3 && amount3) {
        embed.addFields({
          name: `💠 ${header3.toUpperCase()}`,
          value: `> 📦 **Current Stock:** ${formatStock(amount3)}`,
          inline: false
        });
      }
    } else {
      // Default exact Credify stock
      embed.addFields(
        {
          name: '💠 EMAILS',
          value: '> 📦 **Current Stock:** 🟢 10k\n> 💵 **Rate/Price:** `$1.50`',
          inline: false
        },
        {
          name: '💠 DISCORD MEMBERS',
          value: '> 📦 **Current Stock:** 🟢 8000',
          inline: false
        },
        {
          name: '💠 DISCORD BOOSTS',
          value: '> 📦 **Current Stock:** 🟢 300',
          inline: false
        }
      );
    }

    if (notes) {
      embed.addFields({
        name: '📌 Additional Information',
        value: notes,
        inline: false
      });
    }

    // Dispatch message to target channel
    await targetChannel.send({ embeds: [embed], files });

    return interaction.reply({
      content: `✅ Stock update successfully posted to ${targetChannel}!`,
      ephemeral: true
    });
  }
};
