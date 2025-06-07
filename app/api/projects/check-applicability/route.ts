import { NextResponse, type NextRequest } from 'next/server';
import { getFastApiUrl } from '@/lib/getFastApiUrl';

/**
 * POST /api/projects/check-applicability
 * Proxy the request body to FastAPI → /applicability
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const fastApiUrl = getFastApiUrl();
    const apiRes = await fetch(`${fastApiUrl}/api/v1/applicability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY ?? '',
      },
      body: JSON.stringify(body),
    });

    if (!apiRes.ok) {
      const details = await apiRes.text();
      return NextResponse.json(
        { error: 'FastAPI Error', details },
        { status: apiRes.status },
      );
    }

    const data = await apiRes.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error in /check-applicability:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
