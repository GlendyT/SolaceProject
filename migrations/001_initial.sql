CREATE TABLE IF NOT EXISTS dispatch_requests (
  shipper_order_id text PRIMARY KEY,
  pickup_date date,
  delivery_date date,
  price numeric(12, 2) NOT NULL CHECK (price > 0),
  raw_payload jsonb NOT NULL,
  validation_status text NOT NULL CHECK (validation_status IN ('Accepted', 'Cancelled')),
  cancellation_reason text,
  received_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS available_dispatches (
  shipper_order_id text PRIMARY KEY REFERENCES dispatch_requests(shipper_order_id),
  payload jsonb NOT NULL,
  assignment_status text NOT NULL DEFAULT 'Available' CHECK (assignment_status IN ('Available', 'Assigned')),
  carrier_id text,
  assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS request_results (
  shipper_order_id text PRIMARY KEY REFERENCES dispatch_requests(shipper_order_id),
  status text NOT NULL CHECK (status IN ('Accepted', 'Cancelled')),
  notes text NOT NULL,
  event_id text UNIQUE,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbox_events (
  event_id text PRIMARY KEY,
  shipper_order_id text NOT NULL REFERENCES dispatch_requests(shipper_order_id),
  event_type text NOT NULL,
  topic text NOT NULL,
  payload jsonb NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS outbox_events_pending_idx ON outbox_events (created_at) WHERE published_at IS NULL;

CREATE TABLE IF NOT EXISTS processed_events (
  consumer_name text NOT NULL,
  event_id text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer_name, event_id)
);
