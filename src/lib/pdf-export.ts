import { sanitizeHtml } from "@/lib/sanitize";

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
 * Generuje PDF ze zadaného HTML obsahu pomocí skrytého iframe + nativního print dialogu.
 * Uživatel v dialogu zvolí "Uložit jako PDF".
 */
export function generatePdf(
  htmlContent: string,
  filename: string,
  title?: string
): void {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${filename}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 14px;
      line-height: 1.6;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 15mm;
    }
    h1 { font-size: 22px; margin: 0 0 16px; border-bottom: 2px solid #333; padding-bottom: 8px; }
    h2 { font-size: 17px; margin: 24px 0 8px; }
    h3 { font-size: 15px; margin: 20px 0 6px; }
    p { margin: 0 0 8px; }
    hr { border: none; border-top: 1px solid #ccc; margin: 20px 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    img { max-width: 100%; height: auto; }
    a { color: #333; text-decoration: underline; }
    blockquote { border-left: 3px solid #ccc; margin: 12px 0; padding: 8px 16px; color: #555; }
    ul, ol { padding-left: 24px; }
    .page-title { font-size: 24px; text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 24px; }
    h1, h2, h3 { page-break-after: avoid; }
    .doc-section { page-break-inside: avoid; }
  </style>
</head>
<body>
  ${title ? `<div class="page-title">${title}</div>` : ""}
  ${htmlContent}
</body>
</html>`);
  doc.close();

  iframe.contentWindow!.onafterprint = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };

  setTimeout(() => {
    iframe.contentWindow!.print();
    // Fallback cleanup po 60s pokud onafterprint nefunguje
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 60000);
  }, 300);
}
