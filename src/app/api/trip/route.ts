import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

const KEY = "chambers-trip";

export async function GET() {
  try {
    const trip = await kv.get(KEY);
    return NextResponse.json(trip ?? { rounds: [] });
  } catch {
    return NextResponse.json({ rounds: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await kv.set(KEY, body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
