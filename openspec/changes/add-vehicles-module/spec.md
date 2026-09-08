# Especificación: Módulo `vehicles`

- **Change ID:** `add-vehicles-module`
- **Capability:** `vehicles`
- **Estado:** Draft
- **Ubicación de implementación prevista:** `backend/src/vehicles/**`
- **Tests previstos:** `backend/test/vehicles/**`

> Este documento es la especificación funcional/técnica del módulo. No contiene código
> NestJS; su propósito es guiar la implementación posterior siguiendo la metodología SDD.

---

## 1. Contexto y modelo de datos

### 1.1 Entidad `Vehicle` (Prisma, `schema.prisma:158-176`)

```prisma
model Vehicle {
  id           String   @id @default(uuid())
  garageId     String
  clientId     String
  licensePlate String
  brand        String?
  model        String?
  color        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  garage Garage @relation("GarageVehicles", fields: [garageId], references: [id], onDelete: Cascade)
  client Client @relation("VehicleClients", fields: [clientId], references: [id], onDelete: Cascade)

  orders       WorkOrders[]  @relation("VehicleOrders")
  appointments Appointment[] @relation("VehicleAppointments")

  @@unique([garageId, licensePlate])
}
```

Relaciones clave a respetar:

- **`Garage` (Taller/Tenant)**: cada `Vehicle` pertenece exactamente a un `garageId`. El borrado en cascada del `Garage` elimina sus vehículos (`onDelete: Cascade`).
- **`Client`**: cada `Vehicle` pertenece a un `clientId`. El cliente referenciado **debe pertenecer al mismo `garageId`** que el vehículo (esta regla NO está garantizada por la base de datos —no hay `@@unique` compuesto en `Client` que lo fuerce a nivel de FK cruzada— por lo que **debe validarse en la capa de servicio**).
- **`WorkOrders` / `Appointment`**: relaciones inversas de solo lectura desde `Vehicle`; no forman parte del alcance CRUD de este módulo, pero afectan el borrado (ver §4.5, `DELETE`).
- **Restricción única compuesta**: `@@unique([garageId, licensePlate])` — la matrícula debe ser única **por taller**, no globalmente. Dos talleres distintos pueden registrar el mismo `licensePlate` sin conflicto.

### 1.2 Estrategia multi-tenant

- Aislamiento **lógico**, base de datos y esquema compartidos (no hay Row Level Security activa todavía; ver nota en `schema.prisma:202-206` sobre `WorkOrders`, aplicable por analogía a este módulo).
- El filtrado por `garageId` es **responsabilidad exclusiva de la capa de servicio**. Ninguna query a Prisma debe omitir la condición `garageId` en `where`.
- El `garageId` se obtiene del JWT autenticado a través del decorador existente `@GarageId()` (`backend/src/auth/decorators/garage-id.decorator.ts`), poblado por `JwtStrategy.validate()` (`backend/src/auth/strategies/jwt.strategy.ts`) desde `req.user.garageId`.
- **Nunca** debe aceptarse `garageId` desde el body/query del cliente HTTP; siempre se inyecta desde el contexto de autenticación.

---

## 2. Requisitos funcionales y casos de uso

| ID | Requisito | Descripción |
|----|-----------|--------------|
| RF-01 | Alta de vehículo | Un usuario autenticado puede registrar un vehículo asociado a un cliente de **su propio** taller. |
| RF-02 | Listado paginado/filtrado | Un usuario autenticado puede listar los vehículos de su taller, con paginación y filtros básicos (`clientId`, `licensePlate`, `brand`). |
| RF-03 | Detalle de vehículo | Un usuario autenticado puede consultar el detalle de un vehículo por `id`, solo si pertenece a su taller. |
| RF-04 | Actualización parcial | Un usuario autenticado puede actualizar parcialmente los datos editables de un vehículo de su taller. |
| RF-05 | Eliminación | Un usuario autenticado puede eliminar un vehículo de su taller, sujeto a las reglas de integridad referencial (§4.5). |
| RF-06 | Aislamiento de tenant | Ninguna operación puede leer, modificar o eliminar recursos de un `garageId` distinto al del usuario autenticado, incluso conociendo el `id` exacto del recurso (debe responder `404`, no `403`, para no filtrar existencia — ver §5). |
| RF-07 | Validación de pertenencia del cliente | Al crear o actualizar `clientId`, el servicio debe verificar que el cliente exista y pertenezca al mismo `garageId` que el vehículo. |
| RF-08 | Unicidad de matrícula por taller | El servicio debe respetar/mapear la violación de `@@unique([garageId, licensePlate])` a un error de negocio claro (`409 Conflict`). |

### Casos de uso principales

1. **Registrar vehículo tras alta de cliente**: el mecánico/gestor da de alta un vehículo para un cliente existente de su taller.
2. **Consultar vehículos de un cliente**: filtrar el listado por `clientId` para ver el historial de vehículos de un cliente concreto (ej. antes de crear una orden de trabajo).
3. **Buscar vehículo por matrícula**: filtrar por `licensePlate` (búsqueda parcial, case-insensitive) al recibir un vehículo en el taller.
4. **Actualizar datos del vehículo**: corregir marca/modelo/color, o reasignar el vehículo a otro cliente del mismo taller (transferencia de propiedad).
5. **Eliminar vehículo obsoleto**: eliminar un registro erróneo o un vehículo que ya no tiene relación con el taller (sujeto a que no tenga órdenes/citas activas, ver §4.5).
6. **Intento de acceso cruzado (negativo)**: un usuario del Taller B intenta acceder/modificar/eliminar un vehículo del Taller A usando su `id` — debe fallar de forma indistinguible de "no existe".

---

## 3. Endpoints y contrato OpenAPI

Todos los endpoints requieren autenticación JWT (`@UseGuards(JwtAuthGuard)`) y se montan bajo el prefijo `/vehicles`.

```yaml
openapi: 3.0.3
info:
  title: Vehicles Module API
  version: "1.0.0"
servers:
  - url: /
security:
  - bearerAuth: []
paths:
  /vehicles:
    post:
      summary: Crear un vehículo en el taller del usuario autenticado
      tags: [Vehicles]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateVehicleDto'
      responses:
        '201':
          description: Vehículo creado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VehicleResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          description: El clientId indicado no existe o no pertenece al taller del usuario
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '409':
          description: Ya existe un vehículo con esa matrícula en el taller
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
    get:
      summary: Listar vehículos del taller del usuario autenticado (paginado y filtrado)
      tags: [Vehicles]
      parameters:
        - name: page
          in: query
          schema: { type: integer, minimum: 1, default: 1 }
        - name: limit
          in: query
          schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
        - name: clientId
          in: query
          schema: { type: string, format: uuid }
        - name: licensePlate
          in: query
          description: Búsqueda parcial, case-insensitive (contains)
          schema: { type: string }
        - name: brand
          in: query
          description: Búsqueda parcial, case-insensitive (contains)
          schema: { type: string }
      responses:
        '200':
          description: Listado paginado de vehículos del taller
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedVehiclesResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
  /vehicles/{id}:
    get:
      summary: Obtener el detalle de un vehículo del taller del usuario autenticado
      tags: [Vehicles]
      parameters:
        - $ref: '#/components/parameters/VehicleId'
      responses:
        '200':
          description: Vehículo encontrado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VehicleResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
    patch:
      summary: Actualizar parcialmente un vehículo del taller del usuario autenticado
      tags: [Vehicles]
      parameters:
        - $ref: '#/components/parameters/VehicleId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateVehicleDto'
      responses:
        '200':
          description: Vehículo actualizado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VehicleResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: Conflicto de unicidad de matrícula en el taller
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
    delete:
      summary: Eliminar un vehículo del taller del usuario autenticado
      tags: [Vehicles]
      parameters:
        - $ref: '#/components/parameters/VehicleId'
      responses:
        '204':
          description: Vehículo eliminado correctamente
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: >
            El vehículo tiene relaciones dependientes (WorkOrders/Appointments)
            que impiden su eliminación bajo la política de negocio vigente.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  parameters:
    VehicleId:
      name: id
      in: path
      required: true
      schema: { type: string, format: uuid }
  responses:
    BadRequest:
      description: Error de validación de payload
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    Unauthorized:
      description: Token ausente, inválido o expirado
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    NotFound:
      description: >
        Vehículo no encontrado en el taller del usuario autenticado.
        Se devuelve el mismo código tanto si el id no existe como si
        pertenece a otro garageId (ver §5 y §6.4).
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
  schemas:
    CreateVehicleDto:
      type: object
      required: [clientId, licensePlate]
      properties:
        clientId:
          type: string
          format: uuid
        licensePlate:
          type: string
          minLength: 4
          maxLength: 12
        brand:
          type: string
          nullable: true
        model:
          type: string
          nullable: true
        color:
          type: string
          nullable: true
    UpdateVehicleDto:
      type: object
      description: PartialType de CreateVehicleDto (todos los campos opcionales)
      properties:
        clientId:
          type: string
          format: uuid
        licensePlate:
          type: string
          minLength: 4
          maxLength: 12
        brand:
          type: string
          nullable: true
        model:
          type: string
          nullable: true
        color:
          type: string
          nullable: true
    VehicleResponse:
      type: object
      properties:
        id: { type: string, format: uuid }
        garageId: { type: string, format: uuid }
        clientId: { type: string, format: uuid }
        licensePlate: { type: string }
        brand: { type: string, nullable: true }
        model: { type: string, nullable: true }
        color: { type: string, nullable: true }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }
    PaginatedVehiclesResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/VehicleResponse'
        meta:
          type: object
          properties:
            total: { type: integer }
            page: { type: integer }
            limit: { type: integer }
            totalPages: { type: integer }
    ErrorResponse:
      type: object
      properties:
        statusCode: { type: integer }
        message:
          oneOf:
            - type: string
            - type: array
              items: { type: string }
        error: { type: string }
```

---

## 4. DTOs y reglas de validación (`class-validator` / `class-transformer`)

Convención del proyecto: los DTOs viven en `vehicles/dto/*.dto.ts`, y `UpdateVehicleDto` se define como `PartialType(CreateVehicleDto)` (patrón ya usado en `clients/dto/update-client,db.dto.ts`). El `garageId` **nunca** se incluye en el DTO de entrada: se inyecta en el servicio vía `@GarageId()`.

### 4.1 `CreateVehicleDto`

| Campo | Tipo | Validadores `class-validator` | Notas |
|-------|------|-------------------------------|-------|
| `clientId` | `string` (UUID) | `@IsNotEmpty()`, `@IsUUID()` | Debe referenciar un `Client` existente **del mismo `garageId`** (validado en el servicio, no en el DTO). |
| `licensePlate` | `string` | `@IsNotEmpty()`, `@IsString()`, `@MinLength(4)`, `@MaxLength(12)`, `@Matches(/^[A-Za-z0-9- ]+$/)` | Se recomienda normalizar (`@Transform`) a mayúsculas y sin espacios extremos antes de persistir, para evitar duplicados por diferencias de formato dentro del `@@unique([garageId, licensePlate])`. |
| `brand` | `string?` | `@IsOptional()`, `@IsString()`, `@MaxLength(50)` | Opcional en BD (`String?`). |
| `model` | `string?` | `@IsOptional()`, `@IsString()`, `@MaxLength(50)` | Opcional en BD (`String?`). |
| `color` | `string?` | `@IsOptional()`, `@IsString()`, `@MaxLength(30)` | Opcional en BD (`String?`). |

### 4.2 `UpdateVehicleDto`

`export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}`

- Todos los campos son opcionales (hereda validadores de `CreateVehicleDto` vía `PartialType`).
- Si se envía `clientId`, debe volver a validarse su pertenencia al `garageId` en el servicio (transferencia de vehículo entre clientes del mismo taller).
- El endpoint `PATCH` debe rechazar payloads vacíos únicamente si así lo define la política de negocio final (por defecto: se permite un PATCH vacío, es un no-op idempotente que devuelve el recurso sin cambios).

### 4.3 `FindVehiclesQueryDto` (query params de `GET /vehicles`)

| Campo | Tipo | Validadores | Notas |
|-------|------|--------------|-------|
| `page` | `number` | `@IsOptional()`, `@Type(() => Number)`, `@IsInt()`, `@Min(1)` | Default `1` aplicado en el servicio si no se envía. |
| `limit` | `number` | `@IsOptional()`, `@Type(() => Number)`, `@IsInt()`, `@Min(1)`, `@Max(100)` | Default `20`. |
| `clientId` | `string` | `@IsOptional()`, `@IsUUID()` | Filtro exacto. |
| `licensePlate` | `string` | `@IsOptional()`, `@IsString()` | Filtro `contains`, `mode: 'insensitive'` en Prisma. |
| `brand` | `string` | `@IsOptional()`, `@IsString()` | Filtro `contains`, `mode: 'insensitive'` en Prisma. |

Requiere `@Type(() => Number)` de `class-transformer` y `ValidationPipe({ transform: true })` (ya configurado globalmente según el patrón visto en `test/work-order/work-order.e2e-spec.ts:41-47`; debe confirmarse que `main.ts` aplica la misma configuración global en runtime, no solo en tests).

### 4.4 Reglas transversales de DTO

- Usar `whitelist: true` y `forbidNonWhitelisted: true` (patrón ya usado en tests e2e) para rechazar con `400` cualquier campo no declarado (p. ej. intento de enviar `garageId` en el body debe ser rechazado, no ignorado silenciosamente, para evitar confusión — aunque igualmente el servicio lo ignoraría).
- `garageId` **no debe existir como campo en ningún DTO de entrada**.

### 4.5 Regla de negocio: eliminación con dependencias

La entidad `Vehicle` es referenciada por `WorkOrders` (`onDelete: Cascade` desde `WorkOrders.vehicle`) y `Appointment` (`onDelete: Restrict` desde `Appointment.vehicle`). Esto implica:

- Si el vehículo tiene **citas (`Appointment`)** asociadas, Prisma lanzará un error de restricción de FK (`P2003`) al intentar `delete`, que el servicio debe mapear a `409 Conflict` con un mensaje claro ("No se puede eliminar el vehículo: tiene citas asociadas").
- Si el vehículo tiene **órdenes de trabajo (`WorkOrders`)**, la base de datos las eliminaría en cascada (`onDelete: Cascade` en `WorkOrders.vehicle`). **Esta especificación exige que el servicio bloquee explícitamente el borrado si existen `WorkOrders` asociadas** (comprobación previa vía `count()`), para evitar pérdida accidental de historial de facturación/servicio, devolviendo `409 Conflict`. Esta decisión de negocio debe confirmarse con el equipo antes de implementar; se documenta aquí como comportamiento por defecto recomendado.

---

## 5. Matriz de respuestas HTTP y manejo de errores multi-tenant

| Código | Escenario | Endpoint(s) | Cuerpo de respuesta |
|--------|-----------|--------------|----------------------|
| `200` | Operación de lectura/actualización exitosa | `GET /vehicles`, `GET /vehicles/:id`, `PATCH /vehicles/:id` | `VehicleResponse` o `PaginatedVehiclesResponse` |
| `201` | Vehículo creado | `POST /vehicles` | `VehicleResponse` |
| `204` | Vehículo eliminado | `DELETE /vehicles/:id` | Sin cuerpo |
| `400` | Payload inválido (DTO no cumple `class-validator`), o query params fuera de rango (`page < 1`, `limit > 100`) | Todos | `ErrorResponse` con `message: string[]` (formato estándar de `ValidationPipe` de Nest) |
| `401` | Falta `Authorization` header, token inválido o expirado | Todos | `ErrorResponse` (formato estándar de `JwtAuthGuard`/Passport) |
| `403` | **No se usa** para aislamiento de tenant (ver nota abajo). Reservado únicamente si en el futuro se añaden roles (`@Roles()`) que restrinjan una acción CRUD a ciertos `UserRole` dentro del mismo taller (p. ej. solo `OWNER`/`MANAGER` pueden `DELETE`). | `DELETE /vehicles/:id` (futuro, si aplica `RolesGuard`) | `ErrorResponse` |
| `404` | (a) `id` no existe en absoluto, o (b) `id` existe pero pertenece a otro `garageId`, o (c) `clientId` referenciado en `POST`/`PATCH` no existe o no pertenece al `garageId` del usuario | `GET/PATCH/DELETE /vehicles/:id`, `POST /vehicles` (clientId inválido) | `ErrorResponse` |
| `409` | (a) Violación de `@@unique([garageId, licensePlate])`, (b) intento de borrado con dependencias activas (§4.5) | `POST /vehicles`, `PATCH /vehicles/:id`, `DELETE /vehicles/:id` | `ErrorResponse` |

### Nota crítica de seguridad multi-tenant (RF-06)

**El caso (b) de `404` es intencional y obligatorio**: cuando un usuario del Taller B solicita `GET/PATCH/DELETE /vehicles/:id` de un vehículo que pertenece al Taller A, la respuesta debe ser **idéntica** (mismo código `404`, mismo formato de mensaje genérico, p. ej. `"Vehículo no encontrado"`) a cuando el `id` simplemente no existe en la base de datos. Esto sigue el patrón ya implementado en `ClientsService.findOne` (`findFirst({ where: { id, garageId } })` seguido de `NotFoundException` si es `null`) y validado en `work-order.e2e-spec.ts` (`should isolate data between tenants in GET /work-orders/:id` → `expect(listB.status).toBe(404)`).

Está **prohibido**:
- Usar `403 Forbidden` para señalar "el recurso existe pero no es tuyo" (filtraría existencia del recurso a un tenant no autorizado).
- Usar `prisma.vehicle.findUnique({ where: { id } })` sin `garageId` en el filtro y comprobar la pertenencia después (riesgo de fuga de datos en logs/timing, y antipatrón respecto al resto del código base).
- Toda query debe usar `findFirst({ where: { id, garageId } })` o equivalente con `garageId` **en la cláusula `where` de la propia query**, nunca como post-filtro en memoria.

---

## 6. Plan de tests e2e e integración

### 6.1 Ubicación y estructura (siguiendo convención de `test/work-order/`)

```
backend/test/vehicles/
  vehicles.e2e-spec.ts
  helpers/
    fixtures.helper.ts     # builders de payloads + creación de Client/Vehicle vía Prisma
    requests.helper.ts     # wrappers de supertest para cada endpoint
```

Reutilizar sin duplicar:
- `test/work-order/helpers/auth.helper.ts` → `registerAndLoginOwner(httpServer)` para obtener `{ token, garageId, userId, tenant }` de un tenant registrado (ya cubre el flujo `POST /auth/register-tenant` + `POST /auth/login-owner`).
- Patrón de limpieza: `beforeEach(() => prisma.garage.deleteMany({}))` (el `onDelete: Cascade` de `Garage → Client → Vehicle` limpia toda la cadena).
- Patrón de arranque de app: `Test.createTestingModule({ imports: [AppModule] })` + `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.

### 6.2 Nuevos helpers requeridos

**`test/vehicles/helpers/fixtures.helper.ts`**:
- `createClientFixture(prisma, garageId)` — puede reutilizarse tal cual desde `test/work-order/helpers/fixtures.helper.ts`, o extraerse a un helper compartido `test/shared/fixtures.helper.ts` (decisión de refactor recomendada, fuera del alcance estricto pero señalada aquí).
- `buildCreateVehiclePayload(clientId, overrides?)` → payload válido con `licensePlate` único por `Date.now()` (siguiendo el patrón `seed` visto en `createVehicleFixture` existente).
- `buildInvalidVehiclePayload()` → payload que referencia un `clientId` inexistente (UUID válido pero no persistido), para casos `404`/`400`.
- `createVehicleFixtureDirect(prisma, garageId, clientId, overrides?)` → inserción directa vía Prisma (bypass HTTP) para preparar estado previo en tests de lectura/actualización/borrado, análoga a la ya existente `createVehicleFixture` de `work-order`.

**`test/vehicles/helpers/requests.helper.ts`**:
- `createVehicleRequest(httpServer, token, body)` → `POST /vehicles`
- `getVehiclesRequest(httpServer, token, query?)` → `GET /vehicles` (con soporte de query string para paginación/filtros)
- `getVehicleByIdRequest(httpServer, token, id)` → `GET /vehicles/:id`
- `updateVehicleRequest(httpServer, token, id, body)` → `PATCH /vehicles/:id`
- `deleteVehicleRequest(httpServer, token, id)` → `DELETE /vehicles/:id`

### 6.3 Escenarios de test de integración/servicio (unit, `vehicles.service.spec.ts`)

Siguiendo el patrón de `clients.service.spec.ts` (mock de `PrismaService`):

1. `create()` construye el registro con `garageId` inyectado (no confía en el DTO) y delega en `prisma.vehicle.create`.
2. `create()` lanza `NotFoundException` si el `clientId` no pertenece al `garageId` (mock de `prisma.client.findFirst` devolviendo `null`).
3. `create()` mapea `Prisma.PrismaClientKnownRequestError` con `code: 'P2002'` a `ConflictException` (matrícula duplicada en el taller).
4. `findAll()` siempre incluye `garageId` en el `where` de `prisma.vehicle.findMany`, y aplica correctamente `skip`/`take` derivados de `page`/`limit`.
5. `findAll()` aplica filtros `clientId` (exacto) y `licensePlate`/`brand` (`contains`, `insensitive`) combinados con `garageId`.
6. `findOne()` usa `findFirst({ where: { id, garageId } })` y lanza `NotFoundException` si es `null`.
7. `update()` reutiliza `findOne()` (o equivalente) antes de `prisma.vehicle.update`, garantizando que no se pueda actualizar un vehículo de otro tenant.
8. `update()` con nuevo `clientId` revalida pertenencia al `garageId`.
9. `remove()` verifica dependencias de `Appointment`/`WorkOrders` antes de borrar (según política definida en §4.5) y lanza `ConflictException` si existen.
10. `remove()` lanza `NotFoundException` si el vehículo no pertenece al `garageId`.

### 6.4 Escenarios e2e (`vehicles.e2e-spec.ts`)

**Autenticación (por endpoint, replicando patrón de `work-order.e2e-spec.ts:69-101`):**
- `401` sin header `Authorization` en cada uno de los 5 endpoints.
- `401` con token inválido (`Bearer invalidtoken`).
- `401` con token expirado (firmado con `jwt.sign(..., { expiresIn: '-1s' })`).

**`POST /vehicles`:**
- `201` con payload válido y `clientId` de un cliente del propio taller.
- `400` con `licensePlate` vacío / demasiado corto / con caracteres no permitidos.
- `400` con `clientId` que no es UUID.
- `404` cuando `clientId` es un UUID válido pero no existe.
- `404` cuando `clientId` existe pero pertenece a **otro** `garageId` (crear cliente con tenant A, intentar crear vehículo con tenant B usando ese `clientId`).
- `409` al crear dos vehículos con la misma `licensePlate` en el mismo taller.
- Verificar que crear la misma `licensePlate` en **dos talleres distintos** (tenant A y tenant B) **no** produce conflicto (`201` en ambos) — prueba positiva de que la unicidad es por `garageId`.

**`GET /vehicles`:**
- `200` y lista no vacía tras crear un vehículo.
- `200` con paginación: crear N vehículos, pedir `page=2&limit=2`, verificar `meta.total`, `meta.totalPages` y que `data.length` sea el esperado.
- `200` con filtro `clientId` devuelve solo los vehículos de ese cliente.
- `200` con filtro `licensePlate` parcial (case-insensitive) devuelve coincidencias esperadas.
- `400` con `page=0` o `limit=101` (fuera de rango).
- **Aislamiento de tenant**: Tenant A crea un vehículo; Tenant B lista sus vehículos y **no** debe ver el vehículo de A (`listB.body.data.some(v => v.id === vehicleAId)` → `false`), replicando `work-order.e2e-spec.ts:144-179`.

**`GET /vehicles/:id`:**
- `200` con datos correctos cuando el vehículo pertenece al taller del usuario.
- `404` con un UUID válido pero inexistente.
- **Aislamiento de tenant**: Tenant B solicita el `id` de un vehículo de Tenant A → `404` (no `403`), replicando `work-order.e2e-spec.ts:214-244`.

**`PATCH /vehicles/:id`:**
- `200` actualizando `brand`/`model`/`color` correctamente.
- `404` al intentar actualizar un vehículo inexistente.
- **Aislamiento de tenant**: Tenant B intenta hacer `PATCH` sobre un vehículo de Tenant A → `404`, y verificar adicionalmente (vía Prisma directo o `GET` con el token de A) que el registro **no fue modificado**.
- `409` al actualizar `licensePlate` a un valor que ya usa otro vehículo del mismo taller.
- `200` al actualizar `licensePlate` a un valor usado por un vehículo de **otro** taller (debe permitirse, confirma aislamiento de la unicidad).
- `200` al reasignar `clientId` a otro cliente válido del mismo taller (transferencia).
- `404` al reasignar `clientId` a un cliente de otro taller.

**`DELETE /vehicles/:id`:**
- `204` al eliminar un vehículo sin dependencias.
- `404` al eliminar un vehículo inexistente.
- **Aislamiento de tenant**: Tenant B intenta eliminar un vehículo de Tenant A → `404`, y verificar que el vehículo **sigue existiendo** para Tenant A tras el intento fallido.
- `409` al intentar eliminar un vehículo con una `Appointment` asociada (fixture adicional: crear cita vía Prisma directo referenciando el vehículo).
- `409` (según política de §4.5) al intentar eliminar un vehículo con `WorkOrders` asociadas.

### 6.5 Matriz resumen de casos de aislamiento cruzado (`garageId` A vs B)

| Operación | Actor | Recurso | Resultado esperado |
|-----------|-------|---------|---------------------|
| `GET /vehicles` | Tenant B | Lista completa | No incluye vehículos de Tenant A |
| `GET /vehicles/:id` | Tenant B | Vehículo de Tenant A | `404` |
| `PATCH /vehicles/:id` | Tenant B | Vehículo de Tenant A | `404`, sin efectos secundarios |
| `DELETE /vehicles/:id` | Tenant B | Vehículo de Tenant A | `404`, el recurso persiste |
| `POST /vehicles` | Tenant B | `clientId` de Tenant A | `404` |
| `PATCH /vehicles/:id` (reasignación) | Tenant A | `clientId` de Tenant B | `404` |
| Unicidad `licensePlate` | Tenant A y Tenant B | Misma matrícula, distinto taller | Ambos `201`, sin conflicto |

---

## 7. Fuera de alcance de esta especificación

- Row Level Security (RLS) a nivel de PostgreSQL (mencionado como plan futuro en `schema.prisma:205`).
- Restricciones de `UserRole` (`OWNER`/`MANAGER`/`MECHANIC`) sobre las operaciones CRUD de vehículos — a definir en una iteración posterior si el negocio lo requiere (`RolesGuard`/`@Roles()` ya existen como infraestructura reutilizable).
- Soft-delete de vehículos (actualmente se asume borrado físico sujeto a las restricciones de §4.5).
- Endpoints de historial de órdenes/citas por vehículo (pertenecen a los módulos `work-orders`/`appointments`).
