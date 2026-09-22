import { randomUUID } from "node:crypto";
import type { DispatchRequest, DispatchResult } from "./dispatch-schema";

export const EVENT_SCHEMA_VERSION = "1";

export type DispatchEventType = "dispatch.available.v1" | "dispatch.result.v1";

export type DispatchEvent<TPayload> = {
  eventId: string;
  eventType: DispatchEventType;
  schemaVersion: typeof EVENT_SCHEMA_VERSION;
  occurredAt: string;
  shipperOrderId: string;
  payload: TPayload;
};

export function createAvailableEvent(payload: DispatchRequest, occurredAt = new Date()): DispatchEvent<DispatchRequest> {
  return {
    eventId: randomUUID(),
    eventType: "dispatch.available.v1",
    schemaVersion: EVENT_SCHEMA_VERSION,
    occurredAt: occurredAt.toISOString(),
    shipperOrderId: payload.shipperOrderId,
    payload,
  };
}

export function createResultEvent(result: DispatchResult, occurredAt = new Date()): DispatchEvent<DispatchResult> {
  return {
    eventId: randomUUID(),
    eventType: "dispatch.result.v1",
    schemaVersion: EVENT_SCHEMA_VERSION,
    occurredAt: occurredAt.toISOString(),
    shipperOrderId: result.shipperOrderId,
    payload: result,
  };
}
