ALTER TABLE dispatch_requests ALTER COLUMN pickup_date DROP NOT NULL;
ALTER TABLE dispatch_requests ALTER COLUMN delivery_date DROP NOT NULL;
ALTER TABLE dispatch_requests ALTER COLUMN price DROP NOT NULL;
