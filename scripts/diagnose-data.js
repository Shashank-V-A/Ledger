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
  const total = range ? range.split("/")[1] : null;
  const data = await res.json();
  return { total, data };
}

async function main() {
  const users = await get("users?select=id,login_id,display_name,telegram_user_id,created_at");
  console.log("=== USERS ===");
  console.log("count:", users.total);
  for (const u of users.data || []) console.log(u);

  const all = await get("expenses?select=id&limit=1");
  const withUser = await get("expenses?select=id&user_id=not.is.null&limit=1");
  const withoutUser = await get("expenses?select=id&user_id=is.null&limit=1");
  console.log("\n=== EXPENSES COUNTS ===");
  console.log("total:", all.total);
  console.log("with user_id:", withUser.total);
  console.log("without user_id (orphans):", withoutUser.total);

  const julyOrphans = await get(
    "expenses?select=id,amount,description,expense_date,category,telegram_user_id&user_id=is.null&expense_date=gte.2026-07-01&expense_date=lte.2026-07-31&order=expense_date.desc&limit=5"
  );
  console.log("\n=== JULY 2026 ORPHANS (sample) ===");
  console.log("count header approx via separate query...");
  const julyOrphanCount = await get(
    "expenses?select=id&user_id=is.null&expense_date=gte.2026-07-01&expense_date=lte.2026-07-31&limit=1"
  );
  console.log("july orphans:", julyOrphanCount.total);
  for (const e of julyOrphans.data || []) console.log(e);

  const julyAll = await get(
    "expenses?select=id&expense_date=gte.2026-07-01&expense_date=lte.2026-07-31&limit=1"
  );
  console.log("\njuly total (any user):", julyAll.total);

  if (users.data?.[0]) {
    const uid = users.data[0].id;
    const julyMine = await get(
      `expenses?select=id&user_id=eq.${uid}&expense_date=gte.2026-07-01&expense_date=lte.2026-07-31&limit=1`
    );
    console.log("july for first user:", julyMine.total);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
