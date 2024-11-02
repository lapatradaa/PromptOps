import { Kanit } from 'next/font/google'
import './globals.css'

// Initialize the font
const kanit = Kanit({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap'
})

export const metadata = {
  title: 'PromptOps',
  description: 'Optimizes & Tests prompts for LLM',
  icons: {
    icon: '/icon.png'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={kanit.className}>{children}</body>
    </html>
  )
}