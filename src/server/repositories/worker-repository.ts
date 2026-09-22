import { getPool, withTransaction } from "@/server/db/pool";

export type OutboxRow = {
  event_id: string;
  shipper_order_id: string;
  event_type: string;
  topic: string;
  payload: unknown;
};

export async function getPendingOutbox(limit = 20) {
  const result = await getPool().query<OutboxRow>(
    `SELECT event_id, shipper_order_id, event_type, topic, payload
       FROM outbox_events
      WHERE published_at IS NULL
      ORDER BY created_at ASC
      LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export async function markOutboxPublished(eventId: string) {
  await getPool().query(
    "UPDATE outbox_events SET published_at = now(), last_error = NULL, attempts = attempts + 1 WHERE event_id = $1 AND published_at IS NULL",
    [eventId],
  );
}

export async function markOutboxFailed(eventId: string, error: unknown) {
  await getPool().query(
    "UPDATE outbox_events SET attempts = attempts + 1, last_error = $2 WHERE event_id = $1",
    [eventId, error instanceof Error ? error.message : String(error)],
  );
}

export async function processAvailableEvent(eventId: string, event: { shipperOrderId: string; payload: unknown }) {
  return withTransaction(async (client) => {
    const inserted = await client.query(
      "INSERT INTO processed_events (consumer_name, event_id) VALUES ('available-dispatches', $1) ON CONFLICT DO NOTHING RETURNING event_id",
      [eventId],
    );
    if (!inserted.rowCount) return false;
    await client.query(
      `INSERT INTO available_dispatches (shipper_order_id, payload)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (shipper_order_id) DO UPDATE SET payload = EXCLUDED.payload`,
      [event.shipperOrderId, JSON.stringify(event.payload)],
    );
    return true;
  });
}

export async function processResultEvent(eventId: string, event: { shipperOrderId: string; payload: { status: string; notes: string } }) {
  return withTransaction(async (client) => {
    const inserted = await client.query(
      "INSERT INTO processed_events (consumer_name, event_id) VALUES ('request-results', $1) ON CONFLICT DO NOTHING RETURNING event_id",
      [eventId],
    );
    if (!inserted.rowCount) return false;
    await client.query(
      `INSERT INTO request_results (shipper_order_id, status, notes, event_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (shipper_order_id) DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, event_id = EXCLUDED.event_id, received_at = now()`,
      [event.shipperOrderId, event.payload.status, event.payload.notes, eventId],
    );
    return true;
  });
}
