import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shadow Harness",
  description: "Your AI-powered shadow that plans your week 10x better",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
