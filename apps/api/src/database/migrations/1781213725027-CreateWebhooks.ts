import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWebhooks1781213725027 implements MigrationInterface {
    name = 'CreateWebhooks1781213725027'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "webhooks" ("id" character varying NOT NULL, "url" character varying NOT NULL, "events" text NOT NULL, "secret" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "tenant_id" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9e8795cfc899ab7bdaa831e8527" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "webhooks"`);
    }

}
