# CORS_ORIGINS

**CORS (Cross-Origin Resource Sharing)** is a browser security rule. When your frontend (e.g. `https://admin.xelnova.in`) calls your API (`https://api.xelnova.in`), the browser sends an `Origin` header. The API can reply with `Access-Control-Allow-Origin` to say which origins are allowed. If the request's origin isn't in that list, the browser blocks the response and your frontend can't read it.

## What origins do you need?

Your production origins:

- **Storefront (web):** `https://xelnova.in` or `https://www.xelnova.in` (use the one you actually use)
- **Admin dashboard:** `https://admin.xelnova.in`
- **Seller dashboard:** `https://seller.xelnova.in`

## Setting CORS_ORIGINS

If your API is at `https://api.xelnova.in` and your apps are:

- Store: `https://xelnova.in`
- Admin: `https://admin.xelnova.in`
- Seller: `https://seller.xelnova.in`

Set in your backend `.env`:

```
CORS_ORIGINS="https://xelnova.in,https://www.xelnova.in,https://seller.xelnova.in,https://admin.xelnova.in"
```

### Tips

- No trailing slashes: use `https://xelnova.in` not `https://xelnova.in/`.
- Include `www` if you use it:
  `CORS_ORIGINS="https://xelnova.in,https://www.xelnova.in,..."`
- For local development, add `http://localhost:3000,http://localhost:3002,http://localhost:3003`.
