import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1781179680582 implements MigrationInterface {
    name = 'InitialSchema1781179680582'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "messages" ("id" character varying NOT NULL, "channel" character varying NOT NULL, "to_address" character varying NOT NULL, "subject" character varying, "body" text NOT NULL, "status" character varying NOT NULL DEFAULT 'queued', "api_key_id" character varying, "tenant_id" character varying, "retry_count" integer NOT NULL DEFAULT '0', "error_message" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "queued_at" TIMESTAMP WITH TIME ZONE, "processing_at" TIMESTAMP WITH TIME ZONE, "sent_at" TIMESTAMP WITH TIME ZONE, "failed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_befd307485dbf0559d17e4a4d2" ON "messages" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_0777b63da90c27d6ed993dc60b" ON "messages" ("created_at") `);
        await queryRunner.query(`CREATE TABLE "api_keys" ("id" character varying NOT NULL, "name" character varying NOT NULL, "key_hash" character varying NOT NULL, "tenant_id" character varying, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_used_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_57384430aa1959f4578046c9b81" UNIQUE ("key_hash"), CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "api_keys"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0777b63da90c27d6ed993dc60b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_befd307485dbf0559d17e4a4d2"`);
        await queryRunner.query(`DROP TABLE "messages"`);
    }

}
