import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // 1) Read incoming data
        const body = await request.json();

        // 2) Forward to FastAPI endpoint
        const fastapiUrl = 'http://127.0.0.1:5328/applicability';
        const fastapiResponse = await fetch(fastapiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "X-API-Key": process.env.NEXT_PUBLIC_API_KEY || ''
            },
            body: JSON.stringify(body),
        });

        // If error
        if (!fastapiResponse.ok) {
            const errorBody = await fastapiResponse.text();
            return NextResponse.json(
                { error: 'FastAPI Error', details: errorBody },
                { status: fastapiResponse.status }
            );
        }

        // 3) Return FastAPI's response to the front-end
        const fastapiData = await fastapiResponse.json();
        return NextResponse.json(fastapiData);
    } catch (error) {
        console.error('Error in API:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
