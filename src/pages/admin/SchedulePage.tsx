import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRunContext } from "@/hooks/useRunContext";
import { useLarpContext } from "@/hooks/useLarpContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Play, Square, Clock, MapPin, User, Loader2, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];

type ScheduleEventRow = Database["public"]["Tables"]["schedule_events"]["Row"] & {
  persons?: { access_token: string; name: string } | null;
};

interface CP {
  id: string;
  name: string;
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  programovy_blok: "Programový blok",
  jidlo: "Jídlo",
  presun: "Přesun",
  informace: "Informace",
  vystoupeni_cp: "Vystoupení CP",
};

export default function SchedulePage() {
  const { runs, selectedRunId } = useRunContext();
  const { currentLarpId } = useLarpContext();
  const [events, setEvents] = useState<ScheduleEventRow[]>([]);
  const [cps, setCps] = useState<CP[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [liveDayNumber, setLiveDayNumber] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEventRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    day_number: 1,
    start_time: "09:00",
    duration_minutes: 60,
    event_type: "programovy_blok" as EventType,
    title: "",
    description: "",
    location: "",
    cp_id: "",
  });

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

  const fetchCps = async () => {
    if (!currentLarpId) return;
    const { data } = await supabase
      .from("persons")
      .select("id, name")
      .eq("larp_id", currentLarpId)
      .eq("type", "cp")
      .order("name");
    setCps(data || []);
  };

  useEffect(() => {
    if (selectedRunId) fetchEvents();
  }, [selectedRunId]);

  useEffect(() => {
    if (currentLarpId) fetchCps();
  }, [currentLarpId]);

  const uniqueDays = useMemo(() => {
    const days = [...new Set(events.map((e) => e.day_number))].sort((a, b) => a - b);
    return days.length ? days : [1];
  }, [events]);

  const maxDay = useMemo(() => Math.max(...uniqueDays, 1), [uniqueDays]);

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

  const openCreateDialog = () => {
    setSelectedEvent(null);
    setFormData({
      day_number: 1,
      start_time: "09:00",
      duration_minutes: 60,
      event_type: "programovy_blok",
      title: "",
      description: "",
      location: "",
      cp_id: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (event: ScheduleEventRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setFormData({
      day_number: event.day_number,
      start_time: event.start_time,
      duration_minutes: event.duration_minutes,
      event_type: event.event_type,
      title: event.title,
      description: event.description || "",
      location: event.location || "",
      cp_id: event.cp_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !selectedRunId) {
      toast.error("Vyplňte název události");
      return;
    }

    setSaving(true);

    const payload = {
      run_id: selectedRunId,
      day_number: formData.day_number,
      start_time: formData.start_time,
      duration_minutes: formData.duration_minutes,
      event_type: formData.event_type,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      location: formData.location.trim() || null,
      cp_id: formData.cp_id || null,
    };

    if (selectedEvent) {
      const { error } = await supabase
        .from("schedule_events")
        .update(payload)
        .eq("id", selectedEvent.id);

      if (error) {
        toast.error("Chyba při ukládání", { description: error.message });
        setSaving(false);
        return;
      }
      toast.success("Událost upravena");
    } else {
      const { error } = await supabase.from("schedule_events").insert(payload);

      if (error) {
        toast.error("Chyba při vytváření", { description: error.message });
        setSaving(false);
        return;
      }
      toast.success("Událost vytvořena");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchEvents();
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    const { error } = await supabase
      .from("schedule_events")
      .delete()
      .eq("id", selectedEvent.id);

    if (error) {
      toast.error("Chyba při mazání");
      return;
    }

    toast.success("Událost smazána");
    setDeleteDialogOpen(false);
    fetchEvents();
  };

  // Generate day options (1 to maxDay + 1 for new days)
  const dayOptions = Array.from({ length: maxDay + 1 }, (_, i) => i + 1);

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
          <div className="flex items-center justify-between gap-4">
            <Input
              placeholder="Hledat v harmonogramu…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs input-vintage"
            />
            <Button onClick={openCreateDialog} className="btn-vintage">
              <Plus className="mr-2 h-4 w-4" />
              Přidat událost
            </Button>
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
              <p className="text-muted-foreground mb-4">Tento běh zatím nemá žádné události v harmonogramu.</p>
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Přidat první událost
              </Button>
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
                            <div className="flex-1 min-w-0 space-y-2">
                              {blockEvents.map((ev) => (
                                <div key={ev.id} className="flex items-start justify-between gap-2 group">
                                  <div className="flex flex-wrap items-center gap-2 gap-y-1 min-w-0">
                                    <span className="font-medium">{ev.title}</span>
                                    {ev.event_type && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-muted">
                                        {EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
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
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => openEditDialog(ev, e)}
                                      title="Upravit"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEvent(ev);
                                        setDeleteDialogOpen(true);
                                      }}
                                      title="Smazat"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="paper-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-typewriter">
              {selectedEvent ? "Upravit událost" : "Nová událost"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Název</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Název události"
                className="input-vintage"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Den</Label>
                <Select
                  value={String(formData.day_number)}
                  onValueChange={(v) => setFormData({ ...formData, day_number: Number(v) })}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        Den {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Čas začátku</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="input-vintage"
                />
              </div>

              <div className="space-y-2">
                <Label>Délka (min)</Label>
                <Input
                  type="number"
                  min={5}
                  step={5}
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                  className="input-vintage"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Typ události</Label>
              <Select
                value={formData.event_type}
                onValueChange={(v) => setFormData({ ...formData, event_type: v as EventType })}
              >
                <SelectTrigger className="input-vintage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Popis</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Volitelný popis"
                rows={2}
                className="input-vintage"
              />
            </div>

            <div className="space-y-2">
              <Label>Lokace</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Místo konání"
                className="input-vintage"
              />
            </div>

            {formData.event_type === "vystoupeni_cp" && (
              <div className="space-y-2">
                <Label>Cizí postava (CP)</Label>
                <Select
                  value={formData.cp_id}
                  onValueChange={(v) => setFormData({ ...formData, cp_id: v })}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue placeholder="Vyberte CP" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-- Žádné CP --</SelectItem>
                    {cps.map((cp) => (
                      <SelectItem key={cp.id} value={cp.id}>
                        {cp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSave} disabled={saving} className="btn-vintage">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="paper-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-typewriter">Smazat událost?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat událost <strong>{selectedEvent?.title}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
