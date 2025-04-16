// app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import { encryptApiKey } from '@/lib/encryption';
import { SystemPrompt } from '@/app/types';

export async function GET() {
  try {
    // Fetch the session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("promptops");

    // Fetch projects that belong to the logged-in user
    const projects = await db.collection("projects")
      .find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    // console.log("Session user ID:", session.user.id);

    // Redact API keys in the response
    const sanitizedProjects = projects.map(project => ({
      ...project,
      apiKey: project.apiKey ? "[REDACTED]" : null
    }));

    return NextResponse.json(sanitizedProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error("No user ID found in session.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestBody = await request.json();

    const {
      projectName,
      type,
      llm,
      url,
      apiKey,
      systemPrompt,
      customPrompt,
      modelProvider
    } = requestBody;

    // Check if this is a Llama model but URL is empty
    const isLlamaOrCustom = llm.toLowerCase().includes('llama') || llm.toLowerCase().includes('custom');

    // Force URL to be non-empty for Llama models and ensure it's a string
    let finalUrl = "";
    if (isLlamaOrCustom && (!url || url === "")) {
      finalUrl = "http://localhost:8000/v1"; // Fallback URL
    } else if (typeof url === 'boolean') {
      finalUrl = "http://localhost:8000/v1"; // Handle boolean case
    } else {
      finalUrl = String(url || ""); // Convert to string
    }

    // Determine model provider if not explicitly specified
    let finalModelProvider = modelProvider || "";

    if (!finalModelProvider && llm) {
      if (llm.toLowerCase().startsWith('gpt')) finalModelProvider = 'openai';
      else if (llm.toLowerCase().startsWith('gemini')) finalModelProvider = 'gemini';
      else if (llm.toLowerCase().startsWith('claude')) finalModelProvider = 'claude';
      else if (llm.toLowerCase().startsWith('llama')) finalModelProvider = 'llama';
      else if (llm.toLowerCase() === 'custom') finalModelProvider = 'custom';
    }

    // Encrypt API key before storing
    const encryptedApiKey = apiKey ? encryptApiKey(apiKey) : null;

    const client = await clientPromise;
    const db = client.db("promptops");

    // Build the updated system prompt structure with proper types
    let finalSystemPrompt: SystemPrompt = {
      type: systemPrompt.type || 'default',
      customPrompt: '',
      defaultPrompt: ''
    };

    // Handle different prompt based on type
    if (finalSystemPrompt.type === 'custom') {
      finalSystemPrompt.customPrompt = customPrompt || "";
    } else {
      finalSystemPrompt.defaultPrompt = "You will act like a question-answering system that answers the given question.";
    }

    // Set withContext for QA projects (add for all QA projects)
    if (type === 'qa') {
      finalSystemPrompt.withContext = systemPrompt.withContext !== undefined
        ? Boolean(systemPrompt.withContext)
        : true; // Default to true if not specified
    }

    const newProject = {
      name: projectName,
      userId: session.user.id,
      type,
      llm,
      url: finalUrl,
      apiKey: encryptedApiKey,
      systemPrompt: finalSystemPrompt,
      modelProvider: finalModelProvider,
      createdAt: new Date(),
    };

    const result = await db.collection("projects").insertOne(newProject);

    // Return response with redacted API key
    return NextResponse.json({
      ...newProject,
      _id: result.insertedId,
      apiKey: apiKey ? "[REDACTED]" : null
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}