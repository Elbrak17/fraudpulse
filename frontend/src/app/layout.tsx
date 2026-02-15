import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "FraudPulse — AI-Powered Fraud Detection Dashboard",
  description:
    "Real-time transaction fraud detection powered by dual ML models (Isolation Forest + Autoencoder), SHAP Explainable AI, and Gemini 3.0 LLM-generated insights.",
  keywords: [
    "fraud detection",
    "machine learning",
    "dashboard",
    "real-time",
    "explainable AI",
    "SHAP",
    "fintech",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen">
        {/* Animated mesh background */}
        <div className="mesh-bg" aria-hidden="true" />
        <ThemeProvider>
          <div className="relative z-10">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
