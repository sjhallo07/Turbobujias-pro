import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Turbobujias Pro | Bujías, calentadores y repuestos diésel",
  description:
    "Catálogo Turbobujias con búsqueda por SKU/UPC, carrito Redux, precios en USD y VES, y soporte técnico para bujías y calentadores.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
