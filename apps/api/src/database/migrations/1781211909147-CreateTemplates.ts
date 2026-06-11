import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTemplates1781211909147 implements MigrationInterface {
    name = 'CreateTemplates1781211909147'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "templates" ("id" character varying NOT NULL, "name" character varying NOT NULL, "channel" character varying NOT NULL, "subject" character varying, "body" text NOT NULL, "tenant_id" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_5624219dd33b4644599d4d4b231" UNIQUE ("name"), CONSTRAINT "PK_515948649ce0bbbe391de702ae5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "template_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "template_id"`);
        await queryRunner.query(`DROP TABLE "templates"`);
    }

}
