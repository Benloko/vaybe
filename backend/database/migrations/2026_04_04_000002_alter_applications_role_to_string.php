<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('applications')) {
            return;
        }

        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $this->alterSqlite();
            return;
        }

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE applications MODIFY role VARCHAR(50) NOT NULL");
            return;
        }

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE applications ALTER COLUMN role TYPE VARCHAR(50)");
            return;
        }
    }

    public function down(): void
    {
        // Best-effort rollback: revient à un enum dev/designer.
        if (!Schema::hasTable('applications')) {
            return;
        }

        // Normalise les valeurs hors enum avant rollback.
        try {
            DB::statement("UPDATE applications SET role = 'dev' WHERE role NOT IN ('dev','designer')");
        } catch (\Throwable $e) {
            // ignore
        }

        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $this->rollbackSqlite();
            return;
        }

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE applications MODIFY role ENUM('dev','designer') NOT NULL");
            return;
        }

        if ($driver === 'pgsql') {
            // Pas de type enum ici: on laisse en varchar.
            return;
        }
    }

    private function alterSqlite(): void
    {
        // Rebuild complet (SQLite ne permet pas de retirer proprement la contrainte CHECK issue d'un enum).
        DB::statement('PRAGMA foreign_keys=OFF');

        DB::statement(<<<SQL
CREATE TABLE applications__tmp (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  nom VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  telephone VARCHAR(30) NULL,
  ville VARCHAR NULL,
  role VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  portfolio VARCHAR NULL,
  cv VARCHAR NULL,
  avatar_path VARCHAR NULL,
  score INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  offer_id INTEGER NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  FOREIGN KEY(offer_id) REFERENCES offers(id) ON DELETE SET NULL
)
SQL);

        DB::statement(<<<SQL
INSERT INTO applications__tmp (
  id, nom, email, telephone, ville, role, message, portfolio, cv, avatar_path, score, status, offer_id, created_at, updated_at
)
SELECT
  id, nom, email, telephone, ville, role, message, portfolio, cv, avatar_path, score, status, offer_id, created_at, updated_at
FROM applications
SQL);

        DB::statement('DROP TABLE applications');
        DB::statement('ALTER TABLE applications__tmp RENAME TO applications');

        // Restaure les index/contraintes utiles.
        try {
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS applications_offer_id_email_unique ON applications (offer_id, email)');
        } catch (\Throwable $e) {
            // ignore
        }

        DB::statement('PRAGMA foreign_keys=ON');
    }

    private function rollbackSqlite(): void
    {
        DB::statement('PRAGMA foreign_keys=OFF');

        DB::statement(<<<SQL
CREATE TABLE applications__tmp (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  nom VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  telephone VARCHAR(30) NULL,
  ville VARCHAR NULL,
  role VARCHAR NOT NULL CHECK (role IN ('dev','designer')),
  message TEXT NOT NULL,
  portfolio VARCHAR NULL,
  cv VARCHAR NULL,
  avatar_path VARCHAR NULL,
  score INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  offer_id INTEGER NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  FOREIGN KEY(offer_id) REFERENCES offers(id) ON DELETE SET NULL
)
SQL);

        DB::statement(<<<SQL
INSERT INTO applications__tmp (
  id, nom, email, telephone, ville, role, message, portfolio, cv, avatar_path, score, status, offer_id, created_at, updated_at
)
SELECT
  id, nom, email, telephone, ville, role, message, portfolio, cv, avatar_path, score, status, offer_id, created_at, updated_at
FROM applications
SQL);

        DB::statement('DROP TABLE applications');
        DB::statement('ALTER TABLE applications__tmp RENAME TO applications');

        try {
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS applications_offer_id_email_unique ON applications (offer_id, email)');
        } catch (\Throwable $e) {
            // ignore
        }

        DB::statement('PRAGMA foreign_keys=ON');
    }
};
