## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `first_name` | `text` |  Nullable |
| `last_name` | `text` |  Nullable |
| `full_name` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `slug` | `text` |  Unique |
| `description` | `text` |  Nullable |
| `category` | `_text` |  Nullable |
| `base_price` | `int4` |  |
| `images` | `_text` |  Nullable |
| `sizes` | `jsonb` |  Nullable |
| `is_available` | `bool` |  Nullable |
| `is_bestseller` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `orders`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `status` | `text` |  Nullable |
| `total_amount` | `int4` |  |
| `delivery_address` | `text` |  Nullable |
| `delivery_date` | `date` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `delivery_fee` | `int4` |  |
| `delivery_zone_id` | `uuid` |  |
| `subtotal` | `int4` |  |
| `tax` | `numeric` |  Nullable |
| `total` | `int4` |  |
| `updated_at` | `timestamptz` |  Nullable |

## Table `order_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_id` | `uuid` |  Nullable |
| `product_id` | `uuid` |  Nullable |
| `size` | `text` |  Nullable |
| `quantity` | `int4` |  Nullable |
| `unit_price` | `int4` |  Nullable |
| `custom_details` | `jsonb` |  Nullable |
| `color` | `text` |  Nullable |
| `decorations` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `flavor` | `text` |  Nullable |
| `icing` | `varchar` |  Nullable |
| `image` | `bytea` |  Nullable |
| `name` | `text` |  Nullable |
| `price` | `int4` |  Nullable |
| `item_type` | `text` |  Nullable |
| `reference_photo_url` | `text` |  Nullable |

## Table `cart_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `product_id` | `uuid` |  Nullable |
| `size` | `text` |  Nullable |
| `quantity` | `int4` |  Nullable |
| `custom_details` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `color` | `text` |  Nullable |
| `decorations` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `flavor` | `varchar` |  Nullable |
| `icing` | `varchar` |  Nullable |
| `image` | `bytea` |  Nullable |
| `name` | `text` |  Nullable |
| `price` | `int4` |  Nullable |
| `type` | `text` |  Nullable |

## Table `preview_rate_limits`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `actor_key` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `admin_users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `created_at` | `timestamptz` |  Nullable |

## Table `wishlists`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `item_slug` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `reviews`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `item_slug` | `text` |  |
| `rating` | `int4` |  |
| `body` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `delivery_zones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `label` | `text` |  |
| `delivery_fee` | `int4` |  |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  Nullable |

