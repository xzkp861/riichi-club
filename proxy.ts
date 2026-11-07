import { NextResponse } from 'next/server'

export function proxy() {
  return new NextResponse(
    `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BOS RIICHI</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: #fafafa;
        color: #111;
      }
      main {
        min-height: 70vh;
        display: grid;
        place-items: center;
        padding: 40px 24px;
      }
      section {
        max-width: 520px;
        text-align: center;
      }
      h1 {
        font-size: 34px;
        margin: 0 0 14px;
      }
      p {
        color: #666;
        line-height: 1.7;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>BOS RIICHI</h1>
        <p>网站暂时停止开放，稍后恢复。</p>
      </section>
    </main>
  </body>
</html>`,
    {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  )
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
