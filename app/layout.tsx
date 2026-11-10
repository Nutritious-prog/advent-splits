import type { Metadata, Viewport } from "next";
import "@fontsource/anton/index.css";
import "@fontsource-variable/archivo/index.css";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { MotionProvider } from "@/components/ui/MotionProvider";
import { config } from "@/lib/config";
import { TestToggle } from "@/components/TestToggle";
import { testStatus } from "@/lib/test-clock";

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: "THE ADVENT SPLITS — 24 dni. 24 wyzwania.",
  description: `Sportowy kalendarz adwentowy od @${config.instagram}. 24 dni, 24 wyzwania dla biegaczy, kolarzy i pływaków. Ten sam kalendarz dla wszystkich.`,
  openGraph: {
    title: "THE ADVENT SPLITS",
    description: "24 DAYS. 24 CHALLENGES. QUESTIONABLE DECISIONS.",
    type: "website",
    locale: "pl_PL",
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#191919",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const test = await testStatus();
  return (
    <html lang="pl">
      <body>
        <MotionProvider>
          <ToastProvider>
            {children}
            {test.allowed && <TestToggle status={test} />}
          </ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
