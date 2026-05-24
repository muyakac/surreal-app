import { useState, useEffect, useCallback } from "react";

// ─── Supabase config — swap these strings when deploying to Vite ──────────────
// In your Vite project replace with: import.meta.env.VITE_SUPABASE_URL etc.
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sbAuth(action, email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${action}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Auth failed");
  return data;
}

async function sbSignOut(token) {
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SHIPPING_STAGES = [
  "Order Received",
  "Order Placed",
  "Dispatched",
  "In China",
  "In South Africa",
  "In Zambia",
  "Arrived ZM",
];

const STAGE_EMOJI = {
  "Order Received": "📋",
  "Order Placed": "🛒",
  "Dispatched": "📦",
  "In China": "🇨🇳",
  "In South Africa": "🇿🇦",
  "In Zambia": "🛬",
  "Arrived ZM": "✅",
};

function waMessage(order, stage) {
  const items = (order.items || [])
    .map((i) => `• ${i.name} (${[i.size, i.color, `x${i.qty}`].filter(Boolean).join(", ")})`)
    .join("\n");
  const messages = {
    "Order Received": `Hi ${order.customer_name} 👋\n\nYour Surreal order *${order.batch_code}* has been received!\n\n${items}\n\n💰 Total: K${order.total_zmw}\n\nWe'll update you once it's placed. Thank you for ordering with Surreal 🖤`,
    "Order Placed": `Hi ${order.customer_name}!\n\nGreat news — your order *${order.batch_code}* has been placed on SHEIN ✅\n\n${items}\n\nWe'll let you know when it's on the move 📦`,
    "Dispatched": `Hi ${order.customer_name}!\n\nYour Surreal order *${order.batch_code}* has been dispatched 🚚\n\nIt's now on its way. We'll keep you posted!`,
    "In China": `Hi ${order.customer_name}!\n\nYour order *${order.batch_code}* is currently in China 🇨🇳\n\nIt's making its way to you. Stay tuned!`,
    "In South Africa": `Hi ${order.customer_name}!\n\nYour order *${order.batch_code}* has arrived in South Africa 🇿🇦\n\nAlmost there — Zambia is next!`,
    "In Zambia": `Hi ${order.customer_name}!\n\nExciting news! Your order *${order.batch_code}* is in Zambia 🛬\n\nWe'll notify you as soon as it's ready for collection.`,
    "Arrived ZM": `Hi ${order.customer_name}!\n\nYour order *${order.batch_code}* has arrived and is ready ✅🎉\n\nPlease arrange collection at your earliest convenience.\n\nThank you for shopping with Surreal 🖤`,
  };
  return messages[stage] || "";
}

function getEmoji(name = "") {
  const n = name.toLowerCase();
  if (n.includes("dress")) return "👗";
  if (n.includes("bag") || n.includes("purse")) return "👜";
  if (n.includes("shoe") || n.includes("heel") || n.includes("sneaker") || n.includes("boot")) return "👟";
  if (n.includes("top") || n.includes("blouse") || n.includes("shirt")) return "👚";
  if (n.includes("jean") || n.includes("pant") || n.includes("trouser")) return "👖";
  if (n.includes("jacket") || n.includes("coat")) return "🧥";
  if (n.includes("skirt")) return "👘";
  return "✨";
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --gold: #c8a96e;
    --gold-light: #f5edd9;
    --gold-pale: #faf6ee;
    --bg: #fafaf8;
    --white: #ffffff;
    --border: #ece9e4;
    --text: #111111;
    --muted: #9a9490;
    --chip-bg: #f3ede4;
    --radius: 16px;
    --radius-sm: 10px;
    --radius-xs: 7px;
    --shadow: 0 2px 16px rgba(0,0,0,0.06);
    --shadow-card: 0 1px 4px rgba(0,0,0,0.05);
    --green: #3d9970;
    --green-bg: #f0faf5;
    --red: #e05050;
    --red-bg: #fdf3f3;
  }
  html, body {
    background: var(--bg);
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
    -webkit-font-smoothing: antialiased;
  }

  /* ── App wrapper ── */
  .sr-app { min-height: 100vh; background: var(--bg); max-width: 480px; margin: 0 auto; }

  /* ── Login ── */
  .login-wrap {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 28px;
    background: var(--bg);
  }
  .login-logo {
    font-family: 'Inter', sans-serif;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .login-sub {
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 40px;
    letter-spacing: 0.04em;
  }
  .login-sub span { color: var(--gold); }
  .login-card {
    width: 100%;
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 28px 24px;
    box-shadow: var(--shadow);
  }
  .login-title {
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 20px;
    letter-spacing: 0.01em;
  }
  .lf { margin-bottom: 14px; }
  .lf label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .lf input {
    width: 100%;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 13px 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    color: var(--text);
    outline: none;
    transition: border-color 0.18s;
  }
  .lf input:focus { border-color: var(--gold); }
  .lf input::placeholder { color: #ccc; }
  .login-btn {
    width: 100%;
    margin-top: 6px;
    padding: 14px;
    background: var(--text);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.15s;
  }
  .login-btn:hover { background: #222; }
  .login-btn:disabled { background: #ccc; cursor: not-allowed; }
  .login-err {
    margin-top: 12px;
    font-size: 13px;
    color: var(--red);
    text-align: center;
    font-weight: 500;
  }

  /* ── Header ── */
  .dash-header {
    position: sticky;
    top: 0;
    z-index: 20;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    padding: 18px 20px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .dash-brand {
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  .dash-brand-sub {
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 0.04em;
    margin-top: 1px;
  }
  .dash-brand-sub span { color: var(--gold); }
  .signout-btn {
    background: none;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-xs);
    padding: 7px 12px;
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .signout-btn:hover { border-color: var(--text); color: var(--text); }

  /* ── Stats ── */
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 18px 16px 8px;
  }
  .stat-card {
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 16px 14px;
    box-shadow: var(--shadow-card);
  }
  .stat-card.gold-card {
    background: var(--gold-pale);
    border-color: #e8d8b8;
  }
  .stat-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
  }
  .gold-card .stat-label { color: #a08040; }
  .stat-value {
    font-family: 'Inter', sans-serif;
    font-size: 22px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .stat-value.gold { color: var(--gold); }
  .stat-value sup {
    font-size: 11px;
    font-weight: 600;
    vertical-align: super;
    color: var(--muted);
    margin-right: 1px;
  }
  .stat-sub {
    font-size: 11px;
    color: var(--muted);
    margin-top: 4px;
  }

  /* ── Section label ── */
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 16px 10px;
  }
  .section-label {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .order-count {
    background: var(--chip-bg);
    color: #7a6e63;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 9px;
    border-radius: 100px;
  }

  /* ── Filter tabs ── */
  .filter-tabs {
    display: flex;
    gap: 6px;
    padding: 0 16px 12px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .filter-tabs::-webkit-scrollbar { display: none; }
  .ftab {
    flex-shrink: 0;
    padding: 6px 13px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 500;
    border: 1.5px solid var(--border);
    background: var(--white);
    color: var(--muted);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .ftab.active {
    background: var(--text);
    border-color: var(--text);
    color: #fff;
    font-weight: 600;
  }

  /* ── Order cards ── */
  .orders-list { padding: 0 16px; display: flex; flex-direction: column; gap: 10px; padding-bottom: 32px; }

  .order-card {
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-shadow: var(--shadow-card);
    animation: fadeUp 0.2s ease both;
  }
  .order-card:hover { border-color: var(--gold); box-shadow: 0 4px 20px rgba(200,169,110,0.15); }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .card-name {
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 2px;
  }
  .card-batch {
    font-size: 11px;
    color: var(--muted);
    font-weight: 500;
    letter-spacing: 0.04em;
  }
  .card-total {
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 800;
    color: var(--text);
    text-align: right;
  }
  .card-total span { font-size: 10px; color: var(--muted); font-weight: 500; margin-right: 1px; }

  .card-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
  .chip {
    font-size: 11px;
    font-weight: 500;
    padding: 3px 9px;
    border-radius: 100px;
    background: var(--chip-bg);
    color: #7a6e63;
  }
  .chip.paid { background: var(--green-bg); color: var(--green); }
  .chip.pending { background: #fff8ec; color: #b08020; }
  .chip.stage { background: #f0f0ff; color: #5050c0; }
  .chip.arrived { background: var(--green-bg); color: var(--green); }

  .card-items-preview {
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-arrow {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
    font-size: 11px;
    color: #ccc;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  /* ── Empty / loading ── */
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--muted);
    font-size: 14px;
  }
  .empty-icon { font-size: 36px; margin-bottom: 12px; }

  /* ── Detail overlay ── */
  .detail-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: var(--bg);
    overflow-y: auto;
    animation: slideUp 0.25s cubic-bezier(0.32,0.72,0,1);
    max-width: 480px;
    margin: 0 auto;
  }
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0.6; }
    to   { transform: translateY(0); opacity: 1; }
  }

  .detail-header {
    position: sticky;
    top: 0;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    padding: 16px 18px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10;
  }
  .back-btn {
    width: 34px; height: 34px;
    border-radius: 50%;
    border: 1.5px solid var(--border);
    background: var(--white);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    cursor: pointer;
    color: var(--text);
    flex-shrink: 0;
    transition: border-color 0.15s;
  }
  .back-btn:hover { border-color: var(--text); }
  .detail-header-info { flex: 1; }
  .detail-cname {
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 700;
  }
  .detail-batch {
    font-size: 11px;
    color: var(--gold);
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  .detail-body { padding: 18px; }

  /* ── Detail section ── */
  .dsec { margin-bottom: 22px; }
  .dsec-title {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 12px;
  }

  /* ── Item rows ── */
  .item-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 12px 14px;
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    margin-bottom: 8px;
  }
  .item-row-emoji {
    width: 38px; height: 38px;
    border-radius: 8px;
    background: var(--gold-pale);
    border: 1px solid #e0cfb0;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .item-row-info { flex: 1; min-width: 0; }
  .item-row-name {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .item-row-chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .item-chip {
    font-size: 10px;
    font-weight: 500;
    padding: 2px 7px;
    border-radius: 100px;
    background: var(--chip-bg);
    color: #7a6e63;
  }
  .item-row-price {
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* ── Summary box ── */
  .summary-box {
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .sumline {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    font-size: 14px;
    border-bottom: 1px solid var(--border);
  }
  .sumline:last-child { border-bottom: none; }
  .sumline .lbl { color: var(--muted); }
  .sumline .val { font-weight: 600; }
  .sumline .val.gold { color: var(--gold); }
  .sumline.total {
    background: var(--gold-pale);
    padding: 14px 16px;
  }
  .sumline.total .lbl {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #a08040;
  }
  .sumline.total .val {
    font-family: 'Inter', sans-serif;
    font-size: 22px;
    font-weight: 800;
  }

  /* ── Action buttons ── */
  .mark-paid-btn {
    width: 100%;
    padding: 14px;
    border-radius: var(--radius-sm);
    border: none;
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s;
  }
  .mark-paid-btn.unpaid {
    background: var(--green);
    color: #fff;
    box-shadow: 0 4px 16px rgba(61,153,112,0.25);
  }
  .mark-paid-btn.unpaid:hover { background: #2d7a58; }
  .mark-paid-btn.already-paid {
    background: var(--green-bg);
    color: var(--green);
    border: 1.5px solid #b8e8d0;
    cursor: default;
  }
  .mark-paid-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ── Shipping stages ── */
  .stages-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .stage-btn {
    padding: 11px 10px;
    border-radius: var(--radius-sm);
    border: 1.5px solid var(--border);
    background: var(--white);
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .stage-btn:hover { border-color: var(--gold); color: var(--text); background: var(--gold-pale); }
  .stage-btn.current {
    border-color: var(--text);
    background: var(--text);
    color: #fff;
    font-weight: 600;
  }
  .stage-btn.past { border-color: var(--border); background: var(--bg); color: #ccc; }
  .stage-emoji { font-size: 14px; flex-shrink: 0; }

  /* ── WA message box ── */
  .wa-box {
    background: #f0fdf4;
    border: 1.5px solid #b8e8d0;
    border-radius: var(--radius);
    padding: 16px;
    margin-top: 14px;
    animation: fadeUp 0.2s ease;
  }
  .wa-box-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .wa-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--green);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .wa-copy-btn {
    padding: 5px 12px;
    border-radius: 100px;
    border: 1.5px solid var(--green);
    background: none;
    font-size: 11px;
    font-weight: 600;
    color: var(--green);
    cursor: pointer;
    transition: all 0.15s;
  }
  .wa-copy-btn:hover, .wa-copy-btn.copied {
    background: var(--green);
    color: #fff;
  }
  .wa-text {
    font-size: 13px;
    color: #2d6a4f;
    line-height: 1.65;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* ── Refresh button ── */
  .refresh-btn {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    padding: 4px;
    opacity: 0.5;
    transition: opacity 0.15s, transform 0.3s;
  }
  .refresh-btn:hover { opacity: 1; }
  .refresh-btn.spinning { animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Skeleton ── */
  .skeleton {
    background: linear-gradient(90deg, #f0ece8 25%, #e8e4e0 50%, #f0ece8 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    border-radius: var(--radius-xs);
  }
  @keyframes shimmer {
    from { background-position: 200% 0; }
    to   { background-position: -200% 0; }
  }
  .skeleton-card {
    height: 110px;
    border-radius: var(--radius);
    margin-bottom: 10px;
  }
`;

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      const data = await sbAuth("token?grant_type=password", email, password);
      onLogin(data.access_token, data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-logo">Surreal</div>
      <div className="login-sub">Admin · <span>SHEIN Plug ZM</span></div>
      <div className="login-card">
        <div className="login-title">Sign in to Dashboard</div>
        <div className="lf">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@surreal.zm"
            autoComplete="email"
          />
        </div>
        <div className="lf">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoComplete="current-password"
          />
        </div>
        <button className="login-btn" onClick={handleLogin} disabled={loading || !email || !password}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
        {error && <div className="login-err">{error}</div>}
      </div>
    </div>
  );
}

// ─── Order Detail ─────────────────────────────────────────────────────────────
function OrderDetail({ order, token, onBack, onUpdate }) {
  const [updating, setUpdating] = useState(false);
  const [waMsg, setWaMsg] = useState(null);
  const [waStage, setWaStage] = useState(null);
  const [copied, setCopied] = useState(false);

  const isPaid = order.payment_status === "paid";
  const currentStageIdx = SHIPPING_STAGES.indexOf(order.shipping_stage);

  async function markPaid() {
    if (isPaid || updating) return;
    setUpdating(true);
    try {
      await sbFetch(`/orders?batch_code=eq.${order.batch_code}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payment_status: "paid" }),
      });
      onUpdate({ ...order, payment_status: "paid" });
    } catch (e) { alert("Update failed: " + e.message); }
    finally { setUpdating(false); }
  }

  async function setStage(stage) {
    if (updating) return;
    setUpdating(true);
    try {
      await sbFetch(`/orders?batch_code=eq.${order.batch_code}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shipping_stage: stage }),
      });
      const updated = { ...order, shipping_stage: stage };
      onUpdate(updated);
      setWaMsg(waMessage(updated, stage));
      setWaStage(stage);
    } catch (e) { alert("Update failed: " + e.message); }
    finally { setUpdating(false); }
  }

  function copyWa() {
    navigator.clipboard.writeText(waMsg).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const items = order.items || [];

  return (
    <div className="detail-overlay">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="detail-header-info">
          <div className="detail-cname">{order.customer_name}</div>
          <div className="detail-batch">{order.batch_code}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          <span className={`chip ${isPaid ? "paid" : "pending"}`} style={{ fontSize: 11 }}>
            {isPaid ? "✓ Paid" : "⏳ Pending"}
          </span>
        </div>
      </div>

      <div className="detail-body">

        {/* Customer info */}
        <div className="dsec">
          <div className="dsec-title">Customer</div>
          <div className="summary-box">
            <div className="sumline">
              <span className="lbl">Name</span>
              <span className="val">{order.customer_name}</span>
            </div>
            <div className="sumline">
              <span className="lbl">WhatsApp</span>
              <span className="val" style={{ color: "#3d9970" }}>
                <a href={`https://wa.me/${order.whatsapp?.replace(/\D/g,"")}`}
                   style={{ color: "inherit", textDecoration: "none" }}
                   target="_blank" rel="noreferrer">
                  {order.whatsapp} ↗
                </a>
              </span>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="dsec">
          <div className="dsec-title">{items.length} Item{items.length !== 1 ? "s" : ""}</div>
          {items.map((item, i) => (
            <div className="item-row" key={i}>
              <div className="item-row-emoji">{getEmoji(item.name)}</div>
              <div className="item-row-info">
                <div className="item-row-name">{item.name}</div>
                <div className="item-row-chips">
                  {item.size && <span className="item-chip">Size {item.size}</span>}
                  {item.color && <span className="item-chip">{item.color}</span>}
                  <span className="item-chip">Qty {item.qty}</span>
                </div>
              </div>
              <div className="item-row-price">
                ${(item.priceUsd * item.qty).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="dsec">
          <div className="dsec-title">Order Summary</div>
          <div className="summary-box">
            <div className="sumline">
              <span className="lbl">Subtotal (USD)</span>
              <span className="val">${order.total_usd?.toFixed(2)}</span>
            </div>
            <div className="sumline">
              <span className="lbl">Shipping Fee</span>
              <span className="val gold">K{order.shipping_fee}</span>
            </div>
            <div className="sumline total">
              <span className="lbl">Grand Total</span>
              <span className="val">K{order.total_zmw?.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="dsec">
          <div className="dsec-title">Payment</div>
          <button
            className={`mark-paid-btn ${isPaid ? "already-paid" : "unpaid"}`}
            onClick={markPaid}
            disabled={updating || isPaid}
          >
            {isPaid ? "✓ Payment Confirmed" : updating ? "Updating…" : "Mark as Paid"}
          </button>
        </div>

        {/* Shipping stage */}
        <div className="dsec">
          <div className="dsec-title">Shipping Stage</div>
          <div className="stages-grid">
            {SHIPPING_STAGES.map((stage, idx) => {
              const isCurrent = stage === order.shipping_stage;
              const isPast = idx < currentStageIdx;
              return (
                <button
                  key={stage}
                  className={`stage-btn ${isCurrent ? "current" : isPast ? "past" : ""}`}
                  onClick={() => !isCurrent && setStage(stage)}
                  disabled={updating}
                >
                  <span className="stage-emoji">{STAGE_EMOJI[stage]}</span>
                  {stage}
                </button>
              );
            })}
          </div>

          {/* WhatsApp message */}
          {waMsg && (
            <div className="wa-box">
              <div className="wa-box-top">
                <span className="wa-label">💬 WhatsApp Update</span>
                <button className={`wa-copy-btn ${copied ? "copied" : ""}`} onClick={copyWa}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="wa-text">{waMsg}</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ token, user, onSignOut }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("All");

  const fetchOrders = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const data = await sbFetch("/orders?order=created_at.desc", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + (o.total_zmw || 0), 0);
  const totalShipping = orders.reduce((s, o) => s + (o.shipping_fee || 0), 0);
  const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;

  // Filters
  const filters = ["All", "Pending", "Paid", "Arrived ZM"];
  const filtered = orders.filter((o) => {
    if (filter === "All") return true;
    if (filter === "Pending") return o.payment_status === "pending";
    if (filter === "Paid") return o.payment_status === "paid";
    if (filter === "Arrived ZM") return o.shipping_stage === "Arrived ZM";
    return true;
  });

  function handleUpdate(updated) {
    setOrders((prev) => prev.map((o) => o.batch_code === updated.batch_code ? updated : o));
    setSelected(updated);
  }

  // Detail view
  if (selected) {
    return (
      <>
        <style>{css}</style>
        <OrderDetail
          order={selected}
          token={token}
          onBack={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="sr-app">

        {/* Header */}
        <header className="dash-header">
          <div>
            <div className="dash-brand">Surreal</div>
            <div className="dash-brand-sub">Admin · <span>SHEIN Plug ZM</span></div>
          </div>
          <button className="signout-btn" onClick={onSignOut}>Sign Out</button>
        </header>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{totalOrders}</div>
            <div className="stat-sub">{orders.filter(o => o.payment_status === "paid").length} paid</div>
          </div>
          <div className="stat-card gold-card">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value gold"><sup>K</sup>{totalRevenue.toFixed(0)}</div>
            <div className="stat-sub" style={{ color: "#a08040" }}>ZMW</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Shipping Profit</div>
            <div className="stat-value"><sup>K</sup>{totalShipping}</div>
            <div className="stat-sub">from fees</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Order</div>
            <div className="stat-value"><sup>K</sup>{avgOrder.toFixed(0)}</div>
            <div className="stat-sub">per order</div>
          </div>
        </div>

        {/* Orders section */}
        <div className="section-head">
          <span className="section-label">Orders</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="order-count">{filtered.length}</span>
            <button className={`refresh-btn ${refreshing ? "spinning" : ""}`} onClick={() => fetchOrders(true)}>↻</button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="filter-tabs">
          {filters.map((f) => (
            <button key={f} className={`ftab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>

        {/* Orders list */}
        <div className="orders-list">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="skeleton skeleton-card" />)
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              No orders found
            </div>
          ) : (
            filtered.map((order, i) => {
              const items = order.items || [];
              const preview = items.map(it => it.name).join(", ");
              const isPaid = order.payment_status === "paid";
              const isArrived = order.shipping_stage === "Arrived ZM";
              return (
                <div
                  className="order-card"
                  key={order.batch_code || i}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onClick={() => setSelected(order)}
                >
                  <div className="card-top">
                    <div>
                      <div className="card-name">{order.customer_name}</div>
                      <div className="card-batch">{order.batch_code}</div>
                    </div>
                    <div className="card-total">
                      <span>K</span>{order.total_zmw?.toFixed(0)}
                    </div>
                  </div>
                  <div className="card-chips">
                    <span className={`chip ${isPaid ? "paid" : "pending"}`}>
                      {isPaid ? "✓ Paid" : "⏳ Pending"}
                    </span>
                    <span className={`chip ${isArrived ? "arrived" : "stage"}`}>
                      {STAGE_EMOJI[order.shipping_stage]} {order.shipping_stage}
                    </span>
                    <span className="chip">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="card-items-preview">{preview}</div>
                  <div className="card-arrow">View order →</div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function SurrealDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem("sr_token") || null);
  const [user, setUser] = useState(null);

  function handleLogin(t, u) {
    sessionStorage.setItem("sr_token", t);
    setToken(t);
    setUser(u);
  }

  async function handleSignOut() {
    if (token) await sbSignOut(token).catch(() => {});
    sessionStorage.removeItem("sr_token");
    setToken(null);
    setUser(null);
  }

  return (
    <>
      <style>{css}</style>
      {token ? (
        <Dashboard token={token} user={user} onSignOut={handleSignOut} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </>
  );
}
