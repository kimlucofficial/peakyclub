// Lưu dữ liệu vào file JSON (ghi nguyên tử để không hỏng file khi bot tắt đột ngột)
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'store.json');

const empty = () => ({
  ticketCounter: 0,
  channels: {},   // key kênh -> id (do /setup ghi)
  roles: {},      // key role -> id
  products: {},   // productId -> { name, tier, roleId, channelId, createdAt }
  purchases: {}   // userId -> [{ productId, at, by, note }]
});

let data = empty();

function load() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(FILE)) {
    try {
      data = { ...empty(), ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
    } catch (err) {
      console.error('[store] store.json bị lỗi, giữ bản sao và tạo mới:', err.message);
      fs.copyFileSync(FILE, `${FILE}.broken-${Date.now()}`);
      data = empty();
    }
  }
  return data;
}

function save() {
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}

const get = () => data;

function nextTicketNumber() {
  data.ticketCounter += 1;
  save();
  return data.ticketCounter;
}

function userPurchases(userId) {
  return data.purchases[userId] || [];
}

function hasProduct(userId, productId) {
  return userPurchases(userId).some((p) => p.productId === productId);
}

function addPurchase(userId, productId, by, note) {
  if (hasProduct(userId, productId)) return false;
  (data.purchases[userId] ||= []).push({ productId, at: Date.now(), by, note: note || null });
  save();
  return true;
}

function removePurchase(userId, productId) {
  const list = userPurchases(userId);
  const next = list.filter((p) => p.productId !== productId);
  if (next.length === list.length) return false;
  if (next.length) data.purchases[userId] = next;
  else delete data.purchases[userId];
  save();
  return true;
}

module.exports = {
  load, save, get, nextTicketNumber,
  userPurchases, hasProduct, addPurchase, removePurchase
};
