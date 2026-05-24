import { useState, useEffect, useCallback } from "react";

// ─── Supabase client (env vars injected at build time) ───────────────────────
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

async function supabaseInsert(table, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateBatchCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return (
    "SR-" +
    Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("")
  );
}

function shippingFee(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 40;
  if (count <= 5) return 60;
  if (count <= 9) return 120;
  return 160;
}

// ─── Style tokens ─────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --gold: #c8a96e;
    --gold-light: #f5edd9;
    --gold-pale: #faf6ee;
    --bg: #fafaf8;
    --border: #ece9e4;
    --text: #111;
    --muted: #9a9490;
    --chip-bg: #f3ede4;
    --radius: 16px;
    --radius-sm: 10px;
    --shadow: 0 2px 16px rgba(0,0,0,0.06);
    --shadow-card: 0 1px 4px rgba(0,0,0,0.05);
  }

  html, body { background: var(--bg); font-family: 'DM Sans', sans-serif; color: var(--text); }

  .surreal-app {
    min-height: 100vh;
    background: var(--bg);
    max-width: 480px;
    margin: 0 auto;
    padding: 0 0 80px;
  }

  /* ── Header ── */
  .brand-header {
    padding: 48px 24px 28px;
    text-align: center;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .brand-name {
    font-family: 'Inter', sans-serif;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 0.22em;
    color: var(--text);
    text-transform: uppercase;
    display: block;
    margin-bottom: 4px;
  }
  .brand-tag {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    color: var(--muted);
    letter-spacing: 0.04em;
    font-weight: 400;
  }
  .brand-tag span { color: var(--gold); }

  /* ── Rate pill ── */
  .rate-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 14px;
    background: var(--gold-pale);
    border: 1px solid #eddfc8;
    border-radius: 100px;
    padding: 5px 12px;
    font-size: 11.5px;
    font-weight: 500;
    color: #7a6540;
    letter-spacing: 0.01em;
  }
  .rate-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--gold);
    flex-shrink: 0;
    box-shadow: 0 0 0 2px rgba(200,169,110,0.25);
    animation: pulse 2.4s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 0 2px rgba(200,169,110,0.25); }
    50% { box-shadow: 0 0 0 5px rgba(200,169,110,0.12); }
  }

  /* ── Sections ── */
  .section { padding: 24px 20px 0; }
  .section-label {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 14px;
  }

  /* ── Inputs ── */
  .field { margin-bottom: 12px; }
  .field label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    margin-bottom: 5px;
    letter-spacing: 0.02em;
  }
  .field input, .field select {
    width: 100%;
    background: #fff;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 13px 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    color: var(--text);
    outline: none;
    transition: border-color 0.18s;
    -webkit-appearance: none;
  }
  .field input:focus, .field select:focus {
    border-color: var(--gold);
  }
  .field input::placeholder { color: #c8c3bc; }

  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  /* ── Add item box ── */
  .add-item-section { padding: 20px; }
  .add-item-box {
    border: 1.5px dashed #d8d0c4;
    border-radius: var(--radius);
    padding: 20px;
    background: #fff;
    transition: border-color 0.18s, background 0.18s;
  }
  .add-item-box.open {
    border-color: var(--gold);
    border-style: solid;
    background: #fffdfb;
  }

  .add-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    padding: 6px 0;
    user-select: none;
  }
  .add-trigger-icon {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: var(--gold-pale);
    border: 1.5px solid #e0cfb0;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    color: var(--gold);
    font-weight: 300;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .add-trigger:hover .add-trigger-icon { background: #f0e6cf; }
  .add-trigger-text {
    font-size: 14px;
    color: #8c8279;
    font-weight: 500;
    letter-spacing: 0.01em;
  }

  .item-form { margin-top: 16px; }
  .link-field {
    margin-bottom: 14px;
  }
  .link-field label {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    letter-spacing: 0.09em;
    text-transform: uppercase;
    display: block;
    margin-bottom: 6px;
  }
  .link-field input {
    width: 100%;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 12px 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    color: var(--text);
    outline: none;
    transition: border-color 0.18s;
  }
  .link-field input:focus { border-color: var(--gold); }
  .link-field input::placeholder { color: #c8c3bc; }

  .price-row { display: grid; grid-template-columns: 2fr 1fr; gap: 10px; }

  .add-btn {
    width: 100%;
    margin-top: 16px;
    padding: 13px;
    background: var(--text);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .add-btn:hover { background: #2a2a2a; }
  .add-btn:active { transform: scale(0.98); }

  /* ── Item cards ── */
  .items-list { padding: 0 20px; margin-top: 4px; display: flex; flex-direction: column; gap: 10px; }

  .item-card {
    background: #fff;
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 14px 12px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    box-shadow: var(--shadow-card);
    animation: slideIn 0.22s ease;
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .item-emoji {
    width: 44px; height: 44px;
    border-radius: 10px;
    background: var(--gold-pale);
    border: 1px solid #e8dcc8;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }

  .item-info { flex: 1; min-width: 0; }
  .item-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 7px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .chip {
    background: var(--chip-bg);
    color: #7a6e63;
    font-size: 11px;
    font-weight: 500;
    padding: 3px 9px;
    border-radius: 100px;
    letter-spacing: 0.01em;
  }

  .item-price-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    flex-shrink: 0;
  }
  .item-zmw {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
    white-space: nowrap;
  }
  .item-zmw span {
    font-size: 10px;
    font-weight: 500;
    color: var(--muted);
    margin-right: 1px;
  }
  .remove-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: 6px;
    width: 26px; height: 26px;
    cursor: pointer;
    color: #bbb;
    font-size: 14px;
    display: flex; align-items: center; justify-content: center;
    transition: border-color 0.15s, color 0.15s;
    padding: 0;
  }
  .remove-btn:hover { border-color: #e07070; color: #e07070; }

  /* ── Order summary ── */
  .summary-section { padding: 20px; }
  .summary-box {
    background: #fff;
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow);
  }
  .summary-header {
    padding: 14px 18px 12px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .summary-title {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .summary-count {
    background: var(--chip-bg);
    color: #7a6e63;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 100px;
  }

  .summary-lines { padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; }
  .summary-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
  }
  .summary-line .label { color: #6d6761; }
  .summary-line .value { font-weight: 600; color: var(--text); }
  .summary-line .value.gold { color: var(--gold); }
  .summary-line .value.muted { color: var(--muted); font-size: 12px; font-weight: 400; }

  .summary-divider { height: 1px; background: var(--border); margin: 4px 0; }

  .summary-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    border-top: 1.5px solid var(--border);
    background: var(--gold-pale);
  }
  .total-label {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #7a6540;
  }
  .total-value {
    font-family: 'Inter', sans-serif;
    font-size: 22px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.01em;
  }
  .total-value sup {
    font-size: 12px;
    font-weight: 600;
    vertical-align: super;
    margin-right: 1px;
    color: var(--muted);
  }

  /* ── Submit button ── */
  .submit-section { padding: 16px 20px 8px; }
  .submit-btn {
    width: 100%;
    padding: 17px;
    background: var(--text);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
    box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    position: relative;
    overflow: hidden;
  }
  .submit-btn:hover:not(:disabled) {
    background: #1a1a1a;
    box-shadow: 0 6px 24px rgba(0,0,0,0.18);
  }
  .submit-btn:active:not(:disabled) { transform: scale(0.99); }
  .submit-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
    box-shadow: none;
  }
  .submit-btn.loading::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    animation: shimmer 1.2s infinite;
  }
  @keyframes shimmer {
    from { transform: translateX(-100%); }
    to   { transform: translateX(100%); }
  }

  .error-msg {
    margin-top: 10px;
    text-align: center;
    font-size: 13px;
    color: #e07070;
    font-weight: 500;
  }

  /* ── Success screen ── */
  .success-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    text-align: center;
    background: var(--bg);
    animation: fadeIn 0.4s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .success-icon {
    width: 72px; height: 72px;
    border-radius: 50%;
    background: var(--gold-pale);
    border: 2px solid #e0cfb0;
    display: flex; align-items: center; justify-content: center;
    font-size: 34px;
    margin-bottom: 28px;
    animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes popIn {
    from { transform: scale(0.3); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }

  .success-title {
    font-family: 'Inter', sans-serif;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--text);
    margin-bottom: 8px;
  }
  .success-sub {
    font-size: 14px;
    color: var(--muted);
    margin-bottom: 32px;
    line-height: 1.6;
  }
  .batch-box {
    background: #fff;
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 20px 28px;
    margin-bottom: 32px;
    box-shadow: var(--shadow);
    min-width: 240px;
  }
  .batch-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
  }
  .batch-code {
    font-family: 'Inter', sans-serif;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: var(--gold);
  }
  .success-note {
    font-size: 12px;
    color: #a09890;
    line-height: 1.7;
    max-width: 300px;
  }
  .success-note strong { color: var(--text); font-weight: 600; }

  /* ── Empty state ── */
  .empty-items {
    padding: 0 20px 4px;
    font-size: 13px;
    color: #b8b0a8;
    text-align: center;
    font-style: italic;
  }
`;

// Product emoji based on name keywords
function getEmoji(name = "") {
  const n = name.toLowerCase();
  if (n.includes("dress")) return "👗";
  if (n.includes("bag") || n.includes("purse")) return "👜";
  if (n.includes("shoe") || n.includes("heel") || n.includes("sneaker") || n.includes("boot")) return "👟";
  if (n.includes("top") || n.includes("blouse") || n.includes("shirt")) return "👚";
  if (n.includes("jean") || n.includes("pant") || n.includes("trouser")) return "👖";
  if (n.includes("jacket") || n.includes("coat")) return "🧥";
  if (n.includes("skirt")) return "👘";
  if (n.includes("hat") || n.includes("cap")) return "🧢";
  if (n.includes("watch")) return "⌚";
  if (n.includes("glass") || n.includes("sunglass")) return "🕶️";
  return "✨";
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SurrealOrderForm() {
  const [rate, setRate] = useState(null);
  const [rateLoading, setRateLoading] = useState(true);

  // Customer info
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Item form state
  const [formOpen, setFormOpen] = useState(false);
  const [link, setLink] = useState("");
  const [itemName, setItemName] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState("1");
  const [priceUsd, setPriceUsd] = useState("");

  // Items list
  const [items, setItems] = useState([]);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successCode, setSuccessCode] = useState(null);

  // Fetch live rate
  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((d) => {
        if (d?.rates?.ZMW) setRate(d.rates.ZMW);
        else setRate(27.5);
      })
      .catch(() => setRate(27.5))
      .finally(() => setRateLoading(false));
  }, []);

  const toZmw = useCallback(
    (usd) => (rate ? usd * rate : 0),
    [rate]
  );

  const itemCount = items.reduce((s, i) => s + i.qty, 0);
  const fee = shippingFee(itemCount);
  const subtotalUsd = items.reduce((s, i) => s + i.priceUsd * i.qty, 0);
  const subtotalZmw = toZmw(subtotalUsd);
  const grandTotal = subtotalZmw + fee;

  function resetForm() {
    setLink(""); setItemName(""); setSize(""); setColor(""); setQty("1"); setPriceUsd("");
  }

  function handleAddItem() {
    if (!itemName.trim() || !priceUsd || isNaN(parseFloat(priceUsd))) return;
    const newItem = {
      id: Date.now(),
      link: link.trim(),
      name: itemName.trim(),
      size: size.trim(),
      color: color.trim(),
      qty: Math.max(1, parseInt(qty) || 1),
      priceUsd: parseFloat(priceUsd),
    };
    setItems((prev) => [...prev, newItem]);
    resetForm();
    setFormOpen(false);
  }

  async function handleSubmit() {
    if (!name.trim() || !whatsapp.trim()) {
      setError("Please fill in your name and WhatsApp number.");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one item to your order.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const batchCode = generateBatchCode();
      const payload = {
        customer_name: name.trim(),
        whatsapp: whatsapp.trim(),
        items: items.map(({ id, ...i }) => i),
        total_usd: parseFloat(subtotalUsd.toFixed(2)),
        total_zmw: parseFloat(grandTotal.toFixed(2)),
        shipping_fee: fee,
        batch_code: batchCode,
        payment_status: "pending",
        shipping_stage: "Order Received",
      };
      await supabaseInsert("orders", payload);
      setSuccessCode(batchCode);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Success screen ─────────────────────────────────────────────────────────
  if (successCode) {
    return (
      <>
        <style>{css}</style>
        <div className="success-screen">
          <div className="success-icon">🎉</div>
          <h1 className="success-title">Order Placed!</h1>
          <p className="success-sub">
            Your order has been received.<br />
            Screenshot your batch code below.
          </p>
          <div className="batch-box">
            <div className="batch-label">Batch Code</div>
            <div className="batch-code">{successCode}</div>
          </div>
          <p className="success-note">
            Save this code — you'll need it to track your order.<br />
            <strong>Temwa</strong> will reach out on WhatsApp with payment details shortly.
          </p>
        </div>
      </>
    );
  }

  // ─── Main form ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className="surreal-app">

        {/* Header */}
        <header className="brand-header">
          <span className="brand-name">Surreal</span>
          <div className="brand-tag">by <span>Temwa</span> · SHEIN Plug ZM</div>
          <div className="rate-pill">
            <span className="rate-dot" />
            {rateLoading
              ? "Fetching rate…"
              : `1 USD = K ${rate?.toFixed(2)} ZMW`}
          </div>
        </header>

        {/* Customer info */}
        <div className="section">
          <div className="section-label">Your Details</div>
          <div className="field">
            <label>Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chanda Mwanza"
            />
          </div>
          <div className="field">
            <label>WhatsApp Number</label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+260 97X XXX XXX"
            />
          </div>
        </div>

        {/* Items list */}
        {items.length > 0 && (
          <div className="items-list">
            {items.map((item) => {
              const zmw = toZmw(item.priceUsd * item.qty);
              return (
                <div className="item-card" key={item.id}>
                  <div className="item-emoji">{getEmoji(item.name)}</div>
                  <div className="item-info">
                    <div className="item-name">{item.name}</div>
                    <div className="chips">
                      {item.size && <span className="chip">Size {item.size}</span>}
                      {item.color && <span className="chip">{item.color}</span>}
                      <span className="chip">Qty {item.qty}</span>
                      <span className="chip">${item.priceUsd} ea.</span>
                    </div>
                  </div>
                  <div className="item-price-col">
                    <div className="item-zmw"><span>K</span>{zmw.toFixed(0)}</div>
                    <button
                      className="remove-btn"
                      onClick={() => setItems((p) => p.filter((i) => i.id !== item.id))}
                      title="Remove"
                    >×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add item box */}
        <div className="add-item-section">
          <div className={`add-item-box${formOpen ? " open" : ""}`}>
            {!formOpen ? (
              <div className="add-trigger" onClick={() => setFormOpen(true)}>
                <div className="add-trigger-icon">+</div>
                <span className="add-trigger-text">Add a SHEIN item</span>
              </div>
            ) : (
              <div className="item-form">
                <div className="link-field">
                  <label>SHEIN Product Link</label>
                  <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://www.shein.com/…"
                  />
                </div>
                <div className="field">
                  <label>Product Name</label>
                  <input
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Floral Wrap Midi Dress"
                    autoFocus
                  />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Size</label>
                    <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="M, 38, S…" />
                  </div>
                  <div className="field">
                    <label>Color</label>
                    <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Black, Pink…" />
                  </div>
                </div>
                <div className="price-row">
                  <div className="field">
                    <label>Price (USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceUsd}
                      onChange={(e) => setPriceUsd(e.target.value)}
                      placeholder="e.g. 14.99"
                    />
                  </div>
                  <div className="field">
                    <label>Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>
                {rate && priceUsd && !isNaN(parseFloat(priceUsd)) && (
                  <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, marginTop: -4, marginBottom: 10, textAlign: "right" }}>
                    ≈ K {(parseFloat(priceUsd) * parseInt(qty || 1) * rate).toFixed(0)} ZMW
                  </div>
                )}
                <button
                  className="add-btn"
                  onClick={handleAddItem}
                  disabled={!itemName.trim() || !priceUsd}
                >
                  Add to Order
                </button>
                <div
                  style={{ textAlign: "center", marginTop: 10, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}
                  onClick={() => { setFormOpen(false); resetForm(); }}
                >
                  Cancel
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        {items.length > 0 && (
          <div className="summary-section">
            <div className="summary-box">
              <div className="summary-header">
                <span className="summary-title">Order Summary</span>
                <span className="summary-count">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
              </div>
              <div className="summary-lines">
                <div className="summary-line">
                  <span className="label">Subtotal</span>
                  <span className="value">K {subtotalZmw.toFixed(0)}</span>
                </div>
                <div className="summary-line">
                  <span className="label">Shipping Fee</span>
                  <span className="value gold">K {fee}</span>
                </div>
                <div className="summary-divider" />
                <div className="summary-line">
                  <span className="label" style={{ fontSize: 12 }}>USD Subtotal</span>
                  <span className="value muted">${subtotalUsd.toFixed(2)}</span>
                </div>
                <div className="summary-line">
                  <span className="label" style={{ fontSize: 12 }}>Rate used</span>
                  <span className="value muted">1 USD = K {rate?.toFixed(2)}</span>
                </div>
              </div>
              <div className="summary-total">
                <span className="total-label">Grand Total</span>
                <span className="total-value"><sup>K</sup>{grandTotal.toFixed(0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="submit-section">
          <button
            className={`submit-btn${submitting ? " loading" : ""}`}
            onClick={handleSubmit}
            disabled={submitting || items.length === 0 || !name.trim() || !whatsapp.trim()}
          >
            {submitting ? "Placing Order…" : "Confirm Order"}
          </button>
          {error && <div className="error-msg">{error}</div>}

          {/* How to add items */}
          <div style={{ margin: "20px 0 6px", background: "#fff", border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>How to add items</p>
            {[
              ["1", "Open the SHEIN product page and note the price in USD ($)."],
              ["2", "Copy the product link and paste it in the link field."],
              ["3", "Type the product name exactly as shown on SHEIN."],
              ["4", "Select your size, color and quantity."],
            ].map(([num, text]) => (
              <div key={num} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 9 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--gold-pale)", border: "1px solid #e0cfb0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--gold)", flexShrink: 0 }}>{num}</span>
                <span style={{ fontSize: 12, color: "#7a7168", lineHeight: 1.6 }}>{text}</span>
              </div>
            ))}
          </div>

          <p style={{ textAlign: "center", fontSize: 11, color: "#c0b8b0", marginTop: 14, lineHeight: 1.8 }}>
            ⚠️ <span style={{ color: "#a09080", fontWeight: 500 }}>You will be contacted on WhatsApp to confirm payment before your order is placed.</span><br />
            <span style={{ color: "var(--gold)", fontWeight: 500 }}>Surreal · SHEIN Plug ZM</span>
          </p>
        </div>

      </div>
    </>
  );
}
