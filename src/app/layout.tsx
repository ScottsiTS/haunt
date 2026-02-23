import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Haunt — Ghost DB Dashboard',
  description: 'See your Ghost databases as pixel art ghosts in a haunted mansion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
