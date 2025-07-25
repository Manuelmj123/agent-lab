import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const { title, description } = await req.json();

  const prompt = `
  You are a senior full-stack engineer working on a Next.js project.
  Implement the following ticket:
  
  Title: ${title}
  Description: ${description}
  
  **Return ONLY valid JSON in this format (no explanations):**
  {
    "files": [
      {
        "path": "src/components/Example.tsx",
        "content": "CODE_HERE"
      },
      {
        "path": "src/app/page.tsx",
        "content": "CODE_HERE"
      }
    ]
  }
  `;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You generate file patches as JSON." },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
    });

    // Use 'any' or define a type for better type safety
    let codePatch: any = response.choices[0].message?.content || "{}";

    try {
      codePatch = JSON.parse(codePatch);
    } catch {
      codePatch = {
        files: [
          {
            path: "ai-output.txt",
            content: response.choices[0].message?.content || "",
          },
        ],
      };
    }

    return NextResponse.json({ codePatch });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate code." },
      { status: 500 }
    );
  }
}
