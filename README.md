# Lojita REST API

**Lojita REST API** is a modular marketplace and commerce back end built with NestJS and TypeORM. It models the domain relationships needed for stores, products, variants, carts, orders, payments, coupons, conversations, reviews, and customer support.

- [Technical documentation](app/README.md)
- [Repository](https://github.com/cemgthedev/Lojita-REST-API)

## Technical showcase

The API exposes REST resources under paths such as `/users`, `/products`, `/orders`, `/coupons`, `/carts`, `/chats`, and `/support-tickets`. There is currently no Swagger/OpenAPI integration or hosted API documentation. Request examples are available in the [HTTP collection](app/http).

Typical request flow:

```text
HTTP request
  -> NestJS controller
  -> DTO validation and transformation
  -> service
  -> TypeORM repository
  -> PostgreSQL
```

Example data flow for creating an order:

```text
POST /orders
  -> CreateOrderDto validation
  -> OrdersService
  -> Order persistence through TypeORM
  -> 201 response or a standardized error response
```

The [technical README](app/README.md) documents the implemented routes, data model, local setup, scripts, testing, and contribution conventions.

## Problem and objectives

The project provides the server-side foundation for a marketplace in which users can manage stores and catalogs, place and track orders, maintain carts and favorites, apply coupons, communicate through chats, and open support tickets.

The back end is responsible for validating input, applying domain operations, persisting commerce records, maintaining relationships between entities, paginating queries, and translating database constraints into consistent HTTP errors.

## Main features

- Marketplace entities for users, stores, categories, products, specifications, variants, and images.
- Shopping operations including cards, carts, cart items, favorites, and product ratings/reviews.
- Order management with order addresses, items, seller associations, payments, and payment methods.
- Coupons with scopes, types, validity periods, usage limits, product/category associations, and usage records.
- Customer communication through chats, chat participants, and messages.
- Support ticket records and categorized commerce relationships.
- Query pagination and filtering for relevant list resources.
- Global DTO validation and a centralized HTTP exception response format.

## Technology stack

| Area | Technology |
| --- | --- |
| Runtime and language | Node.js, TypeScript 5 |
| Framework | NestJS 11 |
| Database | PostgreSQL |
| Persistence | TypeORM 0.3 |
| Database driver | `pg` |
| Validation and transformation | `class-validator`, `class-transformer` |
| Testing | Jest 30, ts-jest, Supertest |
| Development | ESLint 9, Prettier 3 |
| Package management | npm with `package-lock.json` |

No authentication library, Swagger package, cache, queue, external storage SDK, or deployment configuration is implemented in the current repository.

## Architecture overview

The application is organized into feature modules. Each module typically contains a controller, service, DTOs, and a Nest module registration; entities live in a shared `app/entities` directory and are registered with TypeORM as feature repositories.

```text
Client
  |
  v
Controller  ->  Service  ->  TypeORM Repository  ->  PostgreSQL
                  |
                  +-> DTO and enum validation
                  +-> domain not-found/conflict checks
                  +-> pagination and database queries
```

Cross-cutting behavior is provided by global validation and exception handling in `src/main.ts`, while dynamic database configuration is centralized in `dinamic/db-connect.module.ts`.

## Technical decisions

- **Feature-oriented NestJS modules:** commerce domains are isolated into modules, making controllers and services easier to locate and maintain. The cost is duplication of CRUD structure across many modules.
- **Shared entities and repositories:** TypeORM entities are centralized and injected into feature modules with `TypeOrmModule.forFeature(...)`. This makes relationships visible in one domain model, but also increases coupling between modules.
- **Global validation and exception normalization:** `GlobalValidationPipe` rejects unknown fields and returns grouped validation details; `HttpExceptionFilter` adds stable handling for HTTP and PostgreSQL errors. This improves client-facing consistency at the cost of centralized filter complexity.
- **TypeORM schema synchronization:** the current application configuration uses `synchronize: true` for the `test` database profile. It is convenient for local development, but migrations are not provided and synchronization is not suitable as the primary production schema strategy.

## Results and learnings

The repository implements a broad REST domain model with modularized CRUD operations, TypeORM relationships, pagination, validation, and standardized errors. The test suite demonstrates controller and service isolation with mocked repositories and Jest.

The main engineering lessons demonstrated here are feature decomposition, centralized request validation, typed database entities, consistent HTTP error handling, and testable service/controller boundaries.

## Current repository status

The database connection currently uses the checked-in `test` profile from `db-connect.module.ts`. It is configured for local PostgreSQL and expects a local database named `lojita`. No `.env.example`, migrations, seed scripts, Swagger setup, or authentication layer are present.