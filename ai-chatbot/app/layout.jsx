import "./globals.css";

export const metadata = {
  title: "AI Chatbot | KodeCamp 5.x",
  description: "AI-enriched chatbot powered by LangChain Agent",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full bg-[#0f1117]">{children}</body>
    </html>
  );
}