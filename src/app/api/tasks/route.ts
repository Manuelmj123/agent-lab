import { NextResponse } from "next/server";
import { getTasks } from "@/lib/taskStore";

export async function GET() {
  return NextResponse.json(getTasks());
}
