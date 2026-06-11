import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBatchId1781213278489 implements MigrationInterface {
    name = 'AddBatchId1781213278489'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ADD "batch_id" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_7c9104ed0d67835a0ad2cf9cff" ON "messages" ("batch_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_7c9104ed0d67835a0ad2cf9cff"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "batch_id"`);
    }

}
