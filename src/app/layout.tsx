import type { Metadata } from 'next'
import './globals.css'

export const viewport = {
  themeColor: '#991b1b',
}

export const metadata: Metadata = {
  title: 'Urticaria Tracker — UAS7 Semanal',
  description: 'Rastreador semanal de urticária com pontuação UAS7. Registre e acompanhe seus sintomas diários de urticária e coceira.',
  keywords: 'urticária, UAS7, tracker, saúde, dermatologia',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Urticaria Tracker',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* SCRIPT DO DARK MODE: Executa imediatamente para evitar o "piscar" da tela */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('theme');
                  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}