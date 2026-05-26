import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * AddTokenVersionToUsers
 * ──────────────────────
 * Adds the `token_version` (int, default 0) column to the `users` table.
 *
 * This column is used to invalidate all existing JWT sessions when a user
 * resets or changes their password, without needing a full token blocklist scan.
 * The JWT payload includes `tv` (token version); if it mismatches the DB value
 * the request is rejected in JwtStrategy.validate().
 *
 * Run on production:  npx typeorm migration:run -d dist/src/database/data-source.js
 * Revert:             npx typeorm migration:revert -d dist/src/database/data-source.js
 */
export class AddTokenVersionToUsers1748249000000 implements MigrationInterface {
  name = 'AddTokenVersionToUsers1748249000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'token_version',
        type: 'int',
        default: 0,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'token_version');
  }
}
