import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("vrátí prázdný řetězec pro prázdný vstup", () => {
    expect(sanitizeHtml("")).toBe("");
    expect(sanitizeHtml(null as unknown as string)).toBe("");
    expect(sanitizeHtml(undefined as unknown as string)).toBe("");
  });

  it("vrátí prázdný řetězec pro ne-string vstup", () => {
    expect(sanitizeHtml(123 as unknown as string)).toBe("");
  });

  it("ponechá bezpečné HTML (odstavce, tučné, odkazy)", () => {
    const input = '<p>Text <strong>tučný</strong> a <a href="https://example.com">odkaz</a>.</p>';
    const out = sanitizeHtml(input);
    expect(out).toContain("<p>");
    expect(out).toContain("</p>");
    expect(out).toContain("<strong>");
    expect(out).toContain("<a ");
    expect(out).toContain('href="https://example.com"');
    expect(out).not.toContain("<script>");
  });

  it("odstraní script a nebezpečné tagy", () => {
    const input = '<p>OK</p><script>alert("xss")</script><p>druhý</p>';
    const out = sanitizeHtml(input);
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("alert");
    expect(out).toContain("<p>");
  });

  it("odstraní onclick a jiné nebezpečné atributy", () => {
    const input = '<p onclick="alert(1)">Klik</p>';
    const out = sanitizeHtml(input);
    expect(out).not.toContain("onclick");
    expect(out).toContain("<p>");
  });

  it("ponechá povolené atributy u odkazu (href, target, rel)", () => {
    const input = '<a href="https://a.cz" target="_blank" rel="noopener">Link</a>';
    const out = sanitizeHtml(input);
    expect(out).toContain('href="https://a.cz"');
    expect(out).toContain('target="_blank"');
  });
});
