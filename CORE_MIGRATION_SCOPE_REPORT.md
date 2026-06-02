# Core Migration Scope Report

Date: 2026-06-02

## Scope

This report covers **only** the legacy data we want to migrate right now from `indian bites data/` into the current backend schema:

- customers
- restaurants
- delivery partners / drivers
- restaurant menu
- categories
- products

This report excludes:

- orders
- wallets / transactions / withdrawals
- offers / coupons
- notifications
- settings
- zones
- audits / logs
- support chats
- content / banners / ads

## Legacy Files Included In This Scope

| Legacy file | Rows | Purpose |
|---|---:|---|
| `customers.csv` | 333 | customer/user master data |
| `vendors.csv` | 103 | restaurant master data |
| `owner.csv` | 188 | restaurant owner data |
| `owners.csv` | 48 | owner Aadhaar verification supplement |
| `owner__restaurantCredentials.csv` | 2 | restaurant credential supplement |
| `bank_details.csv` | 157 | restaurant + driver bank data |
| `driver.csv` | 63 | delivery partner master data |
| `driver_users.csv` | 94 | driver Aadhaar verification supplement |
| `verify_driver.csv` | 97 | driver document verification supplement |
| `category.csv` | 464 | food categories |
| `sub_category.csv` | 268 | subcategory support for products/menu |
| `product.csv` | 6493 | products / menu items |
| `cuisine.csv` | 29 | cuisine labels for restaurants |

## Current Target Collections

| Current collection | Model | Purpose |
|---|---|---|
| `food_users` | `FoodUser` | customers |
| `food_restaurants` | `FoodRestaurant` | restaurants |
| `food_delivery_partners` | `FoodDeliveryPartner` | drivers |
| `food_categories` | `FoodCategory` | categories |
| `food_items` | `FoodItem` | products / menu items |
| `food_restaurant_menus` | `FoodRestaurantMenu` | optional restaurant menu grouping |
| `food_addons` | `FoodAddon` | optional addon migration |

## Executive Summary

This migration scope is feasible and can be done in a clean dependency order:

1. customers
2. restaurants
3. delivery partners
4. categories
5. products / restaurant menu

The biggest transformation work is in:

- merging restaurant data from multiple legacy files into one current restaurant document
- merging driver data from multiple legacy files into one current delivery partner document
- deciding how to handle `sub_category.csv`
- converting legacy `variationList` and `addonsList` in `product.csv`

## Recommended Migration Order

1. `customers.csv`
2. `vendors.csv` + `owner.csv` + `owners.csv` + `owner__restaurantCredentials.csv` + restaurant rows from `bank_details.csv`
3. `driver.csv` + `driver_users.csv` + `verify_driver.csv` + driver rows from `bank_details.csv`
4. `category.csv`
5. `product.csv`
6. optional post-step: `sub_category.csv` and `cuisine.csv` refinements

## Entity Mapping

### 1) Customers

Legacy source:

- `customers.csv`

Target:

- `FoodUser`

Current model:

- `Backend/src/core/users/user.model.js:68`

Field mapping:

| Legacy field | Target field | Notes |
|---|---|---|
| `phoneNumber` | `phone` | required |
| `countryCode` | `countryCode` | default `+91` if empty |
| `firstName` + `lastName` | `name` | concatenate and trim |
| `email` | `email` | optional |
| `profilePic` | `profileImage` | optional |
| `dateOfBirth` | `dateOfBirth` | convert to valid date |
| `gender` | `gender` | normalize to `male`, `female`, `other`, or empty |
| `isActive` | `isActive` | default `true` if missing |
| `fcmToken` | `fcmTokens[]` | wrap single token into array |
| `userType` | `role` | usually migrate as `USER` |

Address mapping from `customerAddresses`:

| Legacy field | Target field | Notes |
|---|---|---|
| `address` / `locality` | `addresses[].street` | choose best available line |
| `addressLine2` | `addresses[].additionalDetails` | optional |
| `state` | `addresses[].state` | required if available |
| `pincode` | `addresses[].zipCode` | string |
| `phoneNumber` | `addresses[].phone` | reuse user phone if needed |
| `location.longitude` + `location.latitude` | `addresses[].location.coordinates` | order must be `[lng, lat]` |
| `isDefault` | `addresses[].isDefault` | boolean |
| `addressAs` / `name` | `addresses[].label` | map to `Home`, `Office`, or `Other` where possible |

Fields not needed in current schema:

- `searchEmailKeywords`
- `searchNameKeywords`
- `slug`
- `loginType`
- `walletAmount`

Notes:

- `walletAmount` is out of scope for this migration.
- We should preserve legacy `_id` and `id` in a migration lookup table, not in the main document.

### 2) Restaurants

Legacy sources:

- `vendors.csv`
- `owner.csv`
- `owners.csv`
- `owner__restaurantCredentials.csv`
- `bank_details.csv` where `ownerId` exists
- `cuisine.csv` as optional label support

Target:

- `FoodRestaurant`

Current model:

- `Backend/src/modules/food/restaurant/models/restaurant.model.js:29`

Primary source of truth:

- `vendors.csv` should drive restaurant creation
- `owner.csv` should enrich owner/contact/KYC fields
- `bank_details.csv` should enrich bank/UPI fields

Core mapping from `vendors.csv`:

| Legacy field | Target field | Notes |
|---|---|---|
| `vendorName` | `restaurantName` | required |
| `ownerFullName` | `ownerName` | fallback to owner file if missing |
| `restaurantNumber` | `primaryContactNumber` | restaurant contact |
| `coverImage` | `coverImages[0]` | initialize array |
| `logoImage` | `profileImage` | optional |
| `cuisineName` | `cuisines[]` | split/normalize if multiple |
| `fssai` | `fssaiNumber` | optional |
| `gstin` | `gstNumber` | optional |
| `reviewCount` | `totalRatings` | numeric |
| `reviewSum` | `rating` | derive average if count exists |
| `vendorType` | `businessModel` | optional |
| `isSelfDelivery` | custom migration note | current schema has no exact direct field |
| `active` | `isAcceptingOrders` / `status` | requires migration rule |

Address and geo mapping from `vendors.csv`:

| Legacy field | Target field | Notes |
|---|---|---|
| `address.address` | `addressLine1` | primary address line |
| `address.addressLine2` | `addressLine2` | optional |
| `address.locality` | `area` | optional |
| `address.state` | `state` | optional |
| `address.pincode` | `pincode` | string |
| `address.landmark` | `landmark` | optional |
| `address.location.latitude` | `location.latitude` | optional mirror |
| `address.location.longitude` | `location.longitude` | optional mirror |
| `address.location.longitude` + `address.location.latitude` | `location.coordinates` | `[lng, lat]` |

Owner enrichment from `owner.csv`:

| Legacy field | Target field | Notes |
|---|---|---|
| `firstName` + `lastName` | `ownerName` | use if vendor owner name missing |
| `email` | `ownerEmail` | optional |
| `phoneNumber` | `ownerPhone` | optional |
| `countryCode` | owner phone normalization | keep with phone |
| `panNumber` | `panNumber` | optional |
| `profileImage` | fallback `profileImage` | only if vendor logo absent |
| `fcmToken` / `fcmTokens` | `fcmTokens[]` | normalize to array |
| `isVerified` | `status` | approved/pending mapping |

Bank enrichment from `bank_details.csv`:

| Legacy field | Target field | Notes |
|---|---|---|
| `accountNumber` | `accountNumber` | optional |
| `ifscCode` | `ifscCode` | optional |
| `holderName` | `accountHolderName` | optional |
| `upiId` | `upiId` | optional |
| `upiQrCodeUrl` | `upiQrImage` | optional |

Credential supplement from `owner__restaurantCredentials.csv`:

Use only as support data for:

- owner email validation
- vendor linkage confirmation

Do not migrate directly into the current restaurant collection as a separate credential record, because the current schema does not model restaurant auth credentials here.

Fields with no clean target:

- `customCommission.*`
- `adminDiscount.*`
- `packagingFee.*`
- `userType`
- `likedUser`
- `verifyDocument`

Notes:

- `openingHoursList` needs transformation into `openDays`, `openingTime`, and `closingTime`.
- `owners.csv` appears to be Aadhaar verification supplement and can be used only if needed for verification status checks.

### 3) Delivery Partners / Drivers

Legacy sources:

- `driver.csv`
- `driver_users.csv`
- `verify_driver.csv`
- `bank_details.csv` where `driverId` exists

Target:

- `FoodDeliveryPartner`

Current model:

- `Backend/src/modules/food/delivery/models/deliveryPartner.model.js:8`

Primary source of truth:

- `driver.csv` should drive delivery partner creation
- `driver_users.csv`, `verify_driver.csv`, and `bank_details.csv` should enrich verification and banking fields

Core mapping from `driver.csv`:

| Legacy field | Target field | Notes |
|---|---|---|
| `firstName` + `lastName` | `name` | required |
| `phoneNumber` | `phone` | required |
| `countryCode` | `countryCode` | default `+91` if missing |
| `email` | `email` | optional |
| `driverVehicleDetails.vehicleTypeName` | `vehicleType` | optional |
| `driverVehicleDetails.modelName` | `vehicleName` | optional |
| `driverVehicleDetails.vehicleNumber` | `vehicleNumber` | unique if present |
| `driverVehicleDetails.dlNumber` | `drivingLicenseNumber` | optional |
| `panCard` | `panNumber` | optional |
| `aadharCard` | `aadharNumber` | optional |
| `profileImage` | `profilePhoto` | optional |
| `fcmToken` | `fcmTokens[]` | wrap to array |
| `isOnline` | `availabilityStatus` | `true => online`, else `offline` |
| `reviewCount` | `totalRatings` | numeric |
| `reviewSum` | `rating` | derive average if count exists |
| `location.longitude` + `location.latitude` | `lastLocation.coordinates` | `[lng, lat]` |
| `location.latitude` | `lastLat` | optional |
| `location.longitude` | `lastLng` | optional |

Status mapping:

| Legacy field | Target field | Notes |
|---|---|---|
| `isVerified` | `status` | `true => approved`, else `pending` |
| `active` | status support | can also influence approved vs rejected/pending |

Bank enrichment from `bank_details.csv`:

| Legacy field | Target field | Notes |
|---|---|---|
| `holderName` | `bankAccountHolderName` | optional |
| `accountNumber` | `bankAccountNumber` | optional |
| `ifscCode` | `bankIfscCode` | optional |
| `bankName` | `bankName` | optional |
| `upiId` | `upiId` | optional |
| `upiQrCodeUrl` | `upiQrCode` | optional |

Verification supplements:

- `driver_users.csv` can support Aadhaar verification-related flags
- `verify_driver.csv` can support document verification review

Fields with no clean target:

- `pendingOrderIds`
- `notifiedPendingOrderIds.*`
- `rotation`
- `orderId`
- `walletAmount`
- insurance data from `driver__insurance_data.csv` if we keep this scope strict

Notes:

- `walletAmount` is out of scope and should not be migrated now.
- `driver__insurance_data.csv` is excluded from this report because it has no direct target in the current scope.

### 4) Categories

Legacy sources:

- `category.csv`
- optionally `sub_category.csv`

Target:

- `FoodCategory`

Current model:

- `Backend/src/modules/food/admin/models/category.model.js:3`

Core mapping:

| Legacy field | Target field | Notes |
|---|---|---|
| `categoryName` | `name` | required |
| `image` | `image` | optional |
| `active` | `isActive` | boolean |

Migration defaults:

| Target field | Suggested value |
|---|---|
| `type` | `''` |
| `foodTypeScope` | `Both` |
| `approvalStatus` | `approved` |
| `isApproved` | `true` |
| `sortOrder` | `0` |

About `sub_category.csv`:

- There is no current `FoodSubCategory` model.
- Do **not** migrate it into `FoodCategory` as separate category rows without review.
- Better options:
  - use subcategory names only while shaping menu sections
  - preserve legacy subcategory IDs in product migration lookup tables
  - defer full subcategory migration unless a new schema is added

### 5) Products / Restaurant Menu

Legacy sources:

- `product.csv`
- `sub_category.csv`

Targets:

- `FoodItem`
- optionally `FoodRestaurantMenu`
- optionally `FoodAddon`

Current models:

- `Backend/src/modules/food/admin/models/food.model.js:11`
- `Backend/src/modules/food/restaurant/models/restaurantMenu.model.js:3`
- `Backend/src/modules/food/restaurant/models/foodAddon.model.js:3`

Core mapping from `product.csv` to `FoodItem`:

| Legacy field | Target field | Notes |
|---|---|---|
| `vendorId` | `restaurantId` | resolve via restaurant legacy ID map |
| `categoryId` | `categoryId` | resolve via category legacy ID map |
| `categoryModel.categoryName` | `categoryName` | fallback text |
| `productName` | `name` | required |
| `description` | `description` | optional |
| `price` | `price` | numeric |
| `productImage` | `image` | optional |
| `foodType` | `foodType` | normalize to `Veg` or `Non-Veg` |
| `inStock` / `status` | `isAvailable` | boolean rule required |
| `preparationTime` | `preparationTime` | optional |
| `createAt` | `createdAt` | preserve if valid |

Variation mapping:

| Legacy field | Target field | Notes |
|---|---|---|
| `variationList` | `variants[]` | convert each variation into `{ name, price }` |

Addon handling:

| Legacy field | Suggested target | Notes |
|---|---|---|
| `addonsList` | `FoodAddon` or deferred | depends on addon structure quality |

Subcategory handling:

| Legacy field | Suggested handling | Notes |
|---|---|---|
| `subCategoryId` | preserve as migration metadata | no direct schema field |
| `subCategoryModel.subCategoryName` | optional menu section label | useful for menu grouping |

Fields with no clean target:

- `discount`
- `discountType`
- `likedUser`
- `maxQuantity`
- `reviewCount`
- `reviewSum`
- `searchKeywords`

Restaurant menu note:

- If the app currently depends on grouped menu sections, we can generate `FoodRestaurantMenu` records using:
  - category name as top-level section
  - subcategory name as optional subsection label
- If not required, we can migrate products only into `FoodItem` and build menu grouping later from categories.

## Key Dependencies

The migration depends on these lookup maps being created first:

- legacy customer ID -> new user `_id`
- legacy owner ID -> owner enrichment lookup
- legacy vendor ID -> new restaurant `_id`
- legacy driver ID -> new delivery partner `_id`
- legacy category ID -> new category `_id`
- legacy subcategory ID -> optional subcategory lookup

Products cannot be migrated safely before:

- restaurants are migrated
- categories are migrated

## Rules To Finalize Before Migration

We should confirm these migration rules before writing scripts:

1. how `active` maps to restaurant `status` and `isAcceptingOrders`
2. how `isVerified` maps to restaurant and driver approval statuses
3. whether `sub_category.csv` is ignored, archived, or used for menu grouping
4. whether `addonsList` becomes `FoodAddon` or is deferred
5. whether `openingHoursList` is transformed into a simple daily schedule or stored minimally

## Recommended Deliverables For The Migration Script

For this limited migration scope, the future script should produce:

- `users-migration-result.json`
- `restaurants-migration-result.json`
- `drivers-migration-result.json`
- `categories-migration-result.json`
- `products-migration-result.json`
- `legacy-id-map.json`
- `skipped-records.json`
- `validation-errors.json`

## Final Recommendation

This scoped migration is a good first phase because it covers the platform’s core master data without touching the riskier financial and order-history tables.

The cleanest implementation plan is:

1. migrate customers
2. migrate restaurants
3. migrate drivers
4. migrate categories
5. migrate products
6. optionally generate restaurant menu groupings from category/subcategory data

If you want, I can next create a **very detailed field-by-field mapping sheet** for just:

- `customers.csv`
- `vendors.csv`
- `driver.csv`
- `category.csv`
- `product.csv`

or I can start scaffolding the actual migration scripts for this scoped set.
