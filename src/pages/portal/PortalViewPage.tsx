import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Printer, LogOut, Loader2, FoldVertical, CreditCard, CheckCircle, Clock, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePortalSession } from "@/hooks/usePortalSession";
import { supabase } from "@/integrations/supabase/client";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { sanitizeHtml } from "@/lib/sanitize";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";

interface Document {
  id: string;
  title: string;
  content: string | null;
  doc_type: keyof typeof DOCUMENT_TYPES;
  target_type: string;
  sort_order: number;
  priority: number; // 1 = prioritní, 2 = normální, 3 = volitelné
}

export default function PortalViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { session, loading: sessionLoading, clearSession } = usePortalSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track open categories and open documents separately
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [openDocuments, setOpenDocuments] = useState<Set<string>>(new Set());
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

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

  // Group documents by type - exclude medailonek since it's now on person
  const groupedDocs = useMemo(() => ({
    organizacni: documents.filter((d) => d.doc_type === "organizacni"),
    herni: documents.filter((d) => d.doc_type === "herni"),
    osobni: documents.filter((d) => d.doc_type === "postava"),
    cp: documents.filter((d) => d.doc_type === "cp"),
  }), [documents]);

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleDocument = (docId: string) => {
    setOpenDocuments(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const collapseAllDocuments = () => {
    setOpenDocuments(new Set());
  };

  const handlePrint = () => {
    // Open all categories and documents for print
    const allCategories = new Set(["organizacni", "herni", "osobni", "cp"]);
    const allDocIds = new Set(documents.map(d => d.id));
    setOpenCategories(allCategories);
    setOpenDocuments(allDocIds);
    setTimeout(() => window.print(), 100);
  };

  const handleLogout = () => {
    clearSession();
    navigate(`/hrac/${slug}`);
  };

  // Format date range
  const formatDateRange = (from: string | null, to: string | null) => {
    if (!from) return null;
    const fromDate = new Date(from);
    const toDate = to ? new Date(to) : null;
    
    if (toDate) {
      return `${format(fromDate, "d.", { locale: cs })} – ${format(toDate, "d. MMMM yyyy", { locale: cs })}`;
    }
    return format(fromDate, "d. MMMM yyyy", { locale: cs });
  };

  if (sessionLoading || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAnyOpenDocuments = openDocuments.size > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header - LARP name and motto */}
      <header className="py-8 px-4 text-center border-b border-border">
        <h1 className="font-typewriter text-4xl md:text-5xl tracking-widest text-foreground uppercase mb-2">
          {session.larpName}
        </h1>
        {session.larpMotto && (
          <p className="text-muted-foreground italic text-lg max-w-2xl mx-auto">
            „{session.larpMotto}"
          </p>
        )}
        
        {/* Quick actions */}
        <div className="flex items-center justify-center gap-2 mt-6 no-print">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Tisk
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Odhlásit
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Character Card */}
          <PaperCard>
            <PaperCardContent className="py-6">
              <div className="text-center space-y-3">
                <h2 className="font-typewriter text-2xl md:text-3xl tracking-wide text-foreground">
                  {session.personName}
                </h2>
                {session.groupName && (
                  <Badge variant="secondary" className="uppercase tracking-wider text-xs px-3 py-1">
                    {session.groupName}
                  </Badge>
                )}
                {session.medailonek && (
                  <div 
                    className="prose prose-sm max-w-none text-muted-foreground mt-4 text-left [&_h1]:mt-6 [&_h1]:mb-3 [&_h1:first-child]:mt-0 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2:first-child]:mt-0 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3:first-child]:mt-0 [&_p]:mb-3 [&_p:last-child]:mb-0"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(session.medailonek) }}
                  />
                )}
              </div>
            </PaperCardContent>
          </PaperCard>

          {/* Mission Briefing - only if run data exists */}
          {(session.runName || session.runLocation || session.missionBriefing) && (
            <PaperCard>
              <PaperCardHeader>
                <PaperCardTitle className="font-typewriter tracking-wider uppercase">
                  Mission Briefing
                </PaperCardTitle>
              </PaperCardHeader>
              <PaperCardContent className="space-y-2 text-sm">
                <div className="grid gap-2">
                  <div className="flex">
                    <span className="font-semibold w-24 text-foreground">Operation:</span>
                    <span className="text-muted-foreground">{session.larpName}</span>
                  </div>
                  {session.runName && (
                    <div className="flex">
                      <span className="font-semibold w-24 text-foreground">Run:</span>
                      <span className="text-muted-foreground">{session.runName}</span>
                    </div>
                  )}
                  {(session.runDateFrom || session.runDateTo) && (
                    <div className="flex">
                      <span className="font-semibold w-24 text-foreground">Datum:</span>
                      <span className="text-muted-foreground">
                        {formatDateRange(session.runDateFrom, session.runDateTo)}
                      </span>
                    </div>
                  )}
                  {session.runLocation && (
                    <div className="flex">
                      <span className="font-semibold w-24 text-foreground">Lokace:</span>
                      <span className="text-muted-foreground">{session.runLocation}</span>
                    </div>
                  )}
                  {session.runAddress && (
                    <div className="flex">
                      <span className="font-semibold w-24 text-foreground">Adresa:</span>
                      <span className="text-muted-foreground">{session.runAddress}</span>
                    </div>
                  )}
                </div>
                {session.missionBriefing && (
                  <div 
                    className="prose prose-sm max-w-none text-muted-foreground mt-4 pt-4 border-t border-border whitespace-pre-line [&_h1]:mt-6 [&_h1]:mb-3 [&_h1:first-child]:mt-0 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2:first-child]:mt-0 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3:first-child]:mt-0 [&_p]:mb-3 [&_p:last-child]:mb-0"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(session.missionBriefing) }}
                  />
                )}
                
                {/* Payment info button */}
                {session.personType === "postava" && session.runPaymentAccount && (
                  <div className="mt-4 pt-4 border-t border-border no-print">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowQrCode(false);
                        setPaymentDialogOpen(true);
                      }}
                      className="btn-vintage"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Informace o platbě
                    </Button>
                  </div>
                )}
              </PaperCardContent>
            </PaperCard>
          )}

          {/* CP Info */}
          {session.personType === "cp" && (session.performer || session.performanceTimes) && (
            <PaperCard>
              <PaperCardHeader>
                <PaperCardTitle className="font-typewriter tracking-wider uppercase">
                  Informace o vystoupení
                </PaperCardTitle>
              </PaperCardHeader>
              <PaperCardContent className="space-y-2 text-sm">
                {session.performer && (
                  <div className="flex">
                    <span className="font-semibold w-24 text-foreground">Performer:</span>
                    <span className="text-muted-foreground">{session.performer}</span>
                  </div>
                )}
                {session.performanceTimes && (
                  <div className="flex">
                    <span className="font-semibold w-24 text-foreground">Časy:</span>
                    <span className="text-muted-foreground">{session.performanceTimes}</span>
                  </div>
                )}
              </PaperCardContent>
            </PaperCard>
          )}

          {/* Documents Section Title */}
          {!loading && documents.length > 0 && (
            <div className="pt-4">
              <h2 className="font-typewriter text-xl tracking-wider uppercase text-foreground mb-4">
                Dokumenty
              </h2>
            </div>
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
            <div className="space-y-4">
              {/* Organizační dokumenty */}
              {groupedDocs.organizacni.length > 0 && (
                <DocumentCategory
                  title="Organizační"
                  count={groupedDocs.organizacni.length}
                  documents={groupedDocs.organizacni}
                  isOpen={openCategories.has("organizacni")}
                  onToggle={() => toggleCategory("organizacni")}
                  openDocuments={openDocuments}
                  onToggleDocument={toggleDocument}
                />
              )}

              {/* Herní dokumenty */}
              {groupedDocs.herni.length > 0 && (
                <DocumentCategory
                  title="Herní"
                  count={groupedDocs.herni.length}
                  documents={groupedDocs.herni}
                  isOpen={openCategories.has("herni")}
                  onToggle={() => toggleCategory("herni")}
                  openDocuments={openDocuments}
                  onToggleDocument={toggleDocument}
                />
              )}

              {/* Osobní dokumenty (bez medailonku - ten je v kartě postavy) */}
              {groupedDocs.osobni.filter(d => d.doc_type !== "medailonek").length > 0 && (
                <DocumentCategory
                  title="Osobní"
                  count={groupedDocs.osobni.filter(d => d.doc_type !== "medailonek").length}
                  documents={groupedDocs.osobni.filter(d => d.doc_type !== "medailonek")}
                  isOpen={openCategories.has("osobni")}
                  onToggle={() => toggleCategory("osobni")}
                  openDocuments={openDocuments}
                  onToggleDocument={toggleDocument}
                />
              )}

              {/* CP dokumenty - pouze pro CP */}
              {session.personType === "cp" && groupedDocs.cp.length > 0 && (
                <DocumentCategory
                  title="CP materiály"
                  count={groupedDocs.cp.length}
                  documents={groupedDocs.cp}
                  isOpen={openCategories.has("cp")}
                  onToggle={() => toggleCategory("cp")}
                  openDocuments={openDocuments}
                  onToggleDocument={toggleDocument}
                />
              )}
            </div>
          )}

          {/* Collapse All Button */}
          {hasAnyOpenDocuments && (
            <div className="text-center pt-4 no-print">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={collapseAllDocuments}
                className="btn-vintage"
              >
                <FoldVertical className="h-4 w-4 mr-2" />
                Sbalit vše
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="no-print container mx-auto px-4 py-8 text-center text-sm text-muted-foreground border-t border-border">
        {session.runFooterText ? (
          <p className="whitespace-pre-line">{session.runFooterText}</p>
        ) : (
          <p>Kliknutím na název dokumentu rozbalíte jeho obsah.</p>
        )}
      </footer>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="paper-card max-w-md">
          <DialogHeader>
            <DialogTitle className="font-typewriter tracking-wider uppercase flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Informace o platbě
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {session.runPaymentAccount && (
              <div className="flex">
                <span className="font-semibold w-28 text-foreground">Účet:</span>
                <span className="text-muted-foreground font-mono">{session.runPaymentAccount}</span>
              </div>
            )}
            {session.runPaymentAmount && (
              <div className="flex">
                <span className="font-semibold w-28 text-foreground">Částka:</span>
                <span className="text-muted-foreground">{session.runPaymentAmount}</span>
              </div>
            )}
            {session.runPaymentDueDate && (
              <div className="flex">
                <span className="font-semibold w-28 text-foreground">Splatnost:</span>
                <span className="text-muted-foreground">
                  {format(new Date(session.runPaymentDueDate), "d. MMMM yyyy", { locale: cs })}
                </span>
              </div>
            )}
            
            <div className="border-t border-border pt-4 mt-4">
              {session.personPaidAt ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Máš zaplaceno</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Ještě neevidujeme tvou platbu</span>
                </div>
              )}
            </div>
            
            {!showQrCode && session.runPaymentAccount && session.runPaymentAmount && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQrCode(true)}
                  className="btn-vintage w-full"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Vygenerovat QR kód
                </Button>
              </div>
            )}
            
            {showQrCode && session.runPaymentAccount && (
              <div className="flex flex-col items-center gap-2 pt-2">
                <QRCodeSVG
                  value={generateQrPaymentString(
                    session.runPaymentAccount,
                    session.runPaymentAmount || "",
                    session.playerName || session.personName,
                    session.runName || ""
                  )}
                  size={180}
                  level="M"
                  includeMargin
                />
                <p className="text-xs text-muted-foreground">Naskenuj v bankovní aplikaci</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 
 * Generate SPAYD QR payment string
 * @param account - Czech account in format "123456789/0800" or "000000-123456789/0800" or IBAN
 * @param amount - Amount string like "1500 Kč" or "1500"
 * @param playerName - Player's real name
 * @param runName - Name of the run
 */
function generateQrPaymentString(account: string, amount: string, playerName: string, runName: string): string {
  // Parse amount - extract numeric value
  const numericAmount = amount.replace(/[^\d.,]/g, "").replace(",", ".");
  
  // Convert Czech account format to IBAN
  // Format: prefix-account/bank or account/bank
  const accountMatch = account.match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/);
  
  let iban: string;
  if (accountMatch) {
    // Czech account format - convert to IBAN
    const prefix = accountMatch[1] || "";
    const accountNum = accountMatch[2];
    const bankCode = accountMatch[3];
    
    // IBAN format: CZ + 2 check digits + bank code (4) + prefix (6, padded) + account (10, padded)
    const prefixPadded = prefix.padStart(6, "0");
    const accountPadded = accountNum.padStart(10, "0");
    const bban = bankCode + prefixPadded + accountPadded;
    
    // Calculate check digits (simplified - move CZ00 to end, convert letters, mod 97)
    const numericBban = bban + "123500"; // CZ = 12 35, 00 for initial check
    const checkDigits = 98n - (BigInt(numericBban) % 97n);
    iban = `CZ${checkDigits.toString().padStart(2, "0")}${bban}`;
  } else if (account.match(/^CZ\d{22}$/i)) {
    // Already IBAN format
    iban = account.toUpperCase();
  } else {
    // Unknown format - try to use as-is
    iban = `CZ${account.replace(/[^0-9]/g, "").padStart(22, "0")}`;
  }
  
  // SPAYD format for Czech payment QR codes
  const parts = [
    "SPD*1.0",
    `ACC:${iban}`,
  ];
  
  if (numericAmount) {
    parts.push(`AM:${numericAmount}`);
    parts.push("CC:CZK");
  }
  
  // Message: Player name + Run name
  const message = [playerName, runName].filter(Boolean).join(" - ");
  if (message) {
    // Truncate to 60 chars, remove special characters that break SPAYD
    const sanitizedMsg = message.substring(0, 60).replace(/[*]/g, "");
    parts.push(`MSG:${sanitizedMsg}`);
  }
  
  return parts.join("*");
}

// Separate component for document category
interface DocumentCategoryProps {
  title: string;
  count: number;
  documents: Document[];
  isOpen: boolean;
  onToggle: () => void;
  openDocuments: Set<string>;
  onToggleDocument: (docId: string) => void;
}

function DocumentCategory({
  title,
  count,
  documents,
  isOpen,
  onToggle,
  openDocuments,
  onToggleDocument,
}: DocumentCategoryProps) {
  return (
    <PaperCard>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <ChevronRight 
                className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} 
              />
              <span className="font-typewriter text-lg tracking-wide uppercase">
                {title}
              </span>
              <span className="text-sm text-muted-foreground">({count})</span>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-4 space-y-1">
            {documents.map((doc) => (
              <DocumentItem
                key={doc.id}
                document={doc}
                isOpen={openDocuments.has(doc.id)}
                onToggle={() => onToggleDocument(doc.id)}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </PaperCard>
  );
}

// Separate component for individual document
interface DocumentItemProps {
  document: Document;
  isOpen: boolean;
  onToggle: () => void;
}

function DocumentItem({ document, isOpen, onToggle }: DocumentItemProps) {
  const isPriority = document.priority === 1;
  const isOptional = document.priority === 3;
  
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left py-2 px-3 rounded hover:bg-muted/50 transition-colors flex items-center gap-2">
          <ChevronRight 
            className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? "rotate-90" : ""}`} 
          />
          <span className="font-medium text-foreground">{document.title}</span>
          {isPriority && (
            <span className="text-xs font-bold text-accent uppercase tracking-wider">[PRIORITNÍ]</span>
          )}
          {isOptional && (
            <span className="text-xs text-muted-foreground uppercase tracking-wider">[VOLITELNÉ]</span>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 pl-3 border-l-2 border-border py-3">
          {document.content && (
            <div
              className="prose prose-sm max-w-none text-muted-foreground [&_h1]:mt-6 [&_h1]:mb-3 [&_h1:first-child]:mt-0 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2:first-child]:mt-0 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3:first-child]:mt-0 [&_p]:mb-3 [&_p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(document.content) }}
            />
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="mt-4 text-xs uppercase tracking-wider no-print"
          >
            Sbalit dokument
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
