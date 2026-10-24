import { useEffect, useState } from "react";
import { useGame } from "../gamedata";
import { useStoredState } from "../hooks";
import { Empty, Kpis, ScreenHead, Seg } from "../components/bits";

export const until = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000));
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};

const clock = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
const day = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

export function useNow(every = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

export function Events() {
  const events = useGame((s) => s.events);
  const now = useNow();
  const [map, setMap] = useStoredState("topside-ledger:eventMap", "all");

  const maps = [...new Set(events.map((e) => e.map))].sort();
  const upcoming = events.filter((e) => e.end > now && (map === "all" || e.map === map));
  const live = upcoming.filter((e) => e.start <= now);
  const later = upcoming.filter((e) => e.start > now);

  return (
    <>
      <ScreenHead code="07" title="Events" sub="Map conditions live now and coming up, in your local time." />
      <Kpis
        items={[
          ["Live now", live.length, live.map((e) => `${e.name} · ${e.map}`).slice(0, 2).join(" / ") || "nothing live", live.length ? "hot" : undefined],
          ["Next", later[0] ? until(later[0].start - now) : "—", later[0] ? `${later[0].name} · ${later[0].map}` : undefined],
          ["Scheduled", later.length],
        ]}
      />
      <div className="bar">
        <Seg label="Map" value={map} onChange={setMap} options={[["all", "All maps"], ...maps.map((m) => [m, m] as [string, string])]} />
      </div>
      {upcoming.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>When</th>
                <th>Event</th>
                <th>Map</th>
                <th className="num">Status</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((e, i) => {
                const on = e.start <= now;
                const newDay = i === 0 || day(upcoming[i - 1].start) !== day(e.start);
                return (
                  <tr key={`${e.name}-${e.map}-${e.start}`} className={on ? "live" : ""}>
                    <td className="mono">
                      {newDay && <span className="day">{day(e.start)}</span>}
                      {clock(e.start)}–{clock(e.end)}
                    </td>
                    <td>
                      <span className="evt">
                        {e.icon && <img src={e.icon} alt="" loading="lazy" />}
                        <b>{e.name}</b>
                      </span>
                    </td>
                    <td className="dim">{e.map}</td>
                    <td className="num">{on ? <span className="state s-ready">Live · {until(e.end - now)} left</span> : <span className="dim">in {until(e.start - now)}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title={events.length ? "Nothing scheduled" : "No schedule yet"}>{events.length ? "No events for this map in the current schedule." : "The event schedule couldn't be loaded."}</Empty>
      )}
    </>
  );
}
