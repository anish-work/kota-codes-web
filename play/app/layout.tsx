import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

// Both fonts ship with the app, so nothing loads from the internet at the venue.
const mona = localFont({
  src: './fonts/MonaSans-latin.woff2',
  variable: '--font-mona',
  weight: '200 900',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '75% 125%' }],
})

const mono = localFont({
  src: './fonts/JetBrainsMono-latin.woff2',
  variable: '--font-jetbrains',
  weight: '100 800',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Kota vs AI',
  description: 'AI: myth or fact? Vote from your phone.',
  robots: { index: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F2EEE5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mona.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
