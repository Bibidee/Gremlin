# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
import json
import typing

# --- Tunable game constants -------------------------------------------------

STARTING_BALANCE: u256 = u256(100)
MAX_ACTION_AMOUNT: u256 = u256(50)
MAX_MESSAGE_LEN = 280
MAX_ROAST_LEN = 200

VALID_ACTIONS = ("bless", "gift", "steal", "curse", "roast_tax")
DEBIT_ACTIONS = ("steal", "curse", "roast_tax")  # act on target's balance, target doesn't consent
SELF_TARGET_FORBIDDEN = ("steal", "curse", "roast_tax")  # can't do these to yourself
VALID_VERDICTS = ("grant", "partial", "deny")

DUEL_VERDICTS = ("challenger", "opponent", "draw")
DUEL_STATUS_PENDING = "pending"
DUEL_STATUS_RESOLVED = "resolved"
DUEL_STATUS_DECLINED = "declined"

DUEL_PERSONA = """You are the Gremlin, judging a duel between two rival pleaders in a shared token ledger called GREM.
Both sides submitted a message trying to win your favor. Pick a winner based on wit, creativity, and boldness.
You must respond ONLY with a single JSON object, no other text, matching exactly this shape:
{"verdict": "challenger" | "opponent" | "draw", "amount": <integer, 0 to %d>, "roast": "<your in-character one-liner verdict, under %d characters>"}
"amount" is how much GREM the winner takes from the loser. On a draw, amount is ignored.
Never include markdown, code fences, or explanation - output the JSON object and nothing else.""" % (
    int(MAX_ACTION_AMOUNT),
    MAX_ROAST_LEN,
)

GREMLIN_PERSONA = """You are the Gremlin, a small, chaotic, sharp-tongued creature who lives inside a shared token ledger called GREM.
Players submit pleas asking you to bless (mint), gift (transfer their own funds), steal, curse, or roast_tax (burn) GREM.
You judge each plea on creativity, humor, and boldness. You are whimsical but not a pushover - lazy or rude pleas get denied or mocked.
You must respond ONLY with a single JSON object, no other text, matching exactly this shape:
{"verdict": "grant" | "partial" | "deny", "amount": <integer, 0 to %d>, "roast": "<your in-character one-liner reaction, under %d characters>"}
"amount" is how much GREM you personally would grant if this were a full "grant" - the contract will clamp and adjust it based on the actual verdict.
Never include markdown, code fences, or explanation - output the JSON object and nothing else.""" % (
    int(MAX_ACTION_AMOUNT),
    MAX_ROAST_LEN,
)


@allow_storage
@dataclass
class Plea:
    pleader: Address
    target: Address
    action: str
    message: str
    verdict: str
    roast: str
    amount: u256


@allow_storage
@dataclass
class Duel:
    id: u32
    challenger: Address
    opponent: Address
    challenger_message: str
    opponent_message: str
    status: str
    verdict: str
    winner: Address
    roast: str
    amount: u256


class Contract(gl.Contract):
    balances: TreeMap[Address, u256]
    plea_log: DynArray[Plea]
    plea_count: TreeMap[Address, u32]
    total_supply: u256
    all_addresses: DynArray[Address]
    total_heisted: TreeMap[Address, u256]
    times_targeted: TreeMap[Address, u32]
    duels: DynArray[Duel]
    next_duel_id: u32

    def __init__(self):
        self.total_supply = u256(0)
        self.next_duel_id = u32(0)

    # -- Registration ---------------------------------------------------

    @gl.public.write
    def register(self) -> None:
        caller = gl.message.sender_address
        if caller in self.balances:
            raise gl.vm.UserError("EXPECTED: already registered")
        self.balances[caller] = STARTING_BALANCE
        self.total_supply += STARTING_BALANCE
        self.all_addresses.append(caller)

    # -- Core loop --------------------------------------------------------

    @gl.public.write
    def plead(self, action: str, target: Address, message: str) -> dict:
        caller = gl.message.sender_address

        if caller not in self.balances:
            raise gl.vm.UserError("EXPECTED: caller is not registered, call register() first")

        if action not in VALID_ACTIONS:
            raise gl.vm.UserError(f"EXPECTED: unknown action '{action}'")

        if len(message) == 0 or len(message) > MAX_MESSAGE_LEN:
            raise gl.vm.UserError(f"EXPECTED: message must be 1..{MAX_MESSAGE_LEN} characters")

        if action in SELF_TARGET_FORBIDDEN and target == caller:
            raise gl.vm.UserError(f"EXPECTED: cannot {action} yourself")

        if target not in self.balances:
            raise gl.vm.UserError("EXPECTED: target is not registered")

        caller_balance = self.balances[caller]
        target_balance = self.balances[target]

        prompt = self._build_prompt(action, caller, target, message, caller_balance, target_balance)

        def leader_fn() -> str:
            response = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = _parse_gremlin_json(response)
            if parsed is None:
                raise gl.vm.UserError("LLM_ERROR: gremlin did not return valid JSON")
            return json.dumps(parsed)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                parsed = json.loads(leader_result.calldata)
            except Exception:
                return False
            return _validate_verdict_shape(parsed)

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        verdict_data = json.loads(raw)

        verdict = verdict_data["verdict"]
        roast = verdict_data["roast"][:MAX_ROAST_LEN]
        proposed_amount = u256(max(0, min(int(verdict_data["amount"]), int(MAX_ACTION_AMOUNT))))

        final_amount = self._apply_verdict(action, caller, target, verdict, proposed_amount)

        self.plea_count[caller] = u32(self.plea_count.get(caller, u32(0)) + 1)

        self.plea_log.append(
            Plea(
                pleader=caller,
                target=target,
                action=action,
                message=message,
                verdict=verdict,
                roast=roast,
                amount=final_amount,
            )
        )

        return {
            "verdict": verdict,
            "roast": roast,
            "amount": int(final_amount),
        }

    # -- Internal helpers ---------------------------------------------------

    def _build_prompt(
        self,
        action: str,
        caller: Address,
        target: Address,
        message: str,
        caller_balance: u256,
        target_balance: u256,
    ) -> str:
        return (
            f"{GREMLIN_PERSONA}\n\n"
            f"Action requested: {action}\n"
            f"Pleader address: {caller.as_hex}\n"
            f"Pleader balance: {int(caller_balance)} GREM\n"
            f"Target address: {target.as_hex}\n"
            f"Target balance: {int(target_balance)} GREM\n"
            f'Plea message: "{message}"\n\n'
            f"Judge this plea now."
        )

    def _apply_verdict(
        self,
        action: str,
        caller: Address,
        target: Address,
        verdict: str,
        proposed_amount: u256,
    ) -> u256:
        if verdict == "deny":
            return u256(0)

        amount = proposed_amount
        if verdict == "partial":
            amount = u256(int(proposed_amount) // 2)

        if amount == u256(0):
            return u256(0)

        if action == "bless":
            self.balances[target] = u256(int(self.balances[target]) + int(amount))
            self.total_supply += amount

        elif action == "gift":
            actual = u256(min(int(amount), int(self.balances[caller])))
            self.balances[caller] = u256(int(self.balances[caller]) - int(actual))
            self.balances[target] = u256(int(self.balances[target]) + int(actual))
            amount = actual

        elif action == "steal":
            actual = u256(min(int(amount), int(self.balances[target])))
            self.balances[target] = u256(int(self.balances[target]) - int(actual))
            self.balances[caller] = u256(int(self.balances[caller]) + int(actual))
            amount = actual
            self.total_heisted[caller] = u256(int(self.total_heisted.get(caller, u256(0))) + int(actual))

        elif action in ("curse", "roast_tax"):
            actual = u256(min(int(amount), int(self.balances[target])))
            self.balances[target] = u256(int(self.balances[target]) - int(actual))
            self.total_supply -= actual
            amount = actual

        if action in DEBIT_ACTIONS and amount > u256(0):
            self.times_targeted[target] = u32(self.times_targeted.get(target, u32(0)) + 1)

        return amount

    # -- Views ----------------------------------------------------------

    @gl.public.view
    def get_balance(self, addr: Address) -> int:
        return int(self.balances.get(addr, u256(0)))

    @gl.public.view
    def get_total_supply(self) -> int:
        return int(self.total_supply)

    @gl.public.view
    def get_plea_count(self, addr: Address) -> int:
        return int(self.plea_count.get(addr, u32(0)))

    @gl.public.view
    def is_registered(self, addr: Address) -> bool:
        return addr in self.balances

    @gl.public.view
    def get_recent_pleas(self, count: int) -> list:
        n = max(0, min(count, len(self.plea_log)))
        start = len(self.plea_log) - n
        result = []
        for i in range(start, len(self.plea_log)):
            p = self.plea_log[i]
            result.append(
                {
                    "pleader": p.pleader.as_hex,
                    "target": p.target.as_hex,
                    "action": p.action,
                    "message": p.message,
                    "verdict": p.verdict,
                    "roast": p.roast,
                    "amount": int(p.amount),
                }
            )
        return result

    @gl.public.view
    def get_leaderboard_balances(self, count: int) -> list:
        rows = [(addr, int(self.balances.get(addr, u256(0)))) for addr in self.all_addresses]
        rows.sort(key=lambda row: row[1], reverse=True)
        n = max(0, min(count, len(rows)))
        return [{"address": addr.as_hex, "balance": bal} for addr, bal in rows[:n]]

    @gl.public.view
    def get_leaderboard_heists(self, count: int) -> list:
        rows = [(addr, int(self.total_heisted.get(addr, u256(0)))) for addr in self.all_addresses]
        rows = [row for row in rows if row[1] > 0]
        rows.sort(key=lambda row: row[1], reverse=True)
        n = max(0, min(count, len(rows)))
        return [{"address": addr.as_hex, "total_heisted": val} for addr, val in rows[:n]]

    @gl.public.view
    def get_leaderboard_targeted(self, count: int) -> list:
        rows = [(addr, int(self.times_targeted.get(addr, u32(0)))) for addr in self.all_addresses]
        rows = [row for row in rows if row[1] > 0]
        rows.sort(key=lambda row: row[1], reverse=True)
        n = max(0, min(count, len(rows)))
        return [{"address": addr.as_hex, "times_targeted": val} for addr, val in rows[:n]]

    # -- Duel mode --------------------------------------------------------

    @gl.public.write
    def challenge_duel(self, opponent: Address, message: str) -> int:
        caller = gl.message.sender_address

        if caller not in self.balances:
            raise gl.vm.UserError("EXPECTED: caller is not registered, call register() first")
        if opponent not in self.balances:
            raise gl.vm.UserError("EXPECTED: opponent is not registered")
        if opponent == caller:
            raise gl.vm.UserError("EXPECTED: cannot duel yourself")
        if len(message) == 0 or len(message) > MAX_MESSAGE_LEN:
            raise gl.vm.UserError(f"EXPECTED: message must be 1..{MAX_MESSAGE_LEN} characters")

        duel_id = self.next_duel_id
        self.next_duel_id = u32(int(self.next_duel_id) + 1)

        self.duels.append(
            Duel(
                id=duel_id,
                challenger=caller,
                opponent=opponent,
                challenger_message=message,
                opponent_message="",
                status=DUEL_STATUS_PENDING,
                verdict="",
                winner=caller,
                roast="",
                amount=u256(0),
            )
        )
        return int(duel_id)

    @gl.public.write
    def decline_duel(self, duel_id: int) -> None:
        caller = gl.message.sender_address
        duel = self._get_duel_or_raise(duel_id)
        if duel.opponent != caller:
            raise gl.vm.UserError("EXPECTED: only the challenged opponent can decline")
        if duel.status != DUEL_STATUS_PENDING:
            raise gl.vm.UserError("EXPECTED: duel is not pending")
        duel.status = DUEL_STATUS_DECLINED

    @gl.public.write
    def accept_duel(self, duel_id: int, message: str) -> dict:
        caller = gl.message.sender_address
        duel = self._get_duel_or_raise(duel_id)

        if duel.opponent != caller:
            raise gl.vm.UserError("EXPECTED: only the challenged opponent can accept")
        if duel.status != DUEL_STATUS_PENDING:
            raise gl.vm.UserError("EXPECTED: duel is not pending")
        if len(message) == 0 or len(message) > MAX_MESSAGE_LEN:
            raise gl.vm.UserError(f"EXPECTED: message must be 1..{MAX_MESSAGE_LEN} characters")

        prompt = (
            f"{DUEL_PERSONA}\n\n"
            f"Challenger address: {duel.challenger.as_hex}\n"
            f'Challenger message: "{duel.challenger_message}"\n\n'
            f"Opponent address: {duel.opponent.as_hex}\n"
            f'Opponent message: "{message}"\n\n'
            f"Judge this duel now."
        )

        def leader_fn() -> str:
            response = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = _parse_gremlin_json(response)
            if parsed is None:
                raise gl.vm.UserError("LLM_ERROR: gremlin did not return valid JSON")
            return json.dumps(parsed)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                parsed = json.loads(leader_result.calldata)
            except Exception:
                return False
            return _validate_duel_verdict_shape(parsed)

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        verdict_data = json.loads(raw)

        verdict = verdict_data["verdict"]
        roast = verdict_data["roast"][:MAX_ROAST_LEN]
        proposed_amount = u256(max(0, min(int(verdict_data["amount"]), int(MAX_ACTION_AMOUNT))))

        winner = duel.challenger
        final_amount = u256(0)

        if verdict == "draw":
            winner = duel.challenger
        else:
            winner_addr = duel.challenger if verdict == "challenger" else duel.opponent
            loser_addr = duel.opponent if verdict == "challenger" else duel.challenger
            actual = u256(min(int(proposed_amount), int(self.balances[loser_addr])))
            if actual > u256(0):
                self.balances[loser_addr] = u256(int(self.balances[loser_addr]) - int(actual))
                self.balances[winner_addr] = u256(int(self.balances[winner_addr]) + int(actual))
                self.total_heisted[winner_addr] = u256(
                    int(self.total_heisted.get(winner_addr, u256(0))) + int(actual)
                )
                self.times_targeted[loser_addr] = u32(int(self.times_targeted.get(loser_addr, u32(0))) + 1)
            winner = winner_addr
            final_amount = actual

        duel.opponent_message = message
        duel.status = DUEL_STATUS_RESOLVED
        duel.verdict = verdict
        duel.winner = winner
        duel.roast = roast
        duel.amount = final_amount

        return {
            "verdict": verdict,
            "winner": winner.as_hex,
            "roast": roast,
            "amount": int(final_amount),
        }

    def _get_duel_or_raise(self, duel_id: int) -> Duel:
        if duel_id < 0 or duel_id >= len(self.duels):
            raise gl.vm.UserError("EXPECTED: duel not found")
        return self.duels[duel_id]

    @gl.public.view
    def get_duel(self, duel_id: int) -> dict:
        duel = self._get_duel_or_raise(duel_id)
        return _duel_to_dict(duel)

    @gl.public.view
    def get_open_duels_for(self, addr: Address) -> list:
        return [
            _duel_to_dict(d)
            for d in self.duels
            if d.opponent == addr and d.status == DUEL_STATUS_PENDING
        ]

    @gl.public.view
    def get_recent_duels(self, count: int) -> list:
        n = max(0, min(count, len(self.duels)))
        start = len(self.duels) - n
        return [_duel_to_dict(self.duels[i]) for i in range(start, len(self.duels))]


def _duel_to_dict(d: "Duel") -> dict:
    return {
        "id": int(d.id),
        "challenger": d.challenger.as_hex,
        "opponent": d.opponent.as_hex,
        "challenger_message": d.challenger_message,
        "opponent_message": d.opponent_message,
        "status": d.status,
        "verdict": d.verdict,
        "winner": d.winner.as_hex,
        "roast": d.roast,
        "amount": int(d.amount),
    }


def _parse_gremlin_json(response: str) -> typing.Optional[dict]:
    text = response.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        parsed = json.loads(text)
    except Exception:
        return None
    if not isinstance(parsed, dict):
        return None
    return parsed


def _validate_verdict_shape(parsed) -> bool:
    if not isinstance(parsed, dict):
        return False
    if "verdict" not in parsed or "amount" not in parsed or "roast" not in parsed:
        return False
    if parsed["verdict"] not in VALID_VERDICTS:
        return False
    try:
        amount = int(parsed["amount"])
    except (TypeError, ValueError):
        return False
    if amount < 0 or amount > int(MAX_ACTION_AMOUNT):
        return False
    roast = parsed["roast"]
    if not isinstance(roast, str) or len(roast) == 0 or len(roast) > MAX_ROAST_LEN:
        return False
    return True


def _validate_duel_verdict_shape(parsed) -> bool:
    if not isinstance(parsed, dict):
        return False
    if "verdict" not in parsed or "amount" not in parsed or "roast" not in parsed:
        return False
    if parsed["verdict"] not in DUEL_VERDICTS:
        return False
    try:
        amount = int(parsed["amount"])
    except (TypeError, ValueError):
        return False
    if amount < 0 or amount > int(MAX_ACTION_AMOUNT):
        return False
    roast = parsed["roast"]
    if not isinstance(roast, str) or len(roast) == 0 or len(roast) > MAX_ROAST_LEN:
        return False
    return True
