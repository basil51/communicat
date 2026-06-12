import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApiKeyRateLimit1781252113266 implements MigrationInterface {
    name = 'AddApiKeyRateLimit1781252113266'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "api_keys" ADD "rate_limit_per_minute" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "rate_limit_per_minute"`);
    }

}
