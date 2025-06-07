import { NextResponse, type NextRequest } from 'next/server';
import { getFastApiUrl } from '@/lib/getFastApiUrl';

/**
 * POST /api/projects/calculate-scores
 * Sends the incoming JSON to FastAPI → /calculate-scores
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 },
      );
    }

    const fastApiUrl = getFastApiUrl();
    const apiRes = await fetch(`${fastApiUrl}/calculate-scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY ?? '',
      },
      body: JSON.stringify(data),
    });

    if (!apiRes.ok) {
      const details = await apiRes.text();
      console.error('FastAPI error response:', details);
      return NextResponse.json(
        { error: 'FastAPI Error', details },
        { status: apiRes.status },
      );
    }

    const result = await apiRes.json();
    return NextResponse.json(result);
  } catch (err) {
    console.error('Error in /calculate-scores:', err);
    return NextResponse.json(
      {
        error: 'Failed to compute scores',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
