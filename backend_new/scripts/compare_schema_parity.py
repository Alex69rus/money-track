from __future__ import annotations

import argparse
import asyncio
import os
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import ParseResult, urlparse, urlunparse

import asyncpg

DEFAULT_IGNORE_TABLES = {"piccolo_migration", "piccolo_migrations"}


@dataclass(frozen=True)
class SchemaSnapshot:
    tables: tuple[str, ...]
    columns: tuple[tuple[str, ...], ...]
    constraints: tuple[tuple[str, ...], ...]
    indexes: tuple[tuple[str, ...], ...]


def _quote_ident(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def _normalize_sql(sql: str) -> str:
    return re.sub(r"\s+", " ", sql).strip()


def _with_database(parsed: ParseResult, database: str) -> str:
    path = f"/{database}"
    return urlunparse(parsed._replace(path=path))


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Create a fresh database from backend_new Piccolo migrations and compare "
            "its schema to an existing C# database schema."
        )
    )
    parser.add_argument("--source-database-url", default=os.getenv("DATABASE_URL"))
    parser.add_argument("--target-db-name", default="moneytrack_schema_parity_tmp")
    parser.add_argument(
        "--ignore-table",
        action="append",
        default=[],
        help="Table name to ignore during schema comparison (can be repeated).",
    )
    parser.add_argument(
        "--include-table",
        action="append",
        default=[],
        help=(
            "Table name to include in comparison (can be repeated). "
            "If set, only these tables are compared."
        ),
    )
    parser.add_argument(
        "--keep-target-db",
        action="store_true",
        help="Don't drop the target DB after comparison.",
    )
    return parser.parse_args()


async def _recreate_database(*, admin_dsn: str, database_name: str) -> None:
    conn = await asyncpg.connect(admin_dsn)
    try:
        db_ident = _quote_ident(database_name)
        await conn.execute(
            f"""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '{database_name}'
              AND pid <> pg_backend_pid();
            """
        )
        await conn.execute(f"DROP DATABASE IF EXISTS {db_ident};")
        await conn.execute(f"CREATE DATABASE {db_ident};")
    finally:
        await conn.close()


async def _drop_database(*, admin_dsn: str, database_name: str) -> None:
    conn = await asyncpg.connect(admin_dsn)
    try:
        db_ident = _quote_ident(database_name)
        await conn.execute(
            f"""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '{database_name}'
              AND pid <> pg_backend_pid();
            """
        )
        await conn.execute(f"DROP DATABASE IF EXISTS {db_ident};")
    finally:
        await conn.close()


async def _fetch_snapshot(
    database_url: str,
    ignore_tables: set[str],
    include_tables: set[str],
) -> SchemaSnapshot:
    conn = await asyncpg.connect(database_url)
    try:
        table_rows = await conn.fetch(
            """
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
            """
        )
        tables = tuple(
            row["tablename"]
            for row in table_rows
            if row["tablename"] not in ignore_tables
            and (not include_tables or row["tablename"] in include_tables)
        )

        column_rows = await conn.fetch(
            """
            SELECT
                table_name,
                column_name,
                data_type,
                udt_name,
                is_nullable,
                COALESCE(character_maximum_length::text, ''),
                COALESCE(numeric_precision::text, ''),
                COALESCE(numeric_scale::text, ''),
                COALESCE(datetime_precision::text, ''),
                COALESCE(column_default, ''),
                COALESCE(identity_generation, '')
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position
            """
        )
        columns = tuple(
            tuple(str(value) for value in row)
            for row in column_rows
            if row["table_name"] not in ignore_tables
            and (not include_tables or row["table_name"] in include_tables)
        )

        constraint_rows = await conn.fetch(
            """
            SELECT
                cls.relname AS table_name,
                c.conname,
                c.contype::text,
                pg_get_constraintdef(c.oid, true) AS definition
            FROM pg_constraint c
            JOIN pg_class cls ON cls.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = cls.relnamespace
            WHERE n.nspname = 'public'
            ORDER BY cls.relname, c.conname
            """
        )
        constraints = tuple(
            (
                row["table_name"],
                row["conname"],
                row["contype"],
                _normalize_sql(row["definition"]),
            )
            for row in constraint_rows
            if row["table_name"] not in ignore_tables
            and (not include_tables or row["table_name"] in include_tables)
        )

        index_rows = await conn.fetch(
            """
            SELECT tablename, indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = 'public'
            ORDER BY tablename, indexname
            """
        )
        indexes = tuple(
            (row["tablename"], row["indexname"], _normalize_sql(row["indexdef"]))
            for row in index_rows
            if row["tablename"] not in ignore_tables
            and (not include_tables or row["tablename"] in include_tables)
        )
    finally:
        await conn.close()

    return SchemaSnapshot(
        tables=tables,
        columns=columns,
        constraints=constraints,
        indexes=indexes,
    )


def _print_diff(
    *,
    label: str,
    source_values: tuple[tuple[str, ...], ...] | tuple[str, ...],
    target_values: tuple[tuple[str, ...], ...] | tuple[str, ...],
) -> int:
    source_set = set(source_values)
    target_set = set(target_values)

    missing = sorted(repr(item) for item in (source_set - target_set))
    extra = sorted(repr(item) for item in (target_set - source_set))

    if not missing and not extra:
        return 0

    print(f"\n[{label}]")
    if missing:
        print("Missing in target:")
        for item in missing:
            print(f"  - {item}")
    if extra:
        print("Extra in target:")
        for item in extra:
            print(f"  - {item}")
    return len(missing) + len(extra)


def _run_piccolo_migrations(*, backend_new_dir: Path, target_database_url: str) -> None:
    env = os.environ.copy()
    env["DATABASE_URL"] = target_database_url

    subprocess.run(
        [str(backend_new_dir / ".venv/bin/piccolo"), "migrations", "forwards", "db"],
        cwd=backend_new_dir,
        env=env,
        check=True,
    )


async def _main_async(args: argparse.Namespace) -> int:
    source_database_url = args.source_database_url
    if not source_database_url:
        raise RuntimeError("Set DATABASE_URL or pass --source-database-url.")

    parsed = urlparse(source_database_url)
    source_db_name = parsed.path.lstrip("/")
    if not source_db_name:
        raise RuntimeError(f"Cannot parse database name from DSN: {source_database_url}")
    if source_db_name == args.target_db_name:
        raise RuntimeError("Target DB name must be different from source DB name.")

    admin_dsn = _with_database(parsed, "postgres")
    target_database_url = _with_database(parsed, args.target_db_name)
    backend_new_dir = Path(__file__).resolve().parents[1]

    ignore_tables = set(DEFAULT_IGNORE_TABLES)
    ignore_tables.update(args.ignore_table)
    include_tables = set(args.include_table)

    await _recreate_database(admin_dsn=admin_dsn, database_name=args.target_db_name)
    try:
        _run_piccolo_migrations(
            backend_new_dir=backend_new_dir,
            target_database_url=target_database_url,
        )

        source_snapshot = await _fetch_snapshot(source_database_url, ignore_tables, include_tables)
        target_snapshot = await _fetch_snapshot(target_database_url, ignore_tables, include_tables)

        print(f"Source DB: {source_db_name}")
        print(f"Target DB: {args.target_db_name}")
        print(f"Ignored tables: {sorted(ignore_tables)}")
        if include_tables:
            print(f"Included tables: {sorted(include_tables)}")

        diff_count = 0
        diff_count += _print_diff(
            label="tables",
            source_values=source_snapshot.tables,
            target_values=target_snapshot.tables,
        )
        diff_count += _print_diff(
            label="columns",
            source_values=source_snapshot.columns,
            target_values=target_snapshot.columns,
        )
        diff_count += _print_diff(
            label="constraints",
            source_values=source_snapshot.constraints,
            target_values=target_snapshot.constraints,
        )
        diff_count += _print_diff(
            label="indexes",
            source_values=source_snapshot.indexes,
            target_values=target_snapshot.indexes,
        )

        if diff_count == 0:
            print("\nSchema parity check: PASS")
            return 0

        print(f"\nSchema parity check: FAIL ({diff_count} differences)")
        return 1
    finally:
        if not args.keep_target_db:
            await _drop_database(admin_dsn=admin_dsn, database_name=args.target_db_name)


def main() -> int:
    args = _parse_args()
    return asyncio.run(_main_async(args))


if __name__ == "__main__":
    raise SystemExit(main())
