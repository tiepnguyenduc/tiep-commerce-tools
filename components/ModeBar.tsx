import Link from "next/link";
import type { StoreMode } from "@/lib/types";
export function ModeBar({ mode }: { mode: StoreMode }) {
  return (
    <div className="modebar">
      <div className="shell">
        <span>Explore the same catalog through two commerce journeys.</span>
        <div className="mode-choice">
          <Link className={mode === "b2c" ? "active" : ""} href="/b2c">
            B2C shop
          </Link>
          <Link className={mode === "b2b" ? "active" : ""} href="/b2b">
            B2B procurement
          </Link>
        </div>
      </div>
    </div>
  );
}
