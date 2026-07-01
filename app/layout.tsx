import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BTC Profit Calculator",
  description: "Tính nhanh lợi nhuận mua bán BTC bằng lệnh text.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-bg text-neutral-100 antialiased">{children}</body>
    </html>
  );
}
