import DOMPurify from "dompurify";

/**
 * Sanitizuje HTML před zobrazením (portál, náhled) – odstraňuje skripty a nebezpečné atributy.
 * Povoluje style atribut pro zachování formátování z WYSIWYG editoru.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre",
      "table", "thead", "tbody", "tr", "th", "td", "span", "div", "hr",
      "img", "figure", "figcaption", "mark",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "style", "src", "alt", "width", "height"],
  });
  // Preserve empty paragraphs (TipTap outputs <p></p> for blank lines)
  // Browsers collapse empty <p> tags, so inject a <br> to maintain spacing
  return sanitized.replace(/<p><\/p>/g, "<p><br></p>");
}
