import type { ReactNode } from "react";

export function SectionHead({ num, title, sub, children }: { num: string; title: string; sub: string; children?: ReactNode }) {
  return (
    <div className="sh">
      <div className="sh-l">
        <span className="num">{num}</span>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      {children}
    </div>
  );
}
