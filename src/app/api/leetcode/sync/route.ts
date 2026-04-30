import { NextResponse } from "next/server";

import {
  fetchLeetCodeSyncPreview,
  normalizeLeetCodeUsername,
} from "@/lib/leetcode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = normalizeLeetCodeUsername(searchParams.get("username") ?? "");

  if (!username) {
    return NextResponse.json({ error: "Missing username query parameter." }, { status: 400 });
  }

  try {
    const data = await fetchLeetCodeSyncPreview(username);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed.";
    const status = message === "User not found on LeetCode." ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
