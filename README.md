# BTC Profit Calculator

Web app đơn giản tính lợi nhuận mua/bán BTC bằng lệnh dạng text, chạy 24/24 miễn phí trên Vercel.

## Cú pháp lệnh

```
/cal <giá_mua> <giá_bán> <số_tiền_usd>
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
3. Vercel tự nhận diện Next.js, không cần cấu hình thêm, không cần biến môi trường.
4. Bấm **Deploy** — xong, app chạy 24/24 miễn phí.

## Ghi chú

- Toàn bộ logic tính toán chạy client-side, không cần backend/database.
- Giá BTC hiện tại lấy từ CoinGecko public API (không cần API key), tự refresh mỗi 45s.
- Lịch sử tính toán (tối đa 10 lệnh gần nhất) lưu ở `localStorage` của trình duyệt.
