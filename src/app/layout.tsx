import type { Metadata } from "next";
import { Inter } from "next/font/google";
import TopNav from "@/components/TopNav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NV Video Clipper",
  description: "Create perfect video clips with professional quality",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-nvidia-darker">
          <TopNav />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
