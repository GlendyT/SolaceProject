import "dotenv/config";
import { getPool } from "../src/server/db/pool";

const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

const validRequest = {
  shipperOrderId: `smoke-${Date.now()}`,
  pickupDate: "2099-09-24",
  deliveryDate: "2099-09-25",
  price: 1250,
  stops: [
    { stopNumber: 1, city: "Boston", state: "MA", postalCode: "01757" },
    { stopNumber: 2, city: "New York", state: "NY", postalCode: "10001" },
  ],
  vehicles: [{ year: "2020", make: "Freightliner", model: "Cascadia" }],
  transportationReleaseNotes: "Smoke test",
};

const invalidRequest = {
  ...validRequest,
  shipperOrderId: `smoke-invalid-${Date.now()}`,
  pickupDate: "not-a-date",
};

async function post(payload: unknown) {
  const response = await fetch(`${appUrl}/api/dispatch-requests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

async function waitFor(check: () => Promise<boolean>, label: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

async function main() {
  const accepted = await post(validRequest);
  if (accepted.status !== 202 || accepted.body.status !== "Accepted") {
    throw new Error(`Expected Accepted/202, received ${accepted.status}: ${JSON.stringify(accepted.body)}`);
  }
  console.log(`Accepted: ${validRequest.shipperOrderId}`);

  const duplicate = await post(validRequest);
  if (duplicate.status !== 200 || duplicate.body.duplicate !== true) {
    throw new Error(`Expected duplicate/200, received ${duplicate.status}: ${JSON.stringify(duplicate.body)}`);
  }
  console.log("Duplicate request returned existing state.");

  const conflict = await post({ ...validRequest, price: 1251 });
  if (conflict.status !== 409) {
    throw new Error(`Expected conflict/409, received ${conflict.status}: ${JSON.stringify(conflict.body)}`);
  }
  console.log("Conflicting payload returned 409.");

  const cancelled = await post(invalidRequest);
  if (cancelled.status !== 202 || cancelled.body.status !== "Cancelled") {
    throw new Error(`Expected Cancelled/202, received ${cancelled.status}: ${JSON.stringify(cancelled.body)}`);
  }
  console.log(`Cancelled: ${invalidRequest.shipperOrderId}`);

  const pool = getPool();
  await waitFor(async () => {
    const result = await pool.query<{ published: number; available: number; result: number }>(
      `SELECT
        (SELECT count(*)::int FROM outbox_events WHERE shipper_order_id = $1 AND published_at IS NOT NULL) AS published,
        (SELECT count(*)::int FROM available_dispatches WHERE shipper_order_id = $1) AS available,
        (SELECT count(*)::int FROM request_results WHERE shipper_order_id = $1 AND status = 'Accepted') AS result`,
      [validRequest.shipperOrderId],
    );
    const row = result.rows[0];
    return row.published === 2 && row.available === 1 && row.result === 1;
  }, "accepted event publication and projections");

  await waitFor(async () => {
    const result = await pool.query<{ published: number; available: number; cancelled: number }>(
      `SELECT
        (SELECT count(*)::int FROM outbox_events WHERE shipper_order_id = $1 AND published_at IS NOT NULL) AS published,
        (SELECT count(*)::int FROM available_dispatches WHERE shipper_order_id = $1) AS available,
        (SELECT count(*)::int FROM request_results WHERE shipper_order_id = $1 AND status = 'Cancelled') AS cancelled`,
      [invalidRequest.shipperOrderId],
    );
    const row = result.rows[0];
    return row.published === 1 && row.available === 0 && row.cancelled === 1;
  }, "cancelled event publication and projection");

  console.log("End-to-end dispatch smoke test passed.");
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
