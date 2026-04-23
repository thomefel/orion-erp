// app/layout.tsx
import './globals.css';
import Link from 'next/link';
import { LayoutDashboard, Receipt, Send } from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="bg-[#F8FAFC]">
        <nav className="fixed top-0 w-full bg-white border-b border-slate-200 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-black text-slate-900 flex items-center gap-2">
              ORION <span className="text-blue-600 italic">ERP</span>
            </Link>
            
            <div className="flex gap-8">
              <Link href="/recebiveis" className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">
                <Receipt size={18} /> Recebíveis
              </Link>
              <Link href="/envios" className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">
                <Send size={18} /> Controle de Envios
              </Link>
            </div>
          </div>
        </nav>
        <main className="pt-24 pb-12 px-6">
          {children}
        </main>
      </body>
    </html>
  );
}