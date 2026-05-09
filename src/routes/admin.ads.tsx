import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/ads")({
  component: AdminAds,
});

interface SlotStat {
  slot: string;
  impressions: number;
  clicks: number;
  revenue: number;
}

function AdminAds() {
  const [stats, setStats] = useState<SlotStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      const { data } = await supabase
        .from("ad_impressions")
        .select("slot, event_type, estimated_revenue_brl")
        .gte("created_at", since)
        .limit(10000);

      const map = new Map<string, SlotStat>();
      for (const row of data ?? []) {
        const r: any = row;
        const s = map.get(r.slot) ?? { slot: r.slot, impressions: 0, clicks: 0, revenue: 0 };
        if (r.event_type === "impression") s.impressions += 1;
        else if (r.event_type === "click") s.clicks += 1;
        s.revenue += Number(r.estimated_revenue_brl ?? 0);
        map.set(r.slot, s);
      }
      setStats([...map.values()].sort((a, b) => b.revenue - a.revenue));
      setLoading(false);
    })();
  }, [days]);

  const totalImp = stats.reduce((a, s) => a + s.impressions, 0);
  const totalClicks = stats.reduce((a, s) => a + s.clicks, 0);
  const totalRev = stats.reduce((a, s) => a + s.revenue, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Período:</span>
        {[1, 7, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 h-8 rounded-full text-xs font-medium ${days === d ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
          >
            {d}d
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Impressões" value={totalImp.toLocaleString("pt-BR")} />
        <Stat label="Cliques" value={totalClicks.toLocaleString("pt-BR")} />
        <Stat label="CTR" value={`${totalImp ? ((totalClicks / totalImp) * 100).toFixed(2) : "0.00"}%`} />
        <Stat label="Receita" value={`R$ ${totalRev.toFixed(2)}`} highlight />
      </div>

      {loading ? (
        <div className="h-40 grid place-items-center"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Slot</th>
                <th className="text-right p-3">Impressões</th>
                <th className="text-right p-3">Cliques</th>
                <th className="text-right p-3">CTR</th>
                <th className="text-right p-3">eCPM</th>
                <th className="text-right p-3">Receita</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => {
                const ctr = s.impressions ? (s.clicks / s.impressions) * 100 : 0;
                const ecpm = s.impressions ? (s.revenue / s.impressions) * 1000 : 0;
                return (
                  <tr key={s.slot} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">{s.slot}</td>
                    <td className="p-3 text-right tabular-nums">{s.impressions.toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-right tabular-nums">{s.clicks.toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-right tabular-nums">{ctr.toFixed(2)}%</td>
                    <td className="p-3 text-right tabular-nums">R$ {ecpm.toFixed(2)}</td>
                    <td className="p-3 text-right tabular-nums font-semibold">R$ {s.revenue.toFixed(2)}</td>
                  </tr>
                );
              })}
              {stats.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Sem dados no período</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "bg-gradient-ember text-primary-foreground border-transparent" : "bg-gradient-card border-border"}`}>
      <div className="text-[11px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </div>
  );
}
