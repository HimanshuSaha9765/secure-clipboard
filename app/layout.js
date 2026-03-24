import "./globals.css";

export const metadata = {
  title: "Secure Clipboard",
  description: "Share text and files securely with auto-expiry",
  robots: "noindex, nofollow",
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
      </body>
    </html>
  );
}
