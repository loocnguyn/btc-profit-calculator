import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BTC Profit Calculator",
  description: "Quickly calculate BTC trading profit with text commands.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg text-neutral-100 antialiased">{children}</body>
    </html>
  );
}
