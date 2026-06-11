import './globals.css';
import Link from 'next/link';
import ModulesMenu from '@/components/ModulesMenu';
import RouteGuard from '@/components/RouteGuard'; // Injeção da malha de segurança

export const metadata = {
  title: 'Orion ERP - AC Odontologia',
  description: 'Sistema Integrado de Gestão Clínica e Financeira',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="bg-[#F8FAFC]">
        {/* O RouteGuard monitora e bloqueia de forma atômica o ciclo de vida do roteador */}
        <RouteGuard>
          <nav className="fixed top-0 w-full bg-white border-b border-slate-200 z-50">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
              <Link href="/" className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tighter">
                ORION <span className="text-blue-600 italic">ERP</span>
              </Link>
              <ModulesMenu />
            </div>
          </nav>
          <main className="pt-20">
            {children}
          </main>
        </RouteGuard>
      </body>
    </html>
  );
}