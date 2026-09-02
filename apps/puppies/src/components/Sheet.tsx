import type { ReactNode } from "react";

export function Sheet({
  title,
  sub,
  onClose,
  children,
  foot,
  /** `grave` styles the last purchase of the run — see `.sheet-grave` in styles.css. */
  tone,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  children: ReactNode;
  foot?: ReactNode;
  tone?: "grave";
}) {
  return (
    <div className={`overlay ${tone ? `overlay-${tone}` : ""}`} onClick={onClose}>
      <div className={`sheet ${tone ? `sheet-${tone}` : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <h2>{title}</h2>
            {sub && <p className="sheet-sub">{sub}</p>}
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {foot && <div className="sheet-foot">{foot}</div>}
      </div>
    </div>
  );
}
