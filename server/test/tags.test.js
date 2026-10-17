import test from "node:test";
import assert from "node:assert/strict";
import { start, clearDatabase, prisma } from "./helpers.js";
import { catalog, identity, room } from "./lobby-fixtures.js";

test("tags appear in discovery, persist on rooms, and selected tags all match", async () => {
  await clearDatabase();
  const runtime = await start({ catalog: catalog() });
  try {
    const tags = await prisma.tag.createManyAndReturn({
      data: [
        { name: "Mic Required", category: "Communication" },
        { name: "Chill/Casual", category: "Vibe" },
      ],
    });
    const mic = tags.find((tag) => tag.name === "Mic Required");
    const chill = tags.find((tag) => tag.name === "Chill/Casual");
    const host = await identity(runtime.base, 80);
    const grouped = await host.client.call("/api/tags");
    assert.equal(grouped.status, 200);
    assert.equal(grouped.body.Communication[0].id, mic.id);
    assert.equal(grouped.body.Vibe[0].id, chill.id);

    const both = await room(host, { title: "Mic and chill", tags: [mic.id, chill.id] });
    await room(host, { title: "Mic only", tags: [mic.id] });
    assert.deepEqual(both.tags.map((tag) => tag.id).sort(), [mic.id, chill.id].sort());

    const one = await host.client.call(`/api/games/126459/lobbies?tags=${mic.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.length, 2);
    const all = await host.client.call(`/api/games/126459/lobbies?tags=${mic.id},${chill.id}`);
    assert.deepEqual(all.body.map((lobby) => lobby.id), [both.id]);
    const missing = await host.client.call(`/api/games/126459/lobbies?tags=${chill.id},missing`);
    assert.equal(missing.body.length, 0);
    const invalid = await host.client.call("/api/lobbies?tags=,");
    assert.equal(invalid.status, 400);
  } finally {
    await runtime.close();
    await prisma.$disconnect();
  }
});
