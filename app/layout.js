// ============================================
// ROOT LAYOUT — Wraps every page
// ============================================
// WHAT: This is the outer shell of your website.
// Every page (home, clip, admin) lives inside this.
// It includes the metadata (title, description)
// and the global styles.

import "./globals.css";

export const metadata = {
  title: "Secure Clipboard",
  description: "Share text and files securely with auto-expiry",
  // Prevent search engines from indexing (privacy)
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 
                       dark:from-gray-900 dark:to-gray-800"
      >
        {/* Main content area */}
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          {children}
        </main>

        {/* Footer */}
        <footer className="text-center py-8 text-gray-500 text-sm">
          <p>🔒 Secure Clipboard • Auto-expires in 10 minutes</p>
        </footer>
      </body>
    </html>
  );
}
