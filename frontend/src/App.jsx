import { useState, useEffect, useRef } from "react";
import { api } from "./api";

const ALL_TERMS = ["W26", "S26", "F26", "W27", "S27", "F27", "W28"];
const SKILL_OPTIONS = ["React", "TypeScript", "Python", "ML/AI", "Embedded C", "PCB Design", "CAD", "Rust", "Node.js", "FPGA", "Computer Vision", "iOS", "Java", "C++", "Figma", "Verilog", "Swift", "Docker"];
const DISCIPLINE_OPTIONS = ["ECE", "MTE", "SE", "CE", "ME", "CHE", "CIVE", "ENVE", "NANO", "SYDE", "TRON", "BME"];
const YEAR_OPTIONS = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];
const INTEREST_OPTIONS = ["Volleyball", "Badminton", "Basketball", "Soccer", "Chess", "Hiking", "Music", "Gaming", "Photography", "Cooking", "Running", "Tennis"];
const CATEGORIES_WORK = ["SOFTWARE", "HARDWARE", "RESEARCH", "STARTUP", "DESIGN"];
const CATEGORIES_PLAY = ["SPORT", "MUSIC", "GAMING", "ART", "SOCIAL", "FOOD"];
const STAGES = ["IDEA", "POC", "PROTOTYPE", "SCALING"];
const COMMITMENTS = ["CASUAL", "SERIOUS", "STARTUP"];
const ACTIVITY_TYPES = ["RECREATIONAL", "COMPETITIVE", "ONE-TIME"];

const C = {
  bg: "#F5F2EB",
  surface: "#EDEAE1",
  surface2: "#E5E1D6",
  detail: "#EFECE3",
  ink: "#15150D",
  body: "#3a3a28",
  muted: "#7a7a62",
  rule: "#D8D4C6",
  lime: "#AACC00",
  limeLight: "#F0F9C0",
  limeDark: "#8aaa00",
  limeInk: "#2d3a00",
  red: "#CC3300",
  redLight: "#FFF0ED",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Bebas+Neue&display=swap');`;

const BASE_CSS = `
  ${FONTS}
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.bg}; }
  ::selection { background: ${C.lime}; color: ${C.limeInk}; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: ${C.rule}; border-radius: 2px; }
  input, textarea, button, select { font-family: 'IBM Plex Mono', monospace; }
  input::placeholder, textarea::placeholder { color: ${C.muted}; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  .fade-up { animation: fadeUp 0.3s both; }
  .slide-in { animation: slideIn 0.25s both; }
  @media(max-width:860px) {
    .app-layout { flex-direction: column !important; }
    .app-sidebar { width: 100% !important; max-height: 220px !important; border-right: none !important; border-bottom: 1px solid ${C.rule} !important; }
  }
  @media(max-width:540px) { .topbar-meta { display: none !important; } }
`;

const D = ({ children, size = 48, color = C.ink, style = {} }) => (
  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: size, letterSpacing: "0.08em", lineHeight: 1, color, ...style }}>{children}</span>
);
const M = ({ children, style = {} }) => (
  <span style={{ fontFamily: "'IBM Plex Mono',monospace", ...style }}>{children}</span>
);

function Chip({ children, active, onClick, small }) {
  return (
    <span onClick={onClick} style={{
      display: "inline-block", fontFamily: "'IBM Plex Mono',monospace",
      fontSize: small ? 10 : 11, letterSpacing: "0.04em",
      padding: small ? "3px 8px" : "5px 12px",
      border: active ? `1.5px solid ${C.ink}` : `1px solid ${C.rule}`,
      background: active ? C.ink : "transparent",
      color: active ? C.bg : C.body,
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.1s", userSelect: "none",
    }}>{children}</span>
  );
}

function FieldInput({ label, value, onChange, placeholder, type = "text", hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em" }}>{label}</label>
        {hint && <M style={{ fontSize: 10, color: C.muted }}>{hint}</M>}
      </div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "11px 14px", fontSize: 13, color: C.ink, background: C.surface, border: `1px solid ${C.rule}`, outline: "none", transition: "border-color 0.15s" }}
        onFocus={e => e.target.style.borderColor = C.lime}
        onBlur={e => e.target.style.borderColor = C.rule}
      />
    </div>
  );
}

function FieldTextarea({ label, value, onChange, placeholder, rows = 3, hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em" }}>{label}</label>
        {hint && <M style={{ fontSize: 10, color: C.muted }}>{hint}</M>}
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width: "100%", padding: "11px 14px", fontSize: 13, color: C.ink, background: C.surface, border: `1px solid ${C.rule}`, outline: "none", resize: "vertical", lineHeight: 1.6, transition: "border-color 0.15s" }}
        onFocus={e => e.target.style.borderColor = C.lime}
        onBlur={e => e.target.style.borderColor = C.rule}
      />
    </div>
  );
}

function SectionLabel({ children }) {
  return <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em", display: "block", marginBottom: 12 }}>{children}</M>;
}

function SectionDivider() {
  return <div style={{ height: 1, background: C.rule, margin: "28px 0" }} />;
}

function Landing({ onLogin, onSignup, onDemo }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono',monospace", color: C.ink }}>
      <style>{BASE_CSS}</style>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 56, borderBottom: `1px solid ${C.rule}` }}>
        <D size={26}>PLORK</D>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onLogin} style={{ fontSize: 11, letterSpacing: "0.08em", padding: "8px 20px", border: `1px solid ${C.rule}`, background: "transparent", color: C.body, cursor: "pointer" }}>LOG IN</button>
          <button onClick={onSignup} style={{ fontSize: 11, letterSpacing: "0.08em", padding: "8px 20px", border: "none", background: C.ink, color: C.bg, cursor: "pointer", fontWeight: 600 }}>SIGN UP →</button>
        </div>
      </nav>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "calc(100vh - 56px)" }}>
        <div style={{ padding: "72px 56px 56px", borderRight: `1px solid ${C.rule}`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <M style={{ fontSize: 11, color: C.muted, letterSpacing: "0.16em", display: "block", marginBottom: 20 }}>FOR WORK AND PLAY</M>
            <div style={{ marginBottom: 32 }}>
              <D size={76} style={{ display: "block", marginBottom: 2 }}>FIND YOUR</D>
              <D size={76} style={{ display: "block", marginBottom: 2 }}>TEAM AT</D>
              <span style={{ display: "inline-block", background: C.ink, padding: "2px 14px" }}>
                <D size={76} color={C.lime}>WATERLOO</D>
              </span>
            </div>
            <p style={{ fontSize: 14, color: C.body, lineHeight: 1.8, maxWidth: 420, marginBottom: 40 }}>
              The co-op cycle kills side projects and sports teams alike. Plork matches you by skill, schedule, and the terms you're actually on campus.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={onSignup} style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, padding: "13px 32px", border: "none", background: C.lime, color: C.limeInk, cursor: "pointer" }}>GET STARTED →</button>
              <button onClick={onLogin} style={{ fontSize: 12, letterSpacing: "0.1em", padding: "13px 32px", border: `1px solid ${C.rule}`, background: "transparent", color: C.body, cursor: "pointer" }}>LOG IN</button>
              <button onClick={onDemo} style={{ fontSize: 12, letterSpacing: "0.1em", padding: "13px 32px", border: `1px solid ${C.rule}`, background: "transparent", color: C.muted, cursor: "pointer" }}>VIEW DEMO (READ ONLY)</button>
            </div>
          </div>
          <div style={{ display: "flex", paddingTop: 32, borderTop: `1px solid ${C.rule}`, marginTop: 56 }}>
            {[["10K+", "ENG STUDENTS"], ["4", "CO-OP ROTATIONS/YR"], ["8", "DISCIPLINES"]].map(([n, l], i) => (
              <div key={l} style={{ flex: 1, paddingRight: i < 2 ? 24 : 0, borderRight: i < 2 ? `1px solid ${C.rule}` : "none", marginRight: i < 2 ? 24 : 0 }}>
                <D size={32} style={{ display: "block" }}>{n}</D>
                <M style={{ fontSize: 9, color: C.muted, letterSpacing: "0.1em" }}>{l}</M>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ borderBottom: `1px solid ${C.rule}`, padding: "48px 48px 36px" }}>
            <SectionLabel>TWO MODES</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {[{ m: "WORK", desc: "Side projects & engineering teams. Role slots and skill matching.", dark: true }, { m: "PLAY", desc: "Sports, music, social. Find people on campus the same terms as you.", dark: false }].map((x, i) => (
                <div key={x.m} style={{ padding: "20px 22px", background: x.dark ? C.ink : C.surface, borderRight: i === 0 ? `1px solid ${C.rule}` : "none" }}>
                  <D size={22} color={x.dark ? C.lime : C.muted} style={{ display: "block", marginBottom: 10 }}>{x.m}</D>
                  <p style={{ fontSize: 12, color: x.dark ? "#7a9a6a" : C.muted, lineHeight: 1.65 }}>{x.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderBottom: `1px solid ${C.rule}`, padding: "32px 48px" }}>
            <SectionLabel>CO-OP OVERLAP CALENDAR</SectionLabel>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
              Plork shows you when team members are on campus at the same time, making it easier to coordinate projects and activities.
            </p>
            <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
              {ALL_TERMS.slice(3).map(t => <M key={t} style={{ width: 30, fontSize: 8, color: C.muted, textAlign: "center" }}>{t}</M>)}
            </div>
          </div>
          <div style={{ padding: "32px 48px" }}>
            <SectionLabel>ROLE SLOT SYSTEM</SectionLabel>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              Projects list open roles with required skills. When you apply, founders see your profile and can accept or decline your request.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Login({ onBack, onSuccess }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !pass) {
      setError("Please enter both email and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await api.login(email, pass);
      onSuccess(result.userId, result.user);
    } catch (err) {
      setError(err.message || "Invalid email or password");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono',monospace" }}>
      <style>{BASE_CSS}</style>
      <nav style={{ display: "flex", alignItems: "center", padding: "0 48px", height: 56, borderBottom: `1px solid ${C.rule}`, gap: 16 }}>
        <span onClick={onBack} style={{ fontSize: 11, color: C.muted, cursor: "pointer" }}>← BACK</span>
        <D size={22}>PLORK</D>
      </nav>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, minHeight: "calc(100vh - 56px)" }}>
        <div style={{ width: "100%", maxWidth: 420, border: `1px solid ${C.rule}`, padding: "52px 48px" }}>
          <D size={40} style={{ display: "block", marginBottom: 6 }}>LOG IN</D>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 40 }}>Welcome back to Plork.</p>
          {error && <div style={{ padding: "10px 14px", background: C.redLight, border: `1px solid ${C.red}44`, marginBottom: 20 }}><M style={{ fontSize: 12, color: C.red }}>{error}</M></div>}
          <FieldInput label="UW EMAIL" value={email} onChange={setEmail} placeholder="userid@uwaterloo.ca" type="email" />
          <FieldInput label="PASSWORD" value={pass} onChange={setPass} placeholder="••••••••" type="password" />
          <button onClick={handleLogin} disabled={loading} style={{ width: "100%", padding: "13px", fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, background: loading ? C.rule : C.ink, color: C.bg, border: "none", cursor: loading ? "default" : "pointer", marginTop: 8, opacity: loading ? 0.6 : 1 }}>{loading ? "LOGGING IN..." : "LOG IN →"}</button>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.rule}`, textAlign: "center" }}>
            <span style={{ fontSize: 11, color: C.muted }}>No account? </span>
            <span onClick={onBack} style={{ fontSize: 11, color: C.ink, cursor: "pointer", textDecoration: "underline" }}>Sign up</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const STEPS = ["ACCOUNT", "STREAM", "SKILLS", "SCHEDULE", "DONE"];
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", discipline: "", year: "", skills: [], interests: [], built: "", terms: [], commitment: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [customSkill, setCustomSkill] = useState("");
  const [customInterest, setCustomInterest] = useState("");
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const tog = (k, v) => setForm(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }));
  const addCustomSkill = () => {
    if (customSkill.trim() && !form.skills.includes(customSkill.trim())) {
      tog("skills", customSkill.trim());
      setCustomSkill("");
    }
  };
  const addCustomInterest = () => {
    if (customInterest.trim() && !form.interests.includes(customInterest.trim())) {
      tog("interests", customInterest.trim());
      setCustomInterest("");
    }
  };
  const canNext = () => {
    if (step === 0) return form.name && form.email && form.password && form.password.length >= 6 && form.password === form.confirmPassword;
    if (step === 1) return form.discipline && form.year;
    if (step === 2) return form.skills.length > 0;
    if (step === 3) return form.terms.length > 0;
    return true;
  };
  const handleComplete = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.register(form);
      onComplete(result.userId, result.user);
    } catch (err) {
      setError(err.message || "Registration failed");
      setLoading(false);
    }
  };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono',monospace", display: "flex", flexDirection: "column" }}>
      <style>{BASE_CSS}</style>
      <div style={{ height: 3, background: C.rule }}><div style={{ height: "100%", width: `${(step / (STEPS.length - 1)) * 100}%`, background: C.lime, transition: "width 0.4s" }} /></div>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 56, borderBottom: `1px solid ${C.rule}` }}>
        <D size={22}>PLORK</D>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 22, height: 22, background: i < step ? C.ink : i === step ? C.lime : "transparent", border: i < step ? `1px solid ${C.ink}` : i === step ? "none" : `1px solid ${C.rule}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: i < step ? C.bg : i === step ? C.limeInk : C.muted, fontWeight: 600 }}>{i < step ? "✓" : i + 1}</div>
              {i < STEPS.length - 1 && <div style={{ width: 14, height: 1, background: C.rule }} />}
            </div>
          ))}
        </div>
      </nav>
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "52px 40px", overflowY: "auto" }}>
        <div className="fade-up" key={step} style={{ width: "100%", maxWidth: 580 }}>
          {step === 0 && <>
            <D size={44} style={{ display: "block", marginBottom: 6 }}>CREATE ACCOUNT</D>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 40 }}>Sign up with your UW email.</p>
            {error && <div style={{ padding: "10px 14px", background: C.redLight, border: `1px solid ${C.red}44`, marginBottom: 20 }}><M style={{ fontSize: 12, color: C.red }}>{error}</M></div>}
            <FieldInput label="FULL NAME" value={form.name} onChange={v => u("name", v)} placeholder="Jamie Kim" />
            <FieldInput label="UW EMAIL" value={form.email} onChange={v => u("email", v)} placeholder="jkim@uwaterloo.ca" type="email" />
            <FieldInput label="PASSWORD" value={form.password} onChange={v => u("password", v)} placeholder="••••••••" type="password" hint={form.password && form.password.length < 6 ? "At least 6 characters" : ""} />
            <FieldInput label="CONFIRM PASSWORD" value={form.confirmPassword || ""} onChange={v => u("confirmPassword", v)} placeholder="••••••••" type="password" hint={form.confirmPassword && form.password !== form.confirmPassword ? "Passwords don't match" : ""} />
          </>}
          {step === 1 && <><D size={44} style={{ display: "block", marginBottom: 6 }}>YOUR STREAM</D><p style={{ fontSize: 13, color: C.muted, marginBottom: 40 }}>Helps Plork understand your schedule.</p><div style={{ marginBottom: 28 }}><SectionLabel>DISCIPLINE</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{DISCIPLINE_OPTIONS.map(d => <Chip key={d} active={form.discipline === d} onClick={() => u("discipline", d)}>{d}</Chip>)}</div></div><div><SectionLabel>CURRENT TERM</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{YEAR_OPTIONS.map(y => <Chip key={y} active={form.year === y} onClick={() => u("year", y)}>{y}</Chip>)}</div></div></>}
          {step === 2 && <>
            <D size={44} style={{ display: "block", marginBottom: 6 }}>YOUR SKILLS</D>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 40 }}>Select everything you're comfortable with.</p>
            <div style={{ marginBottom: 28 }}>
              <SectionLabel>TECHNICAL SKILLS</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>{SKILL_OPTIONS.map(s => <Chip key={s} active={form.skills.includes(s)} onClick={() => tog("skills", s)}>{s}</Chip>)}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input value={customSkill} onChange={e => setCustomSkill(e.target.value)} onKeyPress={e => e.key === "Enter" && addCustomSkill()} placeholder="Add custom skill..." style={{ flex: 1, padding: "8px 12px", fontSize: 12, color: C.ink, background: C.surface, border: `1px solid ${C.rule}`, outline: "none" }} onFocus={e => e.target.style.borderColor = C.lime} onBlur={e => e.target.style.borderColor = C.rule} />
                <button onClick={addCustomSkill} style={{ padding: "8px 16px", fontSize: 11, background: C.ink, color: C.bg, border: "none", cursor: "pointer" }}>ADD</button>
              </div>
              {form.skills.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>{form.skills.filter(s => !SKILL_OPTIONS.includes(s)).map(s => <Chip key={s} active={true} onClick={() => tog("skills", s)}>{s}</Chip>)}</div>}
            </div>
            <FieldTextarea label="WHAT I'VE BUILT" value={form.built} onChange={v => u("built", v)} placeholder="Built a lane-detection model for Midnight Sun." hint="1–2 lines" />
            <div>
              <SectionLabel>INTERESTS — for Play Mode</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>{INTEREST_OPTIONS.map(s => <Chip key={s} active={form.interests.includes(s)} onClick={() => tog("interests", s)}>{s}</Chip>)}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input value={customInterest} onChange={e => setCustomInterest(e.target.value)} onKeyPress={e => e.key === "Enter" && addCustomInterest()} placeholder="Add custom interest..." style={{ flex: 1, padding: "8px 12px", fontSize: 12, color: C.ink, background: C.surface, border: `1px solid ${C.rule}`, outline: "none" }} onFocus={e => e.target.style.borderColor = C.lime} onBlur={e => e.target.style.borderColor = C.rule} />
                <button onClick={addCustomInterest} style={{ padding: "8px 16px", fontSize: 11, background: C.ink, color: C.bg, border: "none", cursor: "pointer" }}>ADD</button>
              </div>
              {form.interests.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>{form.interests.filter(s => !INTEREST_OPTIONS.includes(s)).map(s => <Chip key={s} active={true} onClick={() => tog("interests", s)}>{s}</Chip>)}</div>}
            </div>
          </>}
          {step === 3 && <><D size={44} style={{ display: "block", marginBottom: 6 }}>YOUR SCHEDULE</D><p style={{ fontSize: 13, color: C.muted, marginBottom: 40 }}>Which terms are you on campus?</p><div style={{ marginBottom: 32 }}><SectionLabel>ON-CAMPUS TERMS</SectionLabel><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{ALL_TERMS.map(t => <div key={t} onClick={() => tog("terms", t)} style={{ padding: "14px 18px", border: form.terms.includes(t) ? `2px solid ${C.ink}` : `1px solid ${C.rule}`, background: form.terms.includes(t) ? C.ink : C.surface, cursor: "pointer", textAlign: "center", transition: "all 0.12s", minWidth: 60 }}><D size={15} color={form.terms.includes(t) ? C.lime : C.muted} style={{ display: "block" }}>{t}</D></div>)}</div></div><SectionLabel>COMMITMENT LEVEL</SectionLabel>{COMMITMENTS.map(c => <div key={c} onClick={() => u("commitment", c)} style={{ padding: "13px 18px", border: form.commitment === c ? `2px solid ${C.ink}` : `1px solid ${C.rule}`, background: form.commitment === c ? C.ink : C.surface, cursor: "pointer", marginBottom: 8, display: "flex", gap: 16, alignItems: "center", transition: "all 0.12s" }}><D size={15} color={form.commitment === c ? C.lime : C.muted} style={{ flexShrink: 0 }}>{c}</D><span style={{ fontSize: 12, color: form.commitment === c ? "#7a9a6a" : C.muted, lineHeight: 1.5 }}>{c === "CASUAL" ? "A few hours a week" : c === "SERIOUS" ? "Consistent effort, aiming to ship" : "Startup-track — applying to Velocity"}</span></div>)}</>}
          {step === 4 && <div style={{ textAlign: "center", paddingTop: 40 }}><div style={{ width: 64, height: 64, background: C.lime, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 24px" }}>✓</div><D size={48} style={{ display: "block", marginBottom: 14 }}>YOU'RE IN.</D><p style={{ fontSize: 14, color: C.body, lineHeight: 1.8, marginBottom: 40, maxWidth: 380, margin: "0 auto 40px" }}>Profile created for <strong>{form.name || "you"}</strong>.<br />{form.discipline} {form.year}{form.skills.length > 0 ? " · " + form.skills.slice(0, 3).join(", ") : ""}</p>{error && <div style={{ padding: "10px 14px", background: C.redLight, border: `1px solid ${C.red}44`, marginBottom: 20, maxWidth: 380, margin: "0 auto 20px" }}><M style={{ fontSize: 12, color: C.red }}>{error}</M></div>}<button onClick={handleComplete} disabled={loading} style={{ fontSize: 13, letterSpacing: "0.12em", fontWeight: 700, padding: "14px 44px", background: loading ? C.rule : C.ink, color: C.bg, border: "none", cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "CREATING..." : "ENTER PLORK →"}</button></div>}
          {step < 4 && <div style={{ display: "flex", justifyContent: "space-between", marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.rule}` }}><button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{ fontSize: 11, padding: "10px 24px", border: `1px solid ${C.rule}`, background: "transparent", color: step === 0 ? C.rule : C.body, cursor: step === 0 ? "default" : "pointer" }}>← BACK</button><button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} disabled={!canNext()} style={{ fontSize: 11, letterSpacing: "0.1em", padding: "10px 28px", border: "none", background: canNext() ? C.ink : C.rule, color: canNext() ? C.bg : C.muted, cursor: canNext() ? "pointer" : "default", fontWeight: 700 }}>NEXT →</button></div>}
        </div>
      </div>
    </div>
  );
}

function PostModal({ mode, onClose, onSubmit, userId }) {
  const isWork = mode === "WORK";
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", tagline: "", category: "", stage: "", commitment: "", type: "", spots: 2, roles: [{ title: "", skills: [] }], terms: [] });
  const [customSkills, setCustomSkills] = useState({});
  const [loading, setLoading] = useState(false);
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addRole = () => setForm(f => ({ ...f, roles: [...f.roles, { title: "", skills: [] }] }));
  const removeRole = i => setForm(f => ({ ...f, roles: f.roles.filter((_, j) => j !== i) }));
  const updateRole = (i, k, v) => setForm(f => ({ ...f, roles: f.roles.map((r, j) => j === i ? { ...r, [k]: v } : r) }));
  const toggleRoleSkill = (i, s) => setForm(f => ({ ...f, roles: f.roles.map((r, j) => j === i ? { ...r, skills: r.skills.includes(s) ? r.skills.filter(x => x !== s) : [...r.skills, s] } : r) }));
  const addCustomRoleSkill = (roleIndex, skill) => {
    if (skill.trim() && !form.roles[roleIndex].skills.includes(skill.trim())) {
      toggleRoleSkill(roleIndex, skill.trim());
      setCustomSkills({ ...customSkills, [roleIndex]: "" });
    }
  };
  const toggleTerm = t => setForm(f => ({ ...f, terms: f.terms.includes(t) ? f.terms.filter(x => x !== t) : [...f.terms, t] }));
  const canNextStep = () => { if (step === 0) return form.name && form.tagline && form.category && (isWork ? (form.stage && form.commitment) : form.type); if (step === 1) return isWork ? form.roles.every(r => r.title) : true; return form.terms.length > 0; };
  const handleSubmit = async () => {
    if (!userId) { alert("Please log in first"); return; }
    setLoading(true);
    try {
      const created = await api.createProject({ mode, name: form.name.toUpperCase(), tagline: form.tagline, category: form.category, stage: isWork ? form.stage : undefined, type: !isWork ? form.type : undefined, commitment: isWork ? form.commitment : undefined, roles: isWork ? form.roles.map(r => ({ ...r, filled: false })) : undefined, spots: !isWork ? form.spots : undefined, tags: !isWork ? [form.category] : undefined, terms: { founder: form.terms, overlap: form.terms } }, userId);
      onSubmit(created);
      onClose();
    } catch (err) {
      alert("Failed to create post: " + (err.message || "Unknown error"));
    }
    setLoading(false);
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(21,21,13,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div className="slide-in" style={{ width: "100%", maxWidth: 580, background: C.bg, border: `1px solid ${C.rule}`, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "22px 28px", borderBottom: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div><D size={28}>{isWork ? "POST A PROJECT" : "POST AN ACTIVITY"}</D><M style={{ fontSize: 10, color: C.muted, display: "block", marginTop: 2 }}>STEP {step + 1} OF 3 — {["DETAILS", "ROLES", "SCHEDULE"][step]}</M></div>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.rule}`, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: C.muted }}>✕</button>
        </div>
        <div style={{ height: 2, background: C.rule, flexShrink: 0 }}><div style={{ height: "100%", width: `${((step + 1) / 3) * 100}%`, background: C.lime, transition: "width 0.3s" }} /></div>
        <div className="fade-up" key={step} style={{ flex: 1, overflowY: "auto", padding: "28px 28px 0" }}>
          {step === 0 && <>
            <FieldInput label="NAME" value={form.name} onChange={v => u("name", v)} placeholder={isWork ? "e.g. Solar Rover" : "e.g. Volleyball"} />
            <FieldTextarea label="ONE-LINE PITCH" value={form.tagline} onChange={v => u("tagline", v)} rows={2} placeholder="What are you building and why?" hint="120 chars" />
            <div style={{ marginBottom: 20 }}><SectionLabel>CATEGORY</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{(isWork ? CATEGORIES_WORK : CATEGORIES_PLAY).map(c => <Chip key={c} active={form.category === c} onClick={() => u("category", c)}>{c}</Chip>)}</div></div>
            {isWork && <><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}><div><SectionLabel>STAGE</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{STAGES.map(s => <Chip key={s} small active={form.stage === s} onClick={() => u("stage", s)}>{s}</Chip>)}</div></div><div><SectionLabel>COMMITMENT</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{COMMITMENTS.map(c => <Chip key={c} small active={form.commitment === c} onClick={() => u("commitment", c)}>{c}</Chip>)}</div></div></div></>}
            {!isWork && <><div style={{ marginBottom: 20 }}><SectionLabel>ACTIVITY TYPE</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{ACTIVITY_TYPES.map(t => <Chip key={t} active={form.type === t} onClick={() => u("type", t)}>{t}</Chip>)}</div></div><div style={{ marginBottom: 20 }}><SectionLabel>SPOTS NEEDED</SectionLabel><div style={{ display: "flex", alignItems: "center", gap: 12 }}><button onClick={() => u("spots", Math.max(1, form.spots - 1))} style={{ width: 36, height: 36, border: `1px solid ${C.rule}`, background: C.surface, cursor: "pointer", fontSize: 18 }}>−</button><M style={{ fontSize: 20, fontWeight: 600, minWidth: 24, textAlign: "center" }}>{form.spots}</M><button onClick={() => u("spots", Math.min(20, form.spots + 1))} style={{ width: 36, height: 36, border: `1px solid ${C.rule}`, background: C.surface, cursor: "pointer", fontSize: 18 }}>+</button><M style={{ fontSize: 11, color: C.muted }}>spots needed</M></div></div></>}
          </>}
          {step === 1 && <>
            {isWork && <>{form.roles.map((role, i) => <div key={i} style={{ border: `1px solid ${C.rule}`, padding: "18px", marginBottom: 14, background: C.surface }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><M style={{ fontSize: 11, color: C.muted, letterSpacing: "0.1em" }}>ROLE {i + 1}</M>{form.roles.length > 1 && <button onClick={() => removeRole(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.muted }}>✕ remove</button>}</div><input value={role.title} onChange={e => updateRole(i, "title", e.target.value)} placeholder="e.g. Firmware Engineer" style={{ width: "100%", padding: "10px 12px", fontSize: 13, color: C.ink, background: C.bg, border: `1px solid ${C.rule}`, outline: "none", marginBottom: 14 }} onFocus={e => e.target.style.borderColor = C.lime} onBlur={e => e.target.style.borderColor = C.rule} /><SectionLabel>REQUIRED SKILLS</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>{SKILL_OPTIONS.map(s => <Chip key={s} small active={role.skills.includes(s)} onClick={() => toggleRoleSkill(i, s)}>{s}</Chip>)}</div><div style={{ display: "flex", gap: 8, marginTop: 8 }}><input value={customSkills[i] || ""} onChange={e => setCustomSkills({ ...customSkills, [i]: e.target.value })} onKeyPress={e => e.key === "Enter" && addCustomRoleSkill(i, customSkills[i] || "")} placeholder="Add custom skill..." style={{ flex: 1, padding: "8px 12px", fontSize: 12, color: C.ink, background: C.bg, border: `1px solid ${C.rule}`, outline: "none" }} onFocus={e => e.target.style.borderColor = C.lime} onBlur={e => e.target.style.borderColor = C.rule} /><button onClick={() => addCustomRoleSkill(i, customSkills[i] || "")} style={{ padding: "8px 16px", fontSize: 11, background: C.ink, color: C.bg, border: "none", cursor: "pointer" }}>ADD</button></div><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>{role.skills.filter(s => !SKILL_OPTIONS.includes(s)).map(s => <Chip key={s} small active={true} onClick={() => toggleRoleSkill(i, s)}>{s}</Chip>)}</div></div>)}<button onClick={addRole} style={{ width: "100%", padding: "11px", border: `1px dashed ${C.rule}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 11, letterSpacing: "0.08em" }}>+ ADD ANOTHER ROLE</button></>}
            {!isWork && <div style={{ paddingTop: 20 }}><p style={{ fontSize: 13, color: C.body, marginBottom: 24, lineHeight: 1.6 }}>You're looking for {form.spots} person{form.spots !== 1 ? "s" : ""} to join <strong>{form.name || "your activity"}</strong>.</p><div style={{ padding: "20px", border: `1px solid ${C.rule}`, background: C.surface }}><D size={20} style={{ display: "block", marginBottom: 8 }}>{form.name || "YOUR ACTIVITY"}</D><M style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 12 }}>{form.tagline || "Your tagline"}</M><div style={{ display: "flex", gap: 8 }}><M style={{ fontSize: 10, background: C.rule, padding: "2px 8px", color: C.body }}>{form.category || "CATEGORY"}</M><M style={{ fontSize: 10, color: C.lime, border: `1px solid ${C.lime}`, padding: "2px 8px" }}>{form.spots} SPOTS OPEN</M></div></div></div>}
          </>}
          {step === 2 && <>
            <p style={{ fontSize: 13, color: C.body, marginBottom: 24, lineHeight: 1.6 }}>Which terms are you running this {isWork ? "project" : "activity"}?</p>
            <SectionLabel>ACTIVE TERMS</SectionLabel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>{ALL_TERMS.map(t => <div key={t} onClick={() => toggleTerm(t)} style={{ padding: "14px 18px", border: form.terms.includes(t) ? `2px solid ${C.ink}` : `1px solid ${C.rule}`, background: form.terms.includes(t) ? C.ink : C.surface, cursor: "pointer", textAlign: "center", transition: "all 0.12s", minWidth: 60 }}><D size={15} color={form.terms.includes(t) ? C.lime : C.muted} style={{ display: "block" }}>{t}</D></div>)}</div>
            {form.terms.length > 0 && <div style={{ padding: "14px 18px", border: `1px solid ${C.lime}66`, background: C.limeLight }}><M style={{ fontSize: 12, color: C.limeDark }}>✓ Active: {form.terms.join("  ·  ")}</M></div>}
          </>}
        </div>
        <div style={{ padding: "20px 28px", borderTop: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
          <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()} style={{ fontSize: 11, padding: "10px 22px", border: `1px solid ${C.rule}`, background: "transparent", color: C.body, cursor: "pointer" }}>{step === 0 ? "CANCEL" : "← BACK"}</button>
          {step < 2 ? <button onClick={() => canNextStep() && setStep(s => s + 1)} style={{ fontSize: 11, letterSpacing: "0.1em", padding: "10px 28px", border: "none", background: canNextStep() ? C.ink : C.rule, color: canNextStep() ? C.bg : C.muted, cursor: canNextStep() ? "pointer" : "default", fontWeight: 700 }}>NEXT →</button>
            : <button onClick={handleSubmit} disabled={!canNextStep() || loading} style={{ fontSize: 11, letterSpacing: "0.1em", padding: "10px 28px", border: "none", background: canNextStep() && !loading ? C.lime : C.rule, color: canNextStep() && !loading ? C.limeInk : C.muted, cursor: canNextStep() && !loading ? "pointer" : "default", fontWeight: 700, opacity: loading ? 0.6 : 1 }}>{loading ? "POSTING..." : "POST ✓"}</button>}
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ profile, onSave, onBack, userId }) {
  const safeProfile = {
    name: profile?.name || "",
    email: profile?.email || "",
    discipline: profile?.discipline || "",
    year: profile?.year || "",
    skills: Array.isArray(profile?.skills) ? profile.skills : [],
    interests: Array.isArray(profile?.interests) ? profile.interests : [],
    built: profile?.built || "",
    terms: Array.isArray(profile?.terms) ? profile.terms : [],
    commitment: profile?.commitment || "",
    github: profile?.github || "",
  };
  const [form, setForm] = useState(safeProfile);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customSkill, setCustomSkill] = useState("");
  const [customInterest, setCustomInterest] = useState("");
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const tog = (k, v) => {
    setForm(f => {
      const current = Array.isArray(f[k]) ? f[k] : [];
      return { ...f, [k]: current.includes(v) ? current.filter(x => x !== v) : [...current, v] };
    });
  };
  const addCustomSkill = () => {
    const skills = Array.isArray(form.skills) ? form.skills : [];
    if (customSkill.trim() && !skills.includes(customSkill.trim())) {
      tog("skills", customSkill.trim());
      setCustomSkill("");
    }
  };
  const addCustomInterest = () => {
    const interests = Array.isArray(form.interests) ? form.interests : [];
    if (customInterest.trim() && !interests.includes(customInterest.trim())) {
      tog("interests", customInterest.trim());
      setCustomInterest("");
    }
  };
  const handleSave = async () => {
    if (!userId) { alert("No user ID found"); return; }
    setLoading(true);
    try {
      const updated = await api.updateProfile(userId, form);
      onSave(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert("Failed to save: " + (err.message || "Unknown error"));
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono',monospace", color: C.ink }}>
      <style>{BASE_CSS}</style>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "stretch", borderBottom: `1px solid ${C.rule}`, height: 52, flexShrink: 0, background: C.bg }}>
        <div style={{ padding: "0 24px", display: "flex", alignItems: "center", borderRight: `1px solid ${C.rule}`, gap: 10 }}>
          <D size={24}>PLORK</D>
          <div style={{ width: 5, height: 5, background: C.lime, animation: "blink 1.4s infinite" }} />
        </div>
        <button onClick={onBack} style={{ padding: "0 22px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11, letterSpacing: "0.08em", color: C.muted, background: "transparent", border: "none", borderRight: `1px solid ${C.rule}` }}>
          ← BACK TO PLORK
        </button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", padding: "0 24px", borderLeft: `1px solid ${C.rule}`, gap: 12 }}>
          {saved && <M style={{ fontSize: 11, color: C.limeDark }}>✓ Saved</M>}
          <button onClick={handleSave} disabled={loading} style={{ fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, padding: "8px 22px", border: "none", background: loading ? C.rule : C.lime, color: C.limeInk, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "SAVING..." : "SAVE CHANGES"}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: "calc(100vh - 52px)" }}>

        <div style={{ borderRight: `1px solid ${C.rule}`, padding: "36px 28px", background: C.surface }}>
          <div style={{ width: 72, height: 72, background: C.limeLight, border: `1px solid ${C.lime}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 20 }}>
            🧑‍💻
          </div>
          <D size={28} style={{ display: "block", marginBottom: 4 }}>{form.name || "Your Name"}</D>
          <M style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>{form.email || "—"}</M>
          <M style={{ fontSize: 12, color: C.body, display: "block", marginBottom: 24 }}>
            {form.discipline || "—"} · {form.year || "—"}
          </M>

          <SectionDivider />

          <SectionLabel>SKILLS</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 24 }}>
            {Array.isArray(form.skills) && form.skills.length > 0
              ? form.skills.map(s => <M key={s} style={{ fontSize: 10, background: C.limeLight, color: C.limeDark, border: `1px solid ${C.lime}66`, padding: "2px 8px" }}>{s}</M>)
              : <M style={{ fontSize: 11, color: C.muted }}>None added yet</M>}
          </div>

          <SectionLabel>INTERESTS</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 24 }}>
            {Array.isArray(form.interests) && form.interests.length > 0
              ? form.interests.map(s => <M key={s} style={{ fontSize: 10, background: C.surface2, color: C.body, border: `1px solid ${C.rule}`, padding: "2px 8px" }}>{s}</M>)
              : <M style={{ fontSize: 11, color: C.muted }}>None added yet</M>}
          </div>

          <SectionLabel>ON-CAMPUS TERMS</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {ALL_TERMS.map(t => {
              const terms = Array.isArray(form.terms) ? form.terms : [];
              return (
                <M key={t} style={{ fontSize: 10, padding: "2px 7px", background: terms.includes(t) ? C.ink : C.surface2, color: terms.includes(t) ? C.lime : C.muted, border: `1px solid ${terms.includes(t) ? C.ink : C.rule}` }}>{t}</M>
              );
            })}
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "36px 48px", background: C.detail }}>
          <D size={36} style={{ display: "block", marginBottom: 4 }}>EDIT PROFILE</D>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 36 }}>Changes update your match score and visibility to other Plork users.</p>

          <SectionLabel>BASIC INFO</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FieldInput label="FULL NAME" value={form.name} onChange={v => u("name", v)} placeholder="Jamie Kim" />
            <FieldInput label="UW EMAIL" value={form.email} onChange={v => u("email", v)} placeholder="jkim@uwaterloo.ca" type="email" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FieldInput label="GITHUB / PORTFOLIO" value={form.github || ""} onChange={v => u("github", v)} placeholder="github.com/username" />
            <div />
          </div>

          <SectionDivider />

          <SectionLabel>YOUR STREAM</SectionLabel>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", display: "block", marginBottom: 10 }}>DISCIPLINE</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {DISCIPLINE_OPTIONS.map(d => <Chip key={d} active={form.discipline === d} onClick={() => u("discipline", d)}>{d}</Chip>)}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", display: "block", marginBottom: 10 }}>CURRENT TERM</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {YEAR_OPTIONS.map(y => <Chip key={y} active={form.year === y} onClick={() => u("year", y)}>{y}</Chip>)}
            </div>
          </div>

          <SectionDivider />

          <SectionLabel>TECHNICAL SKILLS</SectionLabel>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
              {SKILL_OPTIONS.map(s => {
                const skills = Array.isArray(form.skills) ? form.skills : [];
                return <Chip key={s} active={skills.includes(s)} onClick={() => tog("skills", s)}>{s}</Chip>;
              })}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input value={customSkill} onChange={e => setCustomSkill(e.target.value)} onKeyPress={e => e.key === "Enter" && addCustomSkill()} placeholder="Add custom skill..." style={{ flex: 1, padding: "8px 12px", fontSize: 12, color: C.ink, background: C.surface, border: `1px solid ${C.rule}`, outline: "none" }} onFocus={e => e.target.style.borderColor = C.lime} onBlur={e => e.target.style.borderColor = C.rule} />
              <button onClick={addCustomSkill} style={{ padding: "8px 16px", fontSize: 11, background: C.ink, color: C.bg, border: "none", cursor: "pointer" }}>ADD</button>
            </div>
            {Array.isArray(form.skills) && form.skills.filter(s => !SKILL_OPTIONS.includes(s)).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>{form.skills.filter(s => !SKILL_OPTIONS.includes(s)).map(s => <Chip key={s} active={true} onClick={() => tog("skills", s)}>{s}</Chip>)}</div>}
          </div>

          <FieldTextarea
            label="WHAT I'VE BUILT"
            value={form.built || ""}
            onChange={v => u("built", v)}
            placeholder="Built a lane-detection model for Midnight Sun. Shipped a React dashboard for 500 users."
            hint="1–2 lines"
            rows={3}
          />

          <SectionDivider />

          <SectionLabel>INTERESTS — shown in Play Mode</SectionLabel>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
              {INTEREST_OPTIONS.map(s => {
                const interests = Array.isArray(form.interests) ? form.interests : [];
                return <Chip key={s} active={interests.includes(s)} onClick={() => tog("interests", s)}>{s}</Chip>;
              })}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input value={customInterest} onChange={e => setCustomInterest(e.target.value)} onKeyPress={e => e.key === "Enter" && addCustomInterest()} placeholder="Add custom interest..." style={{ flex: 1, padding: "8px 12px", fontSize: 12, color: C.ink, background: C.surface, border: `1px solid ${C.rule}`, outline: "none" }} onFocus={e => e.target.style.borderColor = C.lime} onBlur={e => e.target.style.borderColor = C.rule} />
              <button onClick={addCustomInterest} style={{ padding: "8px 16px", fontSize: 11, background: C.ink, color: C.bg, border: "none", cursor: "pointer" }}>ADD</button>
            </div>
            {Array.isArray(form.interests) && form.interests.filter(s => !INTEREST_OPTIONS.includes(s)).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>{form.interests.filter(s => !INTEREST_OPTIONS.includes(s)).map(s => <Chip key={s} active={true} onClick={() => tog("interests", s)}>{s}</Chip>)}</div>}
          </div>

          <SectionDivider />

          {/* ─ Schedule ─ */}
          <SectionLabel>CO-OP SCHEDULE</SectionLabel>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", display: "block", marginBottom: 12 }}>ON-CAMPUS TERMS</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ALL_TERMS.map(t => {
                const terms = Array.isArray(form.terms) ? form.terms : [];
                return (
                  <div key={t} onClick={() => tog("terms", t)} style={{ padding: "14px 18px", border: terms.includes(t) ? `2px solid ${C.ink}` : `1px solid ${C.rule}`, background: terms.includes(t) ? C.ink : C.surface, cursor: "pointer", textAlign: "center", transition: "all 0.12s", minWidth: 60 }}>
                    <D size={15} color={terms.includes(t) ? C.lime : C.muted} style={{ display: "block" }}>{t}</D>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", display: "block", marginBottom: 12 }}>COMMITMENT LEVEL</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {COMMITMENTS.map(c => (
                <div key={c} onClick={() => u("commitment", c)} style={{ padding: "13px 18px", border: form.commitment === c ? `2px solid ${C.ink}` : `1px solid ${C.rule}`, background: form.commitment === c ? C.ink : C.surface, cursor: "pointer", display: "flex", gap: 16, alignItems: "center", transition: "all 0.12s" }}>
                  <D size={15} color={form.commitment === c ? C.lime : C.muted} style={{ flexShrink: 0 }}>{c}</D>
                  <span style={{ fontSize: 12, color: form.commitment === c ? "#7a9a6a" : C.muted, lineHeight: 1.5 }}>
                    {c === "CASUAL" ? "A few hours a week, fits around coursework" : c === "SERIOUS" ? "Consistent effort, aiming to ship something real" : "Startup-track — full commitment"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 40, paddingTop: 28, borderTop: `1px solid ${C.rule}`, display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={handleSave} disabled={loading} style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, padding: "12px 32px", border: "none", background: loading ? C.rule : C.lime, color: C.limeInk, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "SAVING..." : "SAVE CHANGES"}</button>
            <button onClick={onBack} style={{ fontSize: 12, padding: "12px 24px", border: `1px solid ${C.rule}`, background: "transparent", color: C.muted, cursor: "pointer" }}>CANCEL</button>
            {saved && <M style={{ fontSize: 12, color: C.limeDark }}>✓ Changes saved!</M>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ManageApplicantsPage({ postId, postName, mode, onBack, userId }) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (postId) {
      setLoading(true);
      api.getApplicantsForPost(postId, mode).then(data => {
        setApplicants(data);
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load applicants:", err);
        setLoading(false);
      });
    }
  }, [postId, mode]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, display: "flex", flexDirection: "column", fontFamily: "'IBM Plex Mono',monospace" }}>
      <style>{BASE_CSS}</style>
      <div style={{ display: "flex", alignItems: "stretch", borderBottom: `1px solid ${C.rule}`, height: 52, flexShrink: 0, background: C.bg }}>
        <div style={{ padding: "0 24px", display: "flex", alignItems: "center", borderRight: `1px solid ${C.rule}`, gap: 10 }}>
          <D size={24}>PLORK</D>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 24px", justifyContent: "space-between" }}>
          <D size={18}>MANAGE APPLICANTS</D>
          <button onClick={onBack} style={{ padding: "6px 16px", fontSize: 11, letterSpacing: "0.08em", fontWeight: 600, background: "transparent", color: C.ink, border: `1px solid ${C.ink}`, cursor: "pointer" }}>← BACK</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "40px 48px" }}>
        <D size={32} style={{ display: "block", marginBottom: 8 }}>{postName}</D>
        <M style={{ fontSize: 12, color: C.muted, marginBottom: 32, display: "block" }}>Review applicants for this {mode === "WORK" ? "project" : "activity"}</M>

        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <M style={{ fontSize: 12, color: C.muted }}>Loading applicants...</M>
          </div>
        ) : applicants.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", border: `1px solid ${C.rule}`, background: C.surface }}>
            <M style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>No applicants yet.<br />Share your {mode === "WORK" ? "project" : "activity"} to get applicants.</M>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {applicants.map((applicant, idx) => {
              const skills = Array.isArray(applicant.skills) ? applicant.skills : [];
              const interests = Array.isArray(applicant.interests) ? applicant.interests : [];
              const compatibilityScore = applicant.compatibility_score || 0;

              return (
                <div key={applicant.id || idx} style={{ border: `1px solid ${C.rule}`, background: C.surface, padding: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <D size={20}>{applicant.name || "Unknown"}</D>
                        <M style={{ fontSize: 11, color: C.muted, background: C.rule, padding: "2px 8px" }}>{applicant.discipline || "N/A"}</M>
                        <M style={{ fontSize: 11, color: C.muted, background: C.rule, padding: "2px 8px" }}>{applicant.year || "N/A"}</M>
                      </div>
                      {applicant.github && (
                        <M style={{ fontSize: 11, color: C.lime, marginBottom: 12, display: "block" }}>GitHub: {applicant.github}</M>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>COMPATIBILITY</M>
                      <D size={24} color={compatibilityScore > 90 ? C.lime : compatibilityScore > 75 ? "#aaaa00" : C.muted}>{compatibilityScore}%</D>
                    </div>
                  </div>

                  {mode === "WORK" && skills.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>SKILLS</M>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {skills.slice(0, 10).map(skill => (
                          <M key={skill} style={{ fontSize: 10, background: C.limeLight, color: C.limeDark, border: `1px solid ${C.lime}66`, padding: "3px 9px" }}>{skill}</M>
                        ))}
                      </div>
                    </div>
                  )}

                  {mode === "PLAY" && interests.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>INTERESTS</M>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {interests.slice(0, 10).map(interest => (
                          <M key={interest} style={{ fontSize: 10, background: C.limeLight, color: C.limeDark, border: `1px solid ${C.lime}66`, padding: "3px 9px" }}>{interest}</M>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.rule}` }}>
                    <button style={{ flex: 1, padding: "10px", fontSize: 11, letterSpacing: "0.08em", fontWeight: 600, background: C.lime, color: C.limeInk, border: "none", cursor: "pointer" }}>ACCEPT</button>
                    <button style={{ flex: 1, padding: "10px", fontSize: 11, letterSpacing: "0.08em", fontWeight: 600, background: "transparent", color: C.ink, border: `1px solid ${C.ink}`, cursor: "pointer" }}>DECLINE</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TopMatchesPage({ postId, postName, mode, onBack, userId }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (postId) {
      setLoading(true);
      api.getTopMatchesForPost(postId, mode, 20).then(data => {
        setMatches(data.matches || []);
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load top matches:", err);
        setLoading(false);
      });
    }
  }, [postId, mode]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, display: "flex", flexDirection: "column", fontFamily: "'IBM Plex Mono',monospace" }}>
      <style>{BASE_CSS}</style>
      <div style={{ display: "flex", alignItems: "stretch", borderBottom: `1px solid ${C.rule}`, height: 52, flexShrink: 0, background: C.bg }}>
        <div style={{ padding: "0 24px", display: "flex", alignItems: "center", borderRight: `1px solid ${C.rule}`, gap: 10 }}>
          <D size={24}>PLORK</D>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 24px", justifyContent: "space-between" }}>
          <D size={18}>TOP MATCHES</D>
          <button onClick={onBack} style={{ padding: "6px 16px", fontSize: 11, letterSpacing: "0.08em", fontWeight: 600, background: "transparent", color: C.ink, border: `1px solid ${C.ink}`, cursor: "pointer" }}>← BACK</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "40px 48px" }}>
        <D size={32} style={{ display: "block", marginBottom: 8 }}>{postName}</D>
        <M style={{ fontSize: 12, color: C.muted, marginBottom: 32, display: "block" }}>Top users who match this {mode === "WORK" ? "project" : "activity"} based on {mode === "WORK" ? "skills" : "interests"}</M>

        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <M style={{ fontSize: 12, color: C.muted }}>Loading top matches...</M>
          </div>
        ) : matches.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", border: `1px solid ${C.rule}`, background: C.surface }}>
            <M style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>No matching users found.</M>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {matches.map((user, idx) => {
              const skills = Array.isArray(user.skills) ? user.skills : [];
              const interests = Array.isArray(user.interests) ? user.interests : [];
              const compatibilityScore = user.compatibility_score || 0;

              return (
                <div key={user.id || idx} style={{ border: `1px solid ${C.rule}`, background: C.surface, padding: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <D size={20}>{user.name || "Unknown"}</D>
                        <M style={{ fontSize: 11, color: C.muted, background: C.rule, padding: "2px 8px" }}>{user.discipline || "N/A"}</M>
                        <M style={{ fontSize: 11, color: C.muted, background: C.rule, padding: "2px 8px" }}>{user.year || "N/A"}</M>
                      </div>
                      {user.github && (
                        <M style={{ fontSize: 11, color: C.lime, marginBottom: 12, display: "block" }}>GitHub: {user.github}</M>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>MATCH</M>
                      <D size={24} color={compatibilityScore > 90 ? C.lime : compatibilityScore > 75 ? "#aaaa00" : C.muted}>{compatibilityScore}%</D>
                    </div>
                  </div>

                  {mode === "WORK" && skills.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>SKILLS</M>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {skills.slice(0, 10).map(skill => (
                          <M key={skill} style={{ fontSize: 10, background: C.limeLight, color: C.limeDark, border: `1px solid ${C.lime}66`, padding: "3px 9px" }}>{skill}</M>
                        ))}
                      </div>
                    </div>
                  )}

                  {mode === "PLAY" && interests.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>INTERESTS</M>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {interests.slice(0, 10).map(interest => (
                          <M key={interest} style={{ fontSize: 10, background: C.limeLight, color: C.limeDark, border: `1px solid ${C.lime}66`, padding: "3px 9px" }}>{interest}</M>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MainApp({ userId: propUserId, initialProfile, onLogout, readOnly = false }) {
  const [mode, setMode] = useState("WORK");
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("ROLES");
  const [showPost, setShowPost] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [showProfile, setShowProfile] = useState(false);
  const [showManageApplicants, setShowManageApplicants] = useState(false);
  const [showTopMatches, setShowTopMatches] = useState(false);
  const [profile, setProfile] = useState(initialProfile || { name: "", email: "", discipline: "", year: "", skills: [], interests: [], built: "", terms: [], commitment: "", github: "" });
  const [userId] = useState(propUserId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      api.getProfile(userId).then(data => {
        setProfile(data);
      }).catch(err => {
        console.error("Failed to load profile:", err);
      });
    }
  }, [userId]);

  useEffect(() => {
    if (userId || readOnly) {
      setLoading(true);
      api.getProjects(mode, userId).then(data => {
        if (mode === "WORK") {
          setProjects(data);
          setSelectedId(data[0]?.id || null);
        } else {
          setActivities(data);
          setSelectedId(data[0]?.id || null);
        }
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load projects:", err);
        setLoading(false);
      });
    }
  }, [mode, userId, readOnly]);

  const items = mode === "WORK" ? projects : activities;
  // Sort by compatibility percentage (descending), with "yours" items first
  const sortedItems = [...items].sort((a, b) => {
    // Your own posts first
    if (a.yours && !b.yours) return -1;
    if (!a.yours && b.yours) return 1;
    // Then by compatibility percentage (descending)
    return (b.match || 0) - (a.match || 0);
  });
  const filtered = filter === "YOURS" ? sortedItems.filter(i => i.yours) : filter === "ALL" ? sortedItems : sortedItems.filter(i => !i.yours);
  const sel = items.find(i => i.id === selectedId) || (items.length > 0 ? items[0] : null);
  const openRoles = sel?.roles?.filter(r => !r.filled) || [];
  const filledRoles = sel?.roles?.filter(r => r.filled) || [];
  const switchMode = m => { setMode(m); setSelectedId(items.length > 0 ? items[0]?.id : null); setTab(m === "WORK" ? "ROLES" : "SPOTS"); setFilter("ALL"); };
  const handlePost = async (item) => {
    if (!userId) { alert("Please log in first"); return; }
    try {
      const created = await api.createProject(item, userId);
      if (mode === "WORK") {
        setProjects(p => [created, ...p]);
        setSelectedId(created.id);
        setTab("ROLES");
      } else {
        setActivities(a => [created, ...a]);
        setSelectedId(created.id);
        setTab("SPOTS");
      }
    } catch (err) {
      alert("Failed to create post: " + (err.message || "Unknown error"));
    }
  };

  const handleApply = async (postId) => {
    if (!userId) { alert("Please log in first"); return; }
    try {
      await api.submitApplication(postId, userId);
      alert("Application submitted!");
    } catch (err) {
      alert("Failed to submit application: " + (err.message || "Unknown error"));
    }
  };

  const prevSkillsRef = useRef(JSON.stringify(profile?.skills || []));
  const prevInterestsRef = useRef(JSON.stringify(profile?.interests || []));

  useEffect(() => {
    if (userId && profile) {
      const currentSkills = JSON.stringify(profile.skills || []);
      const currentInterests = JSON.stringify(profile.interests || []);

      if (currentSkills !== prevSkillsRef.current || currentInterests !== prevInterestsRef.current) {
        prevSkillsRef.current = currentSkills;
        prevInterestsRef.current = currentInterests;

        setLoading(true);
        api.getProjects(mode, userId).then(data => {
          if (mode === "WORK") {
            setProjects(data);
            if (selectedId && !data.find(p => p.id === selectedId)) {
              setSelectedId(data[0]?.id || null);
            }
          } else {
            setActivities(data);
            if (selectedId && !data.find(a => a.id === selectedId)) {
              setSelectedId(data[0]?.id || null);
            }
          }
          setLoading(false);
        }).catch(err => {
          console.error("Failed to reload projects after profile update:", err);
          setLoading(false);
        });
      }
    }
  }, [profile, userId, mode, selectedId]);

  if (showProfile) return <ProfilePage profile={profile} onSave={p => { setProfile(p); }} onBack={() => setShowProfile(false)} userId={userId} />;

  if (showManageApplicants && sel) {
    return <ManageApplicantsPage postId={sel.id} postName={sel.name} mode={mode} onBack={() => setShowManageApplicants(false)} userId={userId} />;
  }

  if (showTopMatches && sel) {
    return <TopMatchesPage postId={sel.id} postName={sel.name} mode={mode} onBack={() => setShowTopMatches(false)} userId={userId} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, display: "flex", flexDirection: "column", fontFamily: "'IBM Plex Mono',monospace" }}>
      <style>{BASE_CSS}</style>
      {showPost && <PostModal mode={mode} onClose={() => setShowPost(false)} onSubmit={handlePost} userId={userId} />}

      <div style={{ display: "flex", alignItems: "stretch", borderBottom: `1px solid ${C.rule}`, height: 52, flexShrink: 0, background: C.bg }}>
        <div style={{ padding: "0 24px", display: "flex", alignItems: "center", borderRight: `1px solid ${C.rule}`, gap: 10 }}>
          <D size={24}>PLORK</D>
          <div style={{ width: 5, height: 5, background: C.lime, animation: "blink 1.4s infinite" }} />
          {readOnly && <M style={{ fontSize: 9, color: C.muted, letterSpacing: "0.1em", border: `1px solid ${C.rule}`, padding: "2px 7px", marginLeft: 4 }}>DEMO — READ ONLY</M>}
        </div>
        {["WORK", "PLAY"].map(m => (
          <button key={m} onClick={() => switchMode(m)} style={{ padding: "0 22px", display: "flex", alignItems: "center", cursor: "pointer", fontSize: 11, letterSpacing: "0.1em", color: mode === m ? C.ink : C.muted, background: "transparent", border: "none", borderBottom: mode === m ? `2px solid ${C.lime}` : "2px solid transparent", transition: "color 0.12s", userSelect: "none", paddingLeft: 22, paddingRight: 22 }}>{m} MODE</button>
        ))}
        <div className="topbar-meta" style={{ marginLeft: "auto", display: "flex", borderLeft: `1px solid ${C.rule}` }}>
          {[["STREAM", (profile.discipline || "") + " " + (profile.year || "")], ["TERM", profile.terms?.[0] || ""]].filter(([_, v]) => v).map(([l, v]) => (
            <div key={l} style={{ padding: "0 18px", borderRight: `1px solid ${C.rule}`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.12em", marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 12, color: C.body }}>{v}</div>
            </div>
          ))}
          {!readOnly && <button onClick={() => setShowProfile(true)} style={{ padding: "0 18px", display: "flex", alignItems: "center", gap: 10, background: "transparent", border: "none", cursor: "pointer", borderLeft: `1px solid ${C.rule}` }}>
            <div style={{ width: 32, height: 32, border: `1px solid ${C.rule}`, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🧑‍💻</div>
            <M style={{ fontSize: 11, color: C.body }}>{profile.name ? profile.name.split(" ")[0] : "Profile"}</M>
          </button>}
          <button onClick={onLogout} style={{ padding: "0 18px", display: "flex", alignItems: "center", background: "transparent", border: "none", cursor: "pointer", borderLeft: `1px solid ${C.rule}` }}>
            <M style={{ fontSize: 11, color: C.muted }}>{readOnly ? "EXIT DEMO" : "LOG OUT"}</M>
          </button>
        </div>
      </div>

      <div className="app-layout" style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        <div className="app-sidebar" style={{ width: 300, borderRight: `1px solid ${C.rule}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0, background: C.bg }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.rule}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>{mode === "WORK" ? "PROJECTS" : "ACTIVITIES"}</M>
              <M style={{ fontSize: 10, color: C.lime, fontWeight: 600 }}>{filtered.length} FOUND</M>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {["ALL", "YOURS", "AVAILABLE"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: "6px", fontSize: 10, letterSpacing: "0.08em", border: `1px solid ${C.rule}`, background: filter === f ? C.ink : "transparent", color: filter === f ? C.bg : C.muted, cursor: "pointer", transition: "all 0.1s" }}>{f}</button>
              ))}
            </div>
            {!readOnly && <button onClick={() => setShowPost(true)} style={{ width: "100%", padding: "9px", fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, background: C.lime, color: C.limeInk, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              + POST {mode === "WORK" ? "PROJECT" : "ACTIVITY"}
            </button>}
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading && <div style={{ padding: "40px 20px", textAlign: "center" }}><M style={{ fontSize: 12, color: C.muted }}>Loading...</M></div>}
            {!loading && filtered.length === 0 && <div style={{ padding: "40px 20px", textAlign: "center" }}><M style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>No {mode === "WORK" ? "projects" : "activities"} yet.<br />Post one to get started.</M></div>}
            {filtered.map(item => {
              const isSel = selectedId === item.id;
              const open = item.roles?.filter(r => !r.filled).length ?? item.spots;
              const filled2 = item.roles?.filter(r => r.filled).length ?? 0;
              const total = item.roles?.length ?? item.spots;
              const pct = total > 0 ? Math.round((filled2 / total) * 100) : 0;
              return (
                <div key={item.id} onClick={() => { setSelectedId(item.id); setTab(mode === "WORK" ? "ROLES" : "SPOTS"); }}
                  style={{ padding: "16px 18px", borderLeft: isSel ? `3px solid ${C.lime}` : "3px solid transparent", borderBottom: `1px solid ${C.rule}`, cursor: "pointer", background: isSel ? C.surface : "transparent", transition: "background 0.1s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0 }}>
                      <D size={17} color={isSel ? C.ink : C.body} style={{ flexShrink: 0 }}>{item.name}</D>
                      {item.yours && <M style={{ fontSize: 8, background: C.limeLight, color: C.limeDark, border: `1px solid ${C.lime}`, padding: "1px 6px", letterSpacing: "0.06em", flexShrink: 0 }}>YOURS</M>}
                    </div>
                    <M style={{ fontSize: 13, fontWeight: 700, color: item.match > 90 ? C.lime : item.match > 75 ? "#aaaa00" : C.muted, flexShrink: 0, marginLeft: 8 }}>{item.match}%</M>
                  </div>
                  <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.55, marginBottom: 10 }}>{item.tagline}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <M style={{ fontSize: 9, color: C.muted, background: C.surface2, padding: "2px 7px" }}>{item.category}</M>
                    <div style={{ flex: 1, height: 3, background: C.rule, borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: C.lime, borderRadius: 2, transition: "width 0.3s" }} />
                    </div>
                    <M style={{ fontSize: 9, color: open > 0 ? C.lime : C.muted }}>{open} OPEN</M>
                  </div>
                </div>
              );
            })}
          </div>
          {!readOnly && <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.rule}`, background: C.surface }}>
            <M style={{ fontSize: 9, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>YOUR SKILLS</M>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {profile.skills.slice(0, 5).map(s => <M key={s} style={{ fontSize: 10, background: C.limeLight, color: C.limeDark, border: `1px solid ${C.lime}66`, padding: "2px 8px" }}>{s}</M>)}
            </div>
          </div>}
        </div>

        {sel && (
          <div key={selectedId} className="fade-up" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.detail }}>

            <div style={{ padding: "28px 36px 0", borderBottom: `1px solid ${C.rule}`, background: C.detail }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 24 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
                    {sel.yours && <M style={{ fontSize: 10, background: C.limeLight, color: C.limeDark, border: `1px solid ${C.lime}`, padding: "3px 10px", letterSpacing: "0.08em" }}>YOUR PROJECT</M>}
                    {sel.stage && <M style={{ fontSize: 10, color: C.muted, border: `1px solid ${C.rule}`, padding: "3px 10px" }}>{sel.stage}</M>}
                    {sel.commitment && <M style={{ fontSize: 10, color: C.muted, border: `1px solid ${C.rule}`, padding: "3px 10px" }}>{sel.commitment}</M>}
                    {sel.type && <M style={{ fontSize: 10, color: C.muted, border: `1px solid ${C.rule}`, padding: "3px 10px" }}>{sel.type}</M>}
                  </div>
                  <D size={52} style={{ display: "block", marginBottom: 10 }}>{sel.name}</D>
                  <p style={{ fontSize: 14, color: C.body, lineHeight: 1.65, maxWidth: 520 }}>{sel.tagline}</p>
                </div>
                <div style={{ border: `1px solid ${C.rule}`, padding: "18px 24px", background: C.surface, textAlign: "center", flexShrink: 0 }}>
                  <D size={52} color={sel.match > 90 ? C.lime : sel.match > 75 ? "#aaaa00" : C.muted} style={{ display: "block" }}>{sel.match}%</D>
                  <M style={{ fontSize: 9, color: C.muted, letterSpacing: "0.14em" }}>SKILL MATCH</M>
                </div>
              </div>
              <div style={{ display: "flex" }}>
                {(mode === "WORK" ? ["ROLES", "TIMELINE", "INFO"] : ["SPOTS", "TIMELINE", "INFO"]).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{ padding: "11px 20px", fontSize: 11, letterSpacing: "0.1em", cursor: "pointer", color: tab === t ? C.ink : C.muted, background: "transparent", border: "none", borderBottom: tab === t ? `2px solid ${C.lime}` : "2px solid transparent", transition: "color 0.1s", userSelect: "none" }}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>

              {(tab === "ROLES" || tab === "SPOTS") && (
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 40 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                      <M style={{ fontSize: 11, color: C.muted, letterSpacing: "0.1em" }}>{mode === "WORK" ? "TEAM COMPOSITION" : "OPEN SPOTS"}</M>
                      {mode === "WORK" && sel.roles && <M style={{ fontSize: 11, color: C.body }}>{filledRoles.length}/{sel.roles.length} filled</M>}
                    </div>
                    {mode === "WORK" && sel.roles && <div style={{ height: 4, background: C.rule, borderRadius: 2, marginBottom: 24 }}><div style={{ height: "100%", width: `${(filledRoles.length / sel.roles.length) * 100}%`, background: C.lime, borderRadius: 2, transition: "width 0.4s" }} /></div>}
                    {mode === "WORK" && sel.roles?.map((role, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "13px 0", borderBottom: `1px solid ${C.rule}` }}>
                        <div style={{ width: 8, height: 8, flexShrink: 0, marginTop: 4, background: role.filled ? C.lime : "transparent", border: role.filled ? "none" : `1px solid ${C.rule}` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: role.filled ? C.muted : C.ink, textDecoration: role.filled ? "line-through" : "none", marginBottom: role.filled ? 3 : 6 }}>{role.title}</div>
                          {role.filled && <M style={{ fontSize: 11, color: C.lime, display: "block", marginBottom: 6 }}>→ {role.member}</M>}
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{role.skills?.map(s => <M key={s} style={{ fontSize: 9, color: C.muted, border: `1px solid ${C.rule}`, padding: "2px 6px" }}>{s}</M>)}</div>
                        </div>
                        {!role.filled && !sel.yours && !readOnly && <M onClick={() => handleApply(sel.id)} style={{ fontSize: 10, color: C.lime, border: `1px solid ${C.lime}`, padding: "4px 12px", cursor: "pointer", letterSpacing: "0.06em", flexShrink: 0, marginTop: 2 }}>APPLY</M>}
                      </div>
                    ))}
                    {mode === "PLAY" && [...Array(sel.spots || 0)].map((_, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: `1px solid ${C.rule}` }}>
                        <div style={{ width: 8, height: 8, border: `1px solid ${C.rule}` }} />
                        <span style={{ fontSize: 13, color: C.body, flex: 1 }}>Open spot {i + 1}</span>
                        {!sel.yours && !readOnly && <M onClick={() => handleApply(sel.id)} style={{ fontSize: 10, color: C.lime, border: `1px solid ${C.lime}`, padding: "4px 12px", cursor: "pointer" }}>JOIN</M>}
                      </div>
                    ))}
                    {mode === "PLAY" && sel.tags && <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }}>{sel.tags.map(t => <M key={t} style={{ fontSize: 10, color: C.muted, border: `1px solid ${C.rule}`, padding: "3px 9px" }}>{t}</M>)}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                    {!sel.yours && readOnly && (
                      <div style={{ border: `1px solid ${C.rule}`, padding: "22px", background: C.surface }}>
                        <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", display: "block", marginBottom: 10 }}>DEMO — READ ONLY</M>
                        <p style={{ fontSize: 12, color: C.body, lineHeight: 1.5 }}>Sign up for a real account to apply or post.</p>
                      </div>
                    )}
                    {!sel.yours && !readOnly && (
                      <div style={{ border: `1px solid ${C.lime}`, padding: "22px", background: C.limeLight }}>
                        <M style={{ fontSize: 10, color: C.limeDark, letterSpacing: "0.12em", display: "block", marginBottom: 10 }}>{mode === "WORK" ? "YOU FIT THIS ROLE" : "YOU CAN JOIN"}</M>
                        <p style={{ fontSize: 14, color: C.ink, marginBottom: 6 }}>{mode === "WORK" ? `${openRoles.length} open role${openRoles.length !== 1 ? "s" : ""} match your skills` : `${sel.spots} spot${sel.spots !== 1 ? "s" : ""} open this term`}</p>
                        <p style={{ fontSize: 12, color: C.body, marginBottom: 20, lineHeight: 1.5 }}>{mode === "WORK" ? "Your React + ML/AI skills fit the Backend Dev role" : "Your schedule overlaps for 3 terms"}</p>
                        <button onClick={() => handleApply(sel.id)} style={{ width: "100%", padding: "12px", fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, background: C.lime, color: C.limeInk, border: "none", cursor: "pointer" }}>{mode === "WORK" ? "REQUEST TO JOIN →" : "EXPRESS INTEREST →"}</button>
                      </div>
                    )}
                    {sel.yours && (
                      <div style={{ border: `1px solid ${C.rule}`, padding: "22px", background: C.surface }}>
                        <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", display: "block", marginBottom: 10 }}>YOUR {mode === "WORK" ? "PROJECT" : "ACTIVITY"}</M>
                        <p style={{ fontSize: 13, color: C.body, marginBottom: 16, lineHeight: 1.5 }}>{openRoles.length > 0 || sel.spots > 0 ? `${mode === "WORK" ? openRoles.length : sel.spots} open ${mode === "WORK" ? "role" : "spot"}${(mode === "WORK" ? openRoles.length : sel.spots) !== 1 ? "s" : ""} — waiting for applicants.` : "Team is full!"}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <button onClick={() => setShowManageApplicants(true)} style={{ width: "100%", padding: "11px", fontSize: 11, letterSpacing: "0.08em", fontWeight: 600, background: "transparent", color: C.ink, border: `1px solid ${C.ink}`, cursor: "pointer" }}>MANAGE APPLICANTS</button>
                          <button onClick={() => setShowTopMatches(true)} style={{ width: "100%", padding: "11px", fontSize: 11, letterSpacing: "0.08em", fontWeight: 600, background: C.lime, color: C.limeInk, border: "none", cursor: "pointer" }}>FIND TOP MATCHES</button>
                        </div>
                      </div>
                    )}
                    <div>
                      <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 14 }}>DETAILS</M>
                      {[["CATEGORY", sel.category], ["STAGE/TYPE", sel.type || sel.stage], ["COMMITMENT", sel.commitment || sel.type || "—"]].map(([k, v]) => v && (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.rule}`, padding: "9px 0" }}>
                          <M style={{ fontSize: 11, color: C.muted }}>{k}</M>
                          <M style={{ fontSize: 11, color: C.body }}>{v}</M>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "TIMELINE" && (
                <div>
                  <p style={{ fontSize: 13, color: C.body, marginBottom: 24, lineHeight: 1.6 }}>When the full team is on campus at the same time — highlighted in green.</p>
                  <div style={{ display: "flex", gap: 24, marginBottom: 28 }}>
                    {[{ c: C.lime, l: "Overlap" }, { c: C.ink, l: "On campus" }, { c: C.rule, l: "On co-op" }].map(x => (
                      <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, background: x.c }} /><M style={{ fontSize: 11, color: C.body }}>{x.l}</M></div>
                    ))}
                  </div>
                  {[{ label: "YOU", terms: profile.terms || [], you: true }, { label: "FOUNDER", terms: sel.terms?.founder || [] }, ...(filledRoles.map((r, i) => ({ label: (r.member || "MEMBER").toUpperCase(), terms: sel.terms?.founder || [] })))].map((p, pi) => (
                    <div key={pi} style={{ display: "flex", alignItems: "center", gap: 20, padding: "12px 0", borderBottom: `1px solid ${C.rule}` }}>
                      <M style={{ width: 80, fontSize: 11, color: p.you ? C.lime : C.body, fontWeight: p.you ? "600" : "400" }}>{p.label}</M>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                        {ALL_TERMS.map(t => {
                          const active = p.terms.includes(t); const overlap = active && (profile.terms || []).includes(t) && (sel.terms?.overlap || []).includes(t);
                          return <div key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: overlap ? 24 : active ? 16 : 8, background: overlap ? C.lime : active ? C.ink : C.rule, transition: "all 0.2s", boxShadow: overlap ? `0 2px 6px ${C.lime}66` : "none" }} /><M style={{ fontSize: 8, color: overlap ? C.limeDark : active ? C.body : C.muted }}>{t}</M></div>;
                        })}
                      </div>
                    </div>
                  ))}
                  {sel.terms?.overlap && sel.terms.overlap.length > 0 && (
                    <div style={{ marginTop: 20, padding: "13px 18px", border: `1px solid ${C.lime}66`, background: C.limeLight }}>
                      <M style={{ fontSize: 12, color: C.limeDark }}>✓ Full team overlaps: {sel.terms.overlap.join("  ·  ")}</M>
                    </div>
                  )}
                </div>
              )}

              {tab === "INFO" && (
                <div style={{ maxWidth: 520 }}>
                  <M style={{ fontSize: 11, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 20 }}>PROJECT INFO</M>
                  {[["Name", sel.name], ["Tagline", sel.tagline], ["Category", sel.category], ["Stage", sel.stage || sel.type], ["Commitment", sel.commitment || "—"]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 24, borderBottom: `1px solid ${C.rule}`, padding: "11px 0" }}>
                      <M style={{ width: 140, fontSize: 11, color: C.muted, flexShrink: 0 }}>{k}</M>
                      <M style={{ fontSize: 12, color: C.ink, lineHeight: 1.5 }}>{v}</M>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const getStoredUserId = () => {
  try {
    return localStorage.getItem("plork_user_id");
  } catch {
    return null;
  }
};

export default function App() {
  const storedUserId = getStoredUserId();
  const [screen, setScreen] = useState(storedUserId ? "app" : "landing");
  const [userId, setUserId] = useState(storedUserId ? Number(storedUserId) : null);
  const [userProfile, setUserProfile] = useState(null);

  const handleAuthSuccess = (id, user) => {
    try {
      localStorage.setItem("plork_user_id", id);
    } catch {
      // localStorage unavailable (e.g. private browsing) — session just won't persist
    }
    setUserId(id);
    setUserProfile(user);
    setScreen("app");
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("plork_user_id");
    } catch {
      // ignore
    }
    setUserId(null);
    setUserProfile(null);
    setScreen("landing");
  };

  if (screen === "login") return <Login onBack={() => setScreen("landing")} onSuccess={handleAuthSuccess} />;
  if (screen === "onboarding") return <Onboarding onComplete={handleAuthSuccess} />;
  if (screen === "app") return <MainApp userId={userId} initialProfile={userProfile} onLogout={handleLogout} />;
  if (screen === "demo") return <MainApp userId={null} initialProfile={null} onLogout={() => setScreen("landing")} readOnly />;
  return <Landing onLogin={() => setScreen("login")} onSignup={() => setScreen("onboarding")} onDemo={() => setScreen("demo")} />;
}
