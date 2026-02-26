import { sanitizeHtml } from "@/lib/sanitize";
import { toast } from "sonner";

/**
 * Sestaví HTML string z pole dokumentů s nadpisy.
 */
export function buildDocumentsHtml(
  docs: { title: string; content: string | null }[],
  sectionTitle?: string
): string {
  const parts: string[] = [];
  if (sectionTitle) {
    parts.push(`<h1 style="font-size:22px;margin-bottom:16px;border-bottom:2px solid #333;padding-bottom:8px;">${sectionTitle}</h1>`);
  }
  for (const doc of docs) {
    parts.push(`<h2 style="font-size:17px;margin-top:24px;margin-bottom:8px;">${doc.title}</h2>`);
    if (doc.content) {
      parts.push(`<div>${sanitizeHtml(doc.content)}</div>`);
    }
    parts.push(`<hr style="margin:20px 0;border:none;border-top:1px solid #ccc;"/>`);
  }
  return parts.join("\n");
}

/**
 * Sestaví HTML string z CP scén.
 */
export function buildScenesHtml(
  scenes: { title: string | null; day_number: number; start_time: string; duration_minutes: number; location: string | null; props: string | null; description: string | null }[],
  sectionTitle?: string
): string {
  const parts: string[] = [];
  if (sectionTitle) {
    parts.push(`<h1 style="font-size:22px;margin-bottom:16px;border-bottom:2px solid #333;padding-bottom:8px;">${sectionTitle}</h1>`);
  }
  for (const scene of scenes) {
    const heading = scene.title?.trim() || `Den ${scene.day_number} ${scene.start_time.substring(0, 5)}`;
    parts.push(`<h2 style="font-size:17px;margin-top:20px;margin-bottom:6px;">${heading}</h2>`);
    parts.push(`<p style="margin:4px 0;color:#555;">Den ${scene.day_number} · ${scene.start_time.substring(0, 5)} · ${scene.duration_minutes} min</p>`);
    if (scene.location) {
      parts.push(`<p style="margin:4px 0;color:#555;">📍 ${scene.location}</p>`);
    }
    if (scene.props) {
      parts.push(`<p style="margin:4px 0;color:#555;">🎭 Rekvizity: ${scene.props}</p>`);
    }
    if (scene.description) {
      const desc = scene.description.startsWith("<") ? scene.description : scene.description.replace(/\n/g, "<br/>");
      parts.push(`<div style="margin-top:8px;">${sanitizeHtml(desc)}</div>`);
    }
    parts.push(`<hr style="margin:16px 0;border:none;border-top:1px solid #ccc;"/>`);
  }
  return parts.join("\n");
}

/**
 * Generuje PDF ze zadaného HTML obsahu a stáhne ho.
 */
export async function generatePdf(
  htmlContent: string,
  filename: string,
  title?: string
): Promise<void> {
  const toastId = toast.loading("Generuji PDF…");

  try {
    // Dynamic import html2pdf.js
    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default;

    // Kontejner musí být ve viewportu, jinak html2canvas vykreslí prázdný obsah (off-screen = blank).
    // Skryjeme ho vizuálně: fixed, opacity 0, z-index -1, pointer-events none.
    const container = document.createElement("div");
    container.style.cssText =
      "position:fixed;left:0;top:0;width:210mm;max-width:100%;font-family:Georgia,serif;font-size:14px;line-height:1.6;color:#000;background:#fff;padding:20px;pointer-events:none;z-index:9999;";

    if (title) {
      const h1 = document.createElement("h1");
      h1.style.cssText = "font-size:24px;margin-bottom:20px;text-align:center;border-bottom:2px solid #333;padding-bottom:12px;";
      h1.textContent = title;
      container.appendChild(h1);
    }

    const content = document.createElement("div");
    content.innerHTML = htmlContent;
    container.appendChild(content);

    document.body.appendChild(container);

    const safeName = filename
      .replace(/[^a-zA-Z0-9áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ _-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 80);

    await (html2pdf() as any)
      .from(container)
      .set({
        margin: [15, 15, 15, 15],
        filename: `${safeName}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css"] },
      } as any)
      .save();

    document.body.removeChild(container);
    toast.success("PDF staženo", { id: toastId });
  } catch (err) {
    console.error("PDF generation error:", err);
    toast.error("Chyba při generování PDF", { id: toastId });
  }
}
