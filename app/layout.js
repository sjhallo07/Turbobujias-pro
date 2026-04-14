import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Turbobujias Pro | Bujías, calentadores y repuestos",
  description:
    "E-commerce automotriz con búsqueda por SKU/UPC, carrito inteligente, precios en USD/EUR/VES, y soporte técnico con IA para bujías y calentadores.",
  icons: {
    icon: "/branding/turbobujias-icon.svg",
    shortcut: "/branding/turbobujias-icon.svg",
    apple: "/branding/turbobujias-icon.svg",
  },
  openGraph: {
    title: "Turbobujias Pro | Bujías, calentadores y repuestos",
    description: "E-commerce automotriz con búsqueda por SKU/UPC, carrito inteligente y soporte técnico con IA.",
    type: "website",
    locale: "es_VE",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1a" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning className="bg-background">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
