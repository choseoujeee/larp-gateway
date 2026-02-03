/**
 * Pomocné funkce pro mapování cílení dokumentů mezi UI (6 možností) a DB (target_type, target_group, target_person_id, visible_to_cp).
 */

import { DOCUMENT_TARGET_OPTIONS, type DocumentTargetOptionKey } from "./constants";

export interface DocumentTargetFields {
  target_type: "vsichni" | "skupina" | "osoba";
  target_group: string | null;
  target_person_id: string | null;
  visible_to_cp?: boolean;
}

export interface PersonForTarget {
  id: string;
  name: string;
  group_name: string | null;
  type: string;
}

/**
 * Vrátí klíč z DOCUMENT_TARGET_OPTIONS podle uložených polí dokumentu.
 * Používá se pro hodnotu Selectu v editoru a pro inicializaci formuláře.
 */
export function getDocumentTargetOptionKey(
  doc: DocumentTargetFields,
  persons: PersonForTarget[]
): DocumentTargetOptionKey {
  if (doc.target_type === "vsichni") {
    return doc.visible_to_cp ? "vsichni_cp" : "vsichni";
  }
  if (doc.target_type === "skupina") {
    return doc.target_group === "CP" ? "skupina_cp" : "skupina";
  }
  if (doc.target_type === "osoba" && doc.target_person_id) {
    const person = persons.find((p) => p.id === doc.target_person_id);
    return person?.type === "cp" ? "osoba_cp" : "osoba_postava";
  }
  return "vsichni";
}

/**
 * Vrátí český popisek cílení pro zobrazení v listu dokumentů.
 */
export function getDocumentTargetLabel(
  doc: DocumentTargetFields,
  persons: PersonForTarget[]
): string {
  if (doc.target_type === "vsichni") {
    return doc.visible_to_cp
      ? DOCUMENT_TARGET_OPTIONS.vsichni_cp.label
      : DOCUMENT_TARGET_OPTIONS.vsichni.label;
  }
  if (doc.target_type === "skupina") {
    if (doc.target_group === "CP") return DOCUMENT_TARGET_OPTIONS.skupina_cp.label;
    return doc.target_group
      ? `${DOCUMENT_TARGET_OPTIONS.skupina.label}: ${doc.target_group}`
      : DOCUMENT_TARGET_OPTIONS.skupina.label;
  }
  if (doc.target_type === "osoba" && doc.target_person_id) {
    const person = persons.find((p) => p.id === doc.target_person_id);
    const name = person?.name ?? "?";
    const option =
      person?.type === "cp"
        ? DOCUMENT_TARGET_OPTIONS.osoba_cp.label
        : DOCUMENT_TARGET_OPTIONS.osoba_postava.label;
    return `${option}: ${name}`;
  }
  return DOCUMENT_TARGET_OPTIONS.vsichni.label;
}

/**
 * Vrátí krátký popisek cílení bez jména – pro stránku /admin/dokumenty,
 * kde je příjemce zobrazen v názvu dokumentu („Životopis - Jan Kubiš“).
 */
export function getDocumentTargetLabelShort(
  doc: DocumentTargetFields,
  persons: PersonForTarget[]
): string {
  if (doc.target_type === "osoba" && doc.target_person_id) {
    const person = persons.find((p) => p.id === doc.target_person_id);
    return person?.type === "cp"
      ? DOCUMENT_TARGET_OPTIONS.osoba_cp.label
      : DOCUMENT_TARGET_OPTIONS.osoba_postava.label;
  }
  return getDocumentTargetLabel(doc, persons);
}

/**
 * Nastaví formData (target_type, target_group, target_person_id, visible_to_cp) podle zvolené UI možnosti.
 * Pro skupina/osoba_postava/osoba_cp ponechá stávající target_group/target_person_id, pokud odpovídají typu.
 */
export function applyTargetOptionToForm(
  option: DocumentTargetOptionKey,
  current: DocumentTargetFields,
  persons: PersonForTarget[]
): Partial<DocumentTargetFields> {
  switch (option) {
    case "vsichni":
      return {
        target_type: "vsichni",
        target_group: null,
        target_person_id: null,
        visible_to_cp: false,
      };
    case "vsichni_cp":
      return {
        target_type: "vsichni",
        target_group: null,
        target_person_id: null,
        visible_to_cp: true,
      };
    case "skupina_cp":
      return {
        target_type: "skupina",
        target_group: "CP",
        target_person_id: null,
        visible_to_cp: false,
      };
    case "skupina":
      return {
        target_type: "skupina",
        target_group: current.target_type === "skupina" && current.target_group && current.target_group !== "CP" ? current.target_group : "",
        target_person_id: null,
        visible_to_cp: false,
      };
    case "osoba_postava": {
      const postavy = persons.filter((p) => p.type === "postava");
      const keep =
        current.target_type === "osoba" &&
        postavy.some((p) => p.id === current.target_person_id);
      return {
        target_type: "osoba",
        target_group: null,
        target_person_id: keep ? current.target_person_id : postavy[0]?.id ?? "",
        visible_to_cp: false,
      };
    }
    case "osoba_cp": {
      const cps = persons.filter((p) => p.type === "cp");
      const keep =
        current.target_type === "osoba" &&
        cps.some((p) => p.id === current.target_person_id);
      return {
        target_type: "osoba",
        target_group: null,
        target_person_id: keep ? current.target_person_id : cps[0]?.id ?? "",
        visible_to_cp: false,
      };
    }
    default:
      return {};
  }
}
