require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, 
    PermissionsBitField, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle,
    Collection
} = require('discord.js');
const express = require('express');
const discordTranscripts = require('discord-html-transcripts');

// --- 🛡️ SISTEM ANTI-CRASH (PREVINE OPRIREA BOTULUI) ---
process.on('unhandledRejection', (reason, promise) => {
    console.log('⚠️ [ANTI-CRASH] Eroare respinsă neprinsă:', reason);
});
process.on('uncaughtException', (err, origin) => {
    console.log('⚠️ [ANTI-CRASH] Excepție neprinsă:', err);
});
process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.log('⚠️ [ANTI-CRASH] Monitor excepție:', err);
});

// --- 🌐 SERVER PENTRU RENDER ---
const app = express();
app.get('/', (req, res) => res.send('GOD TIER Ticket System ONLINE & PROTECTED!'));
app.listen(process.env.PORT || 3000, () => console.log('✅ Server web Render funcțional.'));

// --- 🤖 CONFIGURARE BOT ---
const client = new Client({
    intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ]
});

const activeTickets = new Collection(); 

client.once('ready', () => {
    console.log(`✅ [GOD TIER SYSTEM] Logat ca ${client.user.tag}! Gata de actiune și blindat.`);
});

// --- COMANDA DE SETUP (!setuptickets) ---
client.on('messageCreate', async (message) => {
    if (message.content === '!setuptickets') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setDescription(
                `# <:ticket:1548910446986141726> CENTRU DE SUPORT\n` +
                `***🔴 Ai nevoie de ajutor? Selectează categoria potrivită din meniul de mai jos și deschide un ticket. Echipa noastră îți va răspunde cât mai curând posibil.***\n\n` +
                `## <:giveaway2:1548910503751843870> Claim Reward\n` +
                `**Deschide un ticket pentru a revendica un premiu sau o recompensă. Te rugăm să atașezi dovezile necesare.**\n\n` +
                `## <:report:1548910497888210985> Report a User\n` +
                `**Raportează un utilizator care a încălcat regulamentul. Include ID-ul utilizatorului, motivul raportării și dovezi clare.**\n\n` +
                `## <:unionsupport:1548910500413313067> General Support\n` +
                `**Pentru întrebări, probleme sau orice alt tip de ajutor care nu se încadrează în categoriile de mai sus.**\n\n` +
                `-# ⚠️ Nu deschide ticket-uri fără motiv și nu contacta membrii staff-ului în privat. Abuzul sistemului de suport poate duce la sancțiuni.`
            );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_menu')
            .setPlaceholder('Support General Menu')
            .addOptions([
                { label: 'Claim Reward', value: 'claim_reward', emoji: '<:claim:1548910499226452068>' },
                { label: 'Report A User', value: 'report_user', emoji: '<:report:1548910497888210985>' },
                { label: 'Support General', value: 'support_general', emoji: '<:unionsupport:1548910500413313067>' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        try {
            await message.channel.send({ embeds: [embed], components: [row] });
            await message.delete().catch(() => {}); // catch previne eroarea dacă mesajul e deja șters
        } catch (err) {
            console.log("Eroare la trimiterea panoului de setup.");
        }
    }
});

// --- EVENIMENTE INTERACȚIUNI ---
client.on('interactionCreate', async (interaction) => {
    
    // Asigurăm fallback pentru roluri în caz că uiți să le pui în .env
    const CATEGORY_ID = process.env.CATEGORY_ID;
    const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
    const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
    const ROLE_ID_GIVEAWAY = process.env.ROLE_ID_GIVEAWAY || STAFF_ROLE_ID; 
    const ROLE_ID_MODERATOR = process.env.ROLE_ID_MODERATOR || STAFF_ROLE_ID;

    if (!CATEGORY_ID || !STAFF_ROLE_ID) {
        if (interaction.isRepliable()) {
            return interaction.reply({ content: '❌ Eroare critică: CATEGORY_ID sau STAFF_ROLE_ID nu sunt setate în fișierul .env!', ephemeral: true }).catch(() => {});
        }
        return;
    }

    try {
        // ============================================
        // 1. CREAREA TICHETULUI (ANTI-SPAM INCLUS)
        // ============================================
        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
            
            if (activeTickets.has(interaction.user.id)) {
                const userChannel = activeTickets.get(interaction.user.id);
                return interaction.reply({ content: `❌ Ai deja un tichet deschis aici: <#${userChannel}>. Închide-l înainte de a deschide altul!`, ephemeral: true });
            }

            const selectedValue = interaction.values[0];
            const ticketShortID = `TICK-${Math.floor(Math.random() * 9000) + 1000}`;
            const currentTimestamp = Math.floor(Date.now() / 1000);

            let ticketName = `ticket-${interaction.user.username}`;
            let issueText = 'General Support';
            let roleToPing = STAFF_ROLE_ID; 

            if (selectedValue === 'claim_reward') { 
                ticketName = `🎁-claim-${interaction.user.username}`; 
                issueText = 'Claim Reward'; 
                roleToPing = ROLE_ID_GIVEAWAY;
            } else if (selectedValue === 'report_user') { 
                ticketName = `🧾-report-${interaction.user.username}`; 
                issueText = 'Report a User'; 
                roleToPing = ROLE_ID_MODERATOR;
            } else if (selectedValue === 'support_general') { 
                ticketName = `🎧-support-${interaction.user.username}`; 
                issueText = 'General Support'; 
                roleToPing = STAFF_ROLE_ID;
            }

            const ticketChannel = await interaction.guild.channels.create({
                name: ticketName,
                type: ChannelType.GuildText,
                parent: CATEGORY_ID,
                topic: interaction.user.id, 
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: roleToPing, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
                ]
            });

            activeTickets.set(interaction.user.id, ticketChannel.id);

            await interaction.reply({ content: `✅ Tichet deschis cu succes: ${ticketChannel}`, ephemeral: true });

            const insideEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setAuthor({ name: '🎟️ Ticket — Support' })
                .setDescription(`👋 **Hello** <@${interaction.user.id}>\n\n• A staff member will assist you shortly.\n\nℹ️ **Order Details**\n<:issue:1548912378198888538> **Issue:** ${issueText}\n\n<:snlink:1548912376177496144> **Ticket ID:** \`${ticketShortID}\`\n⚙️ **Opened At:** <t:${currentTimestamp}:R>\n💎 Safe & secure support\n🚨 Do not share your password or token.`)
                .setFooter({ text: `${interaction.guild.name}™ • Keep your information safe` });

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('add_user').setLabel('Add User').setEmoji('<:vqvreactionroles:1548912373547663473>').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ping_user').setLabel('Ping User').setEmoji('🔔').setStyle(ButtonStyle.Secondary)
            );
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('remove_user').setLabel('Remove User').setEmoji('<:uncheckmark:1548912374822477884>').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({ content: `<@${interaction.user.id}> | <@&${roleToPing}>`, embeds: [insideEmbed], components: [row1, row2] });
        }

        // ============================================
        // 2. BUTOANELE DIN INTERIORUL TICHETULUI
        // ============================================
        if (interaction.isButton()) {
            const hasStaffRole = interaction.member.roles.cache.has(STAFF_ROLE_ID) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

            if (interaction.customId === 'ping_user') {
                if (!hasStaffRole) return interaction.reply({ content: '⛔ Doar staff-ul poate folosi.', ephemeral: true });
                const ownerId = interaction.channel.topic;
                if (ownerId) await interaction.reply({ content: `🔔 <@${ownerId}>, salut! Mai ești pe aici? Mai ai nevoie de ajutorul nostru?` });
            }

            if (interaction.customId === 'close_ticket') {
                if (!hasStaffRole) return interaction.reply({ content: '⛔ Doar staff-ul poate închide tichetul.', ephemeral: true });
                
                const ownerId = interaction.channel.topic; 
                if (ownerId) await interaction.channel.permissionOverwrites.edit(ownerId, { ViewChannel: false }).catch(() => {});
                
                await interaction.channel.setName(`🔒-closed-${Math.floor(Math.random() * 1000)}`).catch(() => {});
                
                const closedEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🔒 Tichet Închis')
                    .setDescription(`Acest tichet a fost închis de ${interaction.user}. Alege o opțiune de mai jos pentru a continua.`);
                
                const advancedRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('transcript_ticket').setLabel('Save Transcript').setEmoji('📝').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('reopen_ticket').setLabel('Re-Open').setEmoji('🔓').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete (W/ Log)').setEmoji('⛔').setStyle(ButtonStyle.Danger)
                );

                await interaction.reply({ embeds: [closedEmbed], components: [advancedRow] });
            }

            if (interaction.customId === 'reopen_ticket') {
                if (!hasStaffRole) return interaction.reply({ content: '⛔ Acces interzis.', ephemeral: true });
                const ownerId = interaction.channel.topic; 
                if (ownerId) await interaction.channel.permissionOverwrites.edit(ownerId, { ViewChannel: true, SendMessages: true }).catch(() => {});
                await interaction.channel.setName(`ticket-reopened`).catch(() => {});
                await interaction.message.delete().catch(() => {});
                await interaction.reply({ content: `🔓 Tichet redeschis. Membrul are acces din nou.` });
            }

            if (interaction.customId === 'transcript_ticket') {
                if (!hasStaffRole) return interaction.reply({ content: '⛔ Acces interzis.', ephemeral: true });
                await interaction.reply({ content: '⏳ Generez transcript-ul, așteaptă...' });
                
                const attachment = await discordTranscripts.createTranscript(interaction.channel, {
                    limit: -1, returnType: 'attachment', filename: `transcript-${interaction.channel.name}.html`, saveImages: true
                });

                const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
                if (logChannel) {
                    await logChannel.send({ content: `📝 Transcript salvat manual din: **${interaction.channel.name}**`, files: [attachment] }).catch(() => {});
                }
                await interaction.editReply({ content: '✅ Transcript trimis cu succes pe canalul de logs.' });
            }

            if (interaction.customId === 'delete_ticket') {
                if (!hasStaffRole) return interaction.reply({ content: '⛔ Acces interzis.', ephemeral: true });
                await interaction.reply({ content: '⛔ Generare log-uri finale. Canalul se va șterge în 5 secunde...' });
                
                const ownerId = interaction.channel.topic; 
                if (ownerId) activeTickets.delete(ownerId); // Eliberăm anti-spam-ul

                const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
                if (logChannel) {
                    try {
                        const attachment = await discordTranscripts.createTranscript(interaction.channel, {
                            limit: -1, returnType: 'attachment', filename: `final-log-${interaction.channel.name}.html`, saveImages: true
                        });
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🗑️ Tichet Șters')
                            .setColor('#FF0000')
                            .addFields(
                                { name: '👤 Deschis de:', value: ownerId ? `<@${ownerId}>` : 'Necunoscut', inline: true },
                                { name: '🛡️ Șters de:', value: `${interaction.user}`, inline: true },
                                { name: '📁 Nume Canal:', value: `${interaction.channel.name}`, inline: false }
                            )
                            .setTimestamp();
                        await logChannel.send({ embeds: [logEmbed], files: [attachment] }).catch(() => {});
                    } catch (err) {
                        console.log('Eroare la generarea transcriptului final.');
                    }
                }

                setTimeout(() => {
                    interaction.channel.delete().catch(() => {});
                }, 5000);
            }

            if (interaction.customId === 'claim_ticket') {
                if (!hasStaffRole) return interaction.reply({ content: '⛔ Doar staff-ul poate prelua.', ephemeral: true });
                await interaction.reply({ content: `✅ **PRELUAT.** ${interaction.user} se ocupă de acest tichet.` });
            }

            if (interaction.customId === 'add_user' || interaction.customId === 'remove_user') {
                if (!hasStaffRole) return interaction.reply({ content: '⛔ Acces interzis.', ephemeral: true });
                const action = interaction.customId === 'add_user' ? 'Adaugă' : 'Scoate';
                const modal = new ModalBuilder().setCustomId(`modal_${interaction.customId}`).setTitle(`${action} Membru`);
                const inputInput = new TextInputBuilder()
                    .setCustomId('user_id_input')
                    .setLabel('Introdu ID-ul de Discord (doar cifre):')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(inputInput));
                await interaction.showModal(modal);
            }
        }

        // ============================================
        // 3. REZOLVAREA FERESTRELOR MODALE (Validare strictă)
        // ============================================
        if (interaction.isModalSubmit()) {
            const inputId = interaction.fields.getTextInputValue('user_id_input').trim();
            
            // Verificăm dacă ID-ul este compus doar din cifre (sistem strict)
            if (!/^\d{17,19}$/.test(inputId)) {
                return interaction.reply({ content: '❌ Eroare: ID-ul introdus nu este valid. Trebuie să conțină doar cifre (17-19 caractere).', ephemeral: true });
            }

            try {
                if (interaction.customId === 'modal_add_user') {
                    await interaction.channel.permissionOverwrites.edit(inputId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
                    await interaction.reply({ content: `✅ <@${inputId}> a primit acces cu succes.` });
                } else if (interaction.customId === 'modal_remove_user') {
                    await interaction.channel.permissionOverwrites.edit(inputId, { ViewChannel: false });
                    await interaction.reply({ content: `⛔ Accesul lui <@${inputId}> a fost revocat.` });
                }
            } catch (error) {
                await interaction.reply({ content: '❌ Eroare la modificarea permisiunilor. Asigură-te că botul are gradul destul de sus.', ephemeral: true });
            }
        }

    } catch (globalError) {
        console.error('⚠️ [GLOBAL ERROR CATCHER] Eroare prinsă în interacțiune:', globalError);
        if (interaction.isRepliable()) {
            interaction.reply({ content: '❌ A apărut o eroare neașteptată. Contactează un Administrator!', ephemeral: true }).catch(() => {});
        }
    }
});

client.login(process.env.BOT_TOKEN).catch(err => console.log('❌ Eroare critică la logarea botului! Verifică BOT_TOKEN.'));
  
