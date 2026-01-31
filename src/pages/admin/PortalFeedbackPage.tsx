import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { 
  MessageSquare, 
  Check, 
  CheckCheck, 
  Trash2, 
  Filter,
  ExternalLink,
  Clock
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLarpContext } from "@/hooks/useLarpContext";

type FeedbackStatus = "new" | "read" | "resolved";

interface Feedback {
  id: string;
  larp_id: string | null;
  user_id: string | null;
  source_page: string;
  content: string;
  status: FeedbackStatus;
  created_at: string;
  resolved_at: string | null;
}

const statusConfig: Record<FeedbackStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  new: { label: "Nové", variant: "default" },
  read: { label: "Přečteno", variant: "secondary" },
  resolved: { label: "Vyřešeno", variant: "outline" },
};

export default function PortalFeedbackPage() {
  const { currentLarpId } = useLarpContext();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  const { data: feedbackList = [], isLoading } = useQuery({
    queryKey: ["portal-feedback", currentLarpId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_feedback")
        .select("*")
        .eq("larp_id", currentLarpId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Feedback[];
    },
    enabled: !!currentLarpId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FeedbackStatus }) => {
      const updates: Partial<Feedback> = { status };
      if (status === "resolved") {
        updates.resolved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("portal_feedback")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-feedback"] });
      toast({ title: "Status aktualizován" });
    },
    onError: () => {
      toast({ title: "Chyba při aktualizaci", variant: "destructive" });
    },
  });

  const deleteFeedback = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("portal_feedback")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-feedback"] });
      toast({ title: "Zpětná vazba smazána" });
      setSelectedFeedback(null);
    },
    onError: () => {
      toast({ title: "Chyba při mazání", variant: "destructive" });
    },
  });

  const filteredFeedback = statusFilter === "all" 
    ? feedbackList 
    : feedbackList.filter(f => f.status === statusFilter);

  const newCount = feedbackList.filter(f => f.status === "new").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-typewriter tracking-wide flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Zpětná vazba z portálu
              {newCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {newCount} nových
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Náměty a připomínky od uživatelů portálu
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FeedbackStatus | "all")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny</SelectItem>
                <SelectItem value="new">Nové</SelectItem>
                <SelectItem value="read">Přečtené</SelectItem>
                <SelectItem value="resolved">Vyřešené</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">
            {filteredFeedback.length} záznamů
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Načítání...</div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Zatím žádná zpětná vazba</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Datum</TableHead>
                  <TableHead className="w-32">Stránka</TableHead>
                  <TableHead>Obsah</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-24">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedback.map((feedback) => (
                  <TableRow 
                    key={feedback.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedFeedback(feedback);
                      if (feedback.status === "new") {
                        updateStatus.mutate({ id: feedback.id, status: "read" });
                      }
                    }}
                  >
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(feedback.created_at), "d. M. yyyy HH:mm", { locale: cs })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {feedback.source_page}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="truncate text-sm">
                        {feedback.content}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[feedback.status].variant}>
                        {statusConfig[feedback.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {feedback.status !== "resolved" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateStatus.mutate({ 
                              id: feedback.id, 
                              status: "resolved" 
                            })}
                            title="Označit jako vyřešené"
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Smazat"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Smazat zpětnou vazbu?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tato akce je nevratná.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Zrušit</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteFeedback.mutate(feedback.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Smazat
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Detail zpětné vazby
              </DialogTitle>
            </DialogHeader>
            
            {selectedFeedback && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline" className="font-mono">
                    {selectedFeedback.source_page}
                  </Badge>
                  <Badge variant={statusConfig[selectedFeedback.status].variant}>
                    {statusConfig[selectedFeedback.status].label}
                  </Badge>
                  <span className="text-muted-foreground">
                    {format(new Date(selectedFeedback.created_at), "d. MMMM yyyy, HH:mm", { locale: cs })}
                  </span>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 whitespace-pre-wrap text-sm">
                  {selectedFeedback.content}
                </div>

                {selectedFeedback.resolved_at && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Vyřešeno: {format(new Date(selectedFeedback.resolved_at), "d. M. yyyy HH:mm", { locale: cs })}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  {selectedFeedback.status !== "resolved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateStatus.mutate({ id: selectedFeedback.id, status: "resolved" });
                        setSelectedFeedback(null);
                      }}
                    >
                      <CheckCheck className="h-4 w-4 mr-1" />
                      Vyřešeno
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
