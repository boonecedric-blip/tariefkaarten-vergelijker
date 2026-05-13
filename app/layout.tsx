import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'Vlaamse Dynamische Tarieven · Vergelijker',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  description: 'Vergelijk afname en injectie van Vlaamse leveranciers met dynamisch contract, met live evolutie en historisch archief. Een initiatief van Hivolta.',
  openGraph: {
    title: 'Vlaamse Dynamische Tarieven Vergelijker',
    description: 'Vergelijk afname en injectie van alle Vlaamse leveranciers met dynamisch contract.',
    url: 'https://tarieven-app.vercel.app',
    siteName: 'Hivolta · Tarievenvergelijker',
    locale: 'nl_BE',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen bg-hv-cream">
        {/* Header */}
        <header className="bg-hv-dark text-white border-b-[3px] border-hv-green">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <img src="/hivolta-logo.svg" alt="Hivolta" className="w-11 h-11 object-contain" />
              <div>
                <div className="font-display font-bold text-white leading-tight text-sm sm:text-base tracking-tight">
                  Vlaamse Dynamische Tarieven
                </div>
                <div className="text-xs text-white/65 leading-tight mt-0.5">
                  een initiatief van <span className="font-bold text-hv-yellow">hivolta</span>
                </div>
              </div>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="px-3 py-1.5 rounded-md text-white/85 hover:bg-white/10 hover:text-white font-medium font-display">Vergelijker</Link>
              <Link href="/evolutie" className="px-3 py-1.5 rounded-md text-white/85 hover:bg-white/10 hover:text-white font-medium font-display">Evolutie</Link>
              <Link href="/vergelijking" className="px-3 py-1.5 rounded-md text-white/85 hover:bg-white/10 hover:text-white font-medium font-display">Maand vs maand</Link>
              <a href="https://hivolta.be?utm_source=tarievenapp&utm_medium=nav"
                 target="_blank" rel="noopener"
                 className="ml-2 px-3 py-1.5 rounded-md text-hv-blue bg-hv-yellow hover:brightness-95 text-xs font-bold uppercase tracking-wider font-display">
                hivolta.be ↗
              </a>
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>

        {/* Footer */}
        <footer className="mt-16 bg-hv-dark text-white border-t-[3px] border-hv-green">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <img src="/hivolta-logo.svg" alt="Hivolta" className="w-10 h-10 object-contain" />
                <div>
                  <div className="font-display font-bold text-base tracking-tight">Tarievenvergelijker</div>
                  <div className="text-xs text-white/65">een initiatief van <span className="font-bold text-hv-yellow">hivolta</span></div>
                </div>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                Vergelijk marginale kost en jaarkost van alle Vlaamse leveranciers met dynamisch contract,
                met automatisch maandelijks bijgewerkte tariefkaarten.
              </p>
            </div>

            <div>
              <h3 className="font-display font-bold text-hv-yellow text-xs uppercase tracking-[0.1em] mb-3">Volledige terugverdientijd?</h3>
              <p className="text-sm text-white/80 mb-3 leading-relaxed">
                Deze tool vergelijkt enkel leveranciers. Voor zonnepanelen + batterij + laadpaal mét dynamisch contract —
                bekijk de Hivolta-calculator op basis van jouw werkelijke verbruiksprofiel.
              </p>
              <a href="https://hivolta.be?utm_source=tarievenapp&utm_medium=footer&utm_campaign=calculator"
                 target="_blank" rel="noopener"
                 className="inline-flex items-center gap-1.5 bg-hv-yellow text-hv-blue px-4 py-2 rounded-md text-sm font-bold hover:brightness-95 font-display">
                Naar hivolta.be →
              </a>
            </div>

            <div>
              <h3 className="font-display font-bold text-hv-yellow text-xs uppercase tracking-[0.1em] mb-3">Bronnen &amp; data</h3>
              <ul className="text-xs text-white/65 space-y-1.5">
                <li>Officiële tariefkaarten leveranciers</li>
                <li>VREG/Fluvius distributietarieven 2026</li>
                <li>FOD Financiën — bijzondere accijns</li>
                <li>Update: 2de van elke maand (Vercel Cron)</li>
              </ul>
              <p className="text-[11px] text-white/40 mt-4">
                Tool ter informatie. Verifieer steeds de officiële tariefkaart bij contractondertekening.
              </p>
            </div>
          </div>
          <div className="border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-xs text-white/50 flex flex-col sm:flex-row justify-between gap-2">
              <span>© {new Date().getFullYear()} Hivolta BV · BTW BE 0544.853.354</span>
              <span>
                <a href="https://hivolta.be?utm_source=tarievenapp&utm_medium=footerlink"
                   target="_blank" rel="noopener" className="hover:text-hv-yellow">hivolta.be</a>
                {' · '}
                <a href="https://hivolta.be/contact?utm_source=tarievenapp" target="_blank" rel="noopener" className="hover:text-hv-yellow">contact</a>
              </span>
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
