// Stand-in for the interview: one model call turns a sentence into a brief.json.
// The real interview replaces this later; keeping it makes the two comparable.
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { config, type Usage, addUsage } from "./config.js";

const REQUIRED_KEYS = ["store", "categories", "look", "orders"];

export async function standInBrief(client: Anthropic, prompt: string, examplePath: string, usage: Usage) {
  const example = await readFile(examplePath, "utf8");
  const system =
    "You write brief.json files for an AI store builder. The owner's request is below. " +
    "Use the example brief only for its shape and its defaults; replace every store-specific value " +
    "(name, what it sells, categories, brand words, sample products, look) with values that fit the owner's request. " +
    "Where the request is silent, choose a sensible default and list each assumption in a top-level " +
    '"assumptions" array of short plain sentences. Output one JSON object and nothing else.';
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.messages.create({
      model: config.model,
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: `Owner's request: ${prompt}\n\nExample brief.json:\n${example}` }],
    });
    addUsage(usage, res.usage);
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    try {
      const json = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim());
      const missing = REQUIRED_KEYS.filter((k) => !(k in json));
      if (missing.length === 0) {
        json.source = { prompt, generated_by: "stand-in", model: config.model };
        return json;
      }
    } catch {
      /* try again once */
    }
  }
  throw new Error("The stand-in could not produce a valid brief.json after two tries.");
}
