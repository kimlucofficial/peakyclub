# Peaky Store Bot

Bot dựng toàn bộ server Discord bán source: role, kênh, phân quyền, xác minh, ticket và **hệ thống ghi nhận khách đã mua gì**.

## Cách hoạt động

**Sản phẩm là nguồn gốc của mọi quyền.** Bạn tạo sản phẩm, gắn nó với một cấp (Customer, Gold hoặc Diamond). Khi bạn ghi nhận khách đã mua, bot tự:

1. Gán role riêng của sản phẩm, để khách thấy **kênh tải xuống riêng** của sản phẩm đó.
2. Tính cấp của khách = cấp cao nhất trong các sản phẩm họ đã mua, rồi gán đúng **một** role cấp.
3. Ghi log vào `📋・log-cấp-gói` và nhắn riêng cho khách.

Thu hồi một sản phẩm thì bot tự tính lại cấp. Ví dụ khách có 1 sản phẩm Diamond và 1 sản phẩm Gold, thu hồi bản Diamond thì khách tự xuống Gold.

Khách rời server rồi vào lại, bot tự trả lại đúng role đã mua.

## Ai thấy gì

| Khu vực | Chưa xác minh | Member | Customer | Gold | Diamond | Support |
|---|---|---|---|---|---|---|
| ✅ xác-minh | Xem | Xem | Xem | Xem | Xem | Gửi |
| 👑 Peaky Club, 🆓 Free | — | Xem | Xem | Xem | Xem | Gửi |
| 💬 chat | — | Gửi | Gửi | Gửi | Gửi | Gửi |
| ⭐ đánh-giá | — | Xem | Gửi | Gửi | Gửi | Gửi |
| 🥇 Gold (5 kênh) | — | — | — | Xem | Xem | Gửi |
| 💎 Diamond (5 kênh) | — | — | — | — | Xem | Gửi |
| 📥 Tải xuống | — | — | Chỉ sản phẩm đã mua | ← | ← | Gửi |
| 📂 Ticket, 🔒 Staff | — | — | — | — | — | Có |

Mọi kênh nội dung đều chỉ staff được đăng, khách chỉ xem và tải.

**Bán gói Gold / Diamond:** `/san-pham-tao ten:"Gói Gold" cap:Gold`, rồi `/cap-san-pham` cho khách mua gói.
**Bán lẻ từng source:** tạo mỗi source là một sản phẩm cấp Customer (hoặc cấp khác nếu muốn tặng kèm quyền vào khu Gold/Diamond).

## Lệnh

**Chỉ Peaky (Administrator):**
- `/setup` — dựng hoặc cập nhật toàn bộ server. Chạy lại nhiều lần không bị tạo trùng. Thêm `xoa_kenh_cu:True` để xóa kênh của bản cũ.
- `/san-pham-tao ten cap` — tạo sản phẩm, kèm role và kênh riêng.
- `/san-pham-sua san_pham cap` — đổi cấp sản phẩm, tự tính lại cấp cho người đã mua.
- `/san-pham-xoa san_pham xac_nhan` — xóa sản phẩm, role và kênh của nó, thu hồi khỏi mọi người mua.

**Peaky và Support:**
- `/cap-san-pham khach san_pham ghi_chu` — ghi nhận khách đã mua. Ghi chú nên điền mã đơn Tebex.
- `/thu-hoi khach san_pham ly_do`
- `/kiem-tra khach` — xem khách đã mua gì, cấp hiện tại.
- `/san-pham-danh-sach` — danh sách sản phẩm và số người mua.

**Đăng bài (Peaky và Support):**
- `/dang kenh file link anh video ping` — đăng source thành embed. Sau khi gõ lệnh, bot mở form nhập Tên, Mô tả, Framework, Phiên bản, Yêu cầu.
  - Cần ít nhất **file** hoặc **link**. File lớn hơn giới hạn upload của server thì dùng link (Drive, MEGA…).
  - Màu embed tự đổi theo khu: xanh lá cho Free, vàng cho Gold, xanh kim cương cho Diamond.
  - Mô tả nhiều dòng sẽ tự thành gạch đầu dòng.
  - `ping` để trống nếu không muốn thông báo.

**Mọi người:**
- `/da-mua` — xem sản phẩm của mình (chỉ mình thấy).

## Ticket

- 3 loại: Mua hàng, Hỗ trợ kỹ thuật, Vấn đề khác.
- **Hỗ trợ kỹ thuật chỉ mở được khi đã mua ít nhất 1 sản phẩm.**
- Mỗi người chỉ mở 1 ticket cùng lúc, có chống spam 30 giây.
- Ticket hiện sẵn cấp và danh sách sản phẩm đã mua, staff không cần hỏi lại.
- Tên ticket có 💎 / 🥇 để staff thấy khách VIP ngay.
- Khi đóng, toàn bộ nội dung được lưu thành file `.txt` vào `📋・log-ticket`.

## Cài đặt

### 1. Tạo bot
1. Vào https://discord.com/developers/applications → **New Application**.
2. Tab **Bot** → **Reset Token** → copy token.
3. Cùng tab **Bot**, bật **Server Members Intent**. Thiếu cái này bot không chạy được.
4. Tab **OAuth2 → URL Generator**: chọn `bot` và `applications.commands`, quyền chọn **Administrator**. Mở link để mời bot vào server.

### 2. Kéo role bot lên trên cùng
Server Settings → Roles → kéo role của bot lên **trên cùng**. Bot chỉ quản lý được role nằm dưới nó.

### 3. Chạy trên máy
```bash
npm install
cp .env.example .env    # rồi điền DISCORD_TOKEN, CLIENT_ID, GUILD_ID
npm start
```
Sau đó vào Discord gõ `/setup`.

### 4. Chạy trên Railway
1. Đẩy thư mục này lên GitHub (không đẩy file `.env` và thư mục `data`).
2. Railway → New Project → Deploy from GitHub.
3. Tab **Variables**: thêm `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `DATA_DIR=/data`.
4. Chuột phải service → **Attach Volume**, mount path `/data`.

**Bắt buộc phải có volume.** Không có volume thì mỗi lần Railway deploy lại, toàn bộ lịch sử mua hàng sẽ mất.

## Tùy chỉnh

Mọi thứ nằm trong `src/config.js`:
- Tên store, màu embed.
- Tên và màu role.
- Danh sách category và kênh (thêm, bớt, đổi tên, đổi quyền).
- Nội quy, giá và quyền lợi từng cấp (đang để "Liên hệ").
- Loại ticket.

Sửa xong chạy lại `/setup`.

**Lưu ý khi đổi tên kênh trong config:** bot nhớ kênh theo `key`, nên đổi `name` thì kênh cũ được đổi tên, không tạo trùng. Đừng đổi `key`.

## Sao lưu

Toàn bộ dữ liệu mua hàng nằm trong `data/store.json`. Nên tải file này về định kỳ.

## Quy trình bán hàng gợi ý

1. Đăng bài giới thiệu trong forum `🛍️・sản-phẩm` (ảnh, video, giá, dependency, gắn tag).
2. `/san-pham-tao` → đăng file tải và hướng dẫn vào kênh 📦 riêng của sản phẩm.
3. Khách thanh toán qua Tebex → bạn hoặc Support dùng `/cap-san-pham` kèm mã đơn.
4. Khách tự thấy kênh tải và khu cấp của mình.
