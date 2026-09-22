import "dotenv/config";
import { bindQueue, closeQueue, closeSolace, connectSolace } from "../src/server/solace/connection";

const queueName = process.env.SOLACE_QUEUE_AVAILABLE;
if (!queueName) throw new Error("SOLACE_QUEUE_AVAILABLE is required.");

let session: Awaited<ReturnType<typeof connectSolace>> | undefined;
let consumer: Parameters<typeof closeQueue>[0] | undefined;

connectSolace()
  .then(async (connectedSession) => {
    session = connectedSession;
    consumer = await bindQueue(session, queueName);
    console.log(`Solace connection and queue bind succeeded: ${queueName}`);
    closeQueue(consumer);
    closeSolace(session);
  })
  .catch((error: unknown) => {
    console.error(error);
    if (consumer) closeQueue(consumer);
    if (session) closeSolace(session);
    process.exitCode = 1;
  });
