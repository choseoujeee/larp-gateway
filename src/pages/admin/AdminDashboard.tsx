import { Link } from "react-router-dom";
import { 
  Gamepad2, 
  Calendar, 
  Users, 
  UserCog,
  FileText, 
  Clock, 
  Link as LinkIcon, 
  Printer,
  Plus
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Stamp } from "@/components/ui/stamp";
import { Button } from "@/components/ui/button";

const quickLinks = [
  { name: "LARPy", href: "/admin/larpy", icon: Gamepad2, description: "Správa vašich LARPů" },
  { name: "Běhy", href: "/admin/behy", icon: Calendar, description: "Jednotlivé běhy her" },
  { name: "Postavy", href: "/admin/osoby", icon: Users, description: "Hráčské postavy" },
  { name: "Cizí postavy", href: "/admin/cp", icon: UserCog, description: "CP a jejich role" },
  { name: "Dokumenty", href: "/admin/dokumenty", icon: FileText, description: "Herní a organizační texty" },
  { name: "Harmonogram", href: "/admin/harmonogram", icon: Clock, description: "Časový plán běhu" },
  { name: "Produkce", href: "/admin/produkce", icon: LinkIcon, description: "Užitečné odkazy" },
  { name: "Tiskoviny", href: "/admin/tiskoviny", icon: Printer, description: "Materiály k tisku" },
];

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Přehled</h1>
            <p className="text-muted-foreground">
              Vítejte v administraci LARP Portálu
            </p>
          </div>
          <Stamp variant="primary">
            Administrace
          </Stamp>
        </div>

        {/* Quick action */}
        <PaperCard className="bg-primary/5 border-primary/20">
          <PaperCardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-typewriter text-lg mb-1">Začněte tvořit</h2>
                <p className="text-sm text-muted-foreground">
                  Vytvořte svůj první LARP nebo přidejte nový běh k existujícímu
                </p>
              </div>
              <Link to="/admin/larpy">
                <Button className="btn-vintage">
                  <Plus className="mr-2 h-4 w-4" />
                  Nový LARP
                </Button>
              </Link>
            </div>
          </PaperCardContent>
        </PaperCard>

        {/* Quick links grid */}
        <div>
          <h2 className="font-typewriter text-xl mb-4 tracking-wide">Rychlá navigace</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <Link key={link.name} to={link.href}>
                <PaperCard className="h-full hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer">
                  <PaperCardContent>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-primary/10">
                        <link.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-typewriter text-sm mb-1">{link.name}</h3>
                        <p className="text-xs text-muted-foreground">{link.description}</p>
                      </div>
                    </div>
                  </PaperCardContent>
                </PaperCard>
              </Link>
            ))}
          </div>
        </div>

        {/* Info box */}
        <PaperCard>
          <PaperCardContent>
            <h2 className="font-typewriter text-lg mb-3">Jak začít?</h2>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Vytvořte nový LARP v sekci <strong>"LARPy"</strong></li>
              <li>Přidejte běh (konkrétní uvedení hry) v sekci <strong>"Běhy"</strong></li>
              <li>Vytvořte postavy pro hráče v sekci <strong>"Postavy"</strong></li>
              <li>Napište dokumenty a přiřaďte je postavám v sekci <strong>"Dokumenty"</strong></li>
              <li>Sdílejte přístupové odkazy s hráči</li>
            </ol>
          </PaperCardContent>
        </PaperCard>
      </div>
    </AdminLayout>
  );
}
