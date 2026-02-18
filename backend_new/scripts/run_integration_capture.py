from __future__ import annotations

import argparse
import os
import subprocess
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description="Run single integration test suite and capture results.")
    parser.add_argument("--base-url", required=True, help="Target API base URL")
    parser.add_argument("--results-file", required=True, help="Output JSON file path")
    args = parser.parse_args()

    env = os.environ.copy()
    env["BASE_URL"] = args.base_url
    env["RESULTS_FILE"] = args.results_file

    cmd = ["uv", "run", "pytest", "tests/integration", "-q"]
    return subprocess.run(cmd, env=env, check=False).returncode


if __name__ == "__main__":
    sys.exit(main())
