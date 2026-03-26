import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Secure Clipboard - Temporary Private Sharing",
  description:
    "Share text and files securely with auto deletion. No login required.",
  verification: {
    google: "0w4cn1BIsmpmt36bKM2CByPcfrw59jvfJ5Hw0gY2I0U",
  },
  robots: {
    index: true,
    follow: true,
  },
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            maxWidth: "896px",
            margin: "0 auto",
            padding: "32px 16px",
            minHeight: "100vh",
          }}
        >
          {children}
        </main>
        <footer
          style={{
            textAlign: "center",
            padding: "32px",
            color: "var(--secondary)",
            fontSize: "14px",
          }}
        >
          <p>🔒 Secure Clipboard • Auto-expires in 10 minutes</p>
        </footer>

        {/* Midas Touch Analytics */}
        <Script
          src="https://midas-touch-analytics.onrender.com/tracker.js"
          data-id="site_ffbe3e80"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
