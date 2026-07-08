import { getYearlyData } from "@/lib/expenses";
import { NextRequest, NextResponse } from "next/server";

function isAuthorized(request: NextRequest): boolean {
  const apiKey = process.env.DASHBOARD_API_KEY;
  if (!apiKey) return true;
  return request.headers.get("x-api-key") === apiKey;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const year = parseInt(
    request.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()),
    10
  );

  const data = await getYearlyData(year);
  return NextResponse.json(data);
}
