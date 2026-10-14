"""FalkorDB smoke tests (plan §4.4). Skipped when no FalkorDB is reachable."""

import os
import socket

import pytest


def _falkordb_up() -> bool:
    try:
        with socket.create_connection(
            (os.getenv("FALKORDB_HOST", "localhost"), int(os.getenv("FALKORDB_PORT", "6379"))), timeout=1
        ):
            return True
    except OSError:
        return False


pytestmark = [pytest.mark.falkordb, pytest.mark.skipif(not _falkordb_up(), reason="FalkorDB not running")]


def test_return_one():
    from graph.client import tenant_graph

    g = tenant_graph("smoke-test")
    assert g.query("RETURN 1").result_set[0][0] == 1
