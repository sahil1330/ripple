"""Offline checks on the committed handbook extraction (no FalkorDB needed)."""

import re

from ingest.handbook_changes import load_data

PUBLIC = re.compile(r"^https://(gitlab\.com/gitlab-com/content-sites/handbook/|handbook\.gitlab\.com/)")


def test_every_version_has_provenance():
    for fact in load_data()["facts"]:
        for v in fact["versions"]:
            assert re.fullmatch(r"[0-9a-f]{40}", v["commit_sha"]), v["id"]
            assert PUBLIC.match(v["source_url"]), v["id"]
            assert isinstance(v["valid_from"], int) and v["valid_from"] > 1_600_000_000_000, v["id"]
            assert v["excerpt"].strip()


def test_versions_are_in_time_order():
    for fact in load_data()["facts"]:
        times = [v["valid_from"] for v in fact["versions"]]
        assert times == sorted(times), fact["key"]


def test_changes_reference_known_versions_and_public_mrs():
    ids = {v["id"] for f in load_data()["facts"] for v in f["versions"]}
    for c in load_data()["changes"]:
        assert c["from"] in ids and c["to"] in ids
        assert PUBLIC.match(c["mr_url"])


def test_no_internal_links():
    text = str(load_data())
    assert "theloop.gitlab.com" not in text and "internal-handbook" not in text
    assert "docs.google.com" not in text
