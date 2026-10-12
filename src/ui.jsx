import React from "react";
import { clamp } from "./lib.js";

/* The small, repeated pieces the settings panels are assembled from.
   Kept in one file so spacing and states stay consistent between them. */

export const Card = ({ title, hint, children }) => (
  <section className="fx-card">
    {title && (
      <header className="fx-cardhead">
        <h3>{title}</h3>
        {hint && <p>{hint}</p>}
      </header>
    )}
    {children}
  </section>
);

export const Toggle = ({ on, set, label, hint }) => (
  <div className="fx-row">
    <div className="fx-rowtext">
      <span>{label}</span>
      {hint && <p>{hint}</p>}
    </div>
    <button type="button" className="fx-switch" role="switch" aria-checked={!!on}
      aria-label={label} onClick={() => set(!on)}><span /></button>
  </div>
);

/* A number field that keeps its own text while focused, so clearing it to
   retype does not immediately snap back to the clamped value. */
export function NumField({ label, value, onChange, lim, suffix = "mins" }) {
  const [draft, setDraft] = React.useState(null);
  const [lo, hi] = lim;
  const commit = (raw) => {
    const n = parseInt(raw, 10);
    onChange(Number.isFinite(n) ? clamp(n, lo, hi) : value);
    setDraft(null);
  };
  return (
    <label className="fx-num">
      {label && <span className="fx-numlabel">{label}</span>}
      <span className="fx-numbox">
        <input inputMode="numeric" value={draft ?? value}
          aria-label={label} min={lo} max={hi}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
        {suffix && <em>{suffix}</em>}
      </span>
    </label>
  );
}

export const Select = ({ label, value, onChange, options, hint }) => (
  <label className="fx-select">
    {label && <span className="fx-numlabel">{label}</span>}
    <span className="fx-selectbox">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </span>
    {hint && <p className="fx-hint">{hint}</p>}
  </label>
);

export const Field = ({ label, hint, children }) => (
  <div className="fx-field">
    {label && <span className="fx-numlabel">{label}</span>}
    {children}
    {hint && <p className="fx-hint">{hint}</p>}
  </div>
);

export const TextInput = React.forwardRef(({ value, onChange, ...rest }, ref) => (
  <input ref={ref} className="fx-input" value={value}
    onChange={(e) => onChange(e.target.value)} {...rest} />
));
TextInput.displayName = "TextInput";

export const Button = ({ kind = "ghost", children, ...rest }) => (
  <button type="button" className={`fx-btn ${kind}`} {...rest}>{children}</button>
);
