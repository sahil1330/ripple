"""Shared fixtures for tests that need a running FalkorDB.

Every test gets its own throwaway tenant graph (``ripple:test-<name>``) that is
deleted afterwards, so tests never see each other's data.
"""

from __future__ import annotations

import os
import socket
import uuid

import pytest


def falkordb_up() -> bool:
    """True when something answers on FALKORDB_HOST:FALKORDB_PORT."""
    try:
        with socket.create_connection(
            (os.getenv("FALKORDB_HOST", "localhost"), int(os.getenv("FALKORDB_PORT", "6379"))), timeout=1
        ):
            return True
    except OSError:
        return False


requires_falkordb = [
    pytest.mark.falkordb,
    pytest.mark.skipif(not falkordb_up(), reason="FalkorDB not running"),
]


@pytest.fixture
def tenant() -> str:
    """A unique tenant id for one test."""
    return f"test-{uuid.uuid4().hex[:8]}"


@pytest.fixture
def g(tenant):
    """An empty FalkorDB graph for ``tenant``; deleted after the test."""
    from graph.client import tenant_graph

    graph = tenant_graph(tenant)
    yield graph
    try:
        graph.delete()
    except Exception:  # graph was never created (no writes) -> nothing to delete
        pass
