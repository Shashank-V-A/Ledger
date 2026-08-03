import { getYearlyData } from "@/lib/expenses";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-ledger-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const year = parseInt(
    request.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()),
    10
  );

  const data = await getYearlyData(year, userId);
  return NextResponse.json(data);
}
