import pytest

from agents.concierge import UnknownTopic, route


@pytest.mark.parametrize(
    ("q", "key"),
    [
        ("Can I expense my ExpressVPN?", "expense.vpn.personal_subscription"),
        ("What's the meal limit on a trip?", "expense.travel.meals_daily_limit"),
        ("Is my phone bill covered?", "expense.home_internet_phone.monthly_limit"),
        ("Do I need approval for a co-working day pass?", "expense.coworking.rules"),
        ("How does the new hire stipend work?", "expense.new_hire.home_office_stipend"),
    ],
)
def test_route(q, key):
    assert route(q) == key


def test_unknown_topic():
    with pytest.raises(UnknownTopic):
        route("What is the meaning of life?")


def test_terms_drop_stopwords_and_plurals():
    from agents.concierge import terms

    assert terms("Who owns the onboarding docs?") == ["own", "onboarding", "doc"]
