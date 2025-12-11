# GestorPro-Taller

Pequeño SaaS para la gestión de talleres mecánicos (proyecto personal / trainee).

Descripción corta
- GestorPro-Taller es una aplicación pensada para pequeñas y medianas empresas de mantenimiento y reparación de vehículos. Permite a un gestor/propietario administrar su taller (tenant), gestionar usuarios (mecánicos, recepción), clientes, vehículos, órdenes de trabajo, consumibles e inventario, citas y facturación. Los clientes reciben notificaciones (email/SMS) cuando su vehículo está listo o para recordatorios de cita.

Decisiones técnicas (estado inicial)
- Arquitectura multi-tenant (shared-schema) con aislamiento por tenant (garage).
- Base de datos: PostgreSQL. UUIDs para PKs, uso de tipos ENUM y jsonb para metadatos.
- Seguridad por tenant: Row Level Security (RLS) + session variable.
- Modelo de datos (resumen): garages (tenant), users, clients, vehicles, work_orders, work_order_items (services/parts), consumables, stock_movements, appointments, invoices, invoice_lines, notification_history.
- Campos flexibles: `contact_info` y `metadata` (json) en `garages` para datos y opciones específicas del tenant.
- Numeración de facturas: `invoice_next_number` por garage (contador por tenant) y `invoice_number` formateado al crear facturas.

Qué hay en este repo (por ahora)
- Diagrama ER (SVG) del modelo de dato (Este diagrama lo estoy actualizando con mejoras y lo subiré mejorado proximamente).
  [![Diagrama ER - GestorPro-Taller](diagrams/DiagramaBD-thumb.png)](diagrams/DiagramaBD.svg)
- SQL de ejemplo / snippets (en la carpeta `prisma/`).
- Este README (visión general). Iré agregando migraciones, ejemplos de uso, políticas RLS y scripts a medida que avance el proyecto.

Objetivos a medio plazo
- Migraciones SQL (Prisma).
- Políticas RLS y ejemplos de sesión para aislamiento de tenant.
- Endpoints backend básicos (autenticación, CRUD de órdenes, agenda, facturación).
- UI mínima para demo.

Convenciones y buenas prácticas
- Nombres en snake_case y tablas en plural: `garages`, `users`, `work_orders`, etc.
- IDs: UUID.
- Timestamps: `created_at`, `updated_at`. Soft-delete mediante `deleted_at` si procede.
- Validaciones en la app + checks/triggers en la BD para garantizar la integridad (p. ej. que `assigned_mechanic` pertenezca al mismo `garage`).

Contacto / notas
- Proyecto en desarrollo; documentaré decisiones design y migraciones según avance.
- Si tienes sugerencias, abre un issue o contactame por correo.

