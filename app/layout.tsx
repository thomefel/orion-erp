// app/layout.tsx
import './globals.css';
import Link from 'next/link';
import ModulesMenu from '@/components/ModulesMenu'; // Importação do novo submódulo interativo

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="bg-[#F8FAFC]">
        <nav className="fixed top-0 w-full bg-white border-b border-slate-200 z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tighter">
              ORION <span className="text-blue-600 italic">ERP</span>
            </Link>
            
            {/* Componente Cliente Injetado mantendo a harmonia visual */}
            <ModulesMenu />
          </div>
        </nav>
        <main className="pt-20">
          {children}
        </main>
      </body>
    </html>
  );
}