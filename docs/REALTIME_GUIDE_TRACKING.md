# WellCare real-time guide tracking

## Scope

This subsystem makes the guide browser the location producer and the assigned customer the authorized consumer during the existing active booking lifecycle (`accepted`, `arrived`, and `in_progress`). It does not create a separate ride state machine and does not change the scheduled-booking lifecycle. A scheduled reservation starts using the same tracking channel only after it activates into the normal ride lifecycle.

## Data flow

1. `GuideLocationProvider` owns the only guide-side `watchPosition` subscription.
2. A fresh sample is sent to Socket.IO with an increasing sequence number while the guide is online.
3. The server authenticates the JWT, confirms that the guide is approved/online, validates the sample, and verifies assignment when a booking ID is present.
4. The latest guide and booking snapshots are stored in Redis with a short TTL. MongoDB receives a throttled durability checkpoint rather than every GPS sample.
5. Only the booking owner and assigned guide may join `booking:<id>`.
6. The customer animates accepted coordinates immediately. REST snapshot polling is used only when the socket is disconnected.
7. Booking lifecycle changes are broadcast to personal actor rooms so dashboards refresh immediately; their existing polling remains a reconciliation safety net.

## Required production services

- A single HTTPS origin for the deployed web client. Browser geolocation is unavailable on insecure remote origins.
- Redis configured through `REDIS_URL`. The in-memory fallback is intentionally limited to one local backend process.
- A reverse proxy/load balancer that passes WebSocket upgrades. With the Redis Streams adapter, multiple backend instances share events and connection-state recovery.
- Existing MongoDB and Google Maps/Routes configuration.

## Environment variables

Configure the values documented in `server/.env.example`:

- `REDIS_URL`: production Redis connection URL.
- `SOCKET_ALLOWED_ORIGINS`: comma-separated exact frontend origins.
- `SOCKET_REDIS_STREAM` and `SOCKET_REDIS_STREAM_MAXLEN`: shared adapter stream settings.
- `TRACKING_LOCATION_TTL_SECONDS`: latest-location expiry (default 45 seconds).
- `TRACKING_MIN_INTERVAL_MS`: server-side per-socket rate limit.
- TRACKING_MONGO_CHECKPOINT_MS: MongoDB checkpoint interval.
- TRACKING_GUIDE_RECHECK_MS: bounded MongoDB eligibility recheck interval; booking assignment is cached in Redis and removed on lifecycle teardown.
- `TRACKING_MAX_ACCURACY_METERS`: threshold for degraded GPS quality.
- `TRACKING_MAX_SPEED_MPS`: implausible movement rejection threshold.

`VITE_SOCKET_URL` is optional. Leave it unset when the API/WebSocket is available on the same origin or through Vite's `/socket.io` proxy. Set it to the public backend origin only for split-origin deployment.

## Security and integrity rules

- Socket connections require the existing customer or guide JWT and an exact role claim.
- Room membership is authorized against MongoDB; knowing a booking ID is insufficient.
- Only the currently assigned guide can publish booking coordinates.
- Tracking is accepted only in active ride states.
- Latitude, longitude, accuracy, timestamp, and sequence are validated.
- Older samples and physically implausible jumps are rejected.
- Location data expires automatically and is deleted when tracking ends.
- Socket payload size and event frequency are bounded.

## Browser behavior

A connected socket does not imply fresh GPS. Both sides show delayed/degraded tracking when samples expire or accuracy is weak. Browsers can suspend background tabs, especially on iOS, so the guide UI explicitly asks the guide to keep the active trip visible. Native apps can later replace only the location producer while retaining the server protocol and customer experience.

## Chrome DevTools Sensors test

1. Start MongoDB and the server. Redis may be omitted for a one-process local test; production must use Redis.
2. Start the Vite client and sign in as the customer and guide in separate browser profiles/tabs.
3. Put the approved guide online and create/accept a normal booking, or activate a scheduled booking into `accepted`.
4. In the guide tab open DevTools, then **More tools > Sensors**.
5. Select **Location > Other** and enter a coordinate near the pickup point. Set both fields before taking the guide online so the new availability session establishes the intended baseline.
6. Change latitude/longitude in small, physically plausible steps every 3–5 seconds. DevTools applies each field separately, so finish editing both promptly; an intermediate impossible jump is expected to be rejected rather than displayed.
7. Verify the guide marker moves smoothly to the same acknowledged coordinate on both screens. Manual map pan remains untouched; use the locate button to recenter when desired.
8. Verify the customer status changes to delayed after fresh samples stop, then returns to live after a new valid sample.
9. Move through `arrived`, PIN verification / `in_progress`, and `completed`; verify the route changes to drop-off and tracking closes after completion.
10. Temporarily disable the network, move the simulated position, and restore it. Verify reconnection plus REST reconciliation without duplicate ride-state transitions.

## Mobile browser test

Use an HTTPS deployment, grant precise location permission at both the OS and browser/site levels, keep the guide trip page foregrounded, and disable battery-saving restrictions for the test. A LAN URL such as `http://192.168.x.x` is not a secure context and cannot be used to judge production geolocation behavior.

## Operational metrics to add before public launch

Track socket connections/reconnections, rejected GPS samples by code, last-location age, Redis errors, Mongo checkpoint failures, room authorization failures, and active bookings without a fresh guide sample. Alert on sustained Redis fallback or elevated stale-location rates.
