# CORS origins – Domain configuration

## What is CORS?

**CORS (Cross-Origin Resource Sharing)** is a browser security rule. When your frontend (e.g. `https://admin.xelnova.com`) calls your API (`https://api.xelnova.com`), the browser sends an `Origin` header. The API can reply with `Access-Control-Allow-Origin` to say which origins are allowed. If the request’s origin isn’t in that list, the browser blocks the response and your frontend can’t read it.

So: **CORS origins = the list of frontend domains that are allowed to call your API.**

## What to put in `CORS_ORIGINS`

Set it to the **exact** URLs where your apps run, separated by commas (no spaces):

- **Storefront (web):** `https://xelnova.com` or `https://www.xelnova.com` (use the one you actually use)
- **Admin dashboard:** `https://admin.xelnova.com` or `https://xelnova.com/admin`
- **Seller dashboard:** `https://seller.xelnova.com` or `https://xelnova.com/seller`

### Example

If your API is at `https://api.xelnova.com` and your apps are:

- Store: `https://xelnova.com`
- Admin: `https://admin.xelnova.com`
- Seller: `https://seller.xelnova.com`

then set:

```env
CORS_ORIGINS="https://xelnova.online,https://admin.xelnova.online,https://seller.xelnova.online"
```

## Notes

- Use **HTTPS** in production (no `http://`).
- No trailing slashes: use `https://xelnova.com` not `https://xelnova.com/`.
- If you use `www`, include both if both are used:  
  `CORS_ORIGINS="https://xelnova.com,https://www.xelnova.com,..."`
- For local development, your `.env` (not production) might have:  
  `CORS_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:3002"`

After changing `CORS_ORIGINS`, restart the backend so the new value is applied.
