import { describe, it, expect } from "vitest";
import {
  APP_NAME,
  DOCUMENT_TYPES,
  EVENT_TYPES,
  PERSON_TYPES,
  TARGET_TYPES,
  ROUTES,
} from "./constants";

describe("constants", () => {
  describe("APP_NAME", () => {
    it("je LARP Portál", () => {
      expect(APP_NAME).toBe("LARP Portál");
    });
  });

  describe("DOCUMENT_TYPES", () => {
    it("obsahuje všechny typy dokumentů s labelem a barvou", () => {
      expect(DOCUMENT_TYPES.organizacni.label).toBe("Organizační");
      expect(DOCUMENT_TYPES.herni.label).toBe("Herní");
      expect(DOCUMENT_TYPES.postava.label).toBe("Postava");
      expect(DOCUMENT_TYPES.medailonek.label).toBe("Medailonek");
      expect(DOCUMENT_TYPES.cp.label).toBe("CP");
      expect(Object.keys(DOCUMENT_TYPES)).toHaveLength(5);
    });
  });

  describe("EVENT_TYPES", () => {
    it("obsahuje typy událostí harmonogramu", () => {
      expect(EVENT_TYPES.programovy_blok.label).toBe("Programový blok");
      expect(EVENT_TYPES.vystoupeni_cp.label).toBe("Vystoupení CP");
      expect(Object.keys(EVENT_TYPES)).toHaveLength(5);
    });
  });

  describe("PERSON_TYPES", () => {
    it("obsahuje postava a cp s labelPlural", () => {
      expect(PERSON_TYPES.postava.label).toBe("Postava");
      expect(PERSON_TYPES.postava.labelPlural).toBe("Postavy");
      expect(PERSON_TYPES.cp.labelPlural).toBe("Cizí postavy");
    });
  });

  describe("TARGET_TYPES", () => {
    it("obsahuje vsichni, skupina, osoba", () => {
      expect(TARGET_TYPES.vsichni.label).toBe("Všichni");
      expect(TARGET_TYPES.skupina.label).toBe("Skupina");
      expect(TARGET_TYPES.osoba.label).toBe("Konkrétní osoba");
    });
  });

  describe("ROUTES", () => {
    it("obsahuje veřejné a admin cesty", () => {
      expect(ROUTES.home).toBe("/");
      expect(ROUTES.login).toBe("/login");
      expect(ROUTES.admin.dashboard).toBe("/admin");
      expect(ROUTES.admin.documents).toBe("/admin/dokumenty");
      expect(ROUTES.portal.access).toBe("/portal/:token");
    });
  });
});
