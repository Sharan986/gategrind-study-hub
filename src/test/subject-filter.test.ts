import { describe, expect, it } from "vitest";
import { matchesSubject, matchesTopic } from "../data/subjects";

describe("subject filtering", () => {
  it("matches imported subject slugs when the selected filter uses a compact ID", () => {
    expect(matchesSubject("algorithms", "algo")).toBe(true);
    expect(matchesSubject("operating-system", "os")).toBe(true);
  });

  it("also supports subject slugs in links and leaves other subjects out", () => {
    expect(matchesSubject("algorithms", "algorithms")).toBe(true);
    expect(matchesSubject("databases", "algo")).toBe(false);
  });

  it("maps legacy grouped-topic URLs to the imported PYQ topic slugs", () => {
    expect(matchesTopic("set-theory", "sets", "dm")).toBe(true);
    expect(matchesTopic("relations", "sets", "discrete-mathematics")).toBe(true);
    expect(matchesTopic("graph-connectivity", "sets", "dm")).toBe(false);
  });

  it("continues to support direct links to imported topic slugs", () => {
    expect(matchesTopic("set-theory", "set-theory", "dm")).toBe(true);
  });
});
