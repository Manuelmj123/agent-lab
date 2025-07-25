import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { addTask } from "@/lib/taskStore";

const secret = process.env.GITHUB_WEBHOOK_SECRET!;

function verifySignature(signature: string | null, body: string) {
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = `sha256=${hmac.update(body).digest("hex")}`;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  if (!verifySignature(signature, body)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  const payload = JSON.parse(body);

  if (event === "issues" && payload.action === "opened") {
    const task = {
      id: payload.issue.number,
      title: payload.issue.title,
      description: payload.issue.body || "",
      repo: payload.repository.full_name,
      url: payload.issue.html_url,
      labels: payload.issue.labels.map((l: any) => l.name),
    };

    addTask(task)
    console.log("New structured task:", task);
  }

  return NextResponse.json({ ok: true });
}
