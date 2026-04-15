import time
import base64
import sys
import os

from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import ApplicationCreateTxn, StateSchema, wait_for_confirmation

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
from nexpager.escrow_contract import approval_program, clear_state_program
from pyteal import compileTeal, Mode
from nexpager.escrow_contract import APPROVAL_VERSION

# AlgoNode TestNet
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
algod_token = ""
algod_client = algod.AlgodClient(algod_token, ALGOD_ADDRESS)

def compile_program(client, source_code):
    compile_response = client.compile(source_code)
    return base64.b64decode(compile_response['result'])

print("Compiling Escrow TEAL via local PyTeal...")
approval_raw, clear_raw, _ = approval_program()
approval_teal = approval_raw
clear_teal = clear_raw

print("Compiling PyTeal to bytecode via Algod TestNet...")
try:
    approval_prog = compile_program(algod_client, approval_teal)
    clear_prog = compile_program(algod_client, clear_teal)
except Exception as e:
    print(f"Compilation error: {e}")
    sys.exit(1)

# Setup Dev Account for Deployment
print("\n--- ESCROW DEPLOYMENT ACCOUNT ---")
funded_mnemonic = "describe issue pond pink genre mistake frozen tube bike drive defense twelve husband indicate tattoo entry ostrich meat ten excite night lazy original about medal"
private_key = mnemonic.to_private_key(funded_mnemonic)
address = account.address_from_private_key(private_key)
print(f"Using Funded Deployment Account Address: {address}")
print(f"----------------------------------\n")

print("ACTION REQUIRED:")
print(f"Please copy the address above and send some ALGO (e.g. 1 ALGO) to it using Pera Wallet or the Algorand TestNet Dispenser.")
print("Waiting for funds to arrive...\n")

# Wait for funds
while True:
    try:
        account_info = algod_client.account_info(address)
        balance = account_info.get('amount', 0)
        if balance > 200000: # Needs at least 0.2 ALGO
            print(f"\nFunds detected! Current balance: {balance / 1000000} ALGO")
            break
    except Exception as e:
        pass
    print(f"Checking balance... waiting for ALGO at {address}...", end='\r')
    time.sleep(5)

# Create Smart Contract
print("\nDeploying NexPager Escrow Smart Contract to TestNet...")

# Global Schema:
# VENUE_WALLET (bytes) = 1
# RATE_PER_MINUTE (uint) = 1
# TOTAL_EARNED (uint) = 1
global_schema = StateSchema(num_byte_slices=1, num_uints=2) 
local_schema = StateSchema(num_byte_slices=0, num_uints=0)

sp = algod_client.suggested_params()

txn = ApplicationCreateTxn(
    sender=address,
    sp=sp,
    on_complete=0, # NoOp
    approval_program=approval_prog,
    clear_program=clear_prog,
    global_schema=global_schema,
    local_schema=local_schema
)

print("Signing deployment transaction...")
signed_txn = txn.sign(private_key)

print("Submitting to network...")
tx_id = algod_client.send_transaction(signed_txn)
print(f"Transaction ID: {tx_id}")

print("Waiting for confirmation...")
confirmed_txn = wait_for_confirmation(algod_client, tx_id, 4)

app_id = confirmed_txn['application-index']
print(f"\n✅ SUCCESS! Escrow Contract Deployed!")
print(f"App ID: {app_id}")
print(f"View it on explorer: https://testnet.explorer.perawallet.app/application/{app_id}/")
