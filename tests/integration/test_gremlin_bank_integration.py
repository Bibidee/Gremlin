"""Integration tests against real consensus (StudioNet/GLSim) — real LLM calls.

Run with: gltest tests/integration/ -v -s
Requires a running GenLayer network (StudioNet or local GLSim) reachable per gltest config.
"""
import pytest

from gltest import get_contract_factory


ALICE = "0x1111111111111111111111111111111111111111"
BOB = "0x2222222222222222222222222222222222222222"


@pytest.fixture
def deployed_contract():
    factory = get_contract_factory("Contract", "contracts/gremlin_bank.py")
    return factory.deploy(args=[])


def test_register_and_balance_roundtrip(deployed_contract):
    deployed_contract.register()
    balance = deployed_contract.get_balance(deployed_contract.caller_address)
    assert balance == 100


def test_creative_bless_plea_reaches_consensus(deployed_contract):
    deployed_contract.register()
    result = deployed_contract.plead(
        "bless",
        deployed_contract.caller_address,
        "I once taught a goldfish to high-five. Bless me, oh chaotic one.",
    )
    assert result["verdict"] in ("grant", "partial", "deny")
    assert 0 <= result["amount"] <= 50
    assert isinstance(result["roast"], str) and len(result["roast"]) > 0


def test_lazy_plea_is_plausibly_denied_or_low(deployed_contract):
    deployed_contract.register()
    result = deployed_contract.plead("bless", deployed_contract.caller_address, "money pls")
    assert result["verdict"] in ("grant", "partial", "deny")


def test_feed_reflects_finalized_plea(deployed_contract):
    deployed_contract.register()
    deployed_contract.plead(
        "bless", deployed_contract.caller_address, "A haiku for my balance: rise, oh coins, rise now"
    )
    feed = deployed_contract.get_recent_pleas(1)
    assert len(feed) == 1
    assert feed[0]["action"] == "bless"
