import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";

export default function ProductionPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-typewriter text-3xl tracking-wide mb-2">Produkce</h1>
          <p className="text-muted-foreground">Užitečné odkazy a materiály</p>
        </div>
        <PaperCard>
          <PaperCardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Produkční odkazy budou implementovány v další fázi.
            </p>
          </PaperCardContent>
        </PaperCard>
      </div>
    </AdminLayout>
  );
}
