#!/usr/bin/env bash
# Ripple FalkorDB Seed Script
# Seeds real handbook changes (C1–C5), docs + links, and synthetic nodes into FalkorDB
set -euo pipefail

TENANT="${1:-${RIPPLE_DEFAULT_TENANT:-handbook-demo}}"
DEFAULT_SEED="42"
if [ "${TENANT}" = "acme-synthetic" ]; then
  DEFAULT_SEED="1337"
fi
SEED="${2:-${DEFAULT_SEED}}"

echo "==> Seeding Ripple tenant: ${TENANT} (seed=${SEED})"
echo "==> Target FalkorDB: ${FALKORDB_HOST:-localhost}:${FALKORDB_PORT:-6379}"

echo "0/3: Creating idempotent schema and indexes..."
python -m graph.schema --tenant "${TENANT}"

echo "1/3: Ingesting verified handbook changes (pending chg:c1)..."
python -m ingest.handbook_changes --tenant "${TENANT}" --pending chg:c1

echo "2/3: Ingesting handbook documentation and hyperlinks..."
python -m ingest.handbook_docs --tenant "${TENANT}"

echo "3/3: Ingesting seeded synthetic layer (people, teams, plans, worker agents)..."
python -m ingest.synthetic --tenant "${TENANT}" --seed "${SEED}"

echo "==> Seeding completed successfully for tenant: ${TENANT}"
