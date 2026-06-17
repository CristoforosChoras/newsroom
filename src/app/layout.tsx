import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Shell from "@/components/shell/Shell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "greek"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "greek"],
});

export const metadata: Metadata = {
  title: "MATRIX Newsroom Core",
  description: "AI-assisted newsroom for a Greek WordPress media network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        {/* set the saved theme before paint (no flash of the wrong theme) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.setAttribute('data-theme',localStorage.getItem('matrix-theme')||'dark')}catch(e){}",
          }}
        />
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
