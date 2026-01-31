import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";

export default function SchedulePage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-typewriter text-3xl tracking-wide mb-2">Harmonogram</h1>
          <p className="text-muted-foreground">Časový plán běhu</p>
        </div>
        <PaperCard>
          <PaperCardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Harmonogram bude implementován v další fázi.
            </p>
          </PaperCardContent>
        </PaperCard>
      </div>
    </AdminLayout>
  );
}
