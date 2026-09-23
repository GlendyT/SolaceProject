import { DateTime } from "luxon";
import { createAvailableEvent, createResultEvent } from "@/domain/events";
import type { DispatchValidationResult } from "@/domain/dispatch-schema";
import { getPool, withTransaction } from "@/server/db/pool";

export class DuplicateDispatchError extends Error {
  constructor(message = "A request with this shipperOrderId already exists with different data.") {
    super(message);
    this.name = "DuplicateDispatchError";
  }
}

type SavedRequest = { duplicate: boolean; shipperOrderId: string };

export async function listDispatchRequests() {
  const result = await getPool().query(
    `SELECT
       dr.shipper_order_id AS "shipperOrderId",
       dr.pickup_date AS "pickupDate",
       dr.delivery_date AS "deliveryDate",
       dr.validation_status AS "validationStatus",
       dr.cancellation_reason AS "cancellationReason",
       dr.received_at AS "receivedAt",
       COALESCE(rr.status, 'Pending') AS status,
       COALESCE(rr.notes, 'Esperando procesamiento del worker.') AS notes,
       rr.received_at AS "resultReceivedAt",
       dr.raw_payload->'stops'->0->>'city' AS "pickupCity",
       dr.raw_payload->'stops'->0->>'state' AS "pickupState",
       dr.raw_payload->'stops'->1->>'city' AS "deliveryCity",
       dr.raw_payload->'stops'->1->>'state' AS "deliveryState",
       count(*) OVER ()::int AS "totalCount",
       count(*) FILTER (WHERE COALESCE(rr.status, 'Pending') = 'Accepted') OVER ()::int AS "acceptedCount",
       count(*) FILTER (WHERE COALESCE(rr.status, 'Pending') = 'Pending') OVER ()::int AS "pendingCount"
     FROM dispatch_requests dr
     LEFT JOIN request_results rr ON rr.shipper_order_id = dr.shipper_order_id
     ORDER BY dr.received_at DESC
     LIMIT 100`,
  );
  return result.rows;
}

export async function listAvailableDispatches() {
  const result = await getPool().query(
    `SELECT
       ad.shipper_order_id AS "shipperOrderId",
       ad.payload,
       ad.assignment_status AS "assignmentStatus",
       ad.created_at AS "createdAt"
     FROM available_dispatches ad
     WHERE ad.assignment_status = 'Available'
     ORDER BY ad.created_at DESC
     LIMIT 100`,
  );
  return result.rows;
}

export async function getDispatchRequest(shipperOrderId: string) {
  const result = await getPool().query(
    `SELECT
       dr.shipper_order_id AS "shipperOrderId", dr.pickup_date AS "pickupDate", dr.delivery_date AS "deliveryDate",
       dr.price, dr.raw_payload AS payload, dr.validation_status AS "validationStatus", dr.cancellation_reason AS "cancellationReason", dr.received_at AS "receivedAt",
       rr.status, rr.notes, rr.received_at AS "resultReceivedAt",
       ad.assignment_status AS "assignmentStatus", ad.carrier_id AS "carrierId", ad.assigned_at AS "assignedAt"
     FROM dispatch_requests dr
     LEFT JOIN request_results rr ON rr.shipper_order_id = dr.shipper_order_id
     LEFT JOIN available_dispatches ad ON ad.shipper_order_id = dr.shipper_order_id
     WHERE dr.shipper_order_id = $1`,
    [shipperOrderId],
  );
  return result.rows[0] ?? null;
}

export class DispatchNotFoundError extends Error {}
export class DispatchAlreadyAssignedError extends Error {}

export async function assignDispatch(shipperOrderId: string, carrierId: string) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE available_dispatches
          SET assignment_status = 'Assigned', carrier_id = $2, assigned_at = now()
        WHERE shipper_order_id = $1 AND assignment_status = 'Available'
        RETURNING shipper_order_id AS "shipperOrderId", carrier_id AS "carrierId", assigned_at AS "assignedAt"`,
      [shipperOrderId, carrierId],
    );
    if (result.rowCount) return result.rows[0];
    const exists = await client.query("SELECT assignment_status FROM available_dispatches WHERE shipper_order_id = $1", [shipperOrderId]);
    if (!exists.rowCount) throw new DispatchNotFoundError("Dispatch was not found.");
    throw new DispatchAlreadyAssignedError("Dispatch is no longer available.");
  });
}

function validDateOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = DateTime.fromFormat(value, "yyyy-MM-dd", { zone: "UTC" });
  return parsed.isValid && parsed.toFormat("yyyy-MM-dd") === value ? value : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function getPayload(result: DispatchValidationResult) {
  return result.ok && result.status === "Accepted" ? result.payload : undefined;
}

export async function saveDispatchRequest(
  input: unknown,
  validation: Exclude<DispatchValidationResult, { status: "Invalid" }>,
  receivedAt: Date,
): Promise<SavedRequest> {
  const shipperOrderId = validation.result.shipperOrderId;
  const rawPayload = JSON.stringify(input ?? null);
  const payload = getPayload(validation);
  const topicPrefix = (process.env.SOLACE_TOPIC_PREFIX ?? "newcron/dispatch/v1").replace(/\/$/, "");
  const events = payload
    ? [
        { event: createAvailableEvent(payload, receivedAt), topic: `${topicPrefix}/available/${shipperOrderId}` },
        { event: createResultEvent(validation.result, receivedAt), topic: `${topicPrefix}/result/accepted/${shipperOrderId}` },
      ]
    : [{ event: createResultEvent(validation.result, receivedAt), topic: `${topicPrefix}/result/cancelled/${shipperOrderId}` }];

  return withTransaction(async (client) => {
    const existing = await client.query<{ same: boolean }>(
      "SELECT raw_payload = $2::jsonb AS same FROM dispatch_requests WHERE shipper_order_id = $1 FOR UPDATE",
      [shipperOrderId, rawPayload],
    );
    if (existing.rowCount) {
      if (existing.rows[0].same) return { duplicate: true, shipperOrderId };
      throw new DuplicateDispatchError();
    }

    await client.query(
      `INSERT INTO dispatch_requests
        (shipper_order_id, pickup_date, delivery_date, price, raw_payload, validation_status, cancellation_reason, received_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
      [
        shipperOrderId,
        validDateOrNull((input as Record<string, unknown>)?.pickupDate),
        validDateOrNull((input as Record<string, unknown>)?.deliveryDate),
        numberOrNull((input as Record<string, unknown>)?.price),
        rawPayload,
        validation.status,
        validation.status === "Cancelled" ? validation.reason : null,
        receivedAt,
      ],
    );

    for (const { event, topic } of events) {
      await client.query(
        `INSERT INTO outbox_events (event_id, shipper_order_id, event_type, topic, payload)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [event.eventId, shipperOrderId, event.eventType, topic, JSON.stringify(event)],
      );
    }
    return { duplicate: false, shipperOrderId };
  });
}
