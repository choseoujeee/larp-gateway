import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Clock, Play, Square, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SCHEDULE_PORTAL_SESSION_KEY = "larp_schedule_portal_session";

const SLOT_HEIGHT_PX = 48;
const MINUTES_PER_SLOT = 15;

const EVENT_TYPE_LABELS: Record<string, string> = {
  programovy_blok: "Programový blok",
  jidlo: "Jídlo",
  presun: "Přesun",
  informace: "Informace",
  vystoupeni_cp: "CP VSTUP",
  material: "Materiál",
  organizacni: "Organizační",
};

interface SchedulePortalSession {
  token: string;
  run_id: string;
  run_name: string;
}

/** Událost z RPC get_schedule_portal_events */
interface PortalScheduleEvent {
  id: string;
  day_number: number;
  start_time: string;
  duration_minutes: number;
  event_type: string;
  title: string;
  description: string | null;
  location: string | null;
  cp_id: string | null;
  cp_scene_id: string | null;
  material_id: string | null;
  document_id: string | null;
  performer_text?: string | null;
  persons?: { name: string; schedule_color?: string | null } | null;
  cp_scenes?: { title: string | null } | null;
}

interface EventWithLane extends PortalScheduleEvent {
  laneIndex: number;
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function assignLanes(events: PortalScheduleEvent[]): EventWithLane[] {
  const sorted = [...events].sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );
  const laneEnd: number[] = [];
  const result: EventWithLane[] = [];
  for (const ev of sorted) {
    const start = timeToMinutes(ev.start_time);
    const end = start + ev.duration_minutes;
    let lane = 0;
    while (lane < laneEnd.length && laneEnd[lane] > start) lane++;
    if (lane === laneEnd.length) laneEnd.push(0);
    laneEnd[lane] = end;
    result.push({ ...ev, laneIndex: lane });
  }
  return result;
}

function eventBoxStyle(ev: PortalScheduleEvent): { className: string; style?: React.CSSProperties } {
  const base = "rounded border text-card-foreground overflow-hidden text-left flex flex-col ";
  if (ev.event_type === "vystoupeni_cp") {
    const color = ev.persons?.schedule_color;
    if (color) {
      return { className: base + "rounded-lg border-2", style: { backgroundColor: color + "30", borderColor: color } };
    }
    return { className: base + "rounded-lg bg-primary/15 border-primary/50" };
  }
  if (ev.event_type === "material") return { className: base + "rounded-md bg-amber-500/15 border-amber-500/50" };
  if (ev.event_type === "organizacni") return { className: base + "rounded-md bg-sky-500/15 border-sky-500/50" };
  if (ev.event_type === "jidlo") return { className: base + "rounded-lg bg-green-500/15 border-green-500/50" };
  if (ev.event_type === "presun") return { className: base + "rounded-sm bg-muted border-border" };
  if (ev.event_type === "informace") return { className: base + "rounded-md bg-blue-500/10 border-blue-500/40" };
  return { className: base + "rounded-md bg-muted/50 border-border" };
}

/** Read-only box události v gridu (bez tlačítek, bez drag) */
function ScheduleEventBoxReadOnly({
  event: ev,
  topPx,
  heightPx,
  leftPct,
  widthPct,
  isCurrent,
}: {
  event: PortalScheduleEvent;
  topPx: number;
  heightPx: number;
  leftPct: number;
  widthPct: number;
  isCurrent: boolean;
}) {
  const { className, style } = eventBoxStyle(ev);
  const typeLabel = EVENT_TYPE_LABELS[ev.event_type] || ev.event_type;
  const sub = ev.cp_id ? ev.persons?.name : ev.location ?? null;
  const performerLabel = ev.cp_id ? (ev.performer_text?.trim() ?? null) : null;
  const compact = heightPx < 60;

  return (
    <div
      className={`absolute left-0 right-0 cursor-default ${className} ${isCurrent ? "ring-2 ring-primary ring-inset" : ""}`}
      style={{
        top: topPx,
        height: heightPx,
        left: `${leftPct}%`,
        width: `calc(${widthPct}% - 4px)`,
        marginLeft: 2,
        marginRight: 2,
        ...style,
      }}
      title={[ev.title, typeLabel, sub].filter(Boolean).join(" · ")}
    >
      <div className="p-1.5 h-full flex flex-col min-w-0">
        <span className={`font-medium truncate ${compact ? "text-xs" : "text-sm"}`}>{ev.title}</span>
        {!compact && (
          <>
            <span className="text-xs text-muted-foreground truncate">{typeLabel}</span>
            {sub && <span className="text-xs text-muted-foreground truncate">{sub}</span>}
            {performerLabel && <span className="text-xs text-muted-foreground truncate">{performerLabel}</span>}
          </>
        )}
      </div>
    </div>
  );
}

export default function SchedulePortalPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [session, setSession] = useState<SchedulePortalSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<PortalScheduleEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDay, setFilterDay] = useState<number | "all">("all");
  const [filterEventType, setFilterEventType] = useState<string | "all">("all");
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [liveDayNumber, setLiveDayNumber] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const raw = localStorage.getItem(SCHEDULE_PORTAL_SESSION_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SchedulePortalSession;
        if (parsed.token === token) {
          setSession(parsed);
        }
      } catch {
        localStorage.removeItem(SCHEDULE_PORTAL_SESSION_KEY);
      }
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!session?.token) return;
    let cancelled = false;
    setEventsLoading(true);
    supabase.rpc("get_schedule_portal_events", { p_token: session.token })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error("Chyba při načítání harmonogramu");
          setEvents([]);
        } else {
          const arr = Array.isArray(data) ? (data as unknown as PortalScheduleEvent[]) : [];
          setEvents(arr);
        }
        setEventsLoading(false);
      });
    return () => { cancelled = true; };
  }, [session?.token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password.trim()) {
      toast.error("Zadejte heslo");
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase.rpc("verify_schedule_portal_access", {
      p_token: token,
      p_password: password.trim(),
    });
    setVerifying(false);
    if (error) {
      toast.error("Nepodařilo se ověřit přístup");
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.run_id) {
      toast.error("Nesprávné heslo");
      return;
    }
    const newSession: SchedulePortalSession = {
      token,
      run_id: row.run_id,
      run_name: row.run_name ?? "",
    };
    setSession(newSession);
    localStorage.setItem(SCHEDULE_PORTAL_SESSION_KEY, JSON.stringify(newSession));
    toast.success("Přihlášeno");
  };

  const handleLogout = () => {
    setSession(null);
    setEvents([]);
    localStorage.removeItem(SCHEDULE_PORTAL_SESSION_KEY);
  };

  const uniqueDays = useMemo(() => {
    const days = [...new Set(events.map((e) => e.day_number))].sort((a, b) => a - b);
    return days.length ? days : [1];
  }, [events]);

  const filteredEvents = useMemo(() => {
    let list = events;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          (e.location?.toLowerCase().includes(q) ?? false) ||
          (e.persons?.name?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterDay !== "all") list = list.filter((e) => e.day_number === filterDay);
    if (filterEventType !== "all") list = list.filter((e) => e.event_type === filterEventType);
    return list;
  }, [events, searchTerm, filterDay, filterEventType]);

  const gridTimeRange = useMemo(() => {
    if (filteredEvents.length === 0) {
      return { minStartMinutes: 8 * 60, maxEndMinutes: 22 * 60, slotLabels: [] as string[], totalSlots: 0 };
    }
    const starts = filteredEvents.map((e) => timeToMinutes(e.start_time));
    const ends = filteredEvents.map((e) => timeToMinutes(e.start_time) + e.duration_minutes);
    const minStartMinutes = Math.floor(Math.min(...starts) / MINUTES_PER_SLOT) * MINUTES_PER_SLOT;
    const maxEndMinutes = Math.ceil(Math.max(...ends) / MINUTES_PER_SLOT) * MINUTES_PER_SLOT;
    const totalSlots = (maxEndMinutes - minStartMinutes) / MINUTES_PER_SLOT;
    const slotLabels: string[] = [];
    for (let m = minStartMinutes; m < maxEndMinutes; m += MINUTES_PER_SLOT) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slotLabels.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
    return { minStartMinutes, maxEndMinutes, slotLabels, totalSlots };
  }, [filteredEvents]);

  const eventsByDayWithLanes = useMemo(() => {
    const days = [...new Set(filteredEvents.map((e) => e.day_number))].sort((a, b) => a - b);
    const out: Record<number, { events: EventWithLane[]; maxLanes: number }> = {};
    for (const day of days) {
      const inDay = filteredEvents.filter((e) => e.day_number === day);
      const withLanes = assignLanes(inDay);
      const maxLanes = Math.max(1, ...withLanes.map((e) => e.laneIndex + 1));
      out[day] = { events: withLanes, maxLanes };
    }
    return out;
  }, [filteredEvents]);

  useEffect(() => {
    if (!isLiveRunning) return;
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, [isLiveRunning]);

  const isBlockCurrent = (dayNumber: number, startTime: string, durationMinutes: number) => {
    if (!isLiveRunning || dayNumber !== liveDayNumber) return false;
    const [h, m] = startTime.split(":").map(Number);
    const start = new Date(currentTime);
    start.setHours(h, m ?? 0, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return currentTime >= start && currentTime < end;
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <PaperCard>
          <PaperCardContent className="py-8 text-center">
            <p className="text-muted-foreground">Neplatný odkaz na portál harmonogramu.</p>
          </PaperCardContent>
        </PaperCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="font-typewriter text-2xl tracking-wider">Portál harmonogramu</h1>
            <p className="text-sm text-muted-foreground mt-1">Read-only zobrazení harmonogramu běhu</p>
          </div>
          <PaperCard>
            <PaperCardContent className="py-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sched-portal-password">Heslo</Label>
                  <Input
                    id="sched-portal-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Zadejte heslo"
                    autoFocus
                    disabled={verifying}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={verifying}>
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Přihlásit
                </Button>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Heslo vám poskytne organizátor.
                </p>
              </form>
            </PaperCardContent>
          </PaperCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <section aria-labelledby="sched-harmonogram-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 id="sched-harmonogram-heading" className="font-typewriter text-2xl tracking-wider uppercase text-foreground">Harmonogram</h1>
            <p className="text-sm text-muted-foreground">{session.run_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isLiveRunning ? (
              <>
                <Label className="text-sm">Den:</Label>
                <Select
                  value={String(liveDayNumber)}
                  onValueChange={(v) => setLiveDayNumber(Number(v))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueDays.map((d) => (
                      <SelectItem key={d} value={String(d)}>Den {d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="btn-vintage"
                  onClick={() => setIsLiveRunning(true)}
                  disabled={eventsLoading}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Spustit běh
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsLiveRunning(false)}>
                <Square className="h-4 w-4 mr-2" />
                Zastavit
              </Button>
            )}
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" />
              Odhlásit
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Hledat v harmonogramu…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs input-vintage"
          />
          <Select value={filterDay === "all" ? "all" : String(filterDay)} onValueChange={(v) => setFilterDay(v === "all" ? "all" : Number(v))}>
            <SelectTrigger className="w-32 input-vintage">
              <SelectValue placeholder="Den" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny dny</SelectItem>
              {uniqueDays.map((d) => (
                <SelectItem key={d} value={String(d)}>Den {d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterEventType} onValueChange={setFilterEventType}>
            <SelectTrigger className="w-40 input-vintage">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny typy</SelectItem>
              {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {eventsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground">Žádné události v harmonogramu.</p>
            </PaperCardContent>
          </PaperCard>
        ) : (
          <div className="space-y-6">
            {(Object.keys(eventsByDayWithLanes).map(Number).sort((a, b) => a - b)).map((dayNum) => {
              const dayData = eventsByDayWithLanes[dayNum];
              if (!dayData) return null;
              const { events: dayEvents, maxLanes } = dayData;
              const colHeight = gridTimeRange.totalSlots * SLOT_HEIGHT_PX;
              return (
                <PaperCard key={dayNum}>
                  <PaperCardContent className="py-4">
                    <h2 className="font-typewriter text-xl tracking-wide mb-3 flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Den {dayNum}
                      {isLiveRunning && liveDayNumber === dayNum && (
                        <span className="text-sm font-normal text-muted-foreground">
                          (aktuální čas: {currentTime.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })})
                        </span>
                      )}
                    </h2>
                    <div className="flex gap-4">
                      <div className="shrink-0 w-14 flex flex-col text-xs text-muted-foreground font-mono">
                        {gridTimeRange.slotLabels.map((label) => (
                          <div key={label} style={{ height: SLOT_HEIGHT_PX }} className="leading-none pt-0.5">
                            {label}
                          </div>
                        ))}
                      </div>
                      <div className="flex-1 relative min-h-[200px]" style={{ height: colHeight }}>
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="relative w-full h-full pointer-events-auto">
                            {dayEvents.map((ev) => {
                              const startMinutes = timeToMinutes(ev.start_time);
                              const topPx = ((startMinutes - gridTimeRange.minStartMinutes) / MINUTES_PER_SLOT) * SLOT_HEIGHT_PX;
                              const heightPx = (ev.duration_minutes / MINUTES_PER_SLOT) * SLOT_HEIGHT_PX;
                              const leftPct = (ev.laneIndex / maxLanes) * 100;
                              const widthPct = 100 / maxLanes;
                              const isCurrent =
                                isLiveRunning &&
                                liveDayNumber === dayNum &&
                                isBlockCurrent(dayNum, ev.start_time, ev.duration_minutes);
                              return (
                                <ScheduleEventBoxReadOnly
                                  key={ev.id}
                                  event={ev}
                                  topPx={topPx}
                                  heightPx={heightPx}
                                  leftPct={leftPct}
                                  widthPct={widthPct}
                                  isCurrent={isCurrent}
                                />
                              );
                            })}
                          </div>
                        </div>
                        {isLiveRunning && liveDayNumber === dayNum && (
                          <div
                            className="absolute left-0 right-0 h-0.5 bg-red-500 z-10 pointer-events-none"
                            style={{
                              top: (() => {
                                const minToday = currentTime.getHours() * 60 + currentTime.getMinutes();
                                const slotTop = ((minToday - gridTimeRange.minStartMinutes) / MINUTES_PER_SLOT) * SLOT_HEIGHT_PX;
                                return Math.max(0, Math.min(colHeight - 2, slotTop));
                              })(),
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </PaperCardContent>
                </PaperCard>
              );
            })}
          </div>
        )}

        </section>
        <footer className="mt-8 pt-6 text-center text-sm text-muted-foreground border-t border-border">
          Portál harmonogramu · {session.run_name}
        </footer>
      </div>
    </div>
  );
}
