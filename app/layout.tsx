import './globals.css'

export const metadata = {
  title: 'PromptOps',
  description: 'Optimizes & Tests prompts for LLM',
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
