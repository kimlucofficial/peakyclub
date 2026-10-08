// Dựng role, category, kênh, phân quyền và các bảng (panel) cố định
const {
  ChannelType, PermissionFlagsBits: P, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const cfg = require('./config');
const store = require('./store');

const TYPE = { text: ChannelType.GuildText, forum: ChannelType.GuildForum, voice: ChannelType.GuildVoice };

// ---------- ROLE ----------
async function ensureRoles(guild, report) {
  const data = store.get();
  const keys = Object.keys(cfg.roles);

  for (const key of keys) {
    const def = cfg.roles[key];
    let role = data.roles[key] && guild.roles.cache.get(data.roles[key]);
    if (!role) role = guild.roles.cache.find((r) => r.name === def.name);

    const perms = def.admin ? [P.Administrator] : [];
    const fields = { name: def.name, colors: { primaryColor: def.color }, hoist: def.hoist, permissions: perms, mentionable: false };

    if (!role) {
      role = await guild.roles.create({ ...fields, reason: 'Store setup' });
      report.created.push(`Role ${def.name}`);
    } else if (role.editable) {
      await role.edit({ ...fields, reason: 'Store setup' });
    }
    data.roles[key] = role.id;
  }

  // Sắp thứ tự role ngay dưới role của bot, đúng thứ tự trong config
  const me = guild.members.me;
  const top = me.roles.highest.position;
  const positions = keys
    .map((k, i) => ({ role: data.roles[k], position: Math.max(1, top - 1 - i) }))
    .filter(({ role }) => guild.roles.cache.get(role)?.editable);
  try {
    await guild.roles.setPositions(positions);
  } catch (err) {
    report.warnings.push('Không sắp được thứ tự role. Hãy kéo role của bot lên trên cùng rồi chạy lại /setup.');
  }

  store.save();
}

// ---------- PHÂN QUYỀN ----------
function roleIdsFor(level) {
  const data = store.get();
  return (cfg.access[level] || []).filter((k) => k !== '@everyone').map((k) => data.roles[k]).filter(Boolean);
}

function buildOverwrites(guild, { view, readonly, writers, type }) {
  const data = store.get();
  const isVoice = type === 'voice';
  const isForum = type === 'forum';
  const viewAllow = [P.ViewChannel, P.ReadMessageHistory, ...(isVoice ? [P.Connect, P.Speak] : [])];
  const sendPerms = [P.SendMessages, P.AttachFiles, P.EmbedLinks, P.AddReactions];

  const out = [];
  const add = (id, allow = [], deny = [], memberType = 0) => out.push({ id, allow, deny, type: memberType });

  // @everyone
  if (view === 'everyone') {
    add(guild.id, viewAllow, readonly ? [P.SendMessages, P.CreatePublicThreads, P.CreatePrivateThreads, P.SendMessagesInThreads] : []);
  } else {
    add(guild.id, [], [P.ViewChannel]);
  }

  // Nhóm được xem
  for (const id of roleIdsFor(view)) {
    if (readonly) {
      // Forum chỉ đọc: không được tạo bài, nhưng vẫn được bình luận dưới bài
      const deny = isForum
        ? [P.SendMessages]
        : [P.SendMessages, P.CreatePublicThreads, P.CreatePrivateThreads, P.SendMessagesInThreads];
      add(id, viewAllow, deny);
    } else {
      add(id, [...viewAllow, ...(isVoice ? [] : sendPerms)]);
    }
  }

  // Nhóm được gửi (ghi đè readonly), nhưng chỉ khi họ cũng được xem
  if (writers) {
    const viewers = new Set(roleIdsFor(view));
    for (const id of roleIdsFor(writers)) {
      const existing = out.find((o) => o.id === id);
      if (existing) {
        existing.deny = [];
        existing.allow = [...viewAllow, ...sendPerms];
      } else if (view === 'everyone' || viewers.size === 0) {
        add(id, [...viewAllow, ...sendPerms]);
      }
    }
  }

  // Support: xem và quản lý mọi kênh
  if (data.roles.support) {
    add(data.roles.support, [...viewAllow, ...sendPerms, P.ManageMessages, P.ManageThreads, ...(isVoice ? [P.MoveMembers, P.MuteMembers] : [])]);
  }

  // Bot luôn được xem và gửi để đăng panel, log
  add(guild.members.me.id, [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.EmbedLinks, P.AttachFiles, P.ManageMessages, P.ManageChannels, ...(isVoice ? [P.Connect] : [])], [], 1);

  return out;
}

// ---------- KÊNH ----------
async function findOrCreate(guild, key, def, parentId, report) {
  const data = store.get();
  let ch = data.channels[key] && guild.channels.cache.get(data.channels[key]);
  if (!ch) {
    ch = guild.channels.cache.find((c) => c.name === def.name && c.type === def.channelType && (c.parentId ?? null) === (parentId ?? null));
  }

  const opts = {
    name: def.name,
    type: def.channelType,
    parent: parentId ?? null,
    permissionOverwrites: def.overwrites
  };
  if (def.channelType === ChannelType.GuildForum && def.tags) {
    opts.availableTags = def.tags.map((name) => ({ name }));
  }

  if (!ch) {
    ch = await guild.channels.create({ ...opts, reason: 'Store setup' });
    report.created.push(`Kênh ${def.name}`);
  } else {
    const edit = { name: def.name, parent: parentId ?? null, permissionOverwrites: def.overwrites, lockPermissions: false };
    if (opts.availableTags) {
      // Giữ tag cũ, chỉ thêm tag còn thiếu
      const have = new Set(ch.availableTags.map((t) => t.name));
      edit.availableTags = [...ch.availableTags, ...opts.availableTags.filter((t) => !have.has(t.name))];
    }
    await ch.edit(edit);
  }
  data.channels[key] = ch.id;
  return ch;
}

async function ensureChannels(guild, report) {
  for (const cat of cfg.categories) {
    const catKey = cat.key || `cat:${cat.name}`;
    const category = await findOrCreate(guild, catKey, {
      name: cat.name,
      channelType: ChannelType.GuildCategory,
      overwrites: buildOverwrites(guild, { view: cat.view, type: 'text' })
    }, null, report);

    for (const ch of cat.channels) {
      const view = ch.view || cat.view;
      await findOrCreate(guild, ch.key, {
        name: ch.name,
        channelType: TYPE[ch.type],
        tags: ch.tags,
        overwrites: buildOverwrites(guild, { view, readonly: ch.readonly, writers: ch.writers, type: ch.type })
      }, category.id, report);
    }
  }
  store.save();
}

// Kênh riêng cho 1 sản phẩm: chỉ role sản phẩm + staff thấy, chỉ staff gửi
function productOverwrites(guild, productRoleId) {
  const data = store.get();
  const view = [P.ViewChannel, P.ReadMessageHistory];
  const send = [P.SendMessages, P.AttachFiles, P.EmbedLinks, P.ManageMessages];
  const out = [
    { id: guild.id, deny: [P.ViewChannel] },
    { id: productRoleId, allow: view, deny: [P.SendMessages, P.CreatePublicThreads, P.CreatePrivateThreads, P.SendMessagesInThreads] },
    { id: guild.members.me.id, allow: [...view, ...send, P.ManageChannels], type: 1 }
  ];
  if (data.roles.support) out.push({ id: data.roles.support, allow: [...view, ...send] });
  return out;
}

// ---------- PANEL ----------
async function upsertPanel(channel, marker, payload) {
  const footerText = `${cfg.footer} • ${marker}`;
  payload.embeds[0].setFooter({ text: footerText });
  const msgs = await channel.messages.fetch({ limit: 50 });
  const old = msgs.find((m) => m.author.id === channel.client.user.id && m.embeds[0]?.footer?.text === footerText);
  if (old) return old.edit(payload);
  return channel.send(payload);
}

async function postPanels(guild) {
  const ch = (key) => guild.channels.cache.get(store.get().channels[key]);

  // Xác minh
  if (ch('verify')) {
    await upsertPanel(ch('verify'), 'Xác minh', {
      embeds: [new EmbedBuilder()
        .setColor(cfg.embedColor)
        .setTitle(`Chào mừng đến với ${cfg.storeName}`)
        .setDescription('Bấm nút bên dưới để xác minh và mở khóa các kênh của server.')],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify').setLabel('Xác minh').setEmoji('✅').setStyle(ButtonStyle.Success)
      )]
    });
  }

  // Nội quy
  if (ch('rules')) {
    await upsertPanel(ch('rules'), 'Nội quy', {
      embeds: [new EmbedBuilder().setColor(cfg.embedColor).setTitle('📜 Nội quy').setDescription(cfg.rulesText)]
    });
  }

  // Cấp bậc
  if (ch('tiers')) {
    const embed = new EmbedBuilder()
      .setColor(cfg.embedColor)
      .setTitle('💎 Bảng giá')
      .setDescription('Cấp của bạn được tính theo sản phẩm cao nhất bạn đã mua. Dùng lệnh `/da-mua` để xem sản phẩm và cấp hiện tại.');
    for (const t of cfg.tierInfo) {
      embed.addFields({ name: `${t.title} — ${t.price}`, value: t.perks.map((p) => `› ${p}`).join('\n') });
    }
    await upsertPanel(ch('tiers'), 'Bảng giá', { embeds: [embed] });
  }

  // Ticket
  if (ch('ticket')) {
    const row = new ActionRowBuilder().addComponents(
      cfg.ticketTypes.map((t) => new ButtonBuilder()
        .setCustomId(`ticket:${t.id}`)
        .setLabel(t.label)
        .setEmoji(t.emoji)
        .setStyle(ButtonStyle[t.style]))
    );
    await upsertPanel(ch('ticket'), 'Ticket', {
      embeds: [new EmbedBuilder()
        .setColor(cfg.embedColor)
        .setTitle('🎫 Hỗ trợ')
        .setDescription('Chọn loại hỗ trợ bạn cần. Mỗi người chỉ mở được một ticket cùng lúc.\n\nHỗ trợ kỹ thuật chỉ dành cho khách đã mua sản phẩm.')],
      components: [row]
    });
  }
}

// Kênh bot từng tạo nhưng không còn trong config
async function cleanupOldChannels(guild, remove, report) {
  const data = store.get();
  const valid = new Set();
  for (const cat of cfg.categories) {
    valid.add(cat.key || `cat:${cat.name}`);
    for (const ch of cat.channels) valid.add(ch.key);
  }

  const stale = Object.keys(data.channels).filter((k) => !valid.has(k));
  if (!remove) {
    if (stale.length) report.warnings.push(`Có ${stale.length} kênh cũ không còn dùng. Chạy /setup xoa_kenh_cu:True để xóa.`);
    return;
  }

  // Xóa kênh con trước, category sau
  const items = stale
    .map((k) => ({ k, ch: guild.channels.cache.get(data.channels[k]) }))
    .sort((a, b) => (a.ch?.type === ChannelType.GuildCategory) - (b.ch?.type === ChannelType.GuildCategory));
  for (const { k, ch } of items) {
    if (ch) await ch.delete('Dọn kênh cũ').catch(() => {});
    delete data.channels[k];
  }
  store.save();
  if (items.length) report.removed = items.length;
}

async function runSetup(guild, { cleanup = false } = {}) {
  const report = { created: [], warnings: [], removed: 0 };
  await guild.roles.fetch();
  await guild.channels.fetch();
  await ensureRoles(guild, report);
  await ensureChannels(guild, report);
  await cleanupOldChannels(guild, cleanup, report);
  await postPanels(guild);
  return report;
}

module.exports = { runSetup, productOverwrites, buildOverwrites };
