import "./globals.css";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";
export const metadata: Metadata = {
  title: "WORK/SHOP · Commerce Launchpad",
  description: "A B2C and B2B commercetools training storefront",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <Header />
          {children}
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
