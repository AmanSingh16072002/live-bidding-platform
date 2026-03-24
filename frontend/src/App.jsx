import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ── styles ────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #080b12;
    --surface: #0e1420;
    --surface2: #151c2e;
    --border: #1e2d47;
    --accent: #f97316;
    --accent2: #3b82f6;
    --green: #22c55e;
    --red: #ef4444;
    --text: #e2e8f0;
    --muted: #64748b;
    --font: 'Syne', sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font);
    min-height: 100vh;
    background-image:
      radial-gradient(ellipse 80% 50% at 50% -20%, rgba(249,115,22,0.08) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 80%, rgba(59,130,246,0.06) 0%, transparent 50%);
  }

  .app { max-width: 1100px; margin: 0 auto; padding: 0 24px 80px; }

  /* NAV */
  .nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 24px 0; border-bottom: 1px solid var(--border);
    margin-bottom: 48px;
  }
  .nav-logo {
    font-size: 18px; font-weight: 800; letter-spacing: -0.5px;
    color: var(--text);
  }
  .nav-logo span { color: var(--accent); }
  .nav-badge {
    font-family: var(--mono); font-size: 11px; color: var(--accent);
    background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.25);
    padding: 4px 10px; border-radius: 4px; letter-spacing: 1px;
  }
  .nav-right { display: flex; align-items: center; gap: 12px; }
  .nav-user {
    font-family: var(--mono); font-size: 12px; color: var(--muted);
  }
  .btn-logout {
    background: transparent; border: 1px solid var(--border);
    color: var(--muted); padding: 6px 14px; border-radius: 6px;
    font-family: var(--font); font-size: 13px; cursor: pointer;
    transition: all 0.2s;
  }
  .btn-logout:hover { border-color: var(--red); color: var(--red); }

  /* AUTH */
  .auth-wrap {
    min-height: 80vh; display: flex; align-items: center; justify-content: center;
  }
  .auth-card {
    width: 100%; max-width: 420px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; padding: 40px;
    animation: fadeUp 0.4s ease;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .auth-title {
    font-size: 26px; font-weight: 800; margin-bottom: 6px;
    letter-spacing: -0.5px;
  }
  .auth-title span { color: var(--accent); }
  .auth-sub { color: var(--muted); font-size: 14px; margin-bottom: 32px; }
  .auth-tabs {
    display: flex; gap: 0; margin-bottom: 28px;
    border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
  }
  .auth-tab {
    flex: 1; padding: 10px; text-align: center; cursor: pointer;
    font-family: var(--font); font-size: 14px; font-weight: 600;
    background: transparent; border: none; color: var(--muted);
    transition: all 0.2s;
  }
  .auth-tab.active { background: var(--surface2); color: var(--text); }
  .field { margin-bottom: 16px; }
  .field label {
    display: block; font-size: 12px; font-weight: 600;
    color: var(--muted); margin-bottom: 6px; letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .field input, .field select {
    width: 100%; padding: 11px 14px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text); font-family: var(--font);
    font-size: 14px; outline: none; transition: border 0.2s;
  }
  .field input:focus, .field select:focus { border-color: var(--accent); }
  .field select option { background: var(--surface2); }
  .btn-primary {
    width: 100%; padding: 13px; background: var(--accent);
    border: none; border-radius: 8px; color: white;
    font-family: var(--font); font-size: 15px; font-weight: 700;
    cursor: pointer; transition: opacity 0.2s; margin-top: 8px;
  }
  .btn-primary:hover { opacity: 0.9; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-error {
    background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
    color: var(--red); padding: 10px 14px; border-radius: 8px;
    font-size: 13px; margin-bottom: 16px;
  }
  .auth-success {
    background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3);
    color: var(--green); padding: 10px 14px; border-radius: 8px;
    font-size: 13px; margin-bottom: 16px;
  }

  /* HERO */
  .hero { text-align: center; margin-bottom: 56px; }
  .hero-label {
    font-family: var(--mono); font-size: 11px; letter-spacing: 2px;
    color: var(--accent); text-transform: uppercase; margin-bottom: 16px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .hero-label::before, .hero-label::after {
    content: ''; flex: 1; max-width: 60px; height: 1px; background: var(--border);
  }
  .hero h1 {
    font-size: clamp(36px, 6vw, 64px); font-weight: 800;
    letter-spacing: -2px; line-height: 1.05; margin-bottom: 16px;
  }
  .hero h1 span { color: var(--accent); }
  .hero p { color: var(--muted); font-size: 16px; max-width: 480px; margin: 0 auto; }

  /* STATS BAR */
  .stats-bar {
    display: flex; gap: 1px; background: var(--border);
    border: 1px solid var(--border); border-radius: 12px;
    overflow: hidden; margin-bottom: 48px;
  }
  .stat {
    flex: 1; background: var(--surface); padding: 16px 20px; text-align: center;
  }
  .stat-val {
    font-family: var(--mono); font-size: 22px; font-weight: 500;
    color: var(--accent); display: block;
  }
  .stat-label { font-size: 11px; color: var(--muted); letter-spacing: 0.5px; margin-top: 2px; }

  /* GRID */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 20px;
  }

  /* CARD */
  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; padding: 28px; position: relative; overflow: hidden;
    transition: border-color 0.3s, transform 0.2s;
    animation: fadeUp 0.5s ease both;
  }
  .card:hover { border-color: #2a3a55; transform: translateY(-2px); }
  .card.flash-green { border-color: var(--green); box-shadow: 0 0 20px rgba(34,197,94,0.15); }
  .card.flash-red   { border-color: var(--red);   box-shadow: 0 0 20px rgba(239,68,68,0.15); }
  .card-accent {
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
  }
  .card-tag {
    font-family: var(--mono); font-size: 10px; letter-spacing: 1px;
    color: var(--muted); text-transform: uppercase; margin-bottom: 14px;
  }
  .card-title {
    font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 24px;
  }
  .card-bid-label { font-size: 11px; color: var(--muted); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 4px; }
  .card-bid-val {
    font-family: var(--mono); font-size: 32px; font-weight: 500;
    color: var(--text); margin-bottom: 20px; letter-spacing: -1px;
  }
  .card-bid-val span { font-size: 16px; color: var(--muted); }
  .card-timer {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--mono); font-size: 13px; margin-bottom: 20px;
  }
  .timer-dot {
    width: 7px; height: 7px; border-radius: 50%; background: var(--green);
    animation: pulse 1.5s ease-in-out infinite;
  }
  .timer-dot.urgent { background: var(--red); }
  @keyframes pulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.5; transform: scale(0.8); }
  }
  .card-status {
    font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 5px;
    display: inline-block; margin-bottom: 16px; font-family: var(--mono);
  }
  .card-status.winning { background: rgba(34,197,94,0.15); color: var(--green); }
  .card-status.outbid  { background: rgba(239,68,68,0.15);  color: var(--red); }
  .btn-bid {
    width: 100%; padding: 13px; border: none; border-radius: 10px;
    font-family: var(--font); font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all 0.2s;
    background: linear-gradient(135deg, var(--accent), #ea580c);
    color: white; letter-spacing: 0.3px;
  }
  .btn-bid:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn-bid:disabled {
    background: var(--surface2); color: var(--muted);
    cursor: not-allowed; transform: none; opacity: 1;
  }
  .role-seller-msg {
    text-align: center; padding: 14px; border-radius: 10px;
    background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2);
    color: #93c5fd; font-size: 13px; font-family: var(--mono);
  }

  /* TOAST */
  .toast {
    position: fixed; bottom: 32px; right: 32px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 14px 20px; font-size: 14px;
    animation: slideIn 0.3s ease; z-index: 999; max-width: 320px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  .toast.green { border-color: var(--green); color: var(--green); }
  .toast.red   { border-color: var(--red);   color: var(--red); }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
`;

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat("en-IN").format(n);
}

// ── component ─────────────────────────────────────────────────────────────────
export default function App() {
  // auth
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  const [authTab, setAuthTab]     = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass]   = useState("");
  const [authRole, setAuthRole]   = useState("bidder");
  const [authError, setAuthError] = useState("");
  const [authMsg, setAuthMsg]     = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // auction
  const [items, setItems]           = useState([]);
  const [serverOffset, setServerOffset] = useState(0);
  const [status, setStatus]         = useState({});
  const [flash, setFlash]           = useState({});
  const [toast, setToast]           = useState(null);
  const socketRef = useRef(null);
  const [, forceUpdate] = useState(0);

  // ── socket ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("connect_error", (err) => {
      showToast("Connection error: " + err.message, "red");
    });

    socket.on("RESET_ITEMS", (newItems) => {
      setItems(newItems);
      setStatus({});
      setFlash({});
    });

    socket.on("UPDATE_BID", (updated) => {
      setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i));
      const isMe = updated.highestBidder === socket.data?.user?.sub;
      setStatus((p) => ({ ...p, [updated.id]: isMe ? "winning" : "outbid" }));
      setFlash((p)  => ({ ...p, [updated.id]: isMe ? "green" : "red" }));
      setTimeout(() => setFlash((p) => ({ ...p, [updated.id]: null })), 800);
      showToast(isMe ? `🏆 You're winning!` : `⚡ Someone outbid you`, isMe ? "green" : "red");
    });

    socket.on("BID_ERROR", (msg) => showToast("⚠ " + msg, "red"));
    socket.on("OUTBID",    ()    => showToast("⚡ Bid too low", "red"));

    return () => socket.disconnect();
  }, [token]);

  // ── fetch items ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/items`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || []);
        setServerOffset(d.serverTime - Date.now());
      })
      .catch(() => {});
  }, [token]);

  // ── timer tick ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── helpers ─────────────────────────────────────────────────────────────────
  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function getRemaining(endTime) {
    return Math.max(0, Math.floor((endTime - Date.now() - serverOffset) / 1000));
  }

  function placeBid(item) {
    socketRef.current?.emit("BID_PLACED", {
      itemId: item.id,
      bidAmount: item.currentBid + 1000,
    });
  }

  // ── auth handlers ───────────────────────────────────────────────────────────
  async function handleAuth(e) {
    e.preventDefault();
    setAuthError(""); setAuthMsg(""); setAuthLoading(true);
    try {
      const endpoint = authTab === "login" ? "/auth/login" : "/auth/register";
      const body = authTab === "login"
        ? { email: authEmail, password: authPass }
        : { email: authEmail, password: authPass, role: authRole };

      const res  = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");

      if (authTab === "register") {
        setAuthMsg("Account created! Please login.");
        setAuthTab("login");
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null); setUser(null);
    setItems([]); setStatus({});
    socketRef.current?.disconnect();
  }

  // ── auth screen ─────────────────────────────────────────────────────────────
  if (!token) return (
    <>
      <style>{css}</style>
      <div className="app">
        <nav className="nav">
          <div className="nav-logo">BID<span>X</span></div>
          <div className="nav-badge">LIVE AUCTIONS</div>
        </nav>
        <div className="auth-wrap">
          <div className="auth-card">
            <div className="auth-title">Welcome to <span>BidX</span></div>
            <div className="auth-sub">Sign in to start bidding in real-time auctions</div>
            <div className="auth-tabs">
              <button className={`auth-tab ${authTab === "login" ? "active" : ""}`} onClick={() => { setAuthTab("login"); setAuthError(""); setAuthMsg(""); }}>Login</button>
              <button className={`auth-tab ${authTab === "register" ? "active" : ""}`} onClick={() => { setAuthTab("register"); setAuthError(""); setAuthMsg(""); }}>Register</button>
            </div>
            {authError && <div className="auth-error">{authError}</div>}
            {authMsg   && <div className="auth-success">{authMsg}</div>}
            <form onSubmit={handleAuth}>
              <div className="field">
                <label>Email</label>
                <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} placeholder="••••••••" required />
              </div>
              {authTab === "register" && (
                <div className="field">
                  <label>Role</label>
                  <select value={authRole} onChange={(e) => setAuthRole(e.target.value)}>
                    <option value="bidder">Bidder</option>
                    <option value="seller">Seller</option>
                  </select>
                </div>
              )}
              <button className="btn-primary" type="submit" disabled={authLoading}>
                {authLoading ? "Please wait..." : authTab === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );

  // ── main app ─────────────────────────────────────────────────────────────────
  const activeCount  = items.filter((i) => getRemaining(i.endTime) > 0).length;
  const winningCount = Object.values(status).filter((s) => s === "winning").length;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <nav className="nav">
          <div className="nav-logo">BID<span>X</span></div>
          <div className="nav-badge">● LIVE</div>
          <div className="nav-right">
            <span className="nav-user">{user?.email} · {user?.role}</span>
            <button className="btn-logout" onClick={logout}>Logout</button>
          </div>
        </nav>

        <div className="hero">
          <div className="hero-label">Real-time auctions</div>
          <h1>Bid. Win. <span>Repeat.</span></h1>
          <p>Live auctions powered by WebSockets. Every bid updates instantly across all connected bidders.</p>
        </div>

        <div className="stats-bar">
          <div className="stat">
            <span className="stat-val">{items.length}</span>
            <div className="stat-label">Total Auctions</div>
          </div>
          <div className="stat">
            <span className="stat-val">{activeCount}</span>
            <div className="stat-label">Active Now</div>
          </div>
          <div className="stat">
            <span className="stat-val">{winningCount}</span>
            <div className="stat-label">You're Winning</div>
          </div>
          <div className="stat">
            <span className="stat-val" style={{color: 'var(--accent2)'}}>100</span>
            <div className="stat-label">Max Concurrent</div>
          </div>
        </div>

        <div className="grid">
          {items.map((item, i) => {
            const rem     = getRemaining(item.endTime);
            const urgent  = rem < 30;
            const ended   = rem === 0;
            const isSeller = user?.role === "seller";
            return (
              <div
                key={item.id}
                className={`card ${flash[item.id] ? "flash-" + flash[item.id] : ""}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="card-accent" />
                <div className="card-tag">Auction #{item.id.slice(0, 8)}</div>
                <div className="card-title">{item.title}</div>

                <div className="card-bid-label">Current Bid</div>
                <div className="card-bid-val">
                  <span>₹</span>{fmt(item.currentBid)}
                </div>

                <div className="card-timer">
                  <div className={`timer-dot ${urgent ? "urgent" : ""}`} />
                  <span style={{ color: urgent ? "var(--red)" : "var(--muted)" }}>
                    {ended ? "Auction ended" : `${rem}s remaining`}
                  </span>
                </div>

                {status[item.id] && (
                  <div className={`card-status ${status[item.id]}`}>
                    {status[item.id] === "winning" ? "🏆 Winning" : "❌ Outbid"}
                  </div>
                )}

                {isSeller ? (
                  <div className="role-seller-msg">Sellers cannot place bids</div>
                ) : (
                  <button
                    className="btn-bid"
                    onClick={() => placeBid(item)}
                    disabled={ended}
                  >
                    {ended ? "Auction Ended" : `Place Bid  ₹${fmt(item.currentBid + 1000)}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}
    </>
  );
}