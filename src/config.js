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
      name: '👑 PEAKY CLUB',
      view: 'public',
      channels: [
        { key: 'verify', name: '✅・xác-minh',   type: 'text', view: 'everyone', readonly: true },
        { key: 'news',   name: '📢・thông-báo',  type: 'text', readonly: true },
        { key: 'rules',  name: '📜・nội-quy',    type: 'text', readonly: true },
        { key: 'tiers',  name: '💎・bảng-giá',   type: 'text', readonly: true },
        { key: 'ticket', name: '🎫・tạo-ticket', type: 'text', readonly: true }
      ]
    },
    {
      name: '🆓 FREE',
      view: 'public',
      channels: [
        { key: 'f_scripts',  name: '📜・free-scripts',  type: 'text', readonly: true },
        { key: 'f_maps',     name: '🗺️・free-maps',     type: 'text', readonly: true },
        { key: 'f_vehicles', name: '🚗・free-vehicles', type: 'text', readonly: true },
        { key: 'f_clothing', name: '👕・free-clothing', type: 'text', readonly: true },
        { key: 'f_ui',       name: '🖥️・free-ui',       type: 'text', readonly: true }
      ]
    },
    {
      name: '🥇 GOLD',
      view: 'gold',
      channels: [
        { key: 'g_scripts',  name: '📜・gold-scripts',  type: 'text', readonly: true },
        { key: 'g_maps',     name: '🗺️・gold-maps',     type: 'text', readonly: true },
        { key: 'g_vehicles', name: '🚗・gold-vehicles', type: 'text', readonly: true },
        { key: 'g_clothing', name: '👕・gold-clothing', type: 'text', readonly: true },
        { key: 'g_ui',       name: '🖥️・gold-ui',       type: 'text', readonly: true }
      ]
    },
    {
      name: '💎 DIAMOND',
      view: 'diamond',
      channels: [
        { key: 'd_scripts',  name: '📜・diamond-scripts',  type: 'text', readonly: true },
        { key: 'd_maps',     name: '🗺️・diamond-maps',     type: 'text', readonly: true },
        { key: 'd_vehicles', name: '🚗・diamond-vehicles', type: 'text', readonly: true },
        { key: 'd_clothing', name: '👕・diamond-clothing', type: 'text', readonly: true },
        { key: 'd_ui',       name: '🖥️・diamond-ui',       type: 'text', readonly: true }
      ]
    },
    {
      // Mỗi sản phẩm tạo bằng /san-pham-tao có 1 kênh riêng ở đây,
      // chỉ người đã mua sản phẩm đó (và staff) mới thấy
      key: 'productCategory',
      name: '📥 TẢI XUỐNG',
      view: 'staff',
      channels: []
    },
    {
      name: '💬 CỘNG ĐỒNG',
      view: 'public',
      channels: [
        { key: 'chat',    name: '💬・chat',     type: 'text' },
        { key: 'reviews', name: '⭐・đánh-giá', type: 'text', readonly: true, writers: 'customer' }
      ]
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

  // Nội dung bảng giá (kênh 💎・bảng-giá)
  tierInfo: [
    {
      key: 'customer',
      title: '🛒 Customer',
      price: 'Theo từng sản phẩm',
      perks: [
        'Mua lẻ từng sản phẩm',
        'Kênh tải riêng cho sản phẩm đã mua',
        'Nhận cập nhật và hỗ trợ qua ticket'
      ]
    },
    {
      key: 'gold',
      title: '🥇 Gold',
      price: 'Liên hệ',
      perks: [
        'Mở khóa 5 kênh Gold: Scripts, Maps, Vehicles, Clothing, UI',
        'Ticket được xử lý ưu tiên'
      ]
    },
    {
      key: 'diamond',
      title: '💎 Diamond',
      price: 'Liên hệ',
      perks: [
        'Toàn bộ quyền lợi Gold',
        'Mở khóa 5 kênh Diamond: Scripts, Maps, Vehicles, Clothing, UI',
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
