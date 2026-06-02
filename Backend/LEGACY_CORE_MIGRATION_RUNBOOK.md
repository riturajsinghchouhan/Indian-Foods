# Legacy Core Migration Runbook

This runbook is for the scoped migration of:

- customers
- restaurants
- delivery partners / drivers
- categories
- products

Script:

- `Backend/scripts/migrate-legacy-core-data.js`

## Modes

- dry-run: reads CSVs and writes JSON reports only
- apply: writes into MongoDB using current backend models

## Commands

From `Backend/`:

- dry-run all scopes  
  `node scripts/migrate-legacy-core-data.js`

- apply all scopes  
  `node scripts/migrate-legacy-core-data.js --apply`

- dry-run selected scopes  
  `node scripts/migrate-legacy-core-data.js --scopes=users,restaurants,categories`

- apply selected scopes  
  `node scripts/migrate-legacy-core-data.js --apply --scopes=users,restaurants,drivers,categories,products`

## Required Environment

The apply mode uses the normal backend DB config:

- install backend dependencies first with `npm install`
- `MONGO_URI` or `MONGODB_URI`

Dry-run mode does not require DB access.

## Output

Each run writes to:

- `migration-output/legacy-core/<timestamp>/`

Main output files:

- `migration-summary.json`
- `legacy-id-map.json`
- `users-migration-result.json`
- `restaurants-migration-result.json`
- `drivers-migration-result.json`
- `categories-migration-result.json`
- `products-migration-result.json`

## Migration Rules Implemented

### Users

- upsert key: phone
- address list migrated from `customerAddresses`
- wallet data ignored in this phase

### Restaurants

- base row source: `vendors.csv`
- enrichment sources: `owner.csv`, `owners.csv`, `owner__restaurantCredentials.csv`, `bank_details.csv`
- upsert key: normalized restaurant name + owner phone last 10 digits
- `status`: `approved` when legacy owner/vendor appears verified, otherwise `pending`
- `isAcceptingOrders`: `active && isOnline`
- menu is not migrated as a separate snapshot; current app derives menu from `FoodItem`

### Drivers

- base row source: `driver.csv`
- enrichment sources: `driver_users.csv`, `verify_driver.csv`, `bank_details.csv`
- upsert key: phone, fallback vehicle number
- `status`: `approved` when verified, otherwise `pending`

### Categories

- global categories only
- upsert key: normalized category name

### Products

- depends on migrated restaurants and categories
- upsert key: `restaurantId + categoryId + normalized name`
- `variationList` is flattened into `FoodItem.variants`
- `addonsList` is reported in output notes but not linked, because current `FoodItem` has no direct product-addon relation
- `sub_category.csv` is preserved in output notes only

## Recommended Execution Order

1. run dry-run for all scopes
2. inspect skipped and error JSON files
3. run apply for:
   - `users`
   - `restaurants`
   - `drivers`
   - `categories`
4. run apply for `products`
5. verify records in admin and API

## Notes

- The script is designed to be rerunnable.
- It uses model-level upserts based on natural keys, not legacy IDs stored in MongoDB.
- If you want exact legacy-to-new traceability inside MongoDB documents, that would require a schema change or a dedicated migration audit collection.
