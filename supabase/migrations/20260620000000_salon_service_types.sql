-- Extend job_type to support salon services and make customer_address nullable
-- This migration transitions the platform from HVAC-only to multi-industry support

-- 1. Drop existing job_type CHECK constraints
ALTER TABLE calls    DROP CONSTRAINT IF EXISTS calls_job_type_check;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_job_type_check;

-- 2. Add expanded CHECK constraint covering HVAC + salon service types
ALTER TABLE calls ADD CONSTRAINT calls_job_type_check CHECK (job_type IN (
  -- HVAC (legacy)
  'ac_repair', 'ac_not_turning_on', 'furnace_repair', 'furnace_not_turning_on',
  'installation', 'maintenance', 'ductwork', 'thermostat', 'refrigerant', 'emergency',
  -- Salon — threading
  'eyebrow_threading', 'upper_lip_threading', 'chin_threading', 'full_face_threading',
  'side_burns_threading', 'neck_threading', 'forehead_threading',
  -- Salon — waxing
  'eyebrow_waxing', 'upper_lip_waxing', 'chin_waxing', 'full_face_waxing',
  -- Salon — skin
  'basic_facial', 'deep_cleansing_facial',
  -- Generic fallback
  'other'
));

ALTER TABLE bookings ADD CONSTRAINT bookings_job_type_check CHECK (job_type IN (
  -- HVAC (legacy)
  'ac_repair', 'ac_not_turning_on', 'furnace_repair', 'furnace_not_turning_on',
  'installation', 'maintenance', 'ductwork', 'thermostat', 'refrigerant', 'emergency',
  -- Salon — threading
  'eyebrow_threading', 'upper_lip_threading', 'chin_threading', 'full_face_threading',
  'side_burns_threading', 'neck_threading', 'forehead_threading',
  -- Salon — waxing
  'eyebrow_waxing', 'upper_lip_waxing', 'chin_waxing', 'full_face_waxing',
  -- Salon — skin
  'basic_facial', 'deep_cleansing_facial',
  -- Generic fallback
  'other'
));

-- 3. Make customer_address nullable (salon customers come to the shop, no address needed)
ALTER TABLE bookings ALTER COLUMN customer_address DROP NOT NULL;

-- 4. Add 'pending' status for appointment requests awaiting staff confirmation
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'));
