# Technical Documentation - Lojita REST API

## Overview

This directory contains the NestJS application for the Lojita project. The code implements a marketplace domain with users, stores, products, variants, carts, orders, payments, coupons, chats, and support records.

Primary technologies:

- NestJS 11 and TypeScript 5
- PostgreSQL
- TypeORM 0.3
- `class-validator` and `class-transformer`
- Jest, ts-jest, and Supertest
- ESLint and Prettier

Authentication, Swagger/OpenAPI, caching, messaging, and external service integrations are not implemented in this version.

## Prerequisites

- Node.js with support for the project's TypeScript and Jest toolchain.
- npm, as indicated by `package-lock.json`.
- PostgreSQL accessible at `localhost:5432`.
- A local database named `lojita`, with credentials matching the configured database profile.

The exact Node.js version is not declared in `package.json`, and there is no `.nvmrc`, Dockerfile, or Compose configuration. The database does not use migrations: the current profile uses automatic schema synchronization.

## Local installation and execution

```bash
cd app
npm install
npm run start:dev
```

The API uses port `3000` by default. The port can be changed through the `PORT` environment variable.

PowerShell example:

```powershell
$env:PORT=3000
npm run start:dev
```

The database is configured in `dinamic/db-connect.module.ts`. Currently, `src/app.module.ts` registers the `test` profile with:

- host: `localhost`
- port: `5432`
- database: `lojita`
- `autoLoadEntities: true`
- `synchronize: true`

There is no `.env.example`, and the host, port, database, username, and password are not read from environment variables. These values must be changed in the configuration before using credentials that differ from the local setup.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run build` | Compile the application with the Nest CLI |
| `npm run start` | Start the application |
| `npm run start:dev` | Start in watch mode |
| `npm run start:debug` | Start in debug and watch mode |
| `npm run start:prod` | Execute `dist/main` |
| `npm run lint` | Run ESLint and automatically fix issues |
| `npm run format` | Format TypeScript files under `src` and `test` |
| `npm run test` | Run the Jest tests |
| `npm run test:watch` | Run Jest in watch mode |
| `npm run test:cov` | Generate test coverage |
| `npm run test:debug` | Run Jest in debug mode |
| `npm run test:e2e` | Run the configured end-to-end test suite |

No `test/` directory was found in the current repository, so the end-to-end script may fail without that directory and its configuration.

## Project structure

```text
app/
├── src/
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts
├── common/
│   ├── dtos/
│   ├── enums/
│   ├── filters/
│   ├── pipes/
│   └── types/
├── dinamic/
│   └── db-connect.module.ts
├── entities/
│   └── TypeORM entities
├── modules/
│   └── Business modules
├── http/
│   └── HTTP requests by resource
├── package.json
└── package-lock.json
```

## Architecture and conventions

Each business module generally follows this structure:

- the controller receives requests and delegates to the service;
- the service implements queries, domain checks, and repository operations;
- the DTO defines the expected input and uses `class-validator` decorators;
- the module registers the controller, service, and TypeORM repositories.

`main.ts` registers the global pipe and filter:

- `GlobalValidationPipe` removes undeclared fields, rejects additional fields, and transforms basic types;
- `HttpExceptionFilter` standardizes HTTP errors and translates common PostgreSQL errors.

Example error format:

```json
{
  "status": 400,
  "message": "Validation failed",
  "details": {
    "email": ["email must be an email"]
  }
}
```

Missing resources use `404`; domain or database conflicts use `409`; missing references use `422`; and unhandled exceptions use `500`.

## Main endpoints

The resources below do not have authentication middleware or guards implemented. Methods with `:id` validate the parameter as an integer.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/` | Return the application's base message |
| `GET/POST/PATCH/DELETE` | `/users` and `/users/:id` | List, create, retrieve, update, and remove users |
| `GET/POST/PATCH/DELETE` | `/user-address` and `/user-address/:id` | Manage user addresses |
| `GET/POST/PATCH/DELETE` | `/stores` and `/stores/:id` | Manage stores |
| `GET/POST/PATCH/DELETE` | `/categories` and `/categories/:id` | Manage categories |
| `GET/POST/PATCH/DELETE` | `/products` and `/products/:id` | Manage products |
| `GET/POST/PATCH/DELETE` | `/variants` and `/variants/:id` | Manage variants |
| `GET/POST/PATCH/DELETE` | `/carts` and `/carts/:id` | Manage carts |
| `GET/POST/PATCH/DELETE` | `/cart-items` and `/cart-items/:id` | Manage cart items |
| `GET/POST/PATCH/DELETE` | `/orders` and `/orders/:id` | Manage orders |
| `GET/POST/PATCH/DELETE` | `/coupons` and `/coupons/:id` | Manage coupons |
| `GET/POST/DELETE` | `/coupon-usages/:userId/:couponId/:orderId` | Create, retrieve, and remove coupon usages |
| `GET/POST/PATCH/DELETE` | `/payments` and `/payments/:id` | Manage payments |
| `GET/POST/PATCH/DELETE` | `/chats` and `/chats/:id` | Manage chats |
| `GET/POST/PATCH/DELETE` | `/messages` and `/messages/:id` | Manage messages |
| `GET/POST/PATCH/DELETE` | `/support-tickets` and `/support-tickets/:id` | Manage support tickets |

Other implemented CRUD resources include attributes, attribute values, specifications, variant images, product ratings and reviews, favorites, cards, chat participants, payment methods, order addresses and items, order sellers, and coupon-product/category relationships.

Executable examples are available in `http/*.http`. Swagger or OpenAPI is not configured.

## Database and persistence

The project uses PostgreSQL with TypeORM. The current configuration is in `dinamic/db-connect.module.ts`; there are no migration or seed files in the repository.

Core entities include:

- users, addresses, stores, and categories;
- products, specifications, variants, images, and attributes;
- carts, cart items, favorites, and payments;
- orders, order addresses and items, order sellers, and payment methods;
- coupons, usages, and product/category associations;
- chats, participants, and messages;
- ratings, reviews, and support tickets.

Important relationships include user-store, product-category-store, product-variant, order-user, order-items, and coupon-usage-order relationships. Foreign keys and entity associations are declared with TypeORM decorators inside `entities/`.

Because migrations are not present, the `test` profile uses `synchronize: true` to create or update the schema. This behavior should not be used as the primary production schema strategy.

## Security and access control

The current code does not implement authentication, role-based authorization, guards, JWT, password hashing, or CORS configuration. Passwords are persisted as entity fields, so the current flow should not be considered production-ready from a security perspective.

The project has a `Role` enum in `modules/users/enums`, but it is not used by guards or middleware. Request input is validated globally, and database errors are normalized without exposing stack traces or unhandled exception details to clients.

Database credentials are not parameterized through environment variables in this version and must not be committed as shared secrets.

## Tests and quality

Jest and ts-jest use the `@/` alias configured in `package.json`. Unit tests are colocated with modules in `*.service.spec.ts` and `*.controller.spec.ts` files.

Observed patterns:

- mocks for TypeORM repositories and service methods;
- tests for return values, exception propagation, and expected method calls;
- `NestTestingModule` for retrieving controllers with mocked dependencies;
- local mocks for NestJS decorators when needed.

Example commands:

```bash
npm run test
npm run test -- users.controller.spec.ts
npm run test:cov
```

## Contributing

When adding a feature, follow the existing structure:

1. Create a DTO in `modules/<domain>/dto/` with `class-validator` rules.
2. Add a controller in `modules/<domain>/` using `ParseIntPipe` for numeric IDs.
3. Implement business rules in the service and use the injected TypeORM repository.
4. Define or reuse the entity in `entities/`.
5. Register the module in `src/app.module.ts`.
6. Add controller and service tests.
7. Add an HTTP request to `http/` when manual testing is needed.

Before submitting changes, run:

```bash
npm run lint
npm run test
npm run build
```
