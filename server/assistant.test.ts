// Offline check of the assistant's tool loop with a scripted fake Claude. Run: npx tsx server/assistant.test.ts
import assert from "node:assert/strict";
import { runAssistant } from "./assistant.js";
import { emptyProgress, type Progress } from "../src/state.js";

type Script = { stop_reason: string; content: unknown[] }[];

function fakeClient(script: Script, seen: Record<string, unknown>[]) {
  let i = 0;
  return {
    beta: {
      messages: {
        create: async (params: Record<string, unknown>) => {
          seen.push(structuredClone(params));
          return script[i++];
        },
      },
    },
  } as never;
}

const catalog = [
  { id: "toaster", name: "Toaster", rarity: "Rare", type: "Recyclable", icon: "", value: 1000, loot: "Residential" },
  { id: "fried-motherboard", name: "Fried Motherboard", rarity: "Uncommon", type: "Recyclable", icon: "", value: 500, loot: "" },
];

// 1. Log a raid: tool call, then a confirmation.
{
  const seen: Record<string, unknown>[] = [];
  const out = await runAssistant({
    mode: "log",
    message: "Extracted from dam with 2 toasters and a fried motherboard",
    history: [],
    progress: { ...emptyProgress(), inv: { toaster: 1 } },
    catalog,
    client: fakeClient(
      [
        {
          stop_reason: "tool_use",
          content: [{ type: "tool_use", id: "t1", name: "log_raid", input: { map: "dam", outcome: "extracted", items: [{ id: "toaster", count: 2 }, { id: "fried-motherboard", count: 1 }], note: "" } }],
        },
        { stop_reason: "end_turn", content: [{ type: "text", text: "Logged your Dam raid." }] },
      ],
      seen,
    ),
  });
  const after = out.ops.reduce<Progress>((p, op) => op(p), { ...emptyProgress(), inv: { toaster: 1 } });
  assert.equal(out.reply, "Logged your Dam raid.");
  assert.equal(after.inv.toaster, 3);
  assert.equal(after.inv["fried-motherboard"], 1);
  assert.equal(after.raids.length, 1);
  assert.equal(after.raids[0].map, "Dam", "map name normalised");
  assert.equal(seen[0].model, "claude-haiku-5-5");
  assert.equal(seen[0].fallbacks, undefined, "no fallback on Haiku");
  const second = seen[1].messages as { role: string; content: unknown }[];
  assert.equal(second.length, 3, "assistant turn and tool result appended");
  const res = (second[2].content as { type: string; is_error?: boolean }[])[0];
  assert.equal(res.type, "tool_result");
  assert.ok(!res.is_error);
  console.log("PASS log_raid flow");
}

// 2. Unknown id is rejected back to the model, nothing changes.
{
  const seen: Record<string, unknown>[] = [];
  const out = await runAssistant({
    mode: "ask",
    message: "I used 2 golden widgets",
    history: [{ role: "user", text: "hi" }],
    progress: emptyProgress(),
    catalog,
    client: fakeClient(
      [
        { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "adjust_stash", input: { changes: [{ id: "golden-widget", delta: -2 }] } }] },
        { stop_reason: "end_turn", content: [{ type: "text", text: "I couldn't find that item." }] },
      ],
      seen,
    ),
  });
  assert.equal(out.ops.length, 0);
  const res = ((seen[1].messages as { content: unknown }[])[2].content as { is_error?: boolean }[])[0];
  assert.equal(res.is_error, true);
  assert.equal(seen[0].model, "claude-sonnet-5-5");
  assert.equal(seen[0].fallbacks, "default");
  assert.deepEqual(seen[0].betas, ["server-side-fallback-2026-07-01"]);
  assert.ok(String((seen[0].messages as { content: string }[])[0].content).includes("<earlier_chat>"));
  console.log("PASS unknown id rejected, Sonnet + fallback request shape");
}

// 3. Refusal stops the loop without running tools.
{
  const out = await runAssistant({
    mode: "ask",
    message: "x",
    history: [],
    progress: emptyProgress(),
    catalog,
    client: fakeClient([{ stop_reason: "refusal", content: [{ type: "tool_use", id: "t1", name: "set_stash", input: { id: "toaster", count: 99 } }] }], []),
  });
  assert.equal(out.ops.length, 0);
  console.log("PASS refusal handled");
}

// 4. Every tool schema is strict-compatible: objects close additionalProperties and require every property.
{
  const seen: Record<string, unknown>[] = [];
  await runAssistant({ mode: "ask", message: "x", history: [], progress: emptyProgress(), catalog, client: fakeClient([{ stop_reason: "end_turn", content: [] }], seen) });
  const walk = (s: Record<string, unknown>, path: string) => {
    if (s.type === "object") {
      assert.equal(s.additionalProperties, false, `${path} additionalProperties`);
      assert.deepEqual([...(s.required as string[])].sort(), Object.keys(s.properties as object).sort(), `${path} required`);
      for (const [k, v] of Object.entries(s.properties as object)) walk(v as Record<string, unknown>, `${path}.${k}`);
    }
    if (s.type === "array") walk(s.items as Record<string, unknown>, `${path}[]`);
  };
  for (const t of seen[0].tools as { name: string; strict: boolean; input_schema: Record<string, unknown> }[]) {
    assert.equal(t.strict, true);
    walk(t.input_schema, t.name);
  }
  console.log("PASS tool schemas strict-compatible");
}
