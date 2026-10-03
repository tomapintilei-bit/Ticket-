require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/* =========================================================
   ZEYO BLACK LABEL
   Premium Ticket Infrastructure
   ========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

/* =========================================================
   CONFIG
   ========================================================= */

const CONFIG = {
  BRAND: "ZEYO",
  VERSION: "BLACK LABEL",

  PANEL_CHANNEL_ID: "1548913513307570216",
  TICKET_CATEGORY_ID: "1548756953461825537",
  STAFF_ROLE_ID: "1548756951536504899",
  LOG_CHANNEL_ID: "1548756954200154202",

  COLOR: 0x5865f2,
  SUCCESS: 0x57f287,
  DANGER: 0xed4245,
  WARNING: 0xfee75c,
  DARK: 0x111318
};

/* =========================================================
   CUSTOM EMOJIS
   ========================================================= */

const EMOJI = {
  claim: "<:claim:1548910499226452068>",
  giveaway: "<:giveaway2:1548910503751843870>",
  report: "<:report:1548910497888210985>",
  support: "<:unionsupport:1548910500413313067>",
  add: "<:vqvreactionroles:1548912373547663473>",
  remove: "<:uncheckmark:1548912374822477884>",
  ticket: "<:ticket:1548910446986141726>",
  id: "<:snlink:1548912376177496144>",
  issue: "<:issue:1548912378198888538>"
};

/* =========================================================
   DATA
   ========================================================= */

const DATA_FILE = path.join(__dirname, "zeyo-data.json");

let database = {
  nextTicketNumber: 1,
  tickets: {}
};

function loadDatabase() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      database = JSON.parse(raw);
    }
  } catch (error) {
    console.error("ZEYO DATABASE LOAD ERROR:", error);
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(database, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("ZEYO DATABASE SAVE ERROR:", error);
  }
}

loadDatabase();

/* =========================================================
   UTILITIES
   ========================================================= */

function pad(number, length = 4) {
  return String(number).padStart(length, "0");
}

function generateTicketId() {
  const id = database.nextTicketNumber++;
  saveDatabase();

  return `ZEYO-${pad(id)}`;
}

function escapeHTML(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function truncate(text, max = 1000) {
  if (!text) return "";
  return text.length > max
    ? text.substring(0, max - 3) + "..."
    : text;
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(date);
}

function isStaff(member) {
  if (!member) return false;

  return (
    member.roles.cache.has(CONFIG.STAFF_ROLE_ID) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator)
  );
}

function getTicket(channelId) {
  return database.tickets[channelId] || null;
}

/* =========================================================
   AUDIT LOG
   ========================================================= */

async function sendLog(guild, title, description, color = CONFIG.COLOR) {
  try {
    const channel = guild.channels.cache.get(CONFIG.LOG_CHANNEL_ID);

    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: `${CONFIG.BRAND} • SECURITY LOG`
      })
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();

    await channel.send({
      embeds: [embed]
    });
  } catch (error) {
    console.error("LOG ERROR:", error);
  }
}

/* =========================================================
   PANEL
   ========================================================= */

function createPanelEmbed() {
  return new EmbedBuilder()
    .setColor(CONFIG.COLOR)
    .setAuthor({
      name: `${CONFIG.BRAND} • SUPPORT EXPERIENCE`
    })
    .setTitle("How can we assist you?")
    .setDescription(
      [
        "Welcome to **ZEYO Support**.",
        "",
        "Select the department that best matches your request.",
        "A private support session will be created automatically.",
        "",
        "```PRIVATE • FAST • SECURE```"
      ].join("\n")
    )
    .addFields(
      {
        name: "PURCHASE",
        value: "Questions about products, services or orders.",
        inline: true
      },
      {
        name: "PAYMENT",
        value: "Payment, billing or transaction assistance.",
        inline: true
      },
      {
        name: "SUPPORT",
        value: "General assistance and technical support.",
        inline: true
      },
      {
        name: "GIVEAWAY",
        value: "Giveaway-related questions or issues.",
        inline: true
      },
      {
        name: "REPORT USER",
        value: "Report a user or problematic activity.",
        inline: true
      }
    )
    .setFooter({
      text: `${CONFIG.BRAND} • Premium Support Infrastructure`
    })
    .setTimestamp();
}

function createPanelComponents() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_purchase")
      .setLabel("Purchase")
      .setEmoji(EMOJI.ticket)
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("ticket_payment")
      .setLabel("Payment")
      .setEmoji(EMOJI.id)
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("ticket_support")
      .setLabel("Support")
      .setEmoji(EMOJI.support)
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_giveaway")
      .setLabel("Giveaway")
      .setEmoji(EMOJI.giveaway)
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("ticket_report")
      .setLabel("Report User")
      .setEmoji(EMOJI.report)
      .setStyle(ButtonStyle.Danger)
  );

  return [row1, row2];
}

/* =========================================================
   TICKET EMBED
   ========================================================= */

function createTicketEmbed(ticket, user) {
  const staffText = ticket.claimedBy
    ? `<@${ticket.claimedBy}>`
    : "Unclaimed";

  const status = ticket.locked
    ? "🔒 LOCKED"
    : "🟢 OPEN";

  return new EmbedBuilder()
    .setColor(ticket.locked ? CONFIG.WARNING : CONFIG.COLOR)
    .setAuthor({
      name: `${CONFIG.BRAND} • SUPPORT DEPARTMENT`
    })
    .setTitle(`${EMOJI.ticket} ${ticket.id}`)
    .setDescription(
      [
        "### PRIVATE SUPPORT SESSION",
        "",
        "Welcome to your private ZEYO support ticket.",
        "Please describe your issue clearly and wait for a staff member.",
        "",
        "━━━━━━━━━━━━━━━━━━━━"
      ].join("\n")
    )
    .addFields(
      {
        name: `${EMOJI.id} CUSTOMER`,
        value: `<@${user.id}>`,
        inline: true
      },
      {
        name: "CATEGORY",
        value: ticket.categoryLabel,
        inline: true
      },
      {
        name: "STATUS",
        value: status,
        inline: true
      },
      {
        name: "STAFF",
        value: staffText,
        inline: true
      },
      {
        name: "CREATED",
        value: ticket.createdAt,
        inline: true
      },
      {
        name: "TICKET ID",
        value: `\`${ticket.id}\``,
        inline: true
      }
    )
    .setFooter({
      text: `${CONFIG.BRAND} • Private Support`
    })
    .setTimestamp();
}

/* =========================================================
   TICKET BUTTONS
   ========================================================= */

function createTicketButtons(ticket) {
  const claimButton = new ButtonBuilder()
    .setCustomId("ticket_claim")
    .setLabel(ticket.claimedBy ? "Unclaim" : "Claim")
    .setEmoji(EMOJI.claim)
    .setStyle(ticket.claimedBy ? ButtonStyle.Secondary : ButtonStyle.Success);

  const lockButton = new ButtonBuilder()
    .setCustomId("ticket_lock")
    .setLabel(ticket.locked ? "Unlock" : "Lock")
    .setStyle(ticket.locked ? ButtonStyle.Success : ButtonStyle.Secondary);

  const closeButton = new ButtonBuilder()
    .setCustomId("ticket_close")
    .setLabel("Close")
    .setStyle(ButtonStyle.Danger);

  const management = new StringSelectMenuBuilder()
    .setCustomId("ticket_management")
    .setPlaceholder("Management")
    .addOptions([
      {
        label: "Add User",
        description: "Add a member to this ticket",
        value: "add_user",
        emoji: EMOJI.add
      },
      {
        label: "Remove User",
        description: "Remove a member from this ticket",
        value: "remove_user",
        emoji: EMOJI.remove
      },
      {
        label: "Transfer Staff",
        description: "Transfer ticket ownership",
        value: "transfer_staff"
      },
      {
        label: "Rename Ticket",
        description: "Change the ticket name",
        value: "rename_ticket"
      },
      {
        label: "Generate Transcript",
        description: "Create an HTML transcript",
        value: "transcript"
      }
    ]);

  return [
    new ActionRowBuilder().addComponents(
      claimButton,
      lockButton,
      closeButton
    ),
    new ActionRowBuilder().addComponents(management)
  ];
}

/* =========================================================
   CATEGORY DATA
   ========================================================= */

const CATEGORIES = {
  purchase: {
    label: "Purchase",
    emoji: EMOJI.ticket
  },

  payment: {
    label: "Payment",
    emoji: EMOJI.id
  },

  support: {
    label: "Support",
    emoji: EMOJI.support
  },

  giveaway: {
    label: "Giveaway",
    emoji: EMOJI.giveaway
  },

  report: {
    label: "Report User",
    emoji: EMOJI.report
  }
};

/* =========================================================
   FIND USER OPEN TICKET
   ========================================================= */

function findUserTicket(guildId, userId) {
  return Object.entries(database.tickets).find(
    ([, ticket]) =>
      ticket.guildId === guildId &&
      ticket.userId === userId &&
      !ticket.closed
  );
}

/* =========================================================
   CREATE TICKET
   ========================================================= */

async function createTicket(interaction, categoryKey) {
  const guild = interaction.guild;
  const user = interaction.user;

  const category = CATEGORIES[categoryKey];

  if (!category) {
    return interaction.reply({
      content: "❌ Invalid ticket category.",
      ephemeral: true
    });
  }

  const existing = findUserTicket(guild.id, user.id);

  if (existing) {
    const existingChannel = guild.channels.cache.get(existing[0]);

    return interaction.reply({
      content: `❌ Ai deja un ticket deschis: ${existingChannel || existing[1].id}`,
      ephemeral: true
    });
  }

  const ticketId = generateTicketId();

  const safeName = user.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12) || "user";

  let channel;

  try {
    channel = await guild.channels.create({
      name: `ticket-${safeName}`,
      type: ChannelType.GuildText,
      parent: CONFIG.TICKET_CATEGORY_ID,
      topic: `${CONFIG.BRAND} • ${ticketId} • ${category.label}`,

      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [
            PermissionsBitField.Flags.ViewChannel
          ]
        },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks
          ]
        },
        {
          id: CONFIG.STAFF_ROLE_ID,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.ManageMessages
          ]
        },
        {
          id: guild.members.me.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.ManageMessages
          ]
        }
      ]
    });

    database.tickets[channel.id] = {
      id: ticketId,
      guildId: guild.id,
      channelId: channel.id,
      userId: user.id,
      category: categoryKey,
      categoryLabel: category.label,
      claimedBy: null,
      locked: false,
      closed: false,
      createdAt: formatDate()
    };

    saveDatabase();

    await channel.send({
      content: `<@${user.id}> <@&${CONFIG.STAFF_ROLE_ID}>`,
      embeds: [
        createTicketEmbed(
          database.tickets[channel.id],
          user
        )
      ],
      components: createTicketButtons(
        database.tickets[channel.id]
      )
    });

    await sendLog(
      guild,
      "Ticket Created",
      [
        `**Ticket:** \`${ticketId}\``,
        `**User:** <@${user.id}>`,
        `**Category:** ${category.label}`,
        `**Channel:** ${channel}`
      ].join("\n"),
      CONFIG.SUCCESS
    );

    await interaction.reply({
      content: `✅ Ticket creat cu succes: ${channel}`,
      ephemeral: true
    });

  } catch (error) {
    console.error("CREATE TICKET ERROR:", error);

    if (channel) {
      try {
        await channel.delete();
      } catch {}
    }

    delete database.tickets[channel?.id];
    saveDatabase();

    await interaction.reply({
      content:
        "❌ Nu am putut crea ticketul. Verifică permisiunile botului.",
      ephemeral: true
    });
  }
}

/* =========================================================
   CLAIM / UNCLAIM
   ========================================================= */

async function handleClaim(interaction) {
  const ticket = getTicket(interaction.channel.id);

  if (!ticket) {
    return interaction.reply({
      content: "❌ Acesta nu este un ticket ZEYO.",
      ephemeral: true
    });
  }

  if (!isStaff(interaction.member)) {
    return interaction.reply({
      content: "❌ Nu ai permisiunea să revendici ticketul.",
      ephemeral: true
    });
  }

  if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id) {
    return interaction.reply({
      content: `❌ Ticketul este deja preluat de <@${ticket.claimedBy}>.`,
      ephemeral: true
    });
  }

  ticket.claimedBy = ticket.claimedBy
    ? null
    : interaction.user.id;

  saveDatabase();

  await interaction.message.edit({
    embeds: [
      createTicketEmbed(ticket, await interaction.client.users.fetch(ticket.userId))
    ],
    components: createTicketButtons(ticket)
  });

  await sendLog(
    interaction.guild,
    ticket.claimedBy ? "Ticket Claimed" : "Ticket Unclaimed",
    `**Ticket:** \`${ticket.id}\`\n**Staff:** <@${interaction.user.id}>`,
    ticket.claimedBy ? CONFIG.SUCCESS : CONFIG.WARNING
  );

  return interaction.reply({
    content: ticket.claimedBy
      ? "✅ Ticket revendicat."
      : "✅ Ticket eliberat.",
    ephemeral: true
  });
}

/* =========================================================
   LOCK / UNLOCK
   ========================================================= */

async function handleLock(interaction) {
  const ticket = getTicket(interaction.channel.id);

  if (!ticket) {
    return interaction.reply({
      content: "❌ Ticket invalid.",
      ephemeral: true
    });
  }

  if (!isStaff(interaction.member)) {
    return interaction.reply({
      content: "❌ Nu ai permisiunea necesară.",
      ephemeral: true
    });
  }

  ticket.locked = !ticket.locked;

  try {
    await interaction.channel.permissionOverwrites.edit(
      ticket.userId,
      {
        SendMessages: !ticket.locked
      }
    );

    saveDatabase();

    await interaction.message.edit({
      embeds: [
        createTicketEmbed(
          ticket,
          await client.users.fetch(ticket.userId)
        )
      ],
      components: createTicketButtons(ticket)
    });

    await sendLog(
      interaction.guild,
      ticket.locked ? "Ticket Locked" : "Ticket Unlocked",
      `**Ticket:** \`${ticket.id}\`\n**Staff:** <@${interaction.user.id}>`,
      ticket.locked ? CONFIG.WARNING : CONFIG.SUCCESS
    );

    return interaction.reply({
      content: ticket.locked
        ? "🔒 Ticket blocat."
        : "🔓 Ticket deblocat.",
      ephemeral: true
    });

  } catch (error) {
    console.error(error);

    return interaction.reply({
      content: "❌ Nu am putut modifica permisiunile ticketului.",
      ephemeral: true
    });
  }
}

/* =========================================================
   MODALS
   ========================================================= */

function addUserModal() {
  return new ModalBuilder()
    .setCustomId("modal_add_user")
    .setTitle("ZEYO • Add User")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("user_id")
          .setLabel("Discord User ID")
          .setPlaceholder("123456789012345678")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(17)
          .setMaxLength(20)
      )
    );
}

function removeUserModal() {
  return new ModalBuilder()
    .setCustomId("modal_remove_user")
    .setTitle("ZEYO • Remove User")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("user_id")
          .setLabel("Discord User ID")
          .setPlaceholder("123456789012345678")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(17)
          .setMaxLength(20)
      )
    );
}

function transferStaffModal() {
  return new ModalBuilder()
    .setCustomId("modal_transfer_staff")
    .setTitle("ZEYO • Transfer Staff")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("staff_id")
          .setLabel("Staff User ID")
          .setPlaceholder("Discord User ID")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function renameTicketModal() {
  return new ModalBuilder()
    .setCustomId("modal_rename_ticket")
    .setTitle("ZEYO • Rename Ticket")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("name")
          .setLabel("New ticket name")
          .setPlaceholder("billing-help")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(40)
      )
    );
}

/* =========================================================
   TRANSCRIPT
   ========================================================= */

async function generateTranscript(channel, ticket) {
  const messages = [];
  let lastId;

  while (true) {
    const batch = await channel.messages.fetch({
      limit: 100,
      before: lastId
    });

    if (!batch.size) break;

    messages.push(...batch.values());

    lastId = batch.last().id;

    if (batch.size < 100) break;

    if (messages.length >= 1000) break;
  }

  messages.reverse();

  const rows = messages.map((message) => {
    const avatar = message.author.displayAvatarURL({
      extension: "png",
      size: 64
    });

    const content = escapeHTML(
      message.content || "[Attachment / Embed / Empty message]"
    );

    return `
      <div class="message">
        <img src="${avatar}" class="avatar">
        <div>
          <div class="meta">
            <strong>${escapeHTML(message.author.tag)}</strong>
            <span>${escapeHTML(message.createdAt.toLocaleString("ro-RO"))}</span>
          </div>
          <div class="content">${content}</div>
        </div>
      </div>
    `;
  }).join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHTML(ticket.id)} • ZEYO Transcript</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #0b0d10;
  color: #f2f3f5;
  font-family: Arial, Helvetica, sans-serif;
}

.header {
  padding: 40px;
  background: linear-gradient(135deg,#171a21,#0b0d10);
  border-bottom: 1px solid #292d35;
}

.logo {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 4px;
}

.subtitle {
  color: #8f96a3;
  margin-top: 8px;
}

.container {
  max-width: 1000px;
  margin: 30px auto;
  padding: 0 20px;
}

.card {
  background: #11141a;
  border: 1px solid #292d35;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
}

.message {
  display: flex;
  gap: 14px;
  padding: 16px 0;
  border-bottom: 1px solid #20242b;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
}

.meta {
  display: flex;
  gap: 10px;
  align-items: center;
}

.meta span {
  color: #777f8d;
  font-size: 12px;
}

.content {
  margin-top: 6px;
  white-space: pre-wrap;
  color: #d7dae0;
}

.footer {
  text-align: center;
  color: #626977;
  padding: 40px;
}
</style>
</head>

<body>

<div class="header">
  <div class="logo">ZEYO</div>
  <div class="subtitle">BLACK LABEL • SUPPORT TRANSCRIPT</div>
</div>

<div class="container">

  <div class="card">
    <h2>${escapeHTML(ticket.id)}</h2>
    <p><b>Category:</b> ${escapeHTML(ticket.categoryLabel)}</p>
    <p><b>Customer:</b> ${escapeHTML(ticket.userId)}</p>
    <p><b>Created:</b> ${escapeHTML(ticket.createdAt)}</p>
  </div>

  <div class="card">
    ${rows}
  </div>

</div>

<div class="footer">
  ${CONFIG.BRAND} • Premium Support Infrastructure
</div>

</body>
</html>
`;

  return Buffer.from(html, "utf8");
}

/* =========================================================
   CLOSE TICKET
   ========================================================= */

async function closeTicket(interaction) {
  const ticket = getTicket(interaction.channel.id);

  if (!ticket) {
    return interaction.reply({
      content: "❌ Ticket invalid.",
      ephemeral: true
    });
  }

  if (!isStaff(interaction.member)) {
    return interaction.reply({
      content: "❌ Doar staff-ul poate închide ticketul.",
      ephemeral: true
    });
  }

  await interaction.reply({
    content: "⏳ Se generează transcriptul...",
    ephemeral: true
  });

  try {
    const transcript = await generateTranscript(
      interaction.channel,
      ticket
    );

    const attachment = new AttachmentBuilder(transcript, {
      name: `${ticket.id}-transcript.html`
    });

    const logChannel = interaction.guild.channels.cache.get(
      CONFIG.LOG_CHANNEL_ID
    );

    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor(CONFIG.DANGER)
        .setAuthor({
          name: `${CONFIG.BRAND} • TICKET CLOSED`
        })
        .setTitle(ticket.id)
        .addFields(
          {
            name: "Customer",
            value: `<@${ticket.userId}>`,
            inline: true
          },
          {
            name: "Closed By",
            value: `<@${interaction.user.id}>`,
            inline: true
          },
          {
            name: "Category",
            value: ticket.categoryLabel,
            inline: true
          }
        )
        .setTimestamp();

      await logChannel.send({
        embeds: [embed],
        files: [attachment]
      });
    }

    ticket.closed = true;
    ticket.closedAt = formatDate();
    ticket.closedBy = interaction.user.id;

    saveDatabase();

    await sendLog(
      interaction.guild,
      "Ticket Archived",
      `**Ticket:** \`${ticket.id}\`\n**Closed by:** <@${interaction.user.id}>`,
      CONFIG.DANGER
    );

    setTimeout(async () => {
      try {
        await interaction.channel.delete(
          `ZEYO ticket closed by ${interaction.user.tag}`
        );
      } catch (error) {
        console.error("DELETE TICKET ERROR:", error);
      }
    }, 1500);

  } catch (error) {
    console.error("CLOSE ERROR:", error);

    return interaction.editReply({
      content: "❌ Eroare la generarea transcriptului."
    });
  }
}

/* =========================================================
   MANAGEMENT
   ========================================================= */

async function handleManagement(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({
      content: "❌ Staff only.",
      ephemeral: true
    });
  }

  const value = interaction.values[0];

  if (value === "add_user") {
    return interaction.showModal(addUserModal());
  }

  if (value === "remove_user") {
    return interaction.showModal(removeUserModal());
  }

  if (value === "transfer_staff") {
    return interaction.showModal(transferStaffModal());
  }

  if (value === "rename_ticket") {
    return interaction.showModal(renameTicketModal());
  }

  if (value === "transcript") {
    const ticket = getTicket(interaction.channel.id);

    if (!ticket) {
      return interaction.reply({
        content: "❌ Ticket invalid.",
        ephemeral: true
      });
    }

    await interaction.deferReply({
      ephemeral: true
    });

    try {
      const buffer = await generateTranscript(
        interaction.channel,
        ticket
      );

      const attachment = new AttachmentBuilder(buffer, {
        name: `${ticket.id}-transcript.html`
      });

      return interaction.editReply({
        content: "✅ Transcript generated.",
        files: [attachment]
      });
    } catch (error) {
      console.error(error);

      return interaction.editReply({
        content: "❌ Nu am putut genera transcriptul."
      });
    }
  }
}

/* =========================================================
   MODAL SUBMISSIONS
   ========================================================= */

async function handleModal(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({
      content: "❌ Staff only.",
      ephemeral: true
    });
  }

  const ticket = getTicket(interaction.channel.id);

  if (!ticket) {
    return interaction.reply({
      content: "❌ Ticket invalid.",
      ephemeral: true
    });
  }

  /* ADD USER */

  if (interaction.customId === "modal_add_user") {
    const userId = interaction.fields
      .getTextInputValue("user_id")
      .trim();

    if (!/^\d{17,20}$/.test(userId)) {
      return interaction.reply({
        content: "❌ ID Discord invalid.",
        ephemeral: true
      });
    }

    try {
      const member = await interaction.guild.members.fetch(userId);

      await interaction.channel.permissionOverwrites.edit(
        member.id,
        {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          AttachFiles: true,
          EmbedLinks: true
        }
      );

      await sendLog(
        interaction.guild,
        "User Added",
        `**Ticket:** \`${ticket.id}\`\n**User:** <@${member.id}>\n**Staff:** <@${interaction.user.id}>`,
        CONFIG.SUCCESS
      );

      return interaction.reply({
        content: `✅ ${member} a fost adăugat în ticket.`,
        ephemeral: true
      });

    } catch {
      return interaction.reply({
        content: "❌ Nu am găsit utilizatorul.",
        ephemeral: true
      });
    }
  }

  /* REMOVE USER */

  if (interaction.customId === "modal_remove_user") {
    const userId = interaction.fields
      .getTextInputValue("user_id")
      .trim();

    if (!/^\d{17,20}$/.test(userId)) {
      return interaction.reply({
        content: "❌ ID Discord invalid.",
        ephemeral: true
      });
    }

    if (userId === ticket.userId) {
      return interaction.reply({
        content: "❌ Nu poți elimina creatorul ticketului.",
        ephemeral: true
      });
    }

    try {
      await interaction.channel.permissionOverwrites.delete(
        userId
      );

      await sendLog(
        interaction.guild,
        "User Removed",
        `**Ticket:** \`${ticket.id}\`\n**User ID:** \`${userId}\`\n**Staff:** <@${interaction.user.id}>`,
        CONFIG.WARNING
      );

      return interaction.reply({
        content: "✅ Utilizator eliminat din ticket.",
        ephemeral: true
      });

    } catch {
      return interaction.reply({
        content: "❌ Nu am putut elimina utilizatorul.",
        ephemeral: true
      });
    }
  }

  /* TRANSFER STAFF */

  if (interaction.customId === "modal_transfer_staff") {
    const staffId = interaction.fields
      .getTextInputValue("staff_id")
      .trim();

    if (!/^\d{17,20}$/.test(staffId)) {
      return interaction.reply({
        content: "❌ ID Discord invalid.",
        ephemeral: true
      });
    }

    try {
      const member = await interaction.guild.members.fetch(staffId);

      if (!isStaff(member)) {
        return interaction.reply({
          content: "❌ Utilizatorul nu este staff.",
          ephemeral: true
        });
      }

      ticket.claimedBy = member.id;

      saveDatabase();

      await interaction.message?.edit?.({
        embeds: [
          createTicketEmbed(
            ticket,
            await client.users.fetch(ticket.userId)
          )
        ],
        components: createTicketButtons(ticket)
      }).catch(() => {});

      await sendLog(
        interaction.guild,
        "Ticket Transferred",
        `**Ticket:** \`${ticket.id}\`\n**New Staff:** <@${member.id}>\n**Transferred by:** <@${interaction.user.id}>`,
        CONFIG.SUCCESS
      );

      return interaction.reply({
        content: `✅ Ticket transferat către ${member}.`,
        ephemeral: true
      });

    } catch {
      return interaction.reply({
        content: "❌ Staff member invalid.",
        ephemeral: true
      });
    }
  }

  /* RENAME */

  if (interaction.customId === "modal_rename_ticket") {
    let name = interaction.fields
      .getTextInputValue("name")
      .toLowerCase()
      .trim();

    name = name
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40);

    if (!name) {
      return interaction.reply({
        content: "❌ Numele este invalid.",
        ephemeral: true
      });
    }

    try {
      await interaction.channel.setName(
        `ticket-${name}`
      );

      await sendLog(
        interaction.guild,
        "Ticket Renamed",
        `**Ticket:** \`${ticket.id}\`\n**New name:** \`${name}\`\n**Staff:** <@${interaction.user.id}>`,
        CONFIG.COLOR
      );

      return interaction.reply({
        content: `✅ Ticket redenumit în \`ticket-${name}\`.`,
        ephemeral: true
      });

    } catch {
      return interaction.reply({
        content: "❌ Nu am putut redenumi ticketul.",
        ephemeral: true
      });
    }
  }
}

/* =========================================================
   INTERACTION HANDLER
   ========================================================= */

client.on("interactionCreate", async (interaction) => {
  try {
    /* PANEL BUTTONS */

    if (interaction.isButton()) {
      if (interaction.customId.startsWith("ticket_")) {
        const key = interaction.customId.replace(
          "ticket_",
          ""
        );

        if (CATEGORIES[key]) {
          return createTicket(interaction, key);
        }
      }

      if (interaction.customId === "ticket_claim") {
        return handleClaim(interaction);
      }

      if (interaction.customId === "ticket_lock") {
        return handleLock(interaction);
      }

      if (interaction.customId === "ticket_close") {
        return closeTicket(interaction);
      }
    }

    /* MANAGEMENT */

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "ticket_management"
    ) {
      return handleManagement(interaction);
    }

    /* MODALS */

    if (interaction.isModalSubmit()) {
      return handleModal(interaction);
    }

  } catch (error) {
    console.error("INTERACTION ERROR:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ A apărut o eroare internă.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

/* =========================================================
   PANEL COMMAND
   ========================================================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!panel") {
    if (!message.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    )) {
      return message.reply(
        "❌ Doar administratorii pot trimite panelul."
      );
    }

    await message.channel.send({
      embeds: [createPanelEmbed()],
      components: createPanelComponents()
    });

    await message.delete().catch(() => {});
  }
});

/* =========================================================
   READY
   ========================================================= */

client.once("ready", async () => {
  console.log("");
  console.log("======================================");
  console.log("          ZEYO BLACK LABEL");
  console.log("======================================");
  console.log(`Bot: ${client.user.tag}`);
  console.log(`Guilds: ${client.guilds.cache.size}`);
  console.log("Status: ONLINE");
  console.log("======================================");
  console.log("");

  client.user.setPresence({
    activities: [
      {
        name: "ZEYO Support",
        type: 3
      }
    ],
    status: "online"
  });

  /* RECOVER DATABASE */

  let cleaned = false;

  for (const [channelId, ticket] of Object.entries(
    database.tickets
  )) {
    const guild = client.guilds.cache.get(ticket.guildId);

    if (!guild) continue;

    const channel = guild.channels.cache.get(channelId);

    if (!channel && !ticket.closed) {
      ticket.closed = true;
      ticket.closedAt = formatDate();
      ticket.recovered = true;
      cleaned = true;
    }
  }

  if (cleaned) {
    saveDatabase();
  }

  /* VERIFY PANEL CHANNEL */

  const panelChannel = client.channels.cache.get(
    CONFIG.PANEL_CHANNEL_ID
  );

  if (!panelChannel) {
    console.log(
      "WARNING: Panel channel not found."
    );
  } else {
    console.log(
      `Panel channel: #${panelChannel.name}`
    );
  }
});

/* =========================================================
   ERROR SAFETY
   ========================================================= */

process.on("unhandledRejection", (error) => {
  console.error(
    "UNHANDLED REJECTION:",
    error
  );
});

process.on("uncaughtException", (error) => {
  console.error(
    "UNCAUGHT EXCEPTION:",
    error
  );
});

/* =========================================================
   LOGIN
   ========================================================= */

if (!process.env.TOKEN) {
  console.error(
    "ERROR: TOKEN is missing from environment variables."
  );

  process.exit(1);
}

client.login(process.env.TOKEN);
