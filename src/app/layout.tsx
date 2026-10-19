import type { Metadata, Viewport } from "next";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";
import { THEME_SCRIPT } from "@/components/shell/theme";

export const metadata: Metadata = {
  title: { default: "ThiagoCRM", template: "%s · ThiagoCRM" },
  description: "CRM da Thiago Alemão Gestão Empresarial Veterinária",
};

export const viewport: Viewport = {
  themeColor: "#0b2440",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
