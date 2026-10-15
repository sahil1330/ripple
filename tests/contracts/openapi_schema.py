"""Validate JSON against a component schema of contracts/openapi.yaml.

The spec uses OpenAPI 3.0-style ``nullable: true``; plain JSON Schema ignores it, so
``to_jsonschema`` rewrites it to ``type: [<t>, "null"]`` (or ``anyOf`` with null for $refs)
and points every ``$ref`` at the components section.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import jsonschema
import yaml

SPEC = Path(__file__).resolve().parents[2] / "contracts" / "openapi.yaml"


def _convert(node):
    if isinstance(node, list):
        return [_convert(n) for n in node]
    if not isinstance(node, dict):
        return node
    out = {k: _convert(v) for k, v in node.items() if k not in ("nullable", "example")}
    if node.get("nullable"):
        if "$ref" in out:
            return {"anyOf": [{"$ref": out["$ref"]}, {"type": "null"}]}
        if "type" in out:
            out["type"] = [out["type"], "null"]
        if "enum" in out:
            out["enum"] = [*out["enum"], None]
    return out


@lru_cache(maxsize=1)
def components() -> dict:
    spec = yaml.safe_load(SPEC.read_text())
    return _convert(spec["components"]["schemas"])


def validate(instance, schema_name: str | None = None, *, array_of: str | None = None) -> None:
    """Raise ``jsonschema.ValidationError`` unless ``instance`` matches the named schema
    (or, with ``array_of``, is an array of it)."""
    name = schema_name or array_of
    ref = {"$ref": f"#/components/schemas/{name}"}
    schema = {"type": "array", "items": ref} if array_of else ref
    jsonschema.validate(instance, {**schema, "components": {"schemas": components()}})
