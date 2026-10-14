"""Helper: load the full demo tenant (real handbook versions + docs + synthetic layer)."""

from ingest import handbook_changes, handbook_docs, synthetic


def load_demo(tenant: str, pending: set[str] | None = None) -> None:
    """C1 pending by default, exactly like the start of the demo."""
    handbook_changes.ingest(tenant, pending={"chg:c1"} if pending is None else pending)
    handbook_docs.ingest(tenant)
    synthetic.seed(tenant)
