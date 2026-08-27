"""
tests/test_state_machine.py — unit tests for the prop state machine.
Tests: valid transitions, invalid transitions, failed_* states, budget_exceeded.
"""
import pytest

from store.models import PropStatus, assert_valid_transition, VALID_TRANSITIONS


class TestStateMachine:

    def test_full_happy_path(self):
        """Walk the full happy-path state machine without errors."""
        path = [
            (PropStatus.DRAFT, PropStatus.GENERATING_OPTIONS),
            (PropStatus.GENERATING_OPTIONS, PropStatus.AWAITING_OPTIONS_REVIEW),
            (PropStatus.AWAITING_OPTIONS_REVIEW, PropStatus.SELECTION_CONFIRMED),
            (PropStatus.SELECTION_CONFIRMED, PropStatus.GENERATING_FINAL),
            (PropStatus.GENERATING_FINAL, PropStatus.ASSETS_READY),
            (PropStatus.ASSETS_READY, PropStatus.EXPORTED),
        ]
        for current, target in path:
            assert_valid_transition(current, target)  # must not raise

    def test_invalid_transition_raises(self):
        with pytest.raises(ValueError, match="Invalid state transition"):
            assert_valid_transition(PropStatus.DRAFT, PropStatus.ASSETS_READY)

    def test_cannot_skip_selection(self):
        with pytest.raises(ValueError):
            assert_valid_transition(PropStatus.AWAITING_OPTIONS_REVIEW, PropStatus.GENERATING_FINAL)

    def test_cannot_export_before_assets_ready(self):
        with pytest.raises(ValueError):
            assert_valid_transition(PropStatus.SELECTION_CONFIRMED, PropStatus.EXPORTED)

    def test_failed_options_can_retry(self):
        assert_valid_transition(PropStatus.FAILED_OPTIONS, PropStatus.GENERATING_OPTIONS)

    def test_failed_final_can_retry(self):
        assert_valid_transition(PropStatus.FAILED_FINAL, PropStatus.GENERATING_FINAL)

    def test_budget_exceeded_can_resume(self):
        assert_valid_transition(PropStatus.BUDGET_EXCEEDED, PropStatus.GENERATING_FINAL)

    def test_draft_cannot_go_backward(self):
        for bad_target in [
            PropStatus.SELECTION_CONFIRMED,
            PropStatus.GENERATING_FINAL,
            PropStatus.EXPORTED,
        ]:
            with pytest.raises(ValueError):
                assert_valid_transition(PropStatus.DRAFT, bad_target)

    def test_all_statuses_have_transitions_defined(self):
        """Every PropStatus must appear as a key in VALID_TRANSITIONS."""
        for s in PropStatus:
            assert s in VALID_TRANSITIONS, f"{s!r} missing from VALID_TRANSITIONS"
