import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FlappyBird',
  description: 'Flappy Bird game in Next.js',
}

import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <head>
        <link href="https://fonts.googleapis.com/css?family=Squada+One&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}