// Lệnh /dang: đăng source thành embed đẹp, kèm file, ảnh và nút tải
const {
  SlashCommandBuilder, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder, MessageFlags
} = require('discord.js');
const cfg = require('./config');
const store = require('./store');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };
const PENDING_TTL = 15 * 60 * 1000;
const pending = new Map(); // id -> { options, userId, at }

const command = new SlashCommandBuilder()
  .setName('dang')
  .setDescription('Đăng source thành embed vào một kênh')
  .addChannelOption((o) => o.setName('kenh').setDescription('Kênh đăng bài').setRequired(true)
    .addChannelTypes(ChannelType.GuildText))
  .addAttachmentOption((o) => o.setName('file').setDescription('File source (.zip, .rar…) nếu nhỏ hơn giới hạn upload'))
  .addStringOption((o) => o.setName('link').setDescription('Link tải (Drive, MEGA…) cho file lớn'))
  .addAttachmentOption((o) => o.setName('anh').setDescription('Ảnh xem trước'))
  .addStringOption((o) => o.setName('video').setDescription('Link video preview (YouTube…)'))
  .addRoleOption((o) => o.setName('ping').setDescription('Role cần thông báo (để trống nếu không ping)'))
  .toJSON();

// Màu embed và nhãn theo khu của kênh
function zoneOf(channelId) {
  const keys = Object.entries(store.get().channels).filter(([, id]) => id === channelId).map(([k]) => k);
  const key = keys[0] || '';
  if (key.startsWith('d_')) return { label: '💎 Diamond', color: cfg.roles.diamond.color };
  if (key.startsWith('g_')) return { label: '🥇 Gold', color: cfg.roles.gold.color };
  if (key.startsWith('f_')) return { label: '🆓 Free', color: 0x57f287 };
  return { label: null, color: cfg.embedColor };
}

function isUrl(text) {
  try {
    const u = new URL(text);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function cleanupPending() {
  const now = Date.now();
  for (const [id, p] of pending) if (now - p.at > PENDING_TTL) pending.delete(id);
}

// Bước 1: nhận lệnh, kiểm tra, mở form nhập nội dung
async function handleCommand(i) {
  const channel = i.options.getChannel('kenh');
  const file = i.options.getAttachment('file');
  const link = i.options.getString('link');
  const image = i.options.getAttachment('anh');
  const video = i.options.getString('video');
  const ping = i.options.getRole('ping');

  if (!file && !link) {
    return i.reply({ content: 'Cần đính kèm **file** hoặc điền **link** tải.', ...EPHEMERAL });
  }
  if (link && !isUrl(link)) return i.reply({ content: 'Link tải không hợp lệ.', ...EPHEMERAL });
  if (video && !isUrl(video)) return i.reply({ content: 'Link video không hợp lệ.', ...EPHEMERAL });
  if (image && !image.contentType?.startsWith('image/')) {
    return i.reply({ content: 'Ô **anh** phải là file ảnh.', ...EPHEMERAL });
  }

  const me = i.guild.members.me;
  const perms = channel.permissionsFor(me);
  if (!perms?.has(['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles'])) {
    return i.reply({ content: `Bot không có quyền đăng vào ${channel}.`, ...EPHEMERAL });
  }

  cleanupPending();
  const id = `${i.user.id}-${Date.now()}`;
  pending.set(id, {
    userId: i.user.id,
    at: Date.now(),
    channelId: channel.id,
    file: file && { url: file.url, name: file.name, size: file.size },
    image: image && { url: image.url, name: image.name },
    link, video,
    pingRoleId: ping?.id || null
  });

  const modal = new ModalBuilder().setCustomId(`dang:${id}`).setTitle('Đăng source');
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('ten').setLabel('Tên source').setStyle(TextInputStyle.Short)
      .setMaxLength(100).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('mo_ta').setLabel('Mô tả / tính năng').setStyle(TextInputStyle.Paragraph)
      .setMaxLength(3000).setRequired(false)
      .setPlaceholder('Mỗi dòng một tính năng')),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('framework').setLabel('Framework').setStyle(TextInputStyle.Short)
      .setMaxLength(50).setRequired(false).setPlaceholder('QBX, QBCore, ESX, Standalone…')),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('phien_ban').setLabel('Phiên bản').setStyle(TextInputStyle.Short)
      .setMaxLength(30).setRequired(false)),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('yeu_cau').setLabel('Yêu cầu (dependency)').setStyle(TextInputStyle.Short)
      .setMaxLength(200).setRequired(false).setPlaceholder('ox_lib, ox_inventory…'))
  );
  await i.showModal(modal);
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tải file thất bại (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

// Bước 2: nhận form, dựng embed và đăng
async function handleModal(i) {
  const id = i.customId.slice('dang:'.length);
  const p = pending.get(id);
  if (!p || p.userId !== i.user.id) {
    return i.reply({ content: 'Phiên đăng bài đã hết hạn, vui lòng dùng lại /dang.', ...EPHEMERAL });
  }
  pending.delete(id);

  const channel = i.guild.channels.cache.get(p.channelId);
  if (!channel) return i.reply({ content: 'Không tìm thấy kênh.', ...EPHEMERAL });

  await i.deferReply(EPHEMERAL);

  const name = i.fields.getTextInputValue('ten').trim();
  const desc = i.fields.getTextInputValue('mo_ta').trim();
  const framework = i.fields.getTextInputValue('framework').trim();
  const version = i.fields.getTextInputValue('phien_ban').trim();
  const requires = i.fields.getTextInputValue('yeu_cau').trim();

  const zone = zoneOf(channel.id);
  const embed = new EmbedBuilder()
    .setColor(zone.color)
    .setTitle(`📦 ${name}`)
    .setFooter({ text: zone.label ? `${cfg.storeName} • ${zone.label}` : cfg.storeName })
    .setTimestamp();

  if (desc) {
    // Mỗi dòng mô tả thành một gạch đầu dòng, trừ khi người viết đã tự định dạng
    const lines = desc.split('\n').map((l) => l.trim()).filter(Boolean);
    const formatted = lines.length > 1 && !lines.some((l) => /^[-*›•]/.test(l))
      ? lines.map((l) => `› ${l}`).join('\n')
      : desc;
    embed.setDescription(formatted.slice(0, 4000));
  }

  const fields = [];
  if (framework) fields.push({ name: 'Framework', value: framework, inline: true });
  if (version) fields.push({ name: 'Phiên bản', value: version, inline: true });
  if (p.file) fields.push({ name: 'Dung lượng', value: `${(p.file.size / 1024 / 1024).toFixed(2)} MB`, inline: true });
  if (requires) fields.push({ name: 'Yêu cầu', value: requires });
  if (fields.length) embed.addFields(fields);

  const files = [];
  try {
    if (p.image) {
      const imgName = `preview-${Date.now()}.${(p.image.name.split('.').pop() || 'png').toLowerCase()}`;
      files.push(new AttachmentBuilder(await download(p.image.url), { name: imgName }));
      embed.setImage(`attachment://${imgName}`);
    }
    if (p.file) files.push(new AttachmentBuilder(await download(p.file.url), { name: p.file.name }));
  } catch (err) {
    return i.editReply(`Không tải được file đính kèm: ${err.message}. Thử lại hoặc dùng link.`);
  }

  const buttons = [];
  if (p.link) buttons.push(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Tải xuống').setEmoji('📥').setURL(p.link));
  if (p.video) buttons.push(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Xem video').setEmoji('🎥').setURL(p.video));

  const payload = {
    embeds: [embed],
    files,
    components: buttons.length ? [new ActionRowBuilder().addComponents(buttons)] : [],
    allowedMentions: { roles: p.pingRoleId ? [p.pingRoleId] : [] }
  };
  if (p.pingRoleId) payload.content = p.pingRoleId === i.guild.id ? '@everyone' : `<@&${p.pingRoleId}>`;
  if (p.pingRoleId === i.guild.id) payload.allowedMentions = { parse: ['everyone'] };

  let msg;
  try {
    msg = await channel.send(payload);
  } catch (err) {
    if (err.code === 40005) {
      return i.editReply('File quá lớn so với giới hạn upload của server. Hãy dùng ô **link** (Drive, MEGA…) thay cho file.');
    }
    throw err;
  }

  await i.editReply(`Đã đăng **${name}** vào ${channel}: ${msg.url}`);
}

module.exports = { command, handleCommand, handleModal };
