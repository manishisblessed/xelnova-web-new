-- Add unique constraints to SellerProfile for KYC fields
-- These ensure one bank account, GST, PAN, and Aadhaar per seller

-- GST Number - unique per seller
CREATE UNIQUE INDEX "seller_profiles_gstNumber_key" ON "seller_profiles"("gstNumber") WHERE "gstNumber" IS NOT NULL;

-- Bank Account Number - unique per seller
CREATE UNIQUE INDEX "seller_profiles_bankAccountNumber_key" ON "seller_profiles"("bankAccountNumber") WHERE "bankAccountNumber" IS NOT NULL;

-- PAN Number - unique per seller
CREATE UNIQUE INDEX "seller_profiles_panNumber_key" ON "seller_profiles"("panNumber") WHERE "panNumber" IS NOT NULL;

-- Aadhaar Number - unique per seller
CREATE UNIQUE INDEX "seller_profiles_aadhaarNumber_key" ON "seller_profiles"("aadhaarNumber") WHERE "aadhaarNumber" IS NOT NULL;
