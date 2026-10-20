# Local PostgreSQL smoke test

This Docker Compose setup is for non-production GATE-11 diagnostics only. It does not connect to Neon, run production migrations, enable PayPal, or satisfy GATE-14.

Start the local service:

```sh
docker compose -f docker-compose.local-postgres.yml up -d --wait
```

Run the 27-table and tenant-isolation smoke check:

```sh
LOCAL_POSTGRES_VERIFY=1 npm run verify:local-postgres
```

The database listens on loopback only. The initialization script creates the 27-table persistence contract and enables and forces row-level security on every table. The restricted runtime role must set `app.tenant_id` transaction-locally; without that trusted context, policies deny row access.

This is a local schema/RLS contract check, not a production migration or end-to-end application test. The existing Neon serverless adapter is not proven to connect to a plain local PostgreSQL TCP endpoint by this workflow. The product-specific Drizzle migrations in the extracted platform and marketplace directories remain separate schemas.

To delete the local database volume, run `docker compose -f docker-compose.local-postgres.yml down -v`. This permanently removes local test data.
