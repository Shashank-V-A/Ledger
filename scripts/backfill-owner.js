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
  "Content-Type": "application/json",
  Prefer: "return=representation,count=exact",
};

async function main() {
  // Owner telegram id from historical expenses / env
  const OWNER_TG = Number(env.TELEGRAM_CHAT_ID || env.TELEGRAM_ALLOWED_USER_IDS || "8637683031");

  // Ensure owner user exists
  let userRes = await fetch(
    `${url}/rest/v1/users?telegram_user_id=eq.${OWNER_TG}&select=*`,
    { headers }
  );
  let users = await userRes.json();
  let user = users[0];

  if (!user) {
    const create = await fetch(`${url}/rest/v1/users`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({
        telegram_user_id: OWNER_TG,
        login_id: `user${OWNER_TG}`,
        display_name: "Owner",
        setup_token: require("crypto").randomBytes(24).toString("hex"),
      }),
    });
    const created = await create.json();
    if (!create.ok) {
      console.error("Failed creating owner user", created);
      process.exit(1);
    }
    user = Array.isArray(created) ? created[0] : created;
    console.log("Created owner user:", user.login_id, user.id);
  } else {
    console.log("Owner user already exists:", user.login_id, user.id);
  }

  // Backfill orphans for this telegram id
  const patch1 = await fetch(
    `${url}/rest/v1/expenses?user_id=is.null&telegram_user_id=eq.${OWNER_TG}`,
    {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal,count=exact" },
      body: JSON.stringify({ user_id: user.id }),
    }
  );
  const range1 = patch1.headers.get("content-range");
  console.log("Backfilled telegram orphans:", range1 || patch1.status);

  // Backfill web/null telegram orphans to owner (pre-multi-user web entries)
  const patch2 = await fetch(
    `${url}/rest/v1/expenses?user_id=is.null&or=(telegram_user_id.is.null,telegram_user_id.eq.${OWNER_TG})`,
    {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal,count=exact" },
      body: JSON.stringify({ user_id: user.id }),
    }
  );
  const range2 = patch2.headers.get("content-range");
  console.log("Backfilled remaining null orphans for owner:", range2 || patch2.status);

  // Verify July
  const july = await fetch(
    `${url}/rest/v1/expenses?select=id&user_id=eq.${user.id}&expense_date=gte.2026-07-01&expense_date=lte.2026-07-31`,
    { headers: { ...headers, Prefer: "count=exact" } }
  );
  console.log("July expenses now on owner ledger:", july.headers.get("content-range"));

  const orphans = await fetch(`${url}/rest/v1/expenses?select=id&user_id=is.null`, {
    headers: { ...headers, Prefer: "count=exact" },
  });
  console.log("Remaining orphans:", orphans.headers.get("content-range"));

  console.log("\n=== LOGIN ===");
  console.log("Login ID:", user.login_id);
  if (user.setup_token) {
    console.log(
      "Set password:",
      `${env.APP_URL}/setup?token=${user.setup_token}`
    );
  } else if (!user.password_hash) {
    // ensure setup token
    const token = require("crypto").randomBytes(24).toString("hex");
    await fetch(`${url}/rest/v1/users?id=eq.${user.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ setup_token: token }),
    });
    console.log("Set password:", `${env.APP_URL}/setup?token=${token}`);
  } else {
    console.log("Password already set. Log in at", `${env.APP_URL}/login`);
  }
  console.log("Send /start from your Telegram for a fresh password link anytime.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
