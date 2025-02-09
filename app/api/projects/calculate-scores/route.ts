import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();

        // Call FastAPI backend
        const response = await fetch("http://127.0.0.1:5328/calculate-scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`FastAPI error: ${await response.text()}`);
        }

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in /calculate-scores:", error);
        return NextResponse.json(
            { error: "Failed to compute scores" },
            { status: 500 }
        );
    }
}
