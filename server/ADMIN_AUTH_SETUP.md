# WellCare administrator authentication setup

The Admin Console uses database-backed accounts and opaque server-side sessions. There is no environment-variable login fallback.

## 1. Create the first owner once

Temporarily add these values to `server/.env`:

```env
ADMIN_BOOTSTRAP_EMAIL=owner@example.com
ADMIN_BOOTSTRAP_PASSWORD=replace-with-a-strong-password
ADMIN_TOKEN_SECRET=replace-with-a-long-random-secret
```

From the `server` directory, run:

```powershell
npm run admin:bootstrap
```

Remove `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` immediately after the owner is created. Keep `ADMIN_TOKEN_SECRET`; it protects short-lived recovery codes.

The bootstrap command refuses to run after an owner already exists.

## 2. Develop without external email

```env
EMAIL_PROVIDER=console
```

Invitation links and recovery codes are previewed in the server terminal. This provider cannot run when `NODE_ENV=production`.

## 3. Enable Resend

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_replace_me
EMAIL_FROM="WellCare Security <onboarding@resend.dev>"
CLIENT_URL=http://localhost:8080
```

Without a verified custom domain, `onboarding@resend.dev` can deliver only to the email registered on the Resend account. Resend test recipients can be used to simulate delivery, bounce, complaint, and suppression events.

After a WellCare domain is verified, change only the sender:

```env
EMAIL_FROM="WellCare Security <security@auth.yourdomain.com>"
```

## Security behavior

- Only the owner can invite, suspend, restore, or revoke administrators.
- The owner cannot be modified through regular account-management actions.
- Password recovery codes expire after 10 minutes, allow five attempts, and are stored only as keyed hashes.
- Invitation links expire after 24 hours and are single-use.
- Password changes, suspensions, and revocations invalidate all existing sessions.
- Admin sessions are stored as hashes and delivered in `HttpOnly`, `SameSite=Strict` cookies (`Secure` in production).
- Administrative authentication and access-management events are written to the audit log.
