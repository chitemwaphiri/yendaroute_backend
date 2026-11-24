# Frontend API Compatibility Audit

**Contract:** `Group-ff1/docs/frontend_api_contract.md`  
**Audit scope:** Current YendaRoute backend source and working-tree state  
**Stage:** 1 — baseline audit; no application code changed in this stage

## Summary

The backend already has most of the contract's controller paths and several
useful response mappers, including route, schedule, vehicle, notification, and
booking serializers. The implementation is **not yet fully compatible**.
Important remaining gaps are request validation and Swagger required flags,
booking/payment ownership and lifecycle behavior, endpoint/response differences,
and unsafe runtime schema synchronization.

The audit reflects source inspection, not proof that every endpoint works
against a populated database. Existing automated tests are mostly module
instantiation tests; the only end-to-end test exercises `/`.

The endpoint matrix and findings below describe the initial audit baseline.
Progress sections at the end of this report track subsequent implementation
and validation.

## Endpoint compatibility matrix

“Present” means a controller route is defined. It does not imply the complete
request/response flow has passed an integration test.

| Contract operation | Current backend | Audit result |
|---|---|---|
| `POST /auth/register` | Present | Registration fixes role to `passenger`; account serializer uses string ID. |
| `POST /auth/login` | Present | Returns top-level access/refresh tokens and user. |
| `POST /auth/refresh` | Present | Accepts `{refreshToken}`; refresh-token rotation/revocation is not implemented. |
| `POST /auth/logout` | Present | JWT protected and returns 204; only access token is blacklisted, stored as plaintext. |
| `GET /me` | Present | Uses user mapper; `updatedAt` is not selected by the query and may be absent. |
| `GET /me/passenger-profile` | Present | Returns contract fields plus `updatedAt`. |
| `PATCH /me/passenger-profile` | Present | `name` and `email` required; `phone` and `identificationNumber` optional. |
| `GET /stops/places/search` | Present | Public partial-name search, returns stops with integer IDs. |
| `GET /stops` | Present | Admin protected; returns `{data,total,page,limit}`, not a plain array. |
| `POST /stops` | Present | Admin protected; accepts contract fields, plus optional `description`. |
| `PATCH /stops/:id` | Present | Admin protected; partial update DTO. |
| `DELETE /stops/:id` | Present | Admin protected; returns a deletion object instead of 204. |
| `GET /routes` | Present | Public; response mapper includes contract route fields and aliases. |
| `GET /routes/admin/list` | Present | Admin protected. |
| `POST /routes` | Present | Admin protected; request fields are accepted, but many are optional in validation despite appearing in the contract body. |
| `PATCH /routes/:id` | Present | Admin protected; DTO does not include all create-route metadata/stop fields. |
| `PATCH /routes/:id/stops` | Present | Admin protected; validates an ordered stop ID list. |
| `DELETE /routes/:id` | Present | Admin protected; may deactivate a route and returns a body rather than 204. |
| `POST /routes/:id/fares` | Present as `/routes/:routeId/fares` | Admin protected; validates route membership/order. |
| `PATCH /routes/:id/fare` | Present | Admin protected. |
| `GET /routes/:id/fares` | Present as `/routes/:routeId/fares` | Public; serializes IDs as strings and fare amounts as numbers. |
| `GET /schedules` | Present | Public; returns a paginated envelope. |
| `GET /schedules/admin/list` | Present | Admin protected; returns raw schedule entities rather than the public schedule mapper shape. |
| `GET /schedules/:id` | Present | Public controller and admin controller both register this path; duplicate route registration should be removed. |
| `GET /schedules/:id/seats` | Present | Public; returns contract seat-availability fields, but capacity/held-seat calculations differ from schedule listing. |
| `POST /schedules` | Present | Admin protected; accepts snapshot fields, but many body fields are optional and times are persisted as SQL `TIME`. |
| `PATCH /schedules/:id` | Present | Admin protected; partial DTO. |
| `DELETE /schedules/:id` | Present | Admin protected; returns a deletion object instead of 204. |
| `GET /vehicles` | Present | Admin protected; mapped fields match the Vehicle example. |
| `POST /vehicles` | Present | Admin protected; all fields are optional and fallback defaults can create incomplete/unintended records. |
| `PATCH /vehicles/:id` | Present | Admin protected. |
| `DELETE /vehicles/:id` | Present | Admin protected; returns a deletion object instead of 204. |
| `GET /operators` | Present | Admin protected; maps contract fields. |
| `POST /operators` | Present | Admin protected. |
| `PATCH /operators/:id` | Present | Admin protected. |
| `GET /bookings/mine` | Present | Owner-scoped; paginated envelope. |
| `GET /bookings/admin/list` | **Missing at contract path** | Current admin list is `GET /admin/bookings`; add the documented path or explicitly retain a compatibility alias. |
| `GET /bookings/:reference` | Present | Owner/admin check is in the service. |
| `POST /bookings` | Present | Creates draft and holds seats transactionally; `tripId`/`selectedSeats` are optional in DTO, and undocumented `scheduleId`/`seatNumbers` aliases are accepted. |
| `PATCH /bookings/:reference` | Present | Owner-scoped passenger detail update; optional fields and Swagger required flags disagree. |
| `POST /bookings/:reference/payment` | Present | Owner check exists; creates successful payment and changes booking to `paid`, but payment, booking update, and notification are not one transaction. |
| `POST /bookings/:reference/confirm` | Present | **No actor is passed to the service; booking ownership/admin authorization is not enforced.** |
| `POST /bookings/:reference/cancel` | Present | Owner/admin allowed; contract specifies passenger cancellation. Paid/confirmed bookings are rejected. |
| `GET /notifications/mine` | Present | Owner-scoped; serialized fields match the contract in a paginated envelope. |
| `PATCH /notifications/:id/read` | Present as `:notificationId` | Owner-scoped; path is equivalent and response is mapped. |
| `DELETE /notifications/:id` | Present as `:notificationId` | Owner-scoped; returns a deletion object instead of 204. |

The contract does not define an Operator delete operation. The backend does not
currently expose one.

## Entity and database findings

- `AppModule` sets TypeORM `synchronize: true`. This can alter an existing
  database at startup and conflicts with the contract's explicit no-destructive
  synchronization requirement. Runtime schema changes need safe migrations.
- Runtime `AppModule` does not register/run migrations. Two separate data-source
  configurations exist (`src/data-source.ts` and `src/migration-source.ts`),
  with different environment-variable conventions, paths, SSL settings, and
  entity registration; `src/data-source.ts` has an empty `entities` list.
- The four migration files do not describe the current entities completely.
  Examples include missing operator creation, current route/schedule snapshot
  columns, vehicle display name, and notification category. The initial user
  migration uses a UUID ID while the current user entity and later migration
  logic expect integer IDs.
- `User` is declared twice for the same `users` table: the auth entity has an
  `UpdateDateColumn`, while `users/user.entity.ts` does not. Current modules
  mostly use the auth entity.
- `PassengerProfile.userId` is unique but has no TypeORM user relation/foreign
  key. Other relationship and uniqueness guarantees also differ between
  entity declarations and migrations (notably fare uniqueness and booking-seat
  foreign keys).
- The `Schedule` entity stores departure/arrival as `TIME`, while the API emits
  synthesized ISO timestamps. It has no `Operator` relation despite an
  `operatorId` field. `BookingSeat.seatNumber` is stored as text even though
  the API contract defines integer seat numbers.
- `Fare` represents the route fare entity. `SeatAvailability` is computed by
  the service; `Passenger` is currently a booking response object, not a
  separate database entity. No `OsmRoute` entity is needed.
- Do not apply a schema change until the existing database schema and migration
  history are inspected read-only and a preserving migration is prepared.

## Request, validation, and Swagger findings

- The global `ValidationPipe` correctly enables `whitelist`, rejects
  non-whitelisted fields, transforms values, and uses an explicit validation
  exception factory.
- Several DTOs accept undocumented aliases: booking `scheduleId` and
  `seatNumbers`, schedule `arrivalAt`, payment `method`, and vehicle
  `plateNumber`/`vehicleType`/`capacity`. This differs from the contract's
  canonical frontend names.
- Booking `tripId`, `selectedSeats`, `paymentMethod`, and `paymentReference`
  are optional in validation although the contract requires those request
  fields. Several vehicle create fields are likewise all optional.
- Many optional fields use `@ApiProperty` rather than `@ApiPropertyOptional`.
  The generated OpenAPI `required` lists therefore mark fields required when
  class-validator permits them to be absent. This was observed for route,
  schedule, booking, payment, and vehicle schemas.
- Date/time inputs use plain string validation or a date regex in some DTOs;
  ISO 8601 validation is not consistently enforced. Schedule time conversion
  accepts multiple forms but stores only time-of-day.
- Swagger is configured at `/docs`, and DTO properties have field-level
  examples. Endpoint-level response schemas/examples and error responses are
  not documented consistently. No complete compatibility response DTO set is
  present.

## Response and business-rule findings

- Route responses are explicitly mapped to string route IDs, integer stop IDs,
  ordered `routeStops`/`stops`, numeric fare fields, and distance in
  kilometers. `fareEstimate` is `null` when no full-route fare exists.
- Schedule responses are explicitly mapped, but `bookedSeats` in the schedule
  mapper excludes active `draft`/`reviewed` holds. The seat endpoint counts
  those statuses, and its capacity calculation uses `vehicle.capacity` while
  the mapper prefers `schedule.totalSeats`. Booking creation also requires a
  vehicle capacity, even when the schedule contract's example supplies only a
  `vehicleName`.
- Booking creation enforces maximum five unique seats, validates the selected
  range against assigned vehicle capacity, reserves with a database unique
  index and transaction, and releases expired holds. The database seat value
  remains text.
- Payment notification/booking updates are not atomic. The webhook path moves
  a booking directly to `confirmed`; the documented lifecycle requires payment
  to produce `paid`, with confirmation as a separate transition.
- Booking serialization currently emits `payment`, `paymentMethod`, and
  `paymentReference` as `null` and emits an empty nested schedule `bookedSeats`
  array rather than loading actual payment/seat data. Expired holds can be
  returned with the internal `expired` status although the contract lists five
  canonical statuses.
- `HttpErrorFilter` returns `{error:{code,message,details,requestId}}`, while
  the contract's documented error shape is
  `{statusCode,error,message}`. Validation errors include field-level details,
  but the envelope differs.
- Stop, route, schedule, vehicle, and notification deletes return JSON bodies;
  the contract specifies 204 responses.

## Test baseline

- Most service/controller specs only assert that the class is defined.
- Meaningful unit coverage is limited (for example route mapping and several
  booking seat checks).
- `test/app.e2e-spec.ts` only checks the root endpoint; the 20 contract flows
  and role/ownership boundaries are not covered end-to-end.
- `npm run build` and the focused route service test passed during the previous
  validation pass. These do not establish end-to-end API compatibility.

## Recommended implementation stages

1. **Audit baseline (this report):** record current behavior and protect
   existing database state.
2. **Schema safety and entities:** inspect the live schema/migration history
   read-only, reconcile entity definitions, and add only additive migrations;
   remove runtime synchronization only when migrations cover the deployed
   schema.
3. **Request and endpoint contract:** canonical DTO fields/requiredness,
   missing admin-bookings path, and access rules.
4. **Responses and booking lifecycle:** response serializers, integer seats,
   capacity/holds, payment/confirmation transactions, and deletion semantics.
5. **Swagger and errors:** accurate schemas, complete examples, responses,
   auth documentation, and contract error envelope.
6. **Integration tests:** exercise realistic request/response flows and
   authorization for every contract endpoint; report any unresolved gaps.

## Stage 2 progress — entities and database schema

Completed the entity-model portion and prepared the migration path:

- Startup TypeORM synchronization is now disabled; the compatibility migration
  is registered but is **not** auto-run.
- Added an additive baseline migration for the current entity schema and
  explicit `npm run migration:run` entry point. The migration is not applied
  automatically.
- Consolidated the two TypeORM migration data-source configurations so they
  use the backend `.env`, the existing `DB_*` names, the same migration class,
  and the complete entity registry.
- Added the PassengerProfile-to-User one-to-one relationship; added the
  Operator relation to Schedule; and added User relations to Payment and
  BookingSeat-to-Schedule.
- Changed persisted booking seat numbers to integers, added a nullable
  service date snapshot for schedules, and added a nullable payment `paidAt`.
- Kept the unused legacy booking `seatNumber` column mapped in the entity so
  running the compatibility migration will not drop existing values.
- Made decimal fare/payment values convert to JavaScript numbers, matched the
  initial booking status default to `draft`, and declared unique constraints
  for vehicle registration, route stop ordering, and route-stop fares.
- Consolidated the duplicate User entity module into a re-export of the
  authentication User entity, which includes `updatedAt`.

Read-only inspection of the configured database found the existing tables and
two user records, no TypeORM migration ledger, no orphaned relationships or
duplicate fare/route-stop/vehicle values in the checked sets, and no booking
seat rows requiring conversion. After confirming the booking seat values were
numeric and the affected uniqueness checks were clean, the additive migration
was applied to this local development database. It added the missing schedule
date columns and converted booking seat numbers to integers without dropping
rows. Repeat database-specific preflight checks before applying it elsewhere.

Validation: `npm run build` passed; TypeORM metadata validation found all 13
registered entities and the migration data source has `synchronize: false`.
Focused route and booking tests passed (6/6). The combined test command also
showed that the existing schedules and fares service specs fail during
NestJS test-module setup because their repository providers are not mocked;
those tests currently do not validate entity behavior.

## Stage 3 progress — request and endpoint contract

- Booking creation and passenger-detail DTOs now require the frontend's
  canonical fields; undocumented booking body aliases were removed.
- Booking `tripId` accepts the contract's `TRIP001`-style public ID as well as
  numeric-string IDs, resolving both to the existing numeric schedule key.
  Database primary keys and stop IDs remain unchanged.
- The Flutter admin route form can create a stop missing from the backend
  catalog: it geocodes the entered name with the existing OpenStreetMap client,
  creates the stop with real coordinates, then submits its integer ID with the
  route. Route distance, duration, and transfers are optional because the
  current form does not always have map metadata.
- Payment input now uses the documented `paymentMethod` and
  `paymentReference` fields. Vehicle, route, fare, stop, and schedule inputs
  have been aligned with their documented field names and validation.
- Added the documented `GET /api/v1/bookings/admin/list` path while retaining
  the legacy admin-list route, protected passenger booking/payment actions
  with the passenger-role guard, and removed the duplicate admin schedule
  detail route.
- Booking confirmation now checks ownership for an authenticated passenger
  and allows administrators. It no longer permits confirmation from the
  `reviewed` state.

## Stage 4 progress — booking response and payment lifecycle

- Booking responses now include the successful payment's method, reference,
  amount, currency, paid status, and timestamp, as well as actual seats held
  for the scheduled departure. The response uses canonical `tripId` and
  `selectedSeats` names instead of the old `scheduleId` and `seatNumbers`
  aliases.
- Booking confirmation is serialized through one asynchronous mapper, with
  nested schedule, passenger, and payment details. Expired internal holds are
  exposed as the contract's cancelled status.
- Direct simulated payments and verified webhook payments now update the
  payment and booking together in a database transaction, set `paidAt`, and
  move bookings to `paid`. Confirmation remains a separate transition and
  requires `paid`; repeat direct-payment requests using the same successful
  reference are idempotent.
- Payment notification creation remains a post-transaction side effect. A
  failure is logged without rolling back a successful payment.
- Route partial updates accept the contract's integer stop IDs and preserve
  existing intermediate stops when only one endpoint changes. Schedule
  pagination accepts `limit` and legacy `pageSize`, and the canonical response
  uses `pagination.limit`.
- Schedule creation/update and seat availability enforce the frontend's
  maximum 42-seat capacity.
- Seat availability and schedule/booking serialization now ignore inactive
  seat rows and share the same active-hold lifecycle; focused tests cover an
  active draft hold, an expired hold, and a paid seat.
- Contract delete routes now return HTTP 204.

## Stage 5 progress — Swagger and errors

- The global exception filter now emits the documented
  `{statusCode,error,message}` envelope and retains the request ID in a response
  header.
- Generated OpenAPI was inspected from a running backend. Required properties
  were present for route, schedule, booking, payment, stop, vehicle, and
  operator request schemas; the stop delete route documents HTTP 204.

## Stage 6 progress — integration validation

- Added HTTP-level booking contract tests that verify the canonical
  requests for routes, schedules, stops, vehicles, operators, fares, payments,
  and bookings are accepted; undocumented booking aliases and incomplete route
  requests are rejected.
- Focused affected unit/module tests passed (19/19), the HTTP contract tests
  passed (9/9), and `npm run build` passed.
- Generated OpenAPI verification confirmed full-body examples, required
  request properties, response field schemas, and the 204 stop deletion
  response. The duplicate `UserResponse` schema warning was removed.
- The default e2e command skips the database-writing compatibility suite unless
  `CONTRACT_E2E_WITH_DATABASE=true`. Its independent contract HTTP tests pass
  without connecting to or modifying the configured database.

This is not yet a full database-backed endpoint integration run. The separate
AppModule-based integration suite was not run because it writes to a database
configured by `.env`; it is gated behind `CONTRACT_E2E_WITH_DATABASE=true`.
Set that only with a dedicated disposable test database. The default e2e run
still reports the pre-existing `GET /` smoke-test failure (404) because the
root `AppController` is not registered in `AppModule`; it is outside the
frontend API contract. The additive schema migration has been applied to the
local development database; runtime migration execution remains disabled.

## Runtime schedule-save fix — 2026-11-23

- The reported 500 was caused by formatting the schedule returned from
  `save()` before its route relation was loaded. The formatter passed undefined
  stop IDs to a fare query; schedule creation now reloads the saved row with
  its relations before formatting, and the fare lookup guards missing routes.
- The local database was also missing `serviceDate` and `arrivalDate`; the
  reviewed additive migration was applied after confirming seat-number
  conversion and uniqueness preconditions.
- Updated the backend image to Node 24 and `npm ci`; the prior Node 20 image
  did not satisfy the dependency engine requirements and failed to build.
- Backend build and schedule service tests passed. The restarted container
  responds with HTTP 200 on `GET /api/v1/schedules`.
