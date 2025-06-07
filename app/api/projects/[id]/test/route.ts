// app/api/projects/[id]/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getFastApiUrl } from "@/lib/getFastApiUrl";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // 1️⃣ Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = (await params).id;
    const fastApiUrl = getFastApiUrl();
    const upstream = `${fastApiUrl}/api/v2/tests`;

    // 2️⃣ Grab the raw body (including multipart)
    const body = await request.arrayBuffer();

    // 3️⃣ Copy all headers + override X-API-Key
    const headers = new Headers(request.headers);
    headers.set("X-API-Key", process.env.NEXT_PUBLIC_API_KEY!);

    // 4️⃣ Proxy to FastAPI
    const proxyRes = await fetch(upstream, {
        method: "POST",
        headers,
        body: Buffer.from(body),
    });

    const data = await proxyRes.json();
    return NextResponse.json(data, { status: proxyRes.status });
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // 1️⃣ Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const testId = new URL(request.url).searchParams.get("testId");
    if (!testId) {
        return NextResponse.json({ error: "Missing testId" }, { status: 400 });
    }

    // 2️⃣ Proxy to FastAPI
    const fastApiUrl = getFastApiUrl();
    const proxyRes = await fetch(
        `${fastApiUrl}/api/v2/tests/${testId}/results`,
        {
            method: "GET",
            headers: {
                "X-API-Key": process.env.NEXT_PUBLIC_API_KEY!,
            },
        }
    );

    const data = await proxyRes.json();

    // 3️⃣ Wrap under `results` so your hook always sees `{ results: { … } }`
    return NextResponse.json(
        { results: data },
        { status: proxyRes.status }
    );
}
