# Central Instagram + TikTok bot handoff

Use the existing @Insightseditorall_bot and the existing OxaPay merchant in the Instagram project. This TikTok project only issues TikTok keys and supplies its APK. Never change the Telegram webhook without coordination. No new bot, merchant, or payment gateway.

## Shared product prices

| Plan ID | Duration | USD price (both products) |
| --- | --- | --- |
| day | 1 day | $1 |
| week | 7 days | $5 |
| month | 30 days | $10 |
| lifetime | No expiry | $25 |

Instagram owns price enforcement and payment verification. The TikTok mint endpoint is not a payment verifier and accepts no payment amount.

## TikTok fulfillment request

POST `https://ttttttttttttttttttttttttttt.lovable.app/api/public/bot/tiktok-key`

Headers:

- `Content-Type: application/json`
- `x-bot-internal-secret`: load `BOT_INTERNAL_SECRET` inside the Instagram server handler. Never send it to browsers, logs, or chat.

```json
{
  "product": "tiktok",
  "order_id": "7af91985-14ae-4d49-8563-f1e0cbd8b844",
  "plan_id": "month",
  "telegram_chat_id": "8766641148"
}
```

- `product`: send `tiktok` explicitly. An explicit `instagram` value is rejected. Omitted product defaults to TikTok for legacy callers.
- `order_id`: UUID belonging to the verified paid TikTok order; preserve it on every retry.
- `plan_id`: one of `day`, `week`, `month`, `lifetime`.
- `telegram_chat_id`: buyer's chat ID as a string of up to 20 digits, optionally prefixed with minus. Deliver to the same saved buyer, not an admin.

HTTP 200 response shape (values below are descriptive placeholders):

```json
{
  "product": "tiktok",
  "key_code": "TT-<20 uppercase hexadecimal characters>",
  "expires_at": "<UTC ISO timestamp, or null for lifetime>",
  "reused": false
}
```

Expiry starts at initial key minting, not at payment creation. The key is active, non-admin, and valid in this TikTok app. Device limits on unrelated keys are unchanged.

## Atomic retries

The service-role-only database transaction reserves the unique order and locks it before inserting a key. Parallel requests for the same order return the same persisted key; no losing request inserts an orphan key. Key and order linking commit together or roll back together.

Repeated requests return the original key and expiry with `reused: true`. Changed plan or buyer for the same UUID returns `409` with `{"error":"order conflict"}`. Expired/revoked keys remain the original key on retries; retries do not renew or reactivate them.

Keep a durable paid-but-pending order state. Retry network failures and temporary 5xx with bounded exponential backoff and jitter (for example 2, 5, 10, 20 seconds). Always retain the original UUID and immutable order fields. Do not ask the buyer to pay again after a fulfillment failure.

Errors are JSON `{ "error": "message" }`:

- 400: invalid request / bad JSON — correct input; do not blind retry.
- 401: missing/wrong internal secret — correct safe server configuration.
- 409: conflicting order details — manual reconciliation; do not create another UUID.
- 500: key creation failed / key unavailable — same-order retry, then pending fulfillment.
- 503: secret not configured — wait for configuration correction.

## Product-specific delivery

Store `product`, order UUID, selected plan, verified payment, buyer chat ID, returned key, and delivery state together in Instagram. Only call this endpoint after independently verifying a paid TikTok order. Validate `response.product === "tiktok"` and the TT- key format before delivery.

TikTok APK CDN URL:

`https://ttttttttttttttttttttttttttt.lovable.app/__l5e/assets-v1/1c550d8a-876d-49f4-a42e-16d76f9d6325/TikTok.apk`

Download verified: HTTP 200, 146038 bytes, ZIP/APK signature. No Telegram file_id was verified in this task. Upload this APK through the existing central bot and save `result.document.file_id` separately from Instagram's APK file ID. Reuse that bot-specific TikTok file ID for TikTok deliveries.

TikTok order => TikTok APK + this endpoint's TikTok key.
Instagram order => existing Instagram APK + existing Instagram key fulfillment.

Keep separate product handlers and APK identifiers; never fall back to the other product's APK/key. A failed Telegram send retries delivery with the already stored key. Deduplicate Telegram delivery separately from key minting.

## Ownership and acceptance checks

Live endpoint verification passed on 2026-11-07 UTC: 12 concurrent requests for each of four plans, stable retry key/expiry, changed plan/buyer rejection, explicit Instagram rejection, unauthenticated rejection. Database readback confirmed exactly four keys for four concurrent-test orders, with no orphan duplicates. A newly minted key successfully logged into the published app and passed its guard after reload. Verification-only keys were revoked. APK CDN download passed. Basic security checks found no issues; deep code analysis was not run.

Payment flow and merchant stay in Instagram. Webhook was not changed here. Run an actual central-bot paid order per product after Instagram implements selection and delivery; neither paid checkout nor Android installation is verified by this handoff alone.