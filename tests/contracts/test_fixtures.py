"""Fixture and contract sanity checks. Full openapi validation lands with the fixtures issue."""

import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]


def test_contract_files_parse():
    yaml.safe_load((ROOT / "contracts" / "openapi.yaml").read_text())
    json.loads((ROOT / "contracts" / "mcp-tools.json").read_text())


def test_fixtures_are_valid_json():
    for path in (ROOT / "fixtures").rglob("*.json"):
        json.loads(path.read_text())
