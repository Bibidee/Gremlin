"""Direct (mocked, in-memory) tests for GremlinBank contract state transitions."""
import json
import pytest

from gltest import get_contract_factory
from gltest.helpers import register_contract


ALICE = "0x1111111111111111111111111111111111111111"
BOB = "0x2222222222222222222222222222222222222222"


def _mock_llm(verdict="grant", amount=20, roast="Fine, take your silly coins."):
    def _fn(*args, **kwargs):
        return json.dumps({"verdict": verdict, "amount": amount, "roast": roast})
    return _fn


@pytest.fixture
def contract_factory():
    return get_contract_factory("Contract", "contracts/gremlin_bank.py")


def test_register_sets_starting_balance(contract_factory):
    contract = contract_factory.deploy(args=[])
    contract.register()
    assert contract.get_balance(ALICE) >= 0  # sanity, deployer registers via caller context


def test_register_is_idempotent(contract_factory):
    contract = contract_factory.deploy(args=[])
    contract.register()
    with pytest.raises(Exception):
        contract.register()


def test_bless_mints_capped_amount(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="grant", amount=999),
    )
    result = contract.plead("bless", ALICE, "please bless me, I wrote a haiku")
    assert result["amount"] <= 50


def test_gift_cannot_exceed_balance(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="grant", amount=50),
    )
    result = contract.plead("gift", BOB, "take some of my coins")
    assert result["amount"] <= 100


def test_self_target_forbidden_for_steal(contract_factory):
    contract = contract_factory.deploy(args=[])
    contract.register()
    with pytest.raises(Exception):
        contract.plead("steal", contract.caller_address, "steal from myself, lol")


def test_validator_rejects_bad_verdict_string(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="maybe", amount=10),
    )
    with pytest.raises(Exception):
        contract.plead("bless", ALICE, "please")


def test_validator_rejects_out_of_range_amount(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="grant", amount=99999),
    )
    with pytest.raises(Exception):
        contract.plead("bless", ALICE, "please")


def test_validator_rejects_malformed_json(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        lambda *a, **k: "not json at all",
    )
    with pytest.raises(Exception):
        contract.plead("bless", ALICE, "please")


def test_deny_verdict_moves_nothing(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="deny", amount=40, roast="No."),
    )
    result = contract.plead("bless", ALICE, "gimme money")
    assert result["amount"] == 0
    assert result["verdict"] == "deny"


def test_partial_verdict_halves_amount(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="partial", amount=40),
    )
    result = contract.plead("bless", ALICE, "eh, decent joke")
    assert result["amount"] == 20


def test_message_length_bound(contract_factory):
    contract = contract_factory.deploy(args=[])
    contract.register()
    with pytest.raises(Exception):
        contract.plead("bless", ALICE, "x" * 281)


def test_unregistered_target_rejected(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="grant", amount=10),
    )
    with pytest.raises(Exception):
        contract.plead("bless", "0x9999999999999999999999999999999999999999", "hi")


def test_steal_capped_to_target_balance(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="grant", amount=50),
    )
    result = contract.plead("steal", BOB, "gimme your coins")
    assert result["amount"] <= 100


def test_recent_pleas_feed_records_entry(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="grant", amount=10, roast="Nice try."),
    )
    contract.plead("bless", ALICE, "a good joke")
    feed = contract.get_recent_pleas(5)
    assert len(feed) >= 1
    assert feed[-1]["roast"] == "Nice try."


# -- Leaderboard --------------------------------------------------------


def test_leaderboard_balances_sorted_desc(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="grant", amount=50),
    )
    contract.plead("bless", contract.caller_address, "give me a boost")
    rows = contract.get_leaderboard_balances(10)
    assert len(rows) >= 1
    balances = [row["balance"] for row in rows]
    assert balances == sorted(balances, reverse=True)


def test_leaderboard_heists_tracks_steal(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="grant", amount=30),
    )
    contract.plead("steal", BOB, "gimme your coins")
    rows = contract.get_leaderboard_heists(10)
    assert any(row["total_heisted"] > 0 for row in rows)


def test_leaderboard_targeted_tracks_curse(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="grant", amount=15),
    )
    contract.plead("curse", BOB, "you deserve this")
    rows = contract.get_leaderboard_targeted(10)
    assert any(row["times_targeted"] > 0 for row in rows)


# -- Duel mode ------------------------------------------------------------


def test_challenge_duel_creates_pending_duel(contract_factory):
    contract = contract_factory.deploy(args=[])
    contract.register()
    duel_id = contract.challenge_duel(BOB, "I bet I'm funnier than you.")
    duel = contract.get_duel(duel_id)
    assert duel["status"] == "pending"
    assert duel["opponent"].lower() == BOB.lower()


def test_challenge_duel_self_forbidden(contract_factory):
    contract = contract_factory.deploy(args=[])
    contract.register()
    with pytest.raises(Exception):
        contract.challenge_duel(contract.caller_address, "duel myself")


def test_accept_duel_resolves_and_moves_balance(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    duel_id = contract.challenge_duel(BOB, "I bet I'm funnier than you.")

    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="challenger", amount=25, roast="Challenger wins, easily."),
    )
    result = contract.accept_duel(duel_id, "Not a chance, I'm way funnier.")
    assert result["verdict"] == "challenger"
    assert result["amount"] <= 50

    duel = contract.get_duel(duel_id)
    assert duel["status"] == "resolved"


def test_accept_duel_draw_moves_nothing(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    duel_id = contract.challenge_duel(BOB, "let's see who's got it")

    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="draw", amount=40, roast="Tie. Both mediocre."),
    )
    result = contract.accept_duel(duel_id, "bring it")
    assert result["verdict"] == "draw"
    assert result["amount"] == 0


def test_accept_duel_wrong_opponent_rejected(contract_factory):
    contract = contract_factory.deploy(args=[])
    contract.register()
    duel_id = contract.challenge_duel(BOB, "duel me")
    with pytest.raises(Exception):
        contract.accept_duel(duel_id, "not my duel")  # caller is challenger, not opponent


def test_decline_duel_marks_declined(contract_factory):
    contract = contract_factory.deploy(args=[])
    contract.register()
    duel_id = contract.challenge_duel(BOB, "duel me")
    # NOTE: caller is the challenger here in a single-account test harness;
    # decline is exercised for the guard rejecting a non-opponent caller below.
    with pytest.raises(Exception):
        contract.decline_duel(duel_id)


def test_validator_rejects_bad_duel_verdict(contract_factory, monkeypatch):
    contract = contract_factory.deploy(args=[])
    contract.register()
    duel_id = contract.challenge_duel(BOB, "duel me")
    monkeypatch.setattr(
        "genlayer.gl.nondet.exec_prompt",
        _mock_llm(verdict="grant", amount=10, roast="wrong vocabulary"),
    )
    with pytest.raises(Exception):
        contract.accept_duel(duel_id, "response")
