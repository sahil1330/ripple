"""Opt-in: runs the live agent + LLM Concierge eval against RIPPLE_EVAL_API_URL. Skipped in CI by default."""

import os

import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("RIPPLE_EVAL_API_URL"),
    reason="set RIPPLE_EVAL_API_URL (API must have OPENAI_API_KEY) to run",
)


def test_live_eval():
    from tests.eval import live_eval

    assert live_eval.main() == 0
