# E2E Testing Guide - GestorPro

## Work-Orders Module

### POST /work-orders - ✅ 4/4 PASSING

**Tests:**

1. ❌ No token → 401
2. ❌ Invalid token → 401
3. ❌ Expired token → 401
4. ✅ Valid token → 201 created

**Setup Pattern:**

- Register tenant with unique fiscalId (Date.now())
- Login → extract token & garageId
- Create client & vehicle via Prisma
- POST work-order with valid token

**Fixtures Needed:**

- Client: {name, email (unique), phone, garageId}
- Vehicle: {licensePlate (unique), brand, model, garageId, clientId}

**Common Failures:**

- 500 @GarageId decorator: Use (\_: unknown, ctx: ExecutionContext)
- constraint violations: Use Date.now() for unique fields

---

## Tests to Implement

### GET /work-orders - TODO

- [ ] Should return 200 with array
- [ ] Should filter by garageId (multi-tenant)
- [ ] Should return 403 if accessing other garage

### GET /work-orders/:id - TODO

- [ ] Should return 200 with order
- [ ] Should return 404 if not found
- [ ] Should return 403 if different garage

### PATCH /work-orders/:id - TODO

- [ ] Should update description
- [ ] Should update state (OPEN → IN_PROGRESS)
- [ ] Should return 403 if different garage

### DELETE /work-orders/:id - TODO

- [ ] Should return 204 on success
- [ ] Should return 404 if not found
- [ ] Should return 403 if different garage

---

## Vehicles Module - TODO

- [ ] POST /vehicles
- [ ] GET /vehicles
- [ ] GET /vehicles/:id
- [ ] PATCH /vehicles/:id
- [ ] DELETE /vehicles/:id
