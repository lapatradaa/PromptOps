// app/api/projects/[id]/sse-status/[testId]/route.ts

import { NextRequest } from 'next/server';
import { createSubscriberClient } from '@/lib/redis'; // adjust path if needed

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testId: string }> }
) {
  const { testId } = await params;
  
  // Create a dedicated subscriber connection
  const subscriber = createSubscriberClient();
  subscriber.on('error', err => console.error('[SSE] subscriber error', err));

  const channel = `test_status:${testId}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`: ping\n\n`));

      subscriber.psubscribe(channel, (err) => {
        if (err) {
          controller.error(err);
        }
      });

      subscriber.on('pmessage', (_pattern, _chan, message) => {
        const ssePayload = `event: status\n` +
          `data: ${message}\n\n`;
        controller.enqueue(encoder.encode(ssePayload));
      });

      // Make sure to properly clean up when the connection is closed
      const onAbort = () => {
        try {
          subscriber.punsubscribe(channel);
          subscriber.quit();
        } catch (err) {
          console.error('[SSE] Error during cleanup:', err);
        }
        controller.close();
      };
      request.signal.addEventListener('abort', onAbort);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
