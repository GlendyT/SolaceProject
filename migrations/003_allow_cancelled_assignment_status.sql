ALTER TABLE available_dispatches DROP CONSTRAINT IF EXISTS available_dispatches_assignment_status_check;
ALTER TABLE available_dispatches ADD CONSTRAINT available_dispatches_assignment_status_check CHECK (assignment_status IN ('Available', 'Assigned', 'Cancelled'));
