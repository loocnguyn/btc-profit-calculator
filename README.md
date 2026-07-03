# Máy tính lợi nhuận BTC

Web app đơn giản tính lợi nhuận mua/bán BTC bằng lệnh dạng text, chạy 24/24 miễn phí trên Vercel.

## Các lệnh

```
/cal <giá_mua> <giá_bán> <số_tiền_usd>    — tính nhanh lãi, hiện ở Lịch sử
/profit <entry> <sell> <vốn>              — ghi nhận khoản lãi vào Tổng lợi nhuận
/goal <giá>                               — vẽ đường mục tiêu take-profit lên chart
/cleargoal                                — xoá đường mục tiêu
/entry <giá>                              — vẽ đường giá vào lệnh lên chart
/clearentry                               — xoá đường giá vào lệnh
```

Ví dụ: `/cal 59500 63500 151`

## Chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:3000

## Deploy lên Vercel

1. Push project này lên một repo GitHub.
2. Vào [vercel.com](https://vercel.com) → **Add New Project** → import repo vừa push.
3. Vercel tự nhận diện Next.js, không cần cấu hình thêm.
4. (Tuỳ chọn) Thêm 2 biến môi trường Supabase — xem mục bên dưới.
5. Bấm **Deploy** — xong, app chạy 24/24 miễn phí.

## Lưu Sổ lãi dài hạn bằng Supabase (tuỳ chọn)

Mặc định app lưu mọi thứ bằng `localStorage` của trình duyệt — không cần bước này. Nếu muốn Sổ lãi (`/profit`) được lưu bền vững trên cloud (đồng bộ qua nhiều lần mở lại, không sợ mất khi xoá cache), làm theo:

1. Tạo project free tại [supabase.com](https://supabase.com) → vào **Settings → API**, lấy `Project URL` và `anon public key`.
2. Vào **SQL Editor**, chạy:
   ```sql
   create table if not exists profit_entries (
     id text primary key,
     user_code text not null,
     entry numeric not null,
     sell numeric not null,
     money numeric not null,
     profit_usd numeric not null,
     profit_percent numeric not null,
     created_at timestamptz default now()
   );
   create index if not exists idx_profit_entries_user on profit_entries(user_code);
   alter table profit_entries enable row level security;
   create policy "anon rw" on profit_entries for all
     to anon using (true) with check (true);
   ```
3. Tạo file `.env.local` (đã có trong `.gitignore`, không commit lên git) từ mẫu `.env.local.example`, điền:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxx
   ```
4. Trên Vercel: **Settings → Environment Variables**, thêm 2 biến trên → redeploy.

> Lưu ý: app không có đăng nhập, nên dữ liệu chỉ **tách theo một mã ngẫu nhiên lưu trong trình duyệt** (không phải bảo mật thật — ai có `anon key` + biết cách gọi API đều đọc/ghi được). Đủ dùng cho công cụ cá nhân, không phù hợp cho dữ liệu nhạy cảm nhiều người dùng.

## Ghi chú

- Giá BTC hiện tại lấy real-time qua Binance WebSocket, tự reconnect khi rớt mạng; tiêu đề tab trình duyệt cũng hiển thị giá theo thời gian thực.
- Goal/Entry, Lịch sử `/cal` luôn lưu ở `localStorage` (tạm thời theo trình duyệt). Sổ lãi `/profit` lưu `localStorage` mặc định, hoặc Supabase nếu đã cấu hình.
