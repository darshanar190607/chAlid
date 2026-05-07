import { Providers } from "@/components/Providers";
import "../index.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "chAIid — AI Baby Health Companion", template: "%s | chAIid" },
  description: "AI-powered maternal & child health companion for Indian parents. Track vaccines, growth, symptoms in your language.",
  keywords: ["baby health", "vaccine tracker", "Indian parents", "AI health", "child care"],
  manifest: "/manifest.webmanifest",
  themeColor: "#FF6B35",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
