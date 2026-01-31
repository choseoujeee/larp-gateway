import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileText, Printer, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { DocBadge } from "@/components/ui/doc-badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePortalSession } from "@/hooks/usePortalSession";
import { supabase } from "@/integrations/supabase/client";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { sanitizeHtml } from "@/lib/sanitize";

/** Id sekcí accordionu podle typu dokumentů */
const DOC_SECTION_IDS = ["organizacni", "herni", "osobni", "cp"] as const;

interface Document {
  id: string;
  title: string;
  content: string | null;
  doc_type: keyof typeof DOCUMENT_TYPES;
  target_type: string;
  sort_order: number;
}

export default function PortalViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { session, loading: sessionLoading, clearSession } = usePortalSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  /** Otevřené sekce accordionu (pro „Otevřít vše pro tisk") */
  const [accordionOpen, setAccordionOpen] = useState<string[]>([]);

  useEffect(() => {
    if (!sessionLoading && !session) {
      navigate(`/hrac/${slug}`);
    }
  }, [session, sessionLoading, slug, navigate]);

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

  /** Id sekcí, které mají alespoň jeden dokument (pro výchozí otevření a „Otevřít vše pro tisk") */
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
    if (category) {
      document.body.dataset.printCategory = category;
    }
    window.print();
    delete document.body.dataset.printCategory;
  };

  const handleLogout = () => {
    clearSession();
    navigate(`/hrac/${slug}`);
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
                  {session.personName}
                  {session.groupName && ` • ${session.groupName}`}
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
          {/* Act Info for CP – performer a časy vystoupení */}
          {session.personType === "cp" && (session.performer || session.groupName || session.performanceTimes) && (
            <PaperCard>
              <PaperCardHeader>
                <PaperCardTitle>Informace o vystoupení</PaperCardTitle>
              </PaperCardHeader>
              <PaperCardContent className="space-y-2">
                {(session.performer || session.groupName) && (
                  <p>
                    <span className="font-medium text-foreground">Performer:</span>{" "}
                    <span className="text-muted-foreground">
                      {session.performer || session.groupName}
                    </span>
                  </p>
                )}
                {session.performanceTimes && (
                  <p>
                    <span className="font-medium text-foreground">Časy vystoupení:</span>{" "}
                    <span className="text-muted-foreground">{session.performanceTimes}</span>
                  </p>
                )}
                <p className="text-muted-foreground text-sm">
                  Jako CP máte přístup ke všem dokumentům.
                </p>
              </PaperCardContent>
            </PaperCard>
          )}

          {/* Documents */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <PaperCard>
              <PaperCardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Zatím nejsou k dispozici žádné dokumenty.
                </p>
              </PaperCardContent>
            </PaperCard>
          ) : (
            <Accordion
              type="multiple"
              value={accordionOpen}
              onValueChange={setAccordionOpen}
              className="space-y-4"
            >
              {/* Organizační dokumenty */}
              {groupedDocs.organizacni.length > 0 && (
                <AccordionItem value="organizacni" className="border-none">
                  <PaperCard>
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <DocBadge type="organizacni" />
                        <span className="font-typewriter text-lg">Organizační informace</span>
                        <span className="text-sm text-muted-foreground">
                          ({groupedDocs.organizacni.length})
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-6 pb-6 space-y-6">
                        {groupedDocs.organizacni.map((doc) => (
                          <div key={doc.id} className="space-y-2">
                            <h3 className="font-semibold text-foreground">{doc.title}</h3>
                            {doc.content && (
                              <div
                                className="prose prose-sm max-w-none text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content) }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </PaperCard>
                </AccordionItem>
              )}

              {/* Herní dokumenty */}
              {groupedDocs.herni.length > 0 && (
                <AccordionItem value="herni" className="border-none">
                  <PaperCard>
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <DocBadge type="herni" />
                        <span className="font-typewriter text-lg">Herní materiály</span>
                        <span className="text-sm text-muted-foreground">
                          ({groupedDocs.herni.length})
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-6 pb-6 space-y-6">
                        {groupedDocs.herni.map((doc) => (
                          <div key={doc.id} className="space-y-2">
                            <h3 className="font-semibold text-foreground">{doc.title}</h3>
                            {doc.content && (
                              <div
                                className="prose prose-sm max-w-none text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content) }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </PaperCard>
                </AccordionItem>
              )}

              {/* Osobní dokumenty (postava + medailonek) */}
              {groupedDocs.osobni.length > 0 && (
                <AccordionItem value="osobni" className="border-none">
                  <PaperCard>
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <DocBadge type="postava" />
                        <span className="font-typewriter text-lg">Vaše postava</span>
                        <span className="text-sm text-muted-foreground">
                          ({groupedDocs.osobni.length})
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-6 pb-6 space-y-6">
                        {groupedDocs.osobni.map((doc) => (
                          <div key={doc.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{doc.title}</h3>
                              {doc.doc_type === "medailonek" && (
                                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                  Medailonek
                                </span>
                              )}
                            </div>
                            {doc.content && (
                              <div
                                className="prose prose-sm max-w-none text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content) }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </PaperCard>
                </AccordionItem>
              )}

              {/* CP dokumenty - pouze pro CP */}
              {session.personType === "cp" && groupedDocs.cp.length > 0 && (
                <AccordionItem value="cp" className="border-none">
                  <PaperCard>
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <DocBadge type="cp" />
                        <span className="font-typewriter text-lg">CP materiály</span>
                        <span className="text-sm text-muted-foreground">
                          ({groupedDocs.cp.length})
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-6 pb-6 space-y-6">
                        {groupedDocs.cp.map((doc) => (
                          <div key={doc.id} className="space-y-2">
                            <h3 className="font-semibold text-foreground">{doc.title}</h3>
                            {doc.content && (
                              <div
                                className="prose prose-sm max-w-none text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content) }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </PaperCard>
                </AccordionItem>
              )}
            </Accordion>
          )}
        </div>
      </main>

      {/* Print actions */}
      <div className="no-print container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        <p>Pro tisk jednotlivých kategorií klikněte na „Tisk" v odpovídající sekci.</p>
      </div>
    </div>
  );
}
