import "dotenv/config";
import * as solace from "solclientjs";
import { bindQueue, closeQueue, closeSolace, connectSolace } from "@/server/solace/connection";
import { getPendingOutbox, markOutboxFailed, markOutboxPublished, processAvailableEvent, processResultEvent, type OutboxRow } from "@/server/repositories/worker-repository";

type Envelope = { eventId: string; eventType: string; shipperOrderId: string; payload: unknown };
class InvalidEnvelopeError extends Error {}

function parseMessage(message: solace.Message): Envelope {
  const body = message.getBinaryAttachment();
  const text = typeof body === "string" ? body : body ? Buffer.from(body).toString("utf8") : "";
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object") throw new InvalidEnvelopeError("Message payload must be an object.");
  const envelope = parsed as Partial<Envelope>;
  if (typeof envelope.eventId !== "string" || typeof envelope.eventType !== "string" || typeof envelope.shipperOrderId !== "string") {
    throw new InvalidEnvelopeError(`Message envelope is invalid: ${text.slice(0, 300)}`);
  }
  return envelope as Envelope;
}

function publish(session: solace.Session, row: OutboxRow) {
  return new Promise<void>((resolve, reject) => {
    const correlationKey = row.event_id;
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for Solace publish confirmation."));
    }, 10_000);
    const onAck = (event: solace.SessionEvent) => {
      if (String(event.correlationKey) !== correlationKey) return;
      cleanup();
      resolve();
    };
    const onReject = (event: solace.RequestError) => {
      const details = event as unknown as solace.SessionEvent;
      if (String(details.correlationKey) !== correlationKey) return;
      cleanup();
      reject(new Error(details.infoStr || details.reason || "Solace rejected the message."));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      session.removeListener(String(solace.SessionEventCode.ACKNOWLEDGED_MESSAGE), onAck);
      session.removeListener(String(solace.SessionEventCode.REJECTED_MESSAGE_ERROR), onReject);
    };
    session.on(solace.SessionEventCode.ACKNOWLEDGED_MESSAGE, onAck);
    session.on(solace.SessionEventCode.REJECTED_MESSAGE_ERROR, onReject);
    const message = solace.SolclientFactory.createMessage();
    message.setDestination(solace.SolclientFactory.createTopicDestination(row.topic));
    message.setDeliveryMode(solace.MessageDeliveryModeType.PERSISTENT);
    message.setApplicationMessageId(row.event_id);
    message.setApplicationMessageType(row.event_type);
    message.setCorrelationKey(correlationKey);
    message.setBinaryAttachment(Buffer.from(JSON.stringify(row.payload), "utf8"));
    try {
      session.send(message);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

async function publishPending(session: solace.Session) {
  for (const row of await getPendingOutbox()) {
    try {
      await publish(session, row);
      await markOutboxPublished(row.event_id);
      console.log(`Published ${row.event_type} ${row.shipper_order_id}`);
    } catch (error) {
      await markOutboxFailed(row.event_id, error);
      console.error(`Failed to publish ${row.event_id}`, error);
    }
  }
}

function consume(consumer: solace.MessageConsumer, handler: (event: Envelope) => Promise<boolean>) {
  consumer.on(solace.MessageConsumerEventName.MESSAGE, (message) => {
    void (async () => {
      try {
        const event = parseMessage(message);
        await handler(event);
        message.acknowledge();
      } catch (error) {
        if (error instanceof InvalidEnvelopeError) {
          console.error("Discarding malformed message", error.message);
          message.acknowledge();
        } else {
          console.error("Message processing failed; leaving message unacknowledged", error);
        }
      }
    })();
  });
}

async function main() {
  const availableQueue = process.env.SOLACE_QUEUE_AVAILABLE;
  const resultsQueue = process.env.SOLACE_QUEUE_RESULTS;
  if (!availableQueue || !resultsQueue) throw new Error("SOLACE_QUEUE_AVAILABLE and SOLACE_QUEUE_RESULTS are required.");
  const session = await connectSolace();
  const available = await bindQueue(session, availableQueue);
  const results = await bindQueue(session, resultsQueue);
  consume(available, (event) => processAvailableEvent(event.eventId, { shipperOrderId: event.shipperOrderId, payload: event.payload }));
  consume(results, (event) => processResultEvent(event.eventId, { shipperOrderId: event.shipperOrderId, payload: event.payload as { status: string; notes: string } }));
  console.log("Global Dispatch worker connected.");
  const interval = setInterval(() => void publishPending(session), 2_000);
  await publishPending(session);
  const shutdown = () => {
    clearInterval(interval);
    closeQueue(available);
    closeQueue(results);
    closeSolace(session);
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
