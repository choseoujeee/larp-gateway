import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileText, Printer, LogOut, Loader2, CreditCard, AlertCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { Stamp } from "@/components/ui/stamp";
import { DocBadge } from "@/components/ui/doc-badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePortalSession } from "@/hooks/usePortalSession";
import { supabase } from "@/integrations/supabase/client";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { sanitizeHtml } from "@/lib/sanitize";

/** Id sekcí accordionu podle typu dokumentů */
const DOC_SECTION_IDS = ["organizacni", "herni", "osobni", "cp"] as const;

/**
 * Sestaví SPAYD řetězec pro QR platbu (český standard).
 * ACC = účet (ideálně IBAN CZ...), AM = částka, CC = CZK, DT = splatnost YYYYMMDD.
 */
function buildSpayd(account: string, amountText: string | null, dueDate: string | null): string {
  const parts = ["SPD*1.0"];
  const acc = account?.trim();
  if (acc) parts.push(`ACC:${acc}`);
  if (amountText) {
    const num = amountText.replace(/[^\d,.]/g, "").replace(",", ".");
    const amount = parseFloat(num);
    if (!Number.isNaN(amount)) parts.push(`AM:${amount.toFixed(2)}`);
  }
  parts.push("CC:CZK");
  if (dueDate) {
    try {
      const d = new Date(dueDate);
      const yyyymmdd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
      parts.push(`DT:${yyyymmdd}`);
    } catch {
      // ignore invalid date
    }
  }
  return parts.join("*");
}

interface Document {
  id: string;
  title: string;
  content: string | null;
  doc_type: keyof typeof DOCUMENT_TYPES;
  target_type: string;
  sort_order: number;
}

export default function PortalViewPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { session, loading: sessionLoading, clearSession } = usePortalSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  /** Otevřené sekce accordionu (pro „Otevřít vše pro tisk“) */
  const [accordionOpen, setAccordionOpen] = useState<string[]>([]);

  useEffect(() => {
    if (!sessionLoading && !session) {
      navigate(`/portal/${token}`);
    }
  }, [session, sessionLoading, token, navigate]);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!session?.personId) return;

      const { data, error } = await supabase.rpc("get_person_documents", {
        p_person_id: session.personId,
      });

      if (!error && data) {
        setDocuments(data as Document[]);
      }
      setLoading(false);
    };

    if (session) {
      fetchDocuments();
    }
  }, [session]);

  /** Id sekcí, které mají alespoň jeden dokument (pro výchozí otevření a „Otevřít vše pro tisk“) */
  const sectionIdsWithDocs = useMemo(() => {
    const ids: string[] = [];
    if (documents.some((d) => d.doc_type === "organizacni")) ids.push("organizacni");
    if (documents.some((d) => d.doc_type === "herni")) ids.push("herni");
    if (documents.some((d) => ["postava", "medailonek"].includes(d.doc_type))) ids.push("osobni");
    if (session?.personType === "cp" && documents.some((d) => d.doc_type === "cp")) ids.push("cp");
    return ids;
  }, [documents, session?.personType]);

  useEffect(() => {
    if (!loading && sectionIdsWithDocs.length > 0 && accordionOpen.length === 0) {
      setAccordionOpen([sectionIdsWithDocs[0]]);
    }
  }, [loading, sectionIdsWithDocs, accordionOpen.length]);

  const openAllForPrint = () => setAccordionOpen([...DOC_SECTION_IDS]);

  const handlePrint = (category?: string) => {
    // Add print class to filter content
    if (category) {
      document.body.dataset.printCategory = category;
    }
    window.print();
    delete document.body.dataset.printCategory;
  };

  const handleLogout = () => {
    clearSession();
    navigate(`/portal/${token}`);
  };

  if (sessionLoading || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group documents by type
  const groupedDocs = {
    organizacni: documents.filter((d) => d.doc_type === "organizacni"),
    herni: documents.filter((d) => d.doc_type === "herni"),
    osobni: documents.filter((d) => ["postava", "medailonek"].includes(d.doc_type)),
    cp: documents.filter((d) => d.doc_type === "cp"),
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="no-print border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-primary">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-typewriter text-lg tracking-wider text-foreground">
                  {session.larpName}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {session.runName} • {session.personName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={openAllForPrint} className="no-print">
                Otevřít vše pro tisk
              </Button>
              <Button variant="outline" size="sm" onClick={() => handlePrint()}>
                <Printer className="h-4 w-4 mr-2" />
                Tisk
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Odhlásit
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Mission Briefing */}
          {session.missionBriefing && (
            <PaperCard className="border-2 border-primary/30">
              <PaperCardHeader className="text-center">
                <Stamp variant="primary" className="mb-2">
                  Mission Briefing
                </Stamp>
              </PaperCardHeader>
              <PaperCardContent>
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(session.missionBriefing || "") }}
                />
              </PaperCardContent>
            </PaperCard>
          )}

          {/* Act Info for CP – performer a časy vystoupení */}
          {session.personType === "cp" && (
            <PaperCard>
              <PaperCardHeader>
                <PaperCardTitle>Informace o vystoupení</PaperCardTitle>
              </PaperCardHeader>
              <PaperCardContent className="space-y-2">
                {((session.performer ?? session.groupName) || session.performanceTimes) && (
                  <>
                    {(session.performer ?? session.groupName) && (
                      <p>
                        <span className="font-medium text-foreground">Performer:</span>{" "}
                        <span className="text-muted-foreground">
                          {session.performer ?? session.groupName}
                        </span>
                      </p>
                    )}
                    {session.performanceTimes && (
                      <p>
                        <span className="font-medium text-foreground">Časy vystoupení:</span>{" "}
                        <span className="text-muted-foreground">{session.performanceTimes}</span>
                      </p>
                    )}
                  </>
                )}
                <p className="text-muted-foreground text-sm">
                  Jako CP máte přístup ke všem dokumentům včetně harmonogramu.
                </p>
              </PaperCardContent>
            </PaperCard>
          )}

          {/* Sekce Platba – účet, cena, splatnost, QR kód; upozornění pokud neuhrazeno */}
          {(session.runPaymentAccount || session.runPaymentAmount || session.runPaymentDueDate) && (
            <PaperCard className={session.personPaidAt ? "" : "border-2 border-amber-500/50"}>
              <PaperCardHeader>
                <PaperCardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Platba za LARP
                  {!session.personPaidAt && (
                    <span className="inline-flex items-center gap-1.5 rounded bg-amber-500/20 px-2 py-0.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4" />
                      Neuhrazeno
                    </span>
                  )}
                </PaperCardTitle>
              </PaperCardHeader>
              <PaperCardContent className="space-y-4">
                {session.runPaymentAccount && (
                  <p>
                    <span className="font-medium text-foreground">Účet:</span>{" "}
                    <span className="font-mono text-muted-foreground break-all">{session.runPaymentAccount}</span>
                  </p>
                )}
                {session.runPaymentAmount && (
                  <p>
                    <span className="font-medium text-foreground">Částka:</span>{" "}
                    <span className="text-muted-foreground">{session.runPaymentAmount}</span>
                  </p>
                )}
                {session.runPaymentDueDate && (
                  <p>
                    <span className="font-medium text-foreground">Splatnost:</span>{" "}
                    <span className="text-muted-foreground">
                      {new Date(session.runPaymentDueDate).toLocaleDateString("cs-CZ", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                )}
                {session.runPaymentAccount && (
                  <div className="flex flex-col items-start gap-2">
                    <span className="text-sm font-medium text-foreground">QR kód pro platbu</span>
                    <div className="rounded border border-border bg-white p-3 dark:bg-white">
                      <QRCodeSVG
                        value={buildSpayd(
                          session.runPaymentAccount,
                          session.runPaymentAmount,
                          session.runPaymentDueDate
                        )}
                        size={180}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Naskenujte QR kód v aplikaci své banky pro rychlou platbu.
                    </p>
                  </div>
                )}
              </PaperCardContent>
            </PaperCard>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Dokumenty v rozbalovacích sekcích (accordion) – přehlednost na mobilu, „Otevřít vše pro tisk“ */}
              {documents.length > 0 ? (
                <Accordion
                  type="multiple"
                  value={accordionOpen}
                  onValueChange={setAccordionOpen}
                  className="w-full"
                >
                  {groupedDocs.organizacni.length > 0 && (
                    <AccordionItem value="organizacni">
                      <AccordionTrigger className="font-typewriter text-lg">
                        <span className="flex items-center gap-3">
                          <DocBadge type="organizacni" />
                          Organizační dokumenty
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          {groupedDocs.organizacni.map((doc) => (
                            <PaperCard key={doc.id} data-category="organizacni">
                              <PaperCardHeader>
                                <PaperCardTitle className="text-lg">{doc.title}</PaperCardTitle>
                              </PaperCardHeader>
                              <PaperCardContent>
                                <div
                                  className="prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content || "") }}
                                />
                              </PaperCardContent>
                            </PaperCard>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {groupedDocs.herni.length > 0 && (
                    <AccordionItem value="herni">
                      <AccordionTrigger className="font-typewriter text-lg">
                        <span className="flex items-center gap-3">
                          <DocBadge type="herni" />
                          Herní dokumenty
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          {groupedDocs.herni.map((doc) => (
                            <PaperCard key={doc.id} data-category="herni">
                              <PaperCardHeader>
                                <PaperCardTitle className="text-lg">{doc.title}</PaperCardTitle>
                              </PaperCardHeader>
                              <PaperCardContent>
                                <div
                                  className="prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content || "") }}
                                />
                              </PaperCardContent>
                            </PaperCard>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {groupedDocs.osobni.length > 0 && (
                    <AccordionItem value="osobni">
                      <AccordionTrigger className="font-typewriter text-lg">
                        <span className="flex items-center gap-3">
                          <DocBadge type="postava" />
                          Osobní dokumenty
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          {groupedDocs.osobni.map((doc) => (
                            <PaperCard key={doc.id} data-category="osobni">
                              <PaperCardHeader>
                                <div className="flex items-center justify-between">
                                  <PaperCardTitle className="text-lg">{doc.title}</PaperCardTitle>
                                  {doc.doc_type === "medailonek" && <DocBadge type="medailonek" />}
                                </div>
                              </PaperCardHeader>
                              <PaperCardContent>
                                <div
                                  className="prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content || "") }}
                                />
                              </PaperCardContent>
                            </PaperCard>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {session.personType === "cp" && groupedDocs.cp.length > 0 && (
                    <AccordionItem value="cp">
                      <AccordionTrigger className="font-typewriter text-lg">
                        <span className="flex items-center gap-3">
                          <DocBadge type="cp" />
                          CP dokumenty
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          {groupedDocs.cp.map((doc) => (
                            <PaperCard key={doc.id} data-category="cp">
                              <PaperCardHeader>
                                <PaperCardTitle className="text-lg">{doc.title}</PaperCardTitle>
                              </PaperCardHeader>
                              <PaperCardContent>
                                <div
                                  className="prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content || "") }}
                                />
                              </PaperCardContent>
                            </PaperCard>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              ) : (
                <PaperCard>
                  <PaperCardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      Zatím pro vás nejsou k dispozici žádné dokumenty.
                    </p>
                  </PaperCardContent>
                </PaperCard>
              )}

              {/* Zápatí – kontakt a poznámka z konfigurace běhu */}
              {(session.runContact || session.runFooterText) && (
                <footer className="mt-12 pt-6 border-t border-border text-sm text-muted-foreground space-y-1">
                  {session.runContact && (
                    <p><span className="font-medium text-foreground">Kontakt:</span> {session.runContact}</p>
                  )}
                  {session.runFooterText && (
                    <p className="whitespace-pre-wrap">{session.runFooterText}</p>
                  )}
                </footer>
              )}
            </>
          )}
        </div>
      </main>

      {/* Print actions */}
      <div className="no-print fixed bottom-4 right-4">
        <div className="bg-card border border-border rounded-lg shadow-lg p-2 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handlePrint("organizacni")}>
            Tisk org.
          </Button>
          <Button size="sm" variant="outline" onClick={() => handlePrint("herni")}>
            Tisk herní
          </Button>
          <Button size="sm" variant="outline" onClick={() => handlePrint("osobni")}>
            Tisk osobní
          </Button>
          <Button size="sm" onClick={() => handlePrint()}>
            Tisk vše
          </Button>
        </div>
      </div>
    </div>
  );
}
