require('dotenv').config();
const {
  Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType,
  PermissionFlagsBits: P, AttachmentBuilder, MessageFlags
} = require('discord.js');
const cfg = require('./config');
const store = require('./store');
const { runSetup, productOverwrites } = require('./setup');
const post = require('./post');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('Thiếu DISCORD_TOKEN, CLIENT_ID hoặc GUILD_ID trong .env');
  process.exit(1);
}

store.load();

const client = new Client({
  // GuildMembers cần bật "Server Members Intent" trong Developer Portal
  // để tự trả lại role khi khách rời server rồi vào lại
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const EPHEMERAL = { flags: MessageFlags.Ephemeral };
const ADMIN_COMMANDS = new Set(['setup', 'san-pham-tao', 'san-pham-sua', 'san-pham-xoa']);

// ============================================================
//  TIỆN ÍCH
// ============================================================
const data = () => store.get();
const roleId = (key) => data().roles[key];
const channelOf = (guild, key) => guild.channels.cache.get(data().channels[key]);

function isAdmin(member) {
  return member.permissions.has(P.Administrator);
}
function isStaff(member) {
  return isAdmin(member) || member.roles.cache.has(roleId('support'));
}

function baseEmbed(title) {
  return new EmbedBuilder().setColor(cfg.embedColor).setTitle(title).setFooter({ text: cfg.footer }).setTimestamp();
}

async function log(guild, key, embed, files) {
  const ch = channelOf(guild, key);
  if (ch) await ch.send({ embeds: [embed], files }).catch(() => {});
}

function slugify(text) {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 40);
}

const tierRank = (t) => cfg.tiers.indexOf(t);

// Cấp cao nhất theo sản phẩm đã mua (null nếu chưa mua gì)
function computeTier(userId) {
  let best = null;
  for (const p of store.userPurchases(userId)) {
    const product = data().products[p.productId];
    if (!product) continue;
    if (best === null || tierRank(product.tier) > tierRank(best)) best = product.tier;
  }
  return best;
}

function formatPurchases(userId) {
  const list = store.userPurchases(userId);
  if (!list.length) return 'Chưa mua sản phẩm nào.';
  return list.map((p) => {
    const product = data().products[p.productId];
    const name = product ? product.name : `${p.productId} (đã xóa)`;
    const tier = product ? cfg.tierLabels[product.tier] : '';
    return `› **${name}** ${tier} — <t:${Math.floor(p.at / 1000)}:d>`;
  }).join('\n');
}

// Đồng bộ role của 1 người theo dữ liệu mua hàng.
// Đây là nguồn sự thật duy nhất: role luôn được tính lại từ store, không cộng dồn tay.
async function syncMember(member) {
  const owned = new Set(store.userPurchases(member.id).map((p) => p.productId));
  const tier = computeTier(member.id);

  const add = [];
  const remove = [];

  for (const [pid, product] of Object.entries(data().products)) {
    if (!product.roleId) continue;
    const has = member.roles.cache.has(product.roleId);
    if (owned.has(pid) && !has) add.push(product.roleId);
    if (!owned.has(pid) && has) remove.push(product.roleId);
  }

  for (const t of cfg.tiers) {
    const id = roleId(t);
    if (!id) continue;
    const has = member.roles.cache.has(id);
    if (t === tier && !has) add.push(id);
    if (t !== tier && has) remove.push(id);
  }

  if (tier && roleId('member') && !member.roles.cache.has(roleId('member'))) add.push(roleId('member'));

  if (remove.length) await member.roles.remove(remove, 'Đồng bộ sản phẩm');
  if (add.length) await member.roles.add(add, 'Đồng bộ sản phẩm');
  return tier;
}

// ============================================================
//  LỆNH
// ============================================================
const productOption = (o) => o.setName('san_pham').setDescription('Sản phẩm').setRequired(true).setAutocomplete(true);
const tierChoices = cfg.tiers.map((t) => ({ name: cfg.tierLabels[t], value: t }));

const commands = [
  new SlashCommandBuilder().setName('setup')
    .setDescription('Dựng role, kênh, phân quyền và các bảng của store')
    .setDefaultMemberPermissions(P.Administrator)
    .addBooleanOption((o) => o.setName('xoa_kenh_cu').setDescription('Xóa các kênh bot đã tạo trước đây nhưng không còn dùng')),

  new SlashCommandBuilder().setName('san-pham-tao')
    .setDescription('Tạo sản phẩm mới (kèm role và kênh riêng cho người mua)')
    .setDefaultMemberPermissions(P.Administrator)
    .addStringOption((o) => o.setName('ten').setDescription('Tên sản phẩm').setRequired(true).setMaxLength(60))
    .addStringOption((o) => o.setName('cap').setDescription('Mua sản phẩm này sẽ được cấp nào').setRequired(true).addChoices(...tierChoices)),

  new SlashCommandBuilder().setName('san-pham-sua')
    .setDescription('Đổi cấp của một sản phẩm')
    .setDefaultMemberPermissions(P.Administrator)
    .addStringOption(productOption)
    .addStringOption((o) => o.setName('cap').setDescription('Cấp mới').setRequired(true).addChoices(...tierChoices)),

  new SlashCommandBuilder().setName('san-pham-xoa')
    .setDescription('Xóa sản phẩm, role và kênh riêng của nó')
    .setDefaultMemberPermissions(P.Administrator)
    .addStringOption(productOption)
    .addBooleanOption((o) => o.setName('xac_nhan').setDescription('Chọn True để xác nhận xóa').setRequired(true)),

  new SlashCommandBuilder().setName('san-pham-danh-sach')
    .setDescription('Danh sách sản phẩm và số người đã mua'),

  new SlashCommandBuilder().setName('cap-san-pham')
    .setDescription('Ghi nhận khách đã mua một sản phẩm')
    .addUserOption((o) => o.setName('khach').setDescription('Khách hàng').setRequired(true))
    .addStringOption(productOption)
    .addStringOption((o) => o.setName('ghi_chu').setDescription('Mã đơn Tebex, số tiền…').setMaxLength(200)),

  new SlashCommandBuilder().setName('thu-hoi')
    .setDescription('Thu hồi một sản phẩm của khách')
    .addUserOption((o) => o.setName('khach').setDescription('Khách hàng').setRequired(true))
    .addStringOption(productOption)
    .addStringOption((o) => o.setName('ly_do').setDescription('Lý do').setMaxLength(200)),

  new SlashCommandBuilder().setName('kiem-tra')
    .setDescription('Xem khách đã mua những gì')
    .addUserOption((o) => o.setName('khach').setDescription('Khách hàng').setRequired(true)),

  new SlashCommandBuilder().setName('da-mua')
    .setDescription('Xem sản phẩm bạn đã mua và cấp hiện tại')
].map((c) => c.toJSON()).concat(post.command);

async function registerCommands() {
  const rest = new REST().setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
}

// ============================================================
//  XỬ LÝ LỆNH
// ============================================================
const handlers = {
  async 'setup'(i) {
    await i.deferReply(EPHEMERAL);
    const report = await runSetup(i.guild, { cleanup: i.options.getBoolean('xoa_kenh_cu') === true });
    // Gắn lại quyền cho kênh sản phẩm đã có (phòng khi role Support mới được tạo)
    for (const product of Object.values(data().products)) {
      const ch = i.guild.channels.cache.get(product.channelId);
      if (ch && product.roleId) await ch.permissionOverwrites.set(productOverwrites(i.guild, product.roleId)).catch(() => {});
    }
    const lines = [
      report.created.length ? `Đã tạo mới ${report.created.length} mục.` : 'Không có mục nào mới, đã cập nhật quyền và bảng.',
      ...(report.removed ? [`Đã xóa ${report.removed} kênh cũ.`] : []),
      ...report.warnings.map((w) => `⚠️ ${w}`)
    ];
    await i.editReply(lines.join('\n'));
  },

  async 'san-pham-tao'(i) {
    const name = i.options.getString('ten').trim();
    const tier = i.options.getString('cap');
    const id = slugify(name);
    if (!id) return i.reply({ content: 'Tên sản phẩm không hợp lệ.', ...EPHEMERAL });
    if (data().products[id]) return i.reply({ content: 'Sản phẩm này đã tồn tại.', ...EPHEMERAL });

    const category = channelOf(i.guild, 'productCategory');
    if (!category) return i.reply({ content: 'Chưa chạy /setup.', ...EPHEMERAL });

    await i.deferReply(EPHEMERAL);
    const role = await i.guild.roles.create({
      name: `📦 ${name}`, colors: { primaryColor: cfg.productRoleColor }, hoist: false, mentionable: false, permissions: [],
      reason: 'Tạo sản phẩm'
    });
    const channel = await i.guild.channels.create({
      name: `📦・${id}`, type: ChannelType.GuildText, parent: category.id,
      topic: `Tải xuống, hướng dẫn và cập nhật của ${name}`,
      permissionOverwrites: productOverwrites(i.guild, role.id),
      reason: 'Tạo sản phẩm'
    });

    data().products[id] = { name, tier, roleId: role.id, channelId: channel.id, createdAt: Date.now() };
    store.save();

    await i.editReply(`Đã tạo **${name}** (${cfg.tierLabels[tier]}). Kênh riêng: ${channel}. Đăng file và hướng dẫn vào kênh đó, chỉ người mua mới thấy.`);
  },

  async 'san-pham-sua'(i) {
    const id = i.options.getString('san_pham');
    const product = data().products[id];
    if (!product) return i.reply({ content: 'Không tìm thấy sản phẩm.', ...EPHEMERAL });

    await i.deferReply(EPHEMERAL);
    product.tier = i.options.getString('cap');
    store.save();

    // Tính lại cấp cho tất cả người đã mua sản phẩm này
    let synced = 0;
    for (const [uid, list] of Object.entries(data().purchases)) {
      if (!list.some((p) => p.productId === id)) continue;
      const member = await i.guild.members.fetch(uid).catch(() => null);
      if (member) { await syncMember(member); synced++; }
    }
    await i.editReply(`Đã đổi **${product.name}** sang ${cfg.tierLabels[product.tier]}. Cập nhật lại cấp cho ${synced} khách.`);
  },

  async 'san-pham-xoa'(i) {
    const id = i.options.getString('san_pham');
    const product = data().products[id];
    if (!product) return i.reply({ content: 'Không tìm thấy sản phẩm.', ...EPHEMERAL });
    if (!i.options.getBoolean('xac_nhan')) return i.reply({ content: 'Đã hủy.', ...EPHEMERAL });

    await i.deferReply(EPHEMERAL);
    const buyers = Object.entries(data().purchases).filter(([, list]) => list.some((p) => p.productId === id)).map(([uid]) => uid);
    for (const uid of buyers) store.removePurchase(uid, id);
    delete data().products[id];
    store.save();

    await i.guild.channels.cache.get(product.channelId)?.delete('Xóa sản phẩm').catch(() => {});
    await i.guild.roles.cache.get(product.roleId)?.delete('Xóa sản phẩm').catch(() => {});

    for (const uid of buyers) {
      const member = await i.guild.members.fetch(uid).catch(() => null);
      if (member) await syncMember(member);
    }

    await log(i.guild, 'log_order', baseEmbed('🗑️ Xóa sản phẩm')
      .setDescription(`**${product.name}** bị xóa bởi ${i.user}. Thu hồi khỏi ${buyers.length} khách.`));
    await i.editReply(`Đã xóa **${product.name}**.`);
  },

  async 'san-pham-danh-sach'(i) {
    if (!isStaff(i.member)) return i.reply({ content: 'Bạn không có quyền dùng lệnh này.', ...EPHEMERAL });
    const products = Object.entries(data().products);
    if (!products.length) return i.reply({ content: 'Chưa có sản phẩm nào.', ...EPHEMERAL });

    const count = (pid) => Object.values(data().purchases).filter((l) => l.some((p) => p.productId === pid)).length;
    const lines = cfg.tiers.flatMap((t) => {
      const items = products.filter(([, p]) => p.tier === t);
      if (!items.length) return [];
      return [`**${cfg.tierLabels[t]}**`, ...items.map(([pid, p]) => `› ${p.name} — ${count(pid)} người mua`), ''];
    });
    await i.reply({ embeds: [baseEmbed('📦 Sản phẩm').setDescription(lines.join('\n').slice(0, 4000))], ...EPHEMERAL });
  },

  async 'cap-san-pham'(i) {
    if (!isStaff(i.member)) return i.reply({ content: 'Bạn không có quyền dùng lệnh này.', ...EPHEMERAL });
    const user = i.options.getUser('khach');
    const id = i.options.getString('san_pham');
    const note = i.options.getString('ghi_chu');
    const product = data().products[id];
    if (!product) return i.reply({ content: 'Không tìm thấy sản phẩm.', ...EPHEMERAL });
    if (user.bot) return i.reply({ content: 'Không thể cấp cho bot.', ...EPHEMERAL });

    const member = await i.guild.members.fetch(user.id).catch(() => null);
    if (!member) return i.reply({ content: 'Người này không có trong server.', ...EPHEMERAL });
    if (!store.addPurchase(user.id, id, i.user.id, note)) {
      return i.reply({ content: `${user} đã có **${product.name}** rồi.`, ...EPHEMERAL });
    }

    await i.deferReply(EPHEMERAL);
    const tier = await syncMember(member);

    await log(i.guild, 'log_order', baseEmbed('✅ Cấp sản phẩm')
      .addFields(
        { name: 'Khách', value: `${user} (${user.id})`, inline: true },
        { name: 'Sản phẩm', value: product.name, inline: true },
        { name: 'Cấp hiện tại', value: cfg.tierLabels[tier] || '—', inline: true },
        { name: 'Người cấp', value: `${i.user}`, inline: true },
        { name: 'Ghi chú', value: note || '—' }
      ));

    await user.send({ embeds: [baseEmbed(`Cảm ơn bạn đã mua ${product.name}`)
      .setDescription(`Bạn đã được mở khóa kênh <#${product.channelId}> để tải file và xem hướng dẫn.\nCấp hiện tại: **${cfg.tierLabels[tier]}**`)] })
      .catch(() => {});

    await i.editReply(`Đã cấp **${product.name}** cho ${user}. Cấp hiện tại: ${cfg.tierLabels[tier]}.`);
  },

  async 'thu-hoi'(i) {
    if (!isStaff(i.member)) return i.reply({ content: 'Bạn không có quyền dùng lệnh này.', ...EPHEMERAL });
    const user = i.options.getUser('khach');
    const id = i.options.getString('san_pham');
    const reason = i.options.getString('ly_do');
    const product = data().products[id];
    if (!product) return i.reply({ content: 'Không tìm thấy sản phẩm.', ...EPHEMERAL });
    if (!store.removePurchase(user.id, id)) {
      return i.reply({ content: `${user} chưa mua **${product.name}**.`, ...EPHEMERAL });
    }

    await i.deferReply(EPHEMERAL);
    const member = await i.guild.members.fetch(user.id).catch(() => null);
    const tier = member ? await syncMember(member) : computeTier(user.id);

    await log(i.guild, 'log_order', baseEmbed('⛔ Thu hồi sản phẩm')
      .addFields(
        { name: 'Khách', value: `${user} (${user.id})`, inline: true },
        { name: 'Sản phẩm', value: product.name, inline: true },
        { name: 'Cấp còn lại', value: cfg.tierLabels[tier] || 'Không còn', inline: true },
        { name: 'Người thu hồi', value: `${i.user}`, inline: true },
        { name: 'Lý do', value: reason || '—' }
      ));

    await i.editReply(`Đã thu hồi **${product.name}** của ${user}.`);
  },

  async 'kiem-tra'(i) {
    if (!isStaff(i.member)) return i.reply({ content: 'Bạn không có quyền dùng lệnh này.', ...EPHEMERAL });
    const user = i.options.getUser('khach');
    const tier = computeTier(user.id);
    await i.reply({
      embeds: [baseEmbed(`🔎 ${user.username}`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: 'Cấp', value: cfg.tierLabels[tier] || 'Chưa mua', inline: true },
          { name: 'Số sản phẩm', value: String(store.userPurchases(user.id).length), inline: true },
          { name: 'Đã mua', value: formatPurchases(user.id).slice(0, 1024) }
        )],
      ...EPHEMERAL
    });
  },

  async 'da-mua'(i) {
    const tier = computeTier(i.user.id);
    await i.reply({
      embeds: [baseEmbed('📦 Sản phẩm của bạn')
        .addFields(
          { name: 'Cấp hiện tại', value: cfg.tierLabels[tier] || 'Chưa mua', inline: true },
          { name: 'Đã mua', value: formatPurchases(i.user.id).slice(0, 1024) }
        )],
      ...EPHEMERAL
    });
  }
};

// ============================================================
//  NÚT BẤM
// ============================================================
const ticketCooldown = new Map();

async function handleVerify(i) {
  const id = roleId('member');
  if (!id) return i.reply({ content: 'Server chưa được thiết lập.', ...EPHEMERAL });
  if (i.member.roles.cache.has(id)) return i.reply({ content: 'Bạn đã xác minh rồi.', ...EPHEMERAL });
  await i.member.roles.add(id, 'Xác minh');
  await i.reply({ content: 'Xác minh thành công. Chào mừng bạn!', ...EPHEMERAL });
  await log(i.guild, 'log_member', baseEmbed('✅ Xác minh').setDescription(`${i.user} (${i.user.id})`));
}

function findOpenTicket(guild, userId) {
  const catId = data().channels.ticketCategory;
  return guild.channels.cache.find((c) => c.parentId === catId && c.topic?.startsWith(`uid:${userId}|`));
}

async function handleTicketOpen(i, typeId) {
  const type = cfg.ticketTypes.find((t) => t.id === typeId);
  const category = channelOf(i.guild, 'ticketCategory');
  if (!type || !category) return i.reply({ content: 'Hệ thống ticket chưa sẵn sàng.', ...EPHEMERAL });

  const last = ticketCooldown.get(i.user.id) || 0;
  if (Date.now() - last < cfg.ticketCooldownMs) {
    return i.reply({ content: 'Bạn thao tác quá nhanh, thử lại sau ít giây.', ...EPHEMERAL });
  }

  const open = findOpenTicket(i.guild, i.user.id);
  if (open) return i.reply({ content: `Bạn đang có ticket mở: ${open}`, ...EPHEMERAL });

  const tier = computeTier(i.user.id);
  if (type.requiresPurchase && !tier) {
    return i.reply({ content: 'Hỗ trợ kỹ thuật chỉ dành cho khách đã mua sản phẩm. Nếu bạn cần mua hàng, chọn **Mua hàng**.', ...EPHEMERAL });
  }

  ticketCooldown.set(i.user.id, Date.now());
  await i.deferReply(EPHEMERAL);

  const num = String(store.nextTicketNumber()).padStart(4, '0');
  const prefix = tier === 'diamond' ? '💎' : tier === 'gold' ? '🥇' : '🎫';
  const support = roleId('support');

  const channel = await i.guild.channels.create({
    name: `${prefix}・${type.id}-${num}`,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `uid:${i.user.id}|type:${type.id}`,
    permissionOverwrites: [
      { id: i.guild.id, deny: [P.ViewChannel] },
      { id: i.user.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks] },
      ...(support ? [{ id: support, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.ManageMessages] }] : []),
      { id: i.client.user.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageChannels, P.EmbedLinks, P.AttachFiles] }
    ],
    reason: `Ticket của ${i.user.tag}`
  });

  const embed = baseEmbed(`${type.emoji} ${type.label}`)
    .setDescription(`Chào ${i.user}, hãy mô tả vấn đề của bạn. Staff sẽ phản hồi sớm nhất.`)
    .addFields(
      { name: 'Cấp', value: cfg.tierLabels[tier] || 'Chưa mua', inline: true },
      { name: 'Đã mua', value: formatPurchases(i.user.id).slice(0, 1024) }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket-close').setLabel('Đóng ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );

  const ping = [i.user.toString(), support ? `<@&${support}>` : null].filter(Boolean).join(' ');
  await channel.send({ content: ping, embeds: [embed], components: [row] });
  await i.editReply(`Đã tạo ticket: ${channel}`);
}

async function handleTicketClose(i, confirmed) {
  const topic = i.channel?.topic || '';
  const match = topic.match(/^uid:(\d+)\|type:(\w+)/);
  if (!match || i.channel.parentId !== data().channels.ticketCategory) {
    return i.reply({ content: 'Đây không phải kênh ticket.', ...EPHEMERAL });
  }
  const ownerId = match[1];
  if (i.user.id !== ownerId && !isStaff(i.member)) {
    return i.reply({ content: 'Bạn không có quyền đóng ticket này.', ...EPHEMERAL });
  }

  if (!confirmed) {
    return i.reply({
      content: 'Bạn chắc chắn muốn đóng ticket?',
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket-close-yes').setLabel('Đóng').setStyle(ButtonStyle.Danger)
      )],
      ...EPHEMERAL
    });
  }

  await i.update({ content: 'Đang đóng ticket…', components: [] });

  // Lưu toàn bộ nội dung ticket
  const all = [];
  let before;
  for (let n = 0; n < 10; n++) {
    const batch = await i.channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    all.push(...batch.values());
    before = batch.last().id;
  }
  all.reverse();
  const text = all.map((m) => {
    const time = new Date(m.createdTimestamp).toISOString().replace('T', ' ').slice(0, 19);
    const files = m.attachments.size ? ` [Tệp: ${[...m.attachments.values()].map((a) => a.url).join(', ')}]` : '';
    return `[${time}] ${m.author.tag}: ${m.content}${files}`;
  }).join('\n');

  const file = new AttachmentBuilder(Buffer.from(text || '(trống)', 'utf8'), { name: `${i.channel.name}.txt` });
  await log(i.guild, 'log_ticket', baseEmbed('🔒 Đóng ticket').addFields(
    { name: 'Ticket', value: i.channel.name, inline: true },
    { name: 'Chủ ticket', value: `<@${ownerId}>`, inline: true },
    { name: 'Người đóng', value: `${i.user}`, inline: true }
  ), [file]);

  await i.channel.send('Ticket sẽ bị xóa sau 5 giây.');
  setTimeout(() => i.channel.delete('Đóng ticket').catch(() => {}), 5000);
}

// ============================================================
//  SỰ KIỆN
// ============================================================
client.once(Events.ClientReady, async (c) => {
  await registerCommands();
  console.log(`Đã đăng nhập: ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (i) => {
  if (!i.inGuild() || i.guildId !== GUILD_ID) return;

  try {
    if (i.isAutocomplete()) {
      const q = slugify(String(i.options.getFocused() || ''));
      const choices = Object.entries(data().products)
        .filter(([id]) => !q || id.includes(q))
        .slice(0, 25)
        .map(([id, p]) => ({ name: `${p.name} (${cfg.tierLabels[p.tier]})`.slice(0, 100), value: id }));
      return i.respond(choices);
    }

    if (i.isChatInputCommand() && i.commandName === 'dang') {
      if (!isStaff(i.member)) return i.reply({ content: 'Bạn không có quyền dùng lệnh này.', ...EPHEMERAL });
      return post.handleCommand(i);
    }

    if (i.isModalSubmit() && i.customId.startsWith('dang:')) {
      if (!isStaff(i.member)) return i.reply({ content: 'Bạn không có quyền dùng lệnh này.', ...EPHEMERAL });
      return post.handleModal(i);
    }

    if (i.isChatInputCommand()) {
      const fn = handlers[i.commandName];
      if (!fn) return;
      if (ADMIN_COMMANDS.has(i.commandName) && !isAdmin(i.member)) {
        return i.reply({ content: 'Chỉ Peaky mới dùng được lệnh này.', ...EPHEMERAL });
      }
      await fn(i);
      return;
    }

    if (i.isButton()) {
      if (i.customId === 'verify') return handleVerify(i);
      if (i.customId.startsWith('ticket:')) return handleTicketOpen(i, i.customId.slice(7));
      if (i.customId === 'ticket-close') return handleTicketClose(i, false);
      if (i.customId === 'ticket-close-yes') return handleTicketClose(i, true);
    }
  } catch (err) {
    console.error(err);
    const msg = { content: 'Có lỗi xảy ra. Kiểm tra lại quyền của bot (role bot phải nằm trên cùng).', ...EPHEMERAL };
    if (i.isRepliable()) {
      if (i.deferred || i.replied) await i.followUp(msg).catch(() => {});
      else await i.reply(msg).catch(() => {});
    }
  }
});

// Khách rời rồi vào lại: tự trả lại role sản phẩm và cấp
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.guild.id !== GUILD_ID || member.user.bot) return;
  const tier = await syncMember(member).catch(() => null);
  await log(member.guild, 'log_member', baseEmbed('📥 Thành viên vào').setDescription(
    `${member} (${member.id})\nTạo tài khoản: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` +
    (tier ? `\nĐã khôi phục cấp ${cfg.tierLabels[tier]}` : '')
  ));
});

client.on(Events.GuildMemberRemove, async (member) => {
  if (member.guild.id !== GUILD_ID) return;
  await log(member.guild, 'log_member', baseEmbed('📤 Thành viên rời').setDescription(`${member.user.tag} (${member.id})`));
});

client.login(DISCORD_TOKEN);
