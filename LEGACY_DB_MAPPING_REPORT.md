# Legacy DB Migration Mapping Report

Date: 2026-06-02

## Scope

This report maps the legacy Firestore export in `indian bites data/` to the current MongoDB/Mongoose schema in `Backend/src/`.

- Legacy source summary: 44 CSV files, 11,269 rows
- Goal for this phase: analysis and field mapping only
- Migration execution: not included yet

## Executive Summary

The legacy data can be migrated into the current system in four broad buckets:

1. **Direct or mostly direct migration**
   - admins
   - customers
   - restaurants/vendors
   - products
   - orders
   - coupons/offers
   - notifications
   - referrals

2. **Split migration across multiple current collections**
   - settings
   - bank details
   - wallet and transaction data
   - withdrawal data

3. **Partial migration with transformation required**
   - zones
   - categories / subcategories
   - reviews
   - support chats
   - onboarding / ads / banners

4. **No current direct target or needs custom archival collection**
   - audit logs
   - order audit
   - order termination log
   - Digilocker sessions
   - driver insurance data
   - role/permission data
   - some legacy payment provider settings

## Important Gaps / Risks

- `zones.csv` does **not** contain polygon coordinates, but current `FoodZone` requires at least 3 coordinates. Zone migration is blocked unless polygon data is sourced separately.
- Legacy restaurant structure is split across `vendors.csv`, `owner.csv`, `owner__restaurantCredentials.csv`, and `bank_details.csv`; current schema stores most of that in a single `FoodRestaurant` document.
- Legacy driver structure is split across `driver.csv`, `driver_users.csv`, `verify_driver.csv`, `driver__insurance_data.csv`, and `bank_details.csv`; current schema stores most of that in `FoodDeliveryPartner`.
- Legacy `orders.csv` contains much richer dispatch/audit lifecycle fields than the current `FoodOrder` schema. Most operational fields can be preserved, but some legacy workflow fields will need flattening or omission.
- Legacy `sub_category.csv` has no direct current schema. It must either be folded into category/item naming, menu sections, or handled by a future schema extension.
- Legacy `review_customer.csv` has no standalone review model in the current system. Ratings likely need to be merged into `FoodOrder.ratings` and/or denormalized aggregate ratings on restaurants and delivery partners.

## Recommended Migration Order

1. `admin.csv`
2. `customers.csv`
3. `owner.csv` + `vendors.csv` + `owner__restaurantCredentials.csv` + restaurant bank details
4. `driver.csv` + `driver_users.csv` + `verify_driver.csv` + driver bank details
5. `category.csv`
6. `product.csv`
7. `coupon.csv`
8. `settings.csv`
9. `orders.csv`
10. `wallet_transaction.csv` + `transaction_log.csv` + `withdrawal_history.csv`
11. `notification.csv` + `notification_from_admin.csv`
12. Remaining support/content/archive tables

## Mapping Matrix

| Legacy file | Rows | Current target | Status | Notes |
|---|---:|---|---|---|
| `admin.csv` | 4 | `FoodAdmin` (`food_admins`) | Direct | Map `email`, `password`, `name`, `contactNumber -> phone`, `image -> profileImage`, `role` |
| `advertisements.csv` | 2 | `AppIntroAd` | Partial | Good fit for `title`, `mediaUrl`, `mediaType`, `isEnable -> isActive`; no legacy duration/order fields |
| `audit_logs.csv` | 10 | No direct target | Archive | Recommend archive JSON/CSV or create future audit collection |
| `bank_details.csv` | 157 | `FoodRestaurant`, `FoodDeliveryPartner`, withdrawals | Split | Route by `ownerId` and `driverId`; merge into entity bank fields |
| `banner.csv` | 5 | `FoodHeroBanner` / `FoodDiningBanner` / `FoodUnder250Banner` | Partial | Requires business decision by banner purpose; fields do not perfectly match |
| `category.csv` | 464 | `FoodCategory` | Direct | `categoryName -> name`, `image`, `active -> isActive` |
| `counters.csv` | 2 | No direct target | Ignore/Archive | Likely legacy sequence helpers |
| `country_tax.csv` | 3 | `FoodFeeSettings` / custom tax config | Partial | No dedicated tax-rule model in current schema |
| `coupon.csv` | 2 | `FoodOffer` | Direct-ish | Prefer `FoodOffer` over `Promocode`; map code/value/type/vendorId/minAmount/expireAt/active |
| `cuisine.csv` | 29 | `FoodRestaurant.cuisines` or `FoodDiningCategory` | Partial | Current schema has no master cuisine collection |
| `currencies.csv` | 1 | No direct target | Ignore/Config | Current system assumes currency in transactional schemas |
| `customers.csv` | 333 | `FoodUser` (`food_users`) | Direct-ish | Merge first/last name into `name`; transform address list into `addresses[]` |
| `digilocker_sessions.csv` | 318 | No direct target | Archive | No current schema |
| `documents.csv` | 8 | No direct target | Partial | Could become config for document requirements later |
| `driver.csv` | 63 | `FoodDeliveryPartner` | Direct-ish | Main delivery-partner source; merge bank/verification extras from related legacy files |
| `driver_selfies.csv` | 0 | `FoodDeliveryPartner.shiftStartPic`? | Ignore | Empty export |
| `driver_users.csv` | 94 | `FoodDeliveryPartner` | Partial | Supplemental Aadhaar verification data |
| `driver__insurance_data.csv` | 5 | No direct target | Archive | No insurance schema currently |
| `email_template.csv` | 9 | No direct target | Archive | No email-template model currently |
| `languages.csv` | 3 | No direct target | Ignore/Config | No language management schema currently |
| `notification.csv` | 831 | `FoodNotification` | Direct-ish | Map actor owner type/id plus title/body/isRead/metadata |
| `notification_from_admin.csv` | 1 | `BroadcastNotification` | Direct-ish | Single admin broadcast source |
| `onboarding_screen.csv` | 3 | `AppIntroAd` | Partial | Could reuse intro/ad model; no exact onboarding schema |
| `orders.csv` | 72 | `FoodOrder`, optionally `Payment` / `FoodTransaction` | Partial | Core order migration feasible; payment/dispatch lifecycle needs transformation |
| `order_audit.csv` | 10 | No direct target | Archive | Valuable historical audit but no matching current schema |
| `order_termination_log.csv` | 7 | No direct target | Archive | No direct schema |
| `owner.csv` | 188 | `FoodRestaurant` | Partial | Primary owner data; must be merged with `vendors.csv` |
| `owners.csv` | 48 | `FoodRestaurant` / archive | Partial | Appears to store Aadhaar verification supplement |
| `owner__restaurantCredentials.csv` | 2 | `FoodRestaurant` | Partial | Credentials no longer modeled separately; use for owner email/password history only if needed |
| `product.csv` | 6493 | `FoodItem` (`food_items`) | Direct-ish | Core product mapping is strong; addons/subcategory/variation need transformation |
| `referral.csv` | 642 | `FoodReferralLog`, plus referral fields on users/drivers | Partial | Need entity lookup by role and userId |
| `review_customer.csv` | 8 | `FoodOrder.ratings`, restaurant/driver aggregates | Partial | No standalone review model |
| `role_permissions.csv` | 2 | No direct target | Ignore/Archive | Current admin authorization is code-driven |
| `roles.csv` | 2 | No direct target | Ignore/Archive | No role collection in current schema |
| `settings.csv` | 14 | `FoodBusinessSettings`, `FoodFeeSettings`, `FoodReferralSettings`, `FoodSettings`, `AppConfig`, `FoodPageContent` | Split | Largest transformation area; many keys still have no target |
| `sub_category.csv` | 268 | No direct target | Partial | Fold into category/item/menu or defer |
| `support_chats.csv` | 9 | `FoodSupportTicket` / restaurant or delivery support tickets | Partial | Chat threads do not match ticket-only schema |
| `support_chats__messages.csv` | 139 | No direct target | Archive | Current support models do not store message threads |
| `transaction_log.csv` | 17 | `Transaction` | Direct-ish | Good ledger fit; category mapping required |
| `vendors.csv` | 103 | `FoodRestaurant` | Direct-ish | Main restaurant document source |
| `verify_driver.csv` | 97 | `FoodDeliveryPartner` | Partial | Verification/document supplement |
| `wallet_transaction.csv` | 792 | `FoodUserWallet`, `FoodRestaurantWallet`, `FoodDeliveryWallet`, `Transaction` | Split | Route by `type` / `userId` semantics |
| `withdrawal_history.csv` | 5 | `FoodRestaurantWithdrawal` / `FoodDeliveryWithdrawal` | Direct-ish | Route by withdrawal `type` and owner/driver linkage |
| `zones.csv` | 4 | `FoodZone` | Blocked | Missing required polygon coordinates |

## Entity-Level Mapping

### 1) Admins

Legacy source:

- `admin.csv`

Target:

- `FoodAdmin`

Field mapping:

- `email -> email`
- `password -> password`
- `name -> name`
- `contactNumber -> phone`
- `image -> profileImage`
- `role -> role`
- assume `isActive = true` unless legacy says otherwise

Notes:

- Current schema hashes password on save; migration script should write plain value only if it is truly plain text. If legacy values are already hashed, insert carefully to avoid double-hashing.

### 2) Customers / Users

Legacy source:

- `customers.csv`

Target:

- `FoodUser`
- optionally `FoodUserWallet`

Field mapping:

- `phoneNumber -> phone`
- `countryCode -> countryCode`
- `firstName + lastName -> name`
- `email -> email`
- `profilePic -> profileImage`
- `dateOfBirth -> dateOfBirth`
- `gender -> gender` (normalize values)
- `isActive -> isActive`
- `fcmToken -> fcmTokens[]`
- `userType -> role` if needed, otherwise default `USER`
- `walletAmount -> FoodUserWallet.balance`

Address mapping:

- `customerAddresses[] -> addresses[]`
- `address / locality -> street`
- `addressLine2 -> additionalDetails`
- `name/addressAs -> label or name hint`
- `state -> state`
- `pincode -> zipCode`
- `location.longitude + location.latitude -> location.coordinates`
- phone per address can reuse `phoneNumber`

Notes:

- Legacy export stores one `fcmToken`; current schema supports arrays.
- `searchEmailKeywords`, `searchNameKeywords`, `slug`, `loginType` do not have direct target fields.

### 3) Restaurants

Legacy source:

- `vendors.csv`
- `owner.csv`
- `owners.csv`
- `owner__restaurantCredentials.csv`
- `bank_details.csv` where `ownerId` is present

Primary target:

- `FoodRestaurant`
- optionally `FoodRestaurantWallet`
- optionally `FoodRestaurantWithdrawal`

Core mapping from `vendors.csv`:

- `vendorName -> restaurantName`
- `ownerFullName -> ownerName`
- `ownerId -> temporary legacy owner link`
- `restaurantNumber -> primaryContactNumber`
- `active -> status/isAcceptingOrders` (requires rule)
- `coverImage -> coverImages[0]`
- `logoImage -> profileImage`
- `cuisineName -> cuisines[]`
- `fssai -> fssaiNumber`
- `gstin -> gstNumber`
- `openingHoursList -> openDays/openingTime/closingTime` (transform required)
- `reviewCount -> totalRatings`
- `reviewSum -> rating` after deriving average
- `isSelfDelivery -> business or delivery flag`
- `address.* -> flat address fields + location`
- `position/geopoint + lat/lng -> location.coordinates`

Owner supplements from `owner.csv`:

- `firstName + lastName -> ownerName` if missing
- `email -> ownerEmail`
- `phoneNumber -> ownerPhone`
- `countryCode -> ownerPhone` country prefix support
- `panNumber -> panNumber`
- `profileImage -> profileImage` only if restaurant logo absent
- `fcmToken/fcmTokens -> fcmTokens[]`
- `isVerified -> status approved/pending`
- `walletAmount -> FoodRestaurantWallet.balance`

Bank mapping from `bank_details.csv`:

- `accountNumber -> accountNumber`
- `ifscCode -> ifscCode`
- `holderName -> accountHolderName`
- `upiId -> upiId`
- `upiQrCodeUrl -> upiQrImage`
- `bankName`, `branchCity`, `branchCountry` are partly storable; branch-specific fields have no full dedicated home

Notes:

- Current schema does **not** model a separate restaurant-owner login collection.
- `vendorType` has no direct field unless reused as `businessModel`.
- `customCommission` should likely move to `FoodRestaurantCommission`, not `FoodRestaurant`.

### 4) Delivery Partners / Drivers

Legacy source:

- `driver.csv`
- `driver_users.csv`
- `verify_driver.csv`
- `driver__insurance_data.csv`
- `bank_details.csv` where `driverId` is present

Primary target:

- `FoodDeliveryPartner`
- optionally `FoodDeliveryWallet`
- optionally `FoodDeliveryWithdrawal`

Core mapping from `driver.csv`:

- `firstName + lastName -> name`
- `phoneNumber -> phone`
- `countryCode -> countryCode`
- `email -> email`
- `driverVehicleDetails.vehicleTypeName -> vehicleType`
- `driverVehicleDetails.modelName -> vehicleName`
- `driverVehicleDetails.vehicleNumber -> vehicleNumber`
- `driverVehicleDetails.dlNumber -> drivingLicenseNumber`
- `panCard -> panNumber`
- `aadharCard -> aadharNumber`
- `profileImage -> profilePhoto`
- `fcmToken -> fcmTokens[]`
- `walletAmount -> FoodDeliveryWallet.balance`
- `status/isVerified -> status`
- `isOnline -> availabilityStatus`
- `location.longitude + location.latitude -> lastLocation.coordinates`
- `reviewCount/reviewSum -> totalRatings/rating`

Supplemental verification mapping:

- `driver_users.csv` adds Aadhaar verification timestamps/details
- `verify_driver.csv` contains document verification references
- `bank_details.csv` adds bank/UPI data

Notes:

- `driver__insurance_data.csv` has no current destination.
- `pendingOrderIds`, `notifiedPendingOrderIds.*`, and several dispatch-time runtime fields have no durable target.

### 5) Categories / Subcategories / Cuisine

Legacy source:

- `category.csv`
- `sub_category.csv`
- `cuisine.csv`

Target:

- `FoodCategory`
- optionally `FoodDiningCategory`
- `FoodRestaurant.cuisines[]`

Mapping:

- `category.csv.categoryName -> FoodCategory.name`
- `category.csv.image -> FoodCategory.image`
- `category.csv.active -> FoodCategory.isActive`

Subcategory handling:

- No direct `FoodSubCategory` exists
- options:
  - append subcategory name into item/category naming during product migration
  - convert selected subcategories into menu sections
  - postpone and archive legacy IDs for later schema expansion

Cuisine handling:

- No standalone cuisine model exists
- recommended target: `FoodRestaurant.cuisines[]`
- optional secondary use: convert curated dining cuisines into `FoodDiningCategory`

### 6) Products / Menu Items

Legacy source:

- `product.csv`

Target:

- `FoodItem`
- optionally `FoodAddon`

Field mapping:

- `vendorId -> restaurantId` (via restaurant legacy ID lookup)
- `categoryId -> categoryId`
- `categoryModel.categoryName -> categoryName`
- `productName -> name`
- `description -> description`
- `price -> price`
- `productImage -> image`
- `foodType -> foodType` (`Veg`/`Non-Veg` normalization required)
- `status/inStock -> isAvailable + approvalStatus`
- `preparationTime -> preparationTime`
- `createAt -> createdAt`

Transformations:

- `variationList -> variants[]`
- `addonsList -> FoodAddon` or embed into menu/business logic later
- `discount/discountType` has no direct field on `FoodItem`
- `subCategoryId` has no direct target
- `reviewCount/reviewSum` are not stored on `FoodItem` currently

### 7) Orders

Legacy source:

- `orders.csv`

Target:

- `FoodOrder`
- optionally linked `Payment`
- optionally linked `FoodTransaction`

Core mapping:

- `id/orderNumber -> order_id` or `orderId`
- `customerId -> userId`
- `vendorId -> restaurantId`
- `driverId -> dispatch.deliveryPartnerId`
- `cartItems -> items[]`
- `customerAddress.* -> deliveryAddress.*`
- `subTotal -> pricing.subtotal`
- `deliveryCharge -> pricing.deliveryFee`
- `packagingFee -> pricing.packagingFee`
- `platFormFee -> pricing.platformFee`
- `discount -> pricing.discount`
- `totalAmount -> pricing.total`
- tax totals from `taxList`, `deliveryTaxList`, `tdsAmount`, `tcsAmount` -> `pricing.tax` or transaction metadata
- `paymentType -> payment.method`
- `paymentStatus -> payment.status`
- `pickupOtp -> pickupOtp`
- `deliveryOtp -> deliveryOtp`
- `orderStatus -> orderStatus` (enum normalization required)
- `createdAt -> createdAt`

Dispatch/lifecycle mapping:

- `assignedAt -> dispatch.assignedAt`
- `acceptedAt -> dispatch.acceptedAt`
- `pickedUpAt -> deliveryState.pickedUpAt`
- `deliveredAt -> deliveryState.deliveredAt`
- `broadcastDriverIds`, `rejectedDriverIds` -> `dispatch.offeredTo[]` where possible

Notes:

- Several legacy lifecycle fields have no exact match: `assignmentRings`, `currentRingIndex`, `loopCount`, `parkKickCount`, `restaurantNotifiedStartedAt`, etc.
- Refund-related fields can be partially mapped into `payment.refund.*` and/or standalone `Refund` records later.

### 8) Offers / Coupons

Legacy source:

- `coupon.csv`

Preferred target:

- `FoodOffer`

Field mapping:

- `code -> couponCode`
- `isFix -> discountType` (`true => flat-price`, `false => percentage`)
- `amount -> discountValue`
- `minAmount -> minOrderValue`
- `expireAt -> endDate`
- `active -> status`
- `vendorId -> restaurantId`
- `isVendorOffer -> restaurantScope`
- `title -> couponCode metadata / admin note` if title is not code label
- `isPrivate` has no direct equivalent; can be stored in metadata

Why `FoodOffer` over `Promocode`:

- `FoodOffer` matches current food module naming and supports restaurant scoping better.
- `Promocode` still references `Restaurant` instead of `FoodRestaurant` and requires fields not present in legacy coupon rows.

### 9) Wallets / Transactions / Withdrawals

Legacy source:

- `wallet_transaction.csv`
- `transaction_log.csv`
- `withdrawal_history.csv`

Targets:

- `FoodUserWallet`
- `FoodRestaurantWallet`
- `FoodDeliveryWallet`
- `Transaction`
- `FoodRestaurantWithdrawal`
- `FoodDeliveryWithdrawal`

Mapping approach:

- Use the row `type`, `kind`, and linked entity IDs to determine entity type
- Create normalized `Transaction` rows first
- Rebuild wallet balances from transaction history where possible
- Use legacy `walletAmount` only as fallback seed values

Withdrawal mapping:

- restaurant-linked rows -> `FoodRestaurantWithdrawal`
- driver-linked rows -> `FoodDeliveryWithdrawal`
- `paymentStatus -> status`
- `paymentId -> transactionId`
- bank fields -> nested `bankDetails`
- `adminNote -> adminNote`

Notes:

- `wallet_transaction.csv` mixes several business meanings; category mapping will need a lookup table.

### 10) Referrals

Legacy source:

- `referral.csv`

Targets:

- `FoodReferralLog`
- `FoodUser.referralCode`
- `FoodDeliveryPartner.referralCode`
- `referredBy` on users or delivery partners

Mapping:

- `referralCode` can populate source entity code
- `referralBy` maps to `referrerId` after legacy ID resolution
- `userId` maps to `refereeId`
- `role/referralRole` determine `USER` vs `DELIVERY_PARTNER`

Notes:

- Reward amount is not present in `referral.csv`; it must come from `settings.csv` or default migration policy.

### 11) Notifications

Legacy source:

- `notification.csv`
- `notification_from_admin.csv`

Targets:

- `FoodNotification`
- `BroadcastNotification`

Mapping:

- `title -> title`
- `body/description -> message`
- `isRead -> isRead`
- `createdAt -> createdAt`
- resolve `customerId`, `ownerId`, `driverId`, `vendorId` into `ownerType + ownerId`
- admin-wide messages -> `BroadcastNotification`

Notes:

- Some legacy rows may reference multiple possible owner dimensions; precedence rules are needed during migration.

### 12) Settings / Config

Legacy source:

- `settings.csv`
- `currencies.csv`
- `country_tax.csv`
- `documents.csv`
- `languages.csv`

Targets:

- `FoodBusinessSettings`
- `FoodFeeSettings`
- `FoodReferralSettings`
- `FoodSettings`
- `AppConfig`
- `FoodPageContent`
- possibly custom future config collections

Likely mapping examples:

- `appName -> FoodBusinessSettings.companyName`
- `boss_notification_email -> FoodBusinessSettings.email`
- `customerCareNumber -> FoodBusinessSettings.supportPhone`
- `Address -> FoodBusinessSettings.address`
- `privacyPolicy -> FoodPageContent(key=privacy).legal.content`
- `termsAndConditions -> FoodPageContent(key=terms).legal.content`
- `platformFee/platformFeeActive -> FoodFeeSettings.platformFee`
- `deliveryBonusAmount -> FoodFeeSettings.deliveryBonusAmount`
- `referral_Amount -> FoodReferralSettings.referralRewardUser` (tentative)
- `customerAppColor`, `driverAppColor`, `restaurantAppColor -> AppConfig.primaryColor` per app
- `secondsForOrderCancel` has no current exact field
- payment gateway keys mostly have **no safe current schema destination**

Notes:

- `settings.csv` should be handled as a manual-reviewed migration, not a blind import.

### 13) Zones

Legacy source:

- `zones.csv`

Target:

- `FoodZone`

Available legacy fields:

- `name`
- `area`
- `status`

Blocking issue:

- Current `FoodZone` requires `coordinates[]` polygon data.
- Legacy export does not contain polygon vertices.

Recommendation:

- Do not migrate zones until polygon data is sourced from:
  - old map config
  - Firestore nested subcollections not present in this export
  - frontend/admin GIS source

### 14) Support / Reviews / Content

Support:

- `support_chats.csv` and `support_chats__messages.csv` do not directly fit current ticket-only schemas.
- Recommended approach: archive chats and optionally create summary tickets for active/open threads only.

Reviews:

- `review_customer.csv` should be used to:
  - backfill `FoodOrder.ratings`
  - recalculate `FoodRestaurant.rating` and `FoodDeliveryPartner.rating`
- Standalone review storage is not available in the current schema.

Content:

- `banner.csv`, `advertisements.csv`, `onboarding_screen.csv` can be partly routed into:
  - `AppIntroAd`
  - `FoodHeroBanner`
  - `FoodDiningBanner`
  - `FoodUnder250Banner`
- exact destination depends on product/business meaning of each legacy asset

## Tables That Need Manual Review Before Migration

- `settings.csv`
- `zones.csv`
- `orders.csv`
- `wallet_transaction.csv`
- `transaction_log.csv`
- `owner.csv` + `vendors.csv` merged identity rules
- `driver.csv` + related driver supplemental tables
- `banner.csv`
- `support_chats.csv`

## Suggested Output of the Future Migration Script

When we actually migrate, the script should produce:

- ID lookup maps:
  - legacy customer ID -> new `FoodUser._id`
  - legacy vendor ID -> new `FoodRestaurant._id`
  - legacy driver ID -> new `FoodDeliveryPartner._id`
  - legacy category ID -> new `FoodCategory._id`
  - legacy product ID -> new `FoodItem._id`
  - legacy order ID -> new `FoodOrder._id`

- a skipped-records report
- a field-normalization report
- a missing-reference report
- a post-migration count comparison report

## Recommendation

The safest next step is to build the migration in phases:

1. master entities (`admins`, `users`, `restaurants`, `drivers`)
2. catalog (`categories`, `products`, `offers`)
3. transactional data (`orders`, `wallets`, `transactions`, `withdrawals`)
4. secondary data (`notifications`, `reviews`, `content`)
5. archive-only legacy tables

If you want, I can take this next step and turn the report into a **detailed field-by-field migration spec with legacy column -> target field -> transform rule -> dependency** for each major table.
