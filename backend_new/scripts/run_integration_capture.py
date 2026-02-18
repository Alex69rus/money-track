from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run single integration test suite and capture results."
    )
    parser.add_argument("--base-url", required=True, help="Target API base URL")
    parser.add_argument("--results-file", required=True, help="Output JSON file path")
    parser.add_argument(
        "--test-database-url", help="Optional PostgreSQL DSN for DB setup/assertions"
    )
    parser.add_argument("--test-user-id", help="Optional test user id override")
    parser.add_argument("--test-other-user-id", help="Optional secondary user id override")
    parser.add_argument(
        "--production-base-url",
        help="Optional production-mode API base URL for auth-negative checks",
    )
    args = parser.parse_args()

    env = os.environ.copy()
    env["BASE_URL"] = args.base_url
    env["RESULTS_FILE"] = args.results_file
    if args.test_database_url:
        env["TEST_DATABASE_URL"] = args.test_database_url
    if args.test_user_id:
        env["TEST_USER_ID"] = args.test_user_id
    if args.test_other_user_id:
        env["TEST_OTHER_USER_ID"] = args.test_other_user_id
    if args.production_base_url:
        env["PRODUCTION_BASE_URL"] = args.production_base_url

    venv_pytest = Path(".venv/bin/pytest")
    if venv_pytest.exists():
        cmd = [str(venv_pytest), "tests/integration", "-q"]
    else:
        cmd = ["uv", "run", "--no-project", "pytest", "tests/integration", "-q"]
    return subprocess.run(cmd, env=env, check=False).returncode


if __name__ == "__main__":
    sys.exit(main())
