const fs = require("fs");

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      return [l.slice(0, i), v];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  Prefer: "count=exact",
};

async function get(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers });
  const range = res.headers.get("content-range");
  return {
    total: range ? range.split("/")[1] : null,
    data: await res.json(),
  };
}

async function main() {
  const users = (await get("users?select=id,login_id,display_name")).data || [];
  console.log("=== AUGUST 2026 — expenses & reports ===\n");

  for (const u of users) {
    const exp = await get(
      `expenses?select=id&user_id=eq.${u.id}&expense_date=gte.2026-08-01&expense_date=lte.2026-08-31&limit=1`
    );
    const reports = (
      await get(
        `monthly_reports?select=sent_at,total_spent&user_id=eq.${u.id}&report_month=eq.2026-08-01`
      )
    ).data;
    const report = reports?.[0];

    console.log(`${u.login_id} (${u.display_name || "—"})`);
    console.log(`  August expenses: ${exp.total ?? 0}`);
    console.log(`  Report sent: ${report ? report.sent_at : "NO"}`);
    if (report) console.log(`  Report total spent: ${report.total_spent}`);
    console.log("");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
