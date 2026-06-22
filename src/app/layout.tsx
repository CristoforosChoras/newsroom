import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthHydration from "@/components/auth/AuthHydration";

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
    <html
      lang="el"
      // the inline script below sets data-theme before hydration → expected mismatch
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {/* set the saved theme before paint (no flash of the wrong theme) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.setAttribute('data-theme',localStorage.getItem('matrix-theme')||'dark')}catch(e){}",
          }}
        />
        {/* Google Translate rewrites text nodes into <font> tags, desyncing
            React's vdom from the DOM → "removeChild"/"insertBefore" crashes.
            Make both tolerant of the parent mismatch Translate creates.
            Must run before hydration. See React issue #11538. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){if(typeof Node!=='function'||!Node.prototype)return;var r=Node.prototype.removeChild;Node.prototype.removeChild=function(c){return c.parentNode!==this?c:r.apply(this,arguments)};var i=Node.prototype.insertBefore;Node.prototype.insertBefore=function(n,ref){return ref&&ref.parentNode!==this?n:i.apply(this,arguments)}})()",
          }}
        />
        {/* rehydrate the persisted auth session once after mount (both route
            groups); the (app) group's ProtectedRoute then gates access */}
        <AuthHydration />
        {children}
      </body>
    </html>
  );
}
