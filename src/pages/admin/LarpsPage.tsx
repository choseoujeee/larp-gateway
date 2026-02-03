import { AdminLayout } from "@/components/layout/AdminLayout";
import { LarpsManagement } from "@/components/admin/LarpsManagement";

/** Stránka LARPy – stejný obsah jako Přehled LARPů (/admin), bez hero karty a bez sekce Jak to funguje */
export default function LarpsPage() {
  return (
    <AdminLayout>
      <LarpsManagement
        title="LARPy"
        subtitle="Spravujte své živé akční hry"
        showHeroCard={false}
        showHowItWorks={false}
      />
    </AdminLayout>
  );
}
