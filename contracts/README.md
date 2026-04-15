# NexPager Algorand Contracts

This folder is now the Algorand contract workspace for the NexPager WiFi access flow.

## What changed

- Replaced the old Hardhat/Solidity project with an AlgoKit-style Python scaffold.
- The contract now models WiFi policy state for the captive portal flow.
- Pera Wallet is used in the frontend for Algorand account connection.

## Files

- `pyproject.toml` defines the Python contract environment.
- `algokit.toml` stores the project metadata.
- `src/NexPager/contract.py` contains the PyTeal approval and clear-state programs.
- `tests/test_contract.py` is a minimal smoke test for the scaffold.

## Next steps

- Wire deployment scripts to AlgoKit deploy commands.
- Replace the placeholder policy methods with the exact session rules you want to enforce on-chain.
