// ============================================================
//  CẤU HÌNH STORE — chỉnh tên, màu, nội dung tại đây
// ============================================================

module.exports = {
  storeName: 'Peaky Store',
  embedColor: 0xc9a227,
  footer: 'Peaky Store',

  // ---------- ROLE (xếp từ cao xuống thấp) ----------
  // key dùng trong code, name là tên hiển thị trên Discord
  roles: {
    peaky:    { name: '👑 Peaky',    color: 0xc9a227, hoist: true,  admin: true },
    support:  { name: '🛠️ Support',  color: 0x7b5cd6, hoist: true,  staff: true },
    partner:  { name: '🤝 Partner',  color: 0xe58bb8, hoist: true },
    diamond:  { name: '💎 Diamond',  color: 0x7fd8ff, hoist: true },
    gold:     { name: '🥇 Gold',     color: 0xf1c40f, hoist: true },
    customer: { name: '🛒 Customer', color: 0xb8b8c8, hoist: false },
    member:   { name: 'Member',      color: 0x8a8a99, hoist: false }
  },

  // Cấp khách hàng, thứ tự từ thấp lên cao.
  // Cấp của khách = cấp cao nhất trong các sản phẩm họ đã mua.
  tiers: ['customer', 'gold', 'diamond'],
  tierLabels: { customer: '🛒 Customer', gold: '🥇 Gold', diamond: '💎 Diamond' },

  // Màu role riêng của từng sản phẩm
  productRoleColor: 0x9b8fb8,

  // Ai được xem từng mức truy cập
  //   staff (Peaky + Support) luôn thấy mọi kênh
  access: {
    everyone: ['@everyone'],
    public:   ['member', 'customer', 'gold', 'diamond', 'partner'],
    customer: ['customer', 'gold', 'diamond'],
    gold:     ['gold', 'diamond'],
    diamond:  ['diamond'],
    partner:  ['partner'],
    staff:    []
  },

  // ---------- KÊNH ----------
  // type: text | forum | voice
  // view: mức xem | readonly: chỉ staff được gửi | writers: mức được gửi (ghi đè readonly)
  categories: [
    {
      name: '📌 THÔNG TIN',
      view: 'public',
      channels: [
        { key: 'verify',   name: '✅・xác-minh',  type: 'text', view: 'everyone', readonly: true },
        { key: 'welcome',  name: '👋・chào-mừng', type: 'text', readonly: true },
        { key: 'rules',    name: '📜・nội-quy',   type: 'text', readonly: true },
        { key: 'news',     name: '📢・thông-báo', type: 'text', readonly: true },
        { key: 'roadmap',  name: '🗺️・roadmap',   type: 'text', readonly: true },
        { key: 'changelog',name: '📝・changelog', type: 'text', readonly: true }
      ]
    },
    {
      name: '🛒 CỬA HÀNG',
      view: 'public',
      channels: [
        { key: 'products', name: '🛍️・sản-phẩm', type: 'forum', readonly: true,
          tags: ['QBX', 'UI', 'Job', 'Hệ thống', 'Gold', 'Diamond', 'Free'] },
        { key: 'tiers',    name: '💎・cấp-bậc-thành-viên', type: 'text', readonly: true },
        { key: 'pricing',  name: '💳・bảng-giá',  type: 'text', readonly: true },
        { key: 'howtobuy', name: '🧾・cách-mua',  type: 'text', readonly: true },
        { key: 'reviews',  name: '⭐・đánh-giá',  type: 'text', readonly: true, writers: 'customer' }
      ]
    },
    {
      name: '🎬 SHOWCASE',
      view: 'public',
      channels: [
        { key: 'video',  name: '🎥・video-preview', type: 'text', readonly: true },
        { key: 'images', name: '🖼️・ảnh-ui',        type: 'text', readonly: true },
        { key: 'free',   name: '🆓・source-free',   type: 'text', readonly: true }
      ]
    },
    {
      name: '🛒 KHU CUSTOMER',
      view: 'customer',
      channels: [
        { key: 'c_install',  name: '📦・hướng-dẫn-cài-đặt', type: 'text', readonly: true },
        { key: 'c_docs',     name: '📚・docs',               type: 'text', readonly: true },
        { key: 'c_download', name: '📥・tải-xuống',          type: 'text', readonly: true },
        { key: 'c_update',   name: '🔄・bản-cập-nhật',       type: 'text', readonly: true },
        { key: 'c_chat',     name: '💬・chat-customer',      type: 'text' }
      ]
    },
    {
      name: '🥇 KHU GOLD',
      view: 'gold',
      channels: [
        { key: 'g_news',     name: '📢・thông-báo-gold', type: 'text', readonly: true },
        { key: 'g_download', name: '📥・tải-xuống-gold', type: 'text', readonly: true },
        { key: 'g_update',   name: '🔄・cập-nhật-gold',  type: 'text', readonly: true },
        { key: 'g_chat',     name: '🥂・gold-lounge',    type: 'text' }
      ]
    },
    {
      name: '💎 KHU DIAMOND',
      view: 'diamond',
      channels: [
        { key: 'd_news',     name: '📢・thông-báo-diamond', type: 'text', readonly: true },
        { key: 'd_download', name: '📥・tải-xuống-diamond', type: 'text', readonly: true },
        { key: 'd_beta',     name: '🧪・beta-test',         type: 'text' },
        { key: 'd_request',  name: '✉️・yêu-cầu-riêng',     type: 'text' },
        { key: 'd_chat',     name: '🍷・diamond-lounge',    type: 'text' },
        { key: 'd_voice',    name: '💎 Diamond Lounge',     type: 'voice' }
      ]
    },
    {
      name: '🎫 HỖ TRỢ',
      view: 'public',
      channels: [
        { key: 'ticket',  name: '🎫・tạo-ticket', type: 'text', readonly: true },
        { key: 'faq',     name: '❓・faq',        type: 'text', readonly: true },
        { key: 'bugs',    name: '🐞・báo-lỗi',    type: 'forum', view: 'customer',
          tags: ['Đang xử lý', 'Đã sửa', 'Không phải lỗi'] },
        { key: 'suggest', name: '💡・đề-xuất',    type: 'text' }
      ]
    },
    {
      name: '🤝 PARTNER',
      view: 'partner',
      channels: [
        { key: 'p_chat', name: '🤝・partner-chat',  type: 'text' },
        { key: 'p_ads',  name: '📣・quảng-bá-partner', type: 'text', view: 'public', readonly: true, writers: 'partner' }
      ]
    },
    {
      name: '💬 CỘNG ĐỒNG',
      view: 'public',
      channels: [
        { key: 'chat',     name: '💬・chat-chung',   type: 'text' },
        { key: 'showoff',  name: '🏙️・khoe-server',  type: 'text' },
        { key: 'voice',    name: '🔊 Phòng Chung',   type: 'voice' }
      ]
    },
    {
      // Mỗi sản phẩm tạo bằng /san-pham-tao sẽ có 1 kênh riêng ở đây,
      // chỉ người đã mua sản phẩm đó (và staff) mới thấy
      key: 'productCategory',
      name: '📥 SẢN PHẨM CỦA BẠN',
      view: 'staff',
      channels: []
    },
    {
      key: 'ticketCategory',
      name: '📂 TICKET',
      view: 'staff',
      channels: []
    },
    {
      name: '🔒 STAFF',
      view: 'staff',
      channels: [
        { key: 'staffchat',  name: '💬・staff-chat',     type: 'text' },
        { key: 'log_order',  name: '📋・log-cấp-gói',    type: 'text' },
        { key: 'log_ticket', name: '📋・log-ticket',     type: 'text' },
        { key: 'log_member', name: '📋・log-thành-viên', type: 'text' }
      ]
    }
  ],

  // ---------- NỘI DUNG CÁC BẢNG ----------
  rulesText: [
    '**1.** Tôn trọng mọi thành viên, không xúc phạm hay gây war.',
    '**2.** Không spam, không quảng cáo khi chưa được cho phép.',
    '**3.** Nghiêm cấm chia sẻ lại, bán lại hoặc leak sản phẩm đã mua.',
    '**4.** Mỗi giấy phép chỉ dùng cho server đã đăng ký khi mua.',
    '**5.** Cần hỗ trợ vui lòng mở ticket, không nhắn riêng staff.',
    '**6.** Vi phạm điều 3 sẽ bị thu hồi gói và cấm vĩnh viễn, không hoàn tiền.'
  ].join('\n'),

  tierInfo: [
    {
      key: 'customer',
      title: '🛒 Customer',
      price: 'Liên hệ',
      perks: [
        'Truy cập khu Customer',
        'Hướng dẫn cài đặt và docs đầy đủ',
        'Nhận bản cập nhật của sản phẩm đã mua'
      ]
    },
    {
      key: 'gold',
      title: '🥇 Gold',
      price: 'Liên hệ',
      perks: [
        'Toàn bộ quyền lợi Customer',
        'Mở khóa khu Gold và các script gói Gold',
        'Ticket được xử lý ưu tiên'
      ]
    },
    {
      key: 'diamond',
      title: '💎 Diamond',
      price: 'Liên hệ',
      perks: [
        'Toàn bộ quyền lợi Gold',
        'Mở khóa khu Diamond và các script gói Diamond',
        'Dùng thử bản beta trước khi phát hành',
        'Gửi yêu cầu riêng trực tiếp đến dev',
        'Ưu tiên hỗ trợ cao nhất'
      ]
    }
  ],

  ticketTypes: [
    { id: 'buy',     label: 'Mua hàng',          emoji: '🛒', style: 'Success' },
    { id: 'support', label: 'Hỗ trợ kỹ thuật',   emoji: '🛠️', style: 'Primary', requiresPurchase: true },
    { id: 'other',   label: 'Vấn đề khác',       emoji: '📩', style: 'Secondary' }
  ],

  ticketCooldownMs: 30_000
};
