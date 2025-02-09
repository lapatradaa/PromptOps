import { NextResponse } from "next/server";

// /api/projects/stop/route.ts
export async function POST() {
    try {
        const response = await fetch('http://127.0.0.1:5328/stop-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            return NextResponse.json({ error: await response.text() }, { status: response.status });
        }

        return NextResponse.json({ message: 'Test stopped successfully' });
    } catch (error) {
        console.error('❌ Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}