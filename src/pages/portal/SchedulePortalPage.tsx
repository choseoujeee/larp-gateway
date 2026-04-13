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
import { assignLanes, timeToMinutes } from "@/lib/scheduleGridUtils";
import {
  ScheduleGridDay, computeGridTimeRange,
  ReadOnlyScheduleEventBox,
  EVENT_TYPE_LABELS, PX_PER_MINUTE, SLOT_HEIGHT_PX,
} from "@/components/schedule";
import type { PortalScheduleEvent, PortalEventWithLane } from "@/components/schedule";

const SCHEDULE_PORTAL_SESSION_KEY = "larp_schedule_portal_session";

interface SchedulePortalSession {
  token: string;
  run_id: string;
  run_name: string;
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
    if (!token) { setLoading(false); return; }
    const raw = localStorage.getItem(SCHEDULE_PORTAL_SESSION_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SchedulePortalSession;
        if (parsed.token === token) { setSession(parsed); setLoading(false); return; }
      } catch { localStorage.removeItem(SCHEDULE_PORTAL_SESSION_KEY); }
    }
    supabase.rpc("check_schedule_portal_passwordless", { p_token: token })
      .then(({ data, error }) => {
        if (!error && data && typeof data === "object" && (data as any).run_id) {
          const d = data as any;
          const newSession: SchedulePortalSession = { token, run_id: d.run_id, run_name: d.run_name ?? "" };
          setSession(newSession);
          localStorage.setItem(SCHEDULE_PORTAL_SESSION_KEY, JSON.stringify(newSession));
        }
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (!session?.token) return;
    let cancelled = false;
    setEventsLoading(true);
    supabase.rpc("get_schedule_portal_events", { p_token: session.token })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { toast.error("Chyba při načítání harmonogramu"); setEvents([]); }
        else setEvents(Array.isArray(data) ? (data as unknown as PortalScheduleEvent[]) : []);
        setEventsLoading(false);
      });
    return () => { cancelled = true; };
  }, [session?.token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password.trim()) { toast.error("Zadejte heslo"); return; }
    setVerifying(true);
    const { data, error } = await supabase.rpc("verify_schedule_portal_access", { p_token: token, p_password: password.trim() });
    setVerifying(false);
    if (error) { toast.error("Nepodařilo se ověřit přístup"); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.run_id) { toast.error("Nesprávné heslo"); return; }
    const newSession: SchedulePortalSession = { token, run_id: row.run_id, run_name: row.run_name ?? "" };
    setSession(newSession);
    localStorage.setItem(SCHEDULE_PORTAL_SESSION_KEY, JSON.stringify(newSession));
    toast.success("Přihlášeno");
  };

  const handleLogout = () => {
    setSession(null); setEvents([]);
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
      list = list.filter((e) =>
        e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) ||
        (e.location?.toLowerCase().includes(q) ?? false) ||
        (e.persons?.name?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterDay !== "all") list = list.filter((e) => e.day_number === filterDay);
    if (filterEventType !== "all") list = list.filter((e) => e.event_type === filterEventType);
    return list;
  }, [events, searchTerm, filterDay, filterEventType]);

  const gridTimeRange = useMemo(() => computeGridTimeRange(filteredEvents), [filteredEvents]);

  const eventsByDayWithLanes = useMemo(() => {
    const days = [...new Set(filteredEvents.map((e) => e.day_number))].sort((a, b) => a - b);
    const out: Record<number, { events: PortalEventWithLane[]; maxLanes: number }> = {};
    for (const day of days) {
      const inDay = filteredEvents.filter((e) => e.day_number === day);
      const withLanes = assignLanes(inDay) as PortalEventWithLane[];
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
        <PaperCard><PaperCardContent className="py-8 text-center"><p className="text-muted-foreground">Neplatný odkaz na portál harmonogramu.</p></PaperCardContent></PaperCard>
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
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="font-typewriter text-2xl tracking-wider">Portál harmonogramu</h1>
            <p className="text-sm text-muted-foreground mt-1">Read-only zobrazení harmonogramu běhu</p>
          </div>
          <PaperCard><PaperCardContent className="py-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sched-portal-password">Heslo</Label>
                <Input id="sched-portal-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Zadejte heslo" autoFocus disabled={verifying} />
              </div>
              <Button type="submit" className="w-full" disabled={verifying}>
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Přihlásit
              </Button>
              <p className="mt-4 text-center text-xs text-muted-foreground">Heslo vám poskytne organizátor.</p>
            </form>
          </PaperCardContent></PaperCard>
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
                  <Select value={String(liveDayNumber)} onValueChange={(v) => setLiveDayNumber(Number(v))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>{uniqueDays.map((d) => (<SelectItem key={d} value={String(d)}>Den {d}</SelectItem>))}</SelectContent>
                  </Select>
                  <Button size="sm" className="btn-vintage" onClick={() => setIsLiveRunning(true)} disabled={eventsLoading}>
                    <Play className="h-4 w-4 mr-2" />Spustit běh
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsLiveRunning(false)}>
                  <Square className="h-4 w-4 mr-2" />Zastavit
                </Button>
              )}
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4 mr-1" />Odhlásit</Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Input placeholder="Hledat v harmonogramu…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-xs input-vintage" />
            <Select value={filterDay === "all" ? "all" : String(filterDay)} onValueChange={(v) => setFilterDay(v === "all" ? "all" : Number(v))}>
              <SelectTrigger className="w-32 input-vintage"><SelectValue placeholder="Den" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny dny</SelectItem>
                {uniqueDays.map((d) => (<SelectItem key={d} value={String(d)}>Den {d}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterEventType} onValueChange={setFilterEventType}>
              <SelectTrigger className="w-40 input-vintage"><SelectValue placeholder="Typ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny typy</SelectItem>
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (<SelectItem key={value} value={value}>{label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {eventsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredEvents.length === 0 ? (
            <PaperCard className="mt-4"><PaperCardContent className="py-12 text-center"><p className="text-muted-foreground">Žádné události v harmonogramu.</p></PaperCardContent></PaperCard>
          ) : (
            <div className="space-y-6 mt-4">
              {(Object.keys(eventsByDayWithLanes).map(Number).sort((a, b) => a - b)).map((dayNum) => {
                const dayData = eventsByDayWithLanes[dayNum];
                if (!dayData) return null;
                const { events: dayEvents, maxLanes } = dayData;
                const colHeight = gridTimeRange.totalSlots * SLOT_HEIGHT_PX;
                return (
                  <ScheduleGridDay
                    key={dayNum}
                    dayNum={dayNum}
                    colHeight={colHeight}
                    gridTimeRange={gridTimeRange}
                    maxLanes={maxLanes}
                    isLiveRunning={isLiveRunning}
                    liveDayNumber={liveDayNumber}
                    currentTime={currentTime}
                    renderEvents={() =>
                      dayEvents.map((ev) => {
                        const startMinutes = timeToMinutes(ev.start_time);
                        const topPx = (startMinutes - gridTimeRange.minStartMinutes) * PX_PER_MINUTE;
                        const heightPx = ev.duration_minutes * PX_PER_MINUTE;
                        const leftPct = (ev.laneIndex / maxLanes) * 100;
                        const widthPct = 100 / maxLanes;
                        const isCurrent = isLiveRunning && liveDayNumber === dayNum && isBlockCurrent(dayNum, ev.start_time, ev.duration_minutes);
                        return (
                          <ReadOnlyScheduleEventBox
                            key={ev.id} event={ev}
                            topPx={topPx} heightPx={heightPx} leftPct={leftPct} widthPct={widthPct}
                            isCurrent={isCurrent}
                          />
                        );
                      })
                    }
                  />
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
