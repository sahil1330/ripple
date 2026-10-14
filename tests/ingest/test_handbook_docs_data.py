"""Offline checks on the committed handbook docs extraction."""

from ingest.handbook_docs import POLICY_PAGE, load_data


def test_at_least_30_public_handbook_docs():
    docs = load_data()["docs"]
    assert len(docs) >= 30
    assert all(d["url"].startswith("https://handbook.gitlab.com/handbook/finance/") for d in docs)
    assert load_data()["attribution"] == "GitLab B.V."


def test_links_stay_inside_the_set_and_no_internal_text():
    docs = load_data()["docs"]
    ids = {d["id"] for d in docs}
    assert all(t in ids for d in docs for t in d["links"])
    assert not any("internal.gitlab.com" in d["excerpt"] for d in docs)


def test_policy_page_states_all_five_facts():
    page = next(d for d in load_data()["docs"] if d["id"] == POLICY_PAGE)
    assert len(page["cites"]) == 5
