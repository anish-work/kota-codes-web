import { publicState, subscribe } from '@/lib/engine'
import { gameFrom } from '@/lib/http'

// Live updates as Server-Sent Events. The browser reconnects by itself if the wifi blips.
export async function GET(req: Request) {
  const game = gameFrom(req.url)
  const encoder = new TextEncoder()
  let cleanup = () => {}

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text))
        } catch {
          cleanup()
        }
      }
      send(`retry: 1500\ndata: ${JSON.stringify(publicState(game))}\n\n`)
      const unsubscribe = subscribe(game, (message) => send(`data: ${message}\n\n`))
      // A ping every 5s keeps the connection open and lets phones notice a dead link.
      const ping = setInterval(() => send('event: ping\ndata: 1\n\n'), 5_000)
      cleanup = () => {
        clearInterval(ping)
        unsubscribe()
      }
      req.signal.addEventListener('abort', () => {
        cleanup()
        try {
          controller.close()
        } catch {}
      })
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
