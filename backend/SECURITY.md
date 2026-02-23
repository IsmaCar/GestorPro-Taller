# Security Vulnerabilities Report

**Fecha:** 23 de febrero de 2026  
**Estado:** Pendiente de resolución  
**Impacto:** BAJO (solo devDependencies)

## Resumen

- **Total:** 17 vulnerabilidades
- **Alta (HIGH):** 5
- **Moderada (MODERATE):** 7
- **Baja (LOW):** 5

## Análisis de Impacto

✅ **Todas las vulnerabilidades están en devDependencies** (no afectan producción)

- No hay riesgo para usuarios finales
- Solo afectan entorno de desarrollo/testing

## Vulnerabilidades HIGH (Prioridad 1)

### 1. @isaacs/brace-expansion

- **Versión vulnerable:** <=5.0.0
- **Fix:** >=5.0.1
- **Path:** @nestjs/cli → glob → minimatch
- **Tipo:** Uncontrolled Resource Consumption
- **Contexto:** CLI de NestJS (solo desarrollo)

### 2. qs (DoS via memory exhaustion)

- **Versión vulnerable:** <6.14.1
- **Fix:** >=6.14.1
- **Path:** supertest → superagent → qs
- **Contexto:** Tests E2E solamente

### 3. minimatch (ReDoS)

- **Versión vulnerable:** <10.2.1
- **Fix:** >=10.2.1
- **Path:** Múltiple (ESLint, NestJS CLI, Jest)
- **Contexto:** Herramientas de desarrollo

## Vulnerabilities MODERATE (Prioridad 2)

### 4-7. hono (4 vulnerabilidades)

- **Versión vulnerable:** <4.11.7
- **Fix:** >=4.11.7
- **Path:** prisma → @prisma/dev → hono
- **Tipos:** XSS, Cache Deception, IP spoofing, Arbitrary Key Read
- **Contexto:** Prisma dev dependencies

### 8-9. ajv (ReDoS)

- **Path:** ESLint y @nestjs/cli
- **Contexto:** Validación en herramientas de desarrollo

### 10. lodash (Prototype Pollution)

- **Path:** @nestjs/cli → node-emoji
- **Contexto:** CLI de NestJS

## Plan de Acción

```bash
# Actualizar todas las dependencias posibles
pnpm update

# Verificar resultado
pnpm audit

# Si persisten, actualizar manualmente:
pnpm update @nestjs/cli@latest
pnpm update supertest@latest
pnpm update prisma@latest
```
