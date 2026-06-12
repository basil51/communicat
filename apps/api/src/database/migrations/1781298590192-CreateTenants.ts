import { MigrationInterface, QueryRunner } from 'typeorm';

// Hand-written (not generated): UNIQUE NULLS NOT DISTINCT is not expressible
// through TypeORM decorators. A future migration:generate may try to drop
// UQ_templates_tenant_name — don't let it.
export class CreateTenants1781298590192 implements MigrationInterface {
  name = 'CreateTenants1781298590192';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tenants" ("id" character varying NOT NULL, "name" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_tenants_name" UNIQUE ("name"), CONSTRAINT "PK_tenants" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(`ALTER TABLE "api_keys" ADD "allowed_channels" text`);

    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "FK_api_keys_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "templates" ADD CONSTRAINT "FK_templates_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhooks" ADD CONSTRAINT "FK_webhooks_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")`,
    );

    // No FK on messages (hot insert path) — index only, for scoped list queries
    await queryRunner.query(`CREATE INDEX "IDX_messages_tenant_id" ON "messages" ("tenant_id")`);

    // Template names: globally unique → unique per tenant. NULLS NOT DISTINCT (PG15+)
    // so two global (tenant_id IS NULL) templates can't share a name either.
    await queryRunner.query(`ALTER TABLE "templates" DROP CONSTRAINT "UQ_5624219dd33b4644599d4d4b231"`);
    await queryRunner.query(
      `ALTER TABLE "templates" ADD CONSTRAINT "UQ_templates_tenant_name" UNIQUE NULLS NOT DISTINCT ("tenant_id", "name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "templates" DROP CONSTRAINT "UQ_templates_tenant_name"`);
    await queryRunner.query(
      `ALTER TABLE "templates" ADD CONSTRAINT "UQ_5624219dd33b4644599d4d4b231" UNIQUE ("name")`,
    );
    await queryRunner.query(`DROP INDEX "IDX_messages_tenant_id"`);
    await queryRunner.query(`ALTER TABLE "webhooks" DROP CONSTRAINT "FK_webhooks_tenant"`);
    await queryRunner.query(`ALTER TABLE "templates" DROP CONSTRAINT "FK_templates_tenant"`);
    await queryRunner.query(`ALTER TABLE "api_keys" DROP CONSTRAINT "FK_api_keys_tenant"`);
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "allowed_channels"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
  }
}
