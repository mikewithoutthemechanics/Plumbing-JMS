-- Plumbing JMS — Seed Data
-- Run after schema.sql with: supabase db push

-- Banking details (configure with real bank info)
insert into public.banking_details (bank_name, account_name, account_number, branch_code, swift_code, reference_prefix)
values ('First National Bank', 'Plumbing Services Pty Ltd', '1234567890', '250655', 'FIRNZAJJ', 'PLB');

insert into public.materials (name, description, unit, admin_unit_price, quantity_on_hand, is_active) values
  ('PVC Pipe 110mm', 'Standard drainage pipe', 'meter', 45.00, 50, true),
  ('PVC Pipe 63mm', 'Water supply pipe', 'meter', 25.00, 80, true),
  ('Copper Pipe 15mm', 'Hot water pipe', 'meter', 65.00, 30, true),
  ('Sink Trap 32mm', 'P-trap with nut', 'each', 35.50, 20, true),
  ('Silicone Sealant', 'Clear bathroom sealant', 'tube', 28.00, 100, true),
  ('Washer Tap 15mm', 'Standard compression tap', 'each', 120.00, 15, true),
  ('Ball Valve 20mm', 'Isolation valve', 'each', 45.00, 25, true),
  ('Elbow 32mm', '90 degree PVC elbow', 'each', 8.50, 200, true),
  ('Tee 32mm', 'PVC tee junction', 'each', 10.00, 150, true),
  ('Washer Set', 'Assorted tap washers', 'pack', 15.00, 60, true);

insert into public.customers (name, email, phone, address, notes) values
  ('John Smith', 'john@example.com', '082-555-1234', '123 Main St, Cape Town', 'Prefers morning appointments'),
  ('Sarah Johnson', 'sarah@example.com', '083-555-5678', '456 Oak Ave, Johannesburg', 'Has water meter in back garden'),
  ('Mike van der Merwe', 'mike@example.com', '084-555-9012', '789 Pine Rd, Durban', 'Commercial property');
