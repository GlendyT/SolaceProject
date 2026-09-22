import * as solace from "solclientjs";

let initialized = false;

type SolaceConfig = {
  url: string;
  vpnName: string;
  userName: string;
  password: string;
};

function readConfig(): SolaceConfig {
  const values = {
    url: process.env.SOLACE_URL,
    vpnName: process.env.SOLACE_VPN,
    userName: process.env.SOLACE_USERNAME,
    password: process.env.SOLACE_PASSWORD,
  };
  const missing = Object.entries(values).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) throw new Error(`Missing Solace environment variables: ${missing.join(", ")}`);
  return values as SolaceConfig;
}

function initializeSolace() {
  if (initialized) return;
  const factoryProperties = new solace.SolclientFactoryProperties();
  factoryProperties.profile = solace.SolclientFactoryProfiles.version10;
  solace.SolclientFactory.init(factoryProperties);
  initialized = true;
}

export function connectSolace() {
  initializeSolace();
  const config = readConfig();
  const session = solace.SolclientFactory.createSession({
    url: config.url,
    vpnName: config.vpnName,
    userName: config.userName,
    password: config.password,
    sslValidateCertificate: true,
    connectTimeoutInMsecs: 10_000,
    publisherProperties: new solace.MessagePublisherProperties({
      enabled: true,
      windowSize: 10,
      acknowledgeTimeoutInMsecs: 5_000,
    }),
  });

  return new Promise<solace.Session>((resolve, reject) => {
    const onConnected = () => {
      cleanup();
      resolve(session);
    };
    const onFailed = (event: solace.SessionEvent) => {
      cleanup();
      reject(new Error(`Solace connection failed: ${event.infoStr || event.reason || "unknown error"}`));
    };
    const onDisconnected = (event: solace.SessionEvent) => {
      cleanup();
      reject(new Error(`Solace disconnected before connection completed: ${event.infoStr || event.reason || "unknown error"}`));
    };
    const cleanup = () => {
      session.removeAllListeners();
    };

    session.on(solace.SessionEventCode.UP_NOTICE, onConnected);
    session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, onFailed);
    session.on(solace.SessionEventCode.DISCONNECTED, onDisconnected);
    try {
      session.connect();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

export function closeSolace(session: solace.Session) {
  session.disconnect();
  session.dispose();
}

export function bindQueue(session: solace.Session, queueName: string) {
  const consumer = session.createMessageConsumer({
    queueDescriptor: { name: queueName, type: solace.QueueType.QUEUE },
    acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT,
  });

  return new Promise<solace.MessageConsumer>((resolve, reject) => {
    const onUp = () => {
      cleanup();
      resolve(consumer);
    };
    const onFailed = () => {
      cleanup();
      reject(new Error(`Solace could not bind to queue: ${queueName}`));
    };
    const cleanup = () => {
      consumer.removeAllListeners();
    };
    consumer.on(solace.MessageConsumerEventName.UP, onUp);
    consumer.on(solace.MessageConsumerEventName.CONNECT_FAILED_ERROR, onFailed);
    try {
      consumer.connect();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

export function closeQueue(consumer: solace.MessageConsumer) {
  consumer.disconnect();
  consumer.dispose();
}
