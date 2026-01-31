import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DocumentWithId {
  id: string;
}

/**
 * Sorts documents by priority, then sort_order, then created_at
 */
export function sortDocuments<T extends { priority: number; sort_order: number | null; created_at?: string }>(
  documents: T[]
): T[] {
  return [...documents].sort((a, b) => {
    // Primary: priority (1 = prioritní, 2 = normální, 3 = volitelné)
    if (a.priority !== b.priority) return a.priority - b.priority;
    // Secondary: sort_order
    const sortA = a.sort_order ?? 999;
    const sortB = b.sort_order ?? 999;
    if (sortA !== sortB) return sortA - sortB;
    // Tertiary: created_at
    if (a.created_at && b.created_at) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return 0;
  });
}

/**
 * Updates sort_order for a list of documents after drag-and-drop reordering
 * Each document gets a new sort_order based on its position in the array
 */
export async function updateDocumentOrder(documents: DocumentWithId[]): Promise<boolean> {
  try {
    // Batch update - each document gets sort_order based on its index
    for (let i = 0; i < documents.length; i++) {
      const { error } = await supabase
        .from("documents")
        .update({ sort_order: i })
        .eq("id", documents[i].id);
      
      if (error) {
        console.error("Error updating document order:", error);
        toast.error("Chyba při ukládání pořadí");
        return false;
      }
    }
    
    toast.success("Pořadí uloženo");
    return true;
  } catch (error) {
    console.error("Error updating document order:", error);
    toast.error("Chyba při ukládání pořadí");
    return false;
  }
}
