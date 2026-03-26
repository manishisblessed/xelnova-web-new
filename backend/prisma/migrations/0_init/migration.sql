-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'SELLER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FLAT');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'PENDING', 'DRAFT', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "SellerOnboardingStatus" AS ENUM ('PENDING_VERIFICATION', 'EMAIL_VERIFIED', 'PHONE_VERIFIED', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PAN_CARD', 'GST_CERTIFICATE', 'CANCELLED_CHEQUE', 'BUSINESS_LICENSE', 'ADDRESS_PROOF', 'IDENTITY_PROOF');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "lastLoginLocation" JSONB,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "landmark" TEXT,
    "type" "AddressType" NOT NULL DEFAULT 'HOME',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "onboardingStatus" "SellerOnboardingStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "onboardingCompletedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "gstNumber" TEXT,
    "gstVerified" BOOLEAN NOT NULL DEFAULT false,
    "gstVerifiedAt" TIMESTAMP(3),
    "gstVerifiedData" JSONB,
    "gstCertificateUrl" TEXT,
    "sellsNonGstProducts" BOOLEAN NOT NULL DEFAULT false,
    "panNumber" TEXT,
    "panName" TEXT,
    "panVerified" BOOLEAN NOT NULL DEFAULT false,
    "panVerifiedAt" TIMESTAMP(3),
    "panDocumentUrl" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfscCode" TEXT,
    "bankVerified" BOOLEAN NOT NULL DEFAULT false,
    "bankVerifiedAt" TIMESTAMP(3),
    "bankVerifiedData" JSONB,
    "bankVerifiedName" TEXT,
    "bankName" TEXT,
    "bankBranch" TEXT,
    "cancelledChequeUrl" TEXT,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "businessAddress" TEXT,
    "businessCity" TEXT,
    "businessState" TEXT,
    "businessPincode" TEXT,
    "businessType" TEXT,
    "businessCategory" TEXT,
    "shippingMethod" TEXT DEFAULT 'easy_ship',
    "offerFreeDelivery" BOOLEAN NOT NULL DEFAULT true,
    "deliveryCharge1to3Days" DOUBLE PRECISION,
    "deliveryCharge3PlusDays" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_documents" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "userId" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "captcha_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "puzzleType" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "solvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "captcha_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "parentId" TEXT,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "images" TEXT[],
    "categoryId" TEXT NOT NULL,
    "brand" TEXT,
    "sellerId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "isFlashDeal" BOOLEAN NOT NULL DEFAULT false,
    "flashDealEndsAt" TIMESTAMP(3),
    "variants" JSONB,
    "specifications" JSONB,
    "highlights" TEXT[],
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "sku" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "images" TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shipping" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "shippingAddressId" TEXT,
    "couponCode" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "paymentId" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productImage" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "variant" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "variant" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("userId","productId")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDiscount" DOUBLE PRECISION,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "image" TEXT,
    "ctaText" TEXT,
    "ctaLink" TEXT,
    "bgColor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "position" TEXT NOT NULL DEFAULT 'hero',
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT NOT NULL DEFAULT 'bank_transfer',
    "note" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "isPercentage" BOOLEAN NOT NULL DEFAULT true,
    "minOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_pages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "author" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "userRole" "Role",
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" JSONB,
    "meta" JSONB,
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'success',
    "endpoint" TEXT,
    "method" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "location" JSONB,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_request_logs" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "error" TEXT,
    "location" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_logs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "endpoint" TEXT,
    "memoryUsage" DOUBLE PRECISION,
    "cpuUsage" DOUBLE PRECISION,
    "activeUsers" INTEGER,
    "requestCount" INTEGER,
    "errorCount" INTEGER,
    "avgResponseMs" DOUBLE PRECISION,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_logs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "response" JSONB,
    "userId" TEXT,
    "verifiedData" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "addresses_userId_idx" ON "addresses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_userId_key" ON "seller_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_slug_key" ON "seller_profiles"("slug");

-- CreateIndex
CREATE INDEX "seller_documents_sellerId_idx" ON "seller_documents"("sellerId");

-- CreateIndex
CREATE INDEX "seller_documents_type_idx" ON "seller_documents"("type");

-- CreateIndex
CREATE INDEX "otp_verifications_identifier_type_idx" ON "otp_verifications"("identifier", "type");

-- CreateIndex
CREATE INDEX "otp_verifications_otp_idx" ON "otp_verifications"("otp");

-- CreateIndex
CREATE UNIQUE INDEX "captcha_sessions_sessionId_key" ON "captcha_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "captcha_sessions_sessionId_idx" ON "captcha_sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_sellerId_idx" ON "products"("sellerId");

-- CreateIndex
CREATE INDEX "products_isFeatured_idx" ON "products"("isFeatured");

-- CreateIndex
CREATE INDEX "products_isTrending_idx" ON "products"("isTrending");

-- CreateIndex
CREATE INDEX "products_isFlashDeal_idx" ON "products"("isFlashDeal");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "reviews_productId_idx" ON "reviews"("productId");

-- CreateIndex
CREATE INDEX "reviews_userId_idx" ON "reviews"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_userId_productId_variant_key" ON "cart_items"("userId", "productId", "variant");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "payouts_sellerId_idx" ON "payouts"("sellerId");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_slug_key" ON "cms_pages"("slug");

-- CreateIndex
CREATE INDEX "activity_logs_type_idx" ON "activity_logs"("type");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_token_idx" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "user_sessions_isActive_idx" ON "user_sessions"("isActive");

-- CreateIndex
CREATE INDEX "api_request_logs_endpoint_idx" ON "api_request_logs"("endpoint");

-- CreateIndex
CREATE INDEX "api_request_logs_userId_idx" ON "api_request_logs"("userId");

-- CreateIndex
CREATE INDEX "api_request_logs_statusCode_idx" ON "api_request_logs"("statusCode");

-- CreateIndex
CREATE INDEX "api_request_logs_createdAt_idx" ON "api_request_logs"("createdAt");

-- CreateIndex
CREATE INDEX "performance_logs_type_idx" ON "performance_logs"("type");

-- CreateIndex
CREATE INDEX "performance_logs_metric_idx" ON "performance_logs"("metric");

-- CreateIndex
CREATE INDEX "performance_logs_createdAt_idx" ON "performance_logs"("createdAt");

-- CreateIndex
CREATE INDEX "verification_logs_type_idx" ON "verification_logs"("type");

-- CreateIndex
CREATE INDEX "verification_logs_identifier_idx" ON "verification_logs"("identifier");

-- CreateIndex
CREATE INDEX "verification_logs_userId_idx" ON "verification_logs"("userId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_documents" ADD CONSTRAINT "seller_documents_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

