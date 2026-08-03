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

async function main() {
  const res = await fetch(`${url}/rest/v1/users?select=id,login_id,display_name,created_at`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "count=exact",
    },
  });
  const range = res.headers.get("content-range");
  const total = range ? range.split("/")[1] : "?";
  const rows = await res.json();
  console.log(`Total users (ledgers): ${total}`);
  if (Array.isArray(rows) && rows.length) {
    console.log("\nRecent:");
    for (const u of rows.slice(0, 20)) {
      console.log(`- ${u.login_id} (${u.display_name || "—"}) · ${u.created_at}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
