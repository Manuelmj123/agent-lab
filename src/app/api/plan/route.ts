import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const { title, description } = await req.json();

  const prompt = `
You are a senior software engineer. Create a **step-by-step implementation plan** for this ticket:
Title: ${title}
Description: ${description}
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "You plan tasks for developers." }, { role: "user", content: prompt }],
      max_tokens: 300,
    });

    const plan = response.choices[0].message?.content || "No plan generated.";
    return NextResponse.json({ plan });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate plan." }, { status: 500 });
  }
}
