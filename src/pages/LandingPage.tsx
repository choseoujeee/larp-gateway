import { Link } from "react-router-dom";
import { FileText, Shield, Users, Clock, Printer, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Stamp } from "@/components/ui/stamp";

const features = [
  {
    icon: FileText,
    title: "Správa dokumentů",
    description: "Organizační, herní a osobní dokumenty s WYSIWYG editorem. Cílení na skupiny nebo jednotlivce.",
  },
  {
    icon: Users,
    title: "Postavy a CP",
    description: "Evidence postav a cizích postav. Generování unikátních přístupových odkazů s heslem.",
  },
  {
    icon: Clock,
    title: "Harmonogram",
    description: "Timeline událostí s live zobrazením aktuálního bloku. Vazba na cizí postavy.",
  },
  {
    icon: Shield,
    title: "Bezpečný přístup",
    description: "Hráči vidí jen své materiály. CP má přístup ke všemu potřebnému pro hraní.",
  },
  {
    icon: Printer,
    title: "Tisk a export",
    description: "Optimalizovaný tisk dokumentů. Možnost tisku po kategoriích nebo vše najednou.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 50px,
              hsl(var(--foreground) / 0.03) 50px,
              hsl(var(--foreground) / 0.03) 51px
            )`
          }} />
        </div>
        
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Stamp variant="red" className="mb-6" animated>
              Přísně tajné
            </Stamp>
            
            <h1 className="font-typewriter text-4xl md:text-5xl lg:text-6xl tracking-wide mb-6 text-foreground">
              LARP PORTÁL
            </h1>
            
            <p className="font-mono text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Komplexní systém pro organizátory LARPů, jejich hráče a cizí postavy. 
              Spravujte dokumenty, postavy a harmonogram na jednom místě.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="btn-vintage text-lg px-8">
                  Začít organizovat
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="text-lg px-8">
                  Přihlásit se
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-typewriter text-2xl md:text-3xl text-center mb-12 tracking-wide">
            Funkce systému
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <PaperCard key={index} className="hover:shadow-lg transition-shadow">
                <PaperCardContent>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-primary/10">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-typewriter text-lg mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </PaperCardContent>
              </PaperCard>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-typewriter text-2xl md:text-3xl text-center mb-12 tracking-wide">
            Jak to funguje
          </h2>

          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-typewriter text-lg">
                1
              </div>
              <div>
                <h3 className="font-typewriter text-lg mb-2">Vytvořte LARP a běh</h3>
                <p className="text-muted-foreground">
                  Založte si svůj LARP a nastavte jednotlivé běhy s datumy, lokací a dalšími informacemi.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-typewriter text-lg">
                2
              </div>
              <div>
                <h3 className="font-typewriter text-lg mb-2">Přidejte postavy a dokumenty</h3>
                <p className="text-muted-foreground">
                  Vytvořte postavy, přiřaďte je do skupin a napište dokumenty s cílením na konkrétní příjemce.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-typewriter text-lg">
                3
              </div>
              <div>
                <h3 className="font-typewriter text-lg mb-2">Sdílejte přístupové odkazy</h3>
                <p className="text-muted-foreground">
                  Každá postava dostane unikátní odkaz s heslem. Hráči se přihlásí a vidí jen své materiály.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            LARP Portál © {new Date().getFullYear()} | Systém pro správu živých akčních her
          </p>
        </div>
      </footer>
    </div>
  );
}
