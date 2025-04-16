// /app/api/projects/calculate-scores/route.ts
import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    try {
        let data;
        try {
            data = await req.json();
        } catch (parseError) {
            console.error("Failed to parse request JSON:", parseError);
            return NextResponse.json(
                { error: "Invalid JSON payload" },
                { status: 400 }
            );
        }

        // Safety check
        if (!data) {
            console.error("Data is null or undefined");
            return NextResponse.json(
                { error: "Empty request body" },
                { status: 400 }
            );
        }

        // console.log("POST /calculate-scores - Data:", typeof data, data ? Object.keys(data) : "NO DATA");

        // Call FastAPI backend
        const response = await fetch("http://127.0.0.1:5328/calculate-scores", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": process.env.NEXT_PUBLIC_API_KEY || ''
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("FastAPI error response:", errorText);
            throw new Error(`FastAPI error: ${errorText}`);
        }

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error) {
        console.error("Detailed error in /calculate-scores:", error);
        return NextResponse.json(
            {
                error: "Failed to compute scores",
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}