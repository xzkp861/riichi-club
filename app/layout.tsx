import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'BOS RIICHI',
  description: '日麻战绩与积分统计',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <header
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '28px 24px 0',
          }}
        >
          <nav
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #ddd',
              paddingBottom: 18,
            }}
          >
            <Link
              href="/"
              style={{
                fontWeight: 700,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              BOS RIICHI
            </Link>

            <div
              style={{
                display: 'flex',
                gap: 24,
              }}
            >
              <Link href="/games">历史</Link>
              <Link href="/add-game">录入</Link>
              <Link href="/calculator">算分</Link>
              <Link href="/manage">管理</Link>
            </div>
          </nav>
        </header>

        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '32px 24px 64px',
          }}
        >
          {children}
        </div>
      </body>
    </html>
  )
}