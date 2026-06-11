import { MigrationInterface, QueryRunner } from "typeorm";

export class AddScheduledAt1781212614986 implements MigrationInterface {
    name = 'AddScheduledAt1781212614986'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ADD "scheduled_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "scheduled_at"`);
    }

}
