import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRunContext } from "@/hooks/useRunContext";
import { supabase } from "@/integrations/supabase/client";
import { Play, Square, Clock, MapPin, User, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type ScheduleEventRow = Database["public"]["Tables"]["schedule_events"]["Row"] & {
  persons?: { access_token: string; name: string } | null;
};

export default function SchedulePage() {
  const { runs, selectedRunId } = useRunContext();
  const [events, setEvents] = useState<ScheduleEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [liveDayNumber, setLiveDayNumber] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");

  const fetchEvents = async () => {
    if (!selectedRunId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("schedule_events")
      .select("*, persons!schedule_events_cp_id_fkey(access_token, name)")
      .eq("run_id", selectedRunId)
      .order("day_number", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) {
      setEvents([]);
    } else {
      setEvents((data as ScheduleEventRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedRunId) fetchEvents();
  }, [selectedRunId]);

  const uniqueDays = useMemo(() => {
    const days = [...new Set(events.map((e) => e.day_number))].sort((a, b) => a - b);
    return days.length ? days : [1];
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (!searchTerm.trim()) return events;
    const q = searchTerm.toLowerCase();
    return events.filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        (e.persons?.name?.toLowerCase().includes(q) ?? false)
    );
  }, [events, searchTerm]);

  const eventsByDayAndTime = useMemo(() => {
    const map: Record<number, Record<string, ScheduleEventRow[]>> = {};
    for (const e of filteredEvents) {
      const day = e.day_number;
      const time = e.start_time;
      if (!map[day]) map[day] = {};
      if (!map[day][time]) map[day][time] = [];
      map[day][time].push(e);
    }
    return map;
  }, [filteredEvents]);

  const sortedTimesByDay = useMemo(() => {
    const out: Record<number, string[]> = {};
    Object.keys(eventsByDayAndTime).forEach((dayStr) => {
      const day = Number(dayStr);
      out[day] = Object.keys(eventsByDayAndTime[day]).sort();
    });
    return out;
  }, [eventsByDayAndTime]);

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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Harmonogram</h1>
            <p className="text-muted-foreground">Časový plán běhu</p>
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
                      <SelectItem key={d} value={String(d)}>
                        Den {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="btn-vintage"
                  onClick={() => setIsLiveRunning(true)}
                  disabled={!selectedRunId || loading}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Spustit běh
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsLiveRunning(false)}
              >
                <Square className="h-4 w-4 mr-2" />
                Zastavit
              </Button>
            )}
          </div>
        </div>

        {selectedRunId && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Hledat v harmonogramu…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs input-vintage"
            />
          </div>
        )}

        {runs.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nejprve vytvořte LARP a běh.</p>
            </PaperCardContent>
          </PaperCard>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground">Tento běh zatím nemá žádné události v harmonogramu.</p>
            </PaperCardContent>
          </PaperCard>
        ) : (
          <div className="space-y-8">
            {uniqueDays.map((dayNum) => (
              <div key={dayNum}>
                <h2 className="font-typewriter text-xl mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Den {dayNum}
                  {isLiveRunning && liveDayNumber === dayNum && (
                    <span className="text-sm font-normal text-muted-foreground">
                      (aktuální čas: {currentTime.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })})
                    </span>
                  )}
                </h2>
                <div className="space-y-3">
                  {(sortedTimesByDay[dayNum] ?? []).map((time) => {
                    const blockEvents = eventsByDayAndTime[dayNum]?.[time] ?? [];
                    const first = blockEvents[0];
                    const isCurrent = first && isBlockCurrent(dayNum, time, first.duration_minutes);
                    return (
                      <PaperCard
                        key={`${dayNum}-${time}`}
                        className={isCurrent ? "ring-2 ring-primary bg-primary/5" : ""}
                      >
                        <PaperCardContent className="py-3">
                          <div className="flex flex-wrap items-start gap-4">
                            <div className="font-mono text-sm text-muted-foreground shrink-0">
                              {time}
                              {first && (
                                <span className="ml-2 text-xs">
                                  ({first.duration_minutes} min)
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              {blockEvents.map((ev) => (
                                <div key={ev.id} className="flex flex-wrap items-center gap-2 gap-y-1">
                                  <span className="font-medium">{ev.title}</span>
                                  {ev.event_type && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-muted">
                                      {ev.event_type}
                                    </span>
                                  )}
                                  {ev.description && (
                                    <span className="text-sm text-muted-foreground">{ev.description}</span>
                                  )}
                                  {ev.location && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {ev.location}
                                    </span>
                                  )}
                                  {ev.cp_id && ev.persons?.access_token && (
                                    <Link
                                      to={`/portal/${ev.persons.access_token}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                      <User className="h-3 w-3" />
                                      Portál CP: {ev.persons.name}
                                    </Link>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </PaperCardContent>
                      </PaperCard>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
