import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { createTodoBrokerAdapter } from "./ui-adapter";

describe("TODO broker template", () => {
  it("starts unimplemented (detect false)", () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "https://TODO_DOMAIN.example/",
    });
    const adapter = createTodoBrokerAdapter(dom.window.document);
    expect(adapter.detect()).toBe(false);
    expect(adapter.id).toBe("TODO_BROKER_ID");
  });
});
