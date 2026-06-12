import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeliveredTracking1781269443298 implements MigrationInterface {
    name = 'AddDeliveredTracking1781269443298'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ADD "delivered_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "provider_message_id" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_53e8170f736f8b0ad29a5bfa91" ON "messages" ("provider_message_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_53e8170f736f8b0ad29a5bfa91"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "provider_message_id"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "delivered_at"`);
    }

}
