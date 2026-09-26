import assert from "node:assert/strict";
import test from "node:test";
import { runMerchandiseUpdate } from "./update-merchandise-data.mjs";

test("a blocked Arsenal scan does not prevent a healthy Barcelona scan", async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes("arsenaldirect"))
      return { ok: false, status: 403 };
    return {
      ok: true,
      json: async () => ({
        products: [
          {
            handle: "home-shirt",
            id: 7,
            image: { src: "https://cdn.example/home.jpg" },
            product_type: "Jersey",
            title: "Home Jersey",
            variants: [{ available: true, price: "99.99" }],
          },
        ],
      }),
    };
  };
  const report = await runMerchandiseUpdate({
    dryRun: true,
    fetchImpl,
    sources: ["arsenal", "barcelona"],
  });
  assert.equal(report.healthy, false);
  assert.equal(
    report.outcomes.find((outcome) => outcome.source === "arsenal")?.status,
    "failed",
  );
  assert.equal(
    report.outcomes.find((outcome) => outcome.source === "barcelona")
      ?.itemCount,
    1,
  );
});
