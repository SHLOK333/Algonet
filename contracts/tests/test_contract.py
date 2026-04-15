from src.NexPager.contract import approval_program, clear_state_program


def test_contract_compiles():
    approval, clear = approval_program()
    assert approval is not None
    assert clear_state_program() is not None
