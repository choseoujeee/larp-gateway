import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileText, Printer, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { Stamp } from "@/components/ui/stamp";
import { DocBadge } from "@/components/ui/doc-badge";
import { usePortalSession } from "@/hooks/usePortalSession";
import { supabase } from "@/integrations/supabase/client";
import { DOCUMENT_TYPES } from "@/lib/constants";

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

            <div className="flex items-center gap-2">
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
                  dangerouslySetInnerHTML={{ __html: session.missionBriefing }}
                />
              </PaperCardContent>
            </PaperCard>
          )}

          {/* Character info for CP */}
          {session.personType === "cp" && (
            <PaperCard>
              <PaperCardHeader>
                <PaperCardTitle>Informace o vystoupení</PaperCardTitle>
              </PaperCardHeader>
              <PaperCardContent>
                <p className="text-muted-foreground">
                  Jako CP máte přístup ke všem dokumentům včetně harmonogramu.
                </p>
              </PaperCardContent>
            </PaperCard>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Organizational documents */}
              {groupedDocs.organizacni.length > 0 && (
                <section>
                  <h2 className="font-typewriter text-xl mb-4 flex items-center gap-3">
                    <DocBadge type="organizacni" />
                    Organizační dokumenty
                  </h2>
                  <div className="space-y-4">
                    {groupedDocs.organizacni.map((doc) => (
                      <PaperCard key={doc.id} data-category="organizacni">
                        <PaperCardHeader>
                          <PaperCardTitle className="text-lg">{doc.title}</PaperCardTitle>
                        </PaperCardHeader>
                        <PaperCardContent>
                          <div 
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: doc.content || "" }}
                          />
                        </PaperCardContent>
                      </PaperCard>
                    ))}
                  </div>
                </section>
              )}

              {/* Game documents */}
              {groupedDocs.herni.length > 0 && (
                <section>
                  <h2 className="font-typewriter text-xl mb-4 flex items-center gap-3">
                    <DocBadge type="herni" />
                    Herní dokumenty
                  </h2>
                  <div className="space-y-4">
                    {groupedDocs.herni.map((doc) => (
                      <PaperCard key={doc.id} data-category="herni">
                        <PaperCardHeader>
                          <PaperCardTitle className="text-lg">{doc.title}</PaperCardTitle>
                        </PaperCardHeader>
                        <PaperCardContent>
                          <div 
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: doc.content || "" }}
                          />
                        </PaperCardContent>
                      </PaperCard>
                    ))}
                  </div>
                </section>
              )}

              {/* Personal documents */}
              {groupedDocs.osobni.length > 0 && (
                <section>
                  <h2 className="font-typewriter text-xl mb-4 flex items-center gap-3">
                    <DocBadge type="postava" />
                    Osobní dokumenty
                  </h2>
                  <div className="space-y-4">
                    {groupedDocs.osobni.map((doc) => (
                      <PaperCard key={doc.id} data-category="osobni">
                        <PaperCardHeader>
                          <div className="flex items-center justify-between">
                            <PaperCardTitle className="text-lg">{doc.title}</PaperCardTitle>
                            {doc.doc_type === "medailonek" && (
                              <DocBadge type="medailonek" />
                            )}
                          </div>
                        </PaperCardHeader>
                        <PaperCardContent>
                          <div 
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: doc.content || "" }}
                          />
                        </PaperCardContent>
                      </PaperCard>
                    ))}
                  </div>
                </section>
              )}

              {/* CP documents (for CP only) */}
              {session.personType === "cp" && groupedDocs.cp.length > 0 && (
                <section>
                  <h2 className="font-typewriter text-xl mb-4 flex items-center gap-3">
                    <DocBadge type="cp" />
                    CP dokumenty
                  </h2>
                  <div className="space-y-4">
                    {groupedDocs.cp.map((doc) => (
                      <PaperCard key={doc.id} data-category="cp">
                        <PaperCardHeader>
                          <PaperCardTitle className="text-lg">{doc.title}</PaperCardTitle>
                        </PaperCardHeader>
                        <PaperCardContent>
                          <div 
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: doc.content || "" }}
                          />
                        </PaperCardContent>
                      </PaperCard>
                    ))}
                  </div>
                </section>
              )}

              {/* No documents */}
              {documents.length === 0 && (
                <PaperCard>
                  <PaperCardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      Zatím pro vás nejsou k dispozici žádné dokumenty.
                    </p>
                  </PaperCardContent>
                </PaperCard>
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
