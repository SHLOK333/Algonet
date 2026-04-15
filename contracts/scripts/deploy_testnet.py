import time
import base64
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import ApplicationCreateTxn, StateSchema, wait_for_confirmation
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
from NexPager.contract import approval_program

# AlgoNode TestNet
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
algod_client = algod.AlgodClient("", ALGOD_ADDRESS)

print("Compiling TEAL via local PyTeal...")
approval_teal, clear_teal, contract_json = approval_program()

# 1. Compile TEAL strings via Algod to get bytecodes
def compile_program(client, source_code):
    compile_response = client.compile(source_code)
    return base64.b64decode(compile_response['result'])

print("Compiling PyTeal to bytecode via Algod TestNet...")
try:
    approval_prog = compile_program(algod_client, approval_teal)
    clear_prog = compile_program(algod_client, clear_teal)
except Exception as e:
    print(f"Compilation error: {e}")
    sys.exit(1)

# 2. Setup Dev Account for Deployment
print("\n--- TESTNET DEPLOYMENT ACCOUNT ---")
private_key, address = account.generate_account()
print(f"Deployment Account Address: {address}")
print(f"Mnemonic (save this): {mnemonic.from_private_key(private_key)}")
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
            print(f"Funds detected! Current balance: {balance / 1000000} ALGO")
            break
    except Exception as e:
        pass
    print("Checking balance... waiting for ALGO...", end='\r')
    time.sleep(5)

# 3. Create Smart Contract
print("\nDeploying NexPager Smart Contract to TestNet...")
global_schema = StateSchema(num_uints=2, num_byte_slices=1) # session_count, min_payment, payee(address) ... wait, payee = Bytes, asset_id = Uint, min_payment = Uint, session_count = Uint
# Let's count them: payee(bytes), asset_id(uint), min_payment(uint), session_count(uint) = 1 byte, 3 uints
global_schema = StateSchema(num_uints=3, num_byte_slices=1)
local_schema = StateSchema(num_uints=0, num_byte_slices=0)
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

print("Signing transaction...")
signed_txn = txn.sign(private_key)

print("Submitting to network...")
tx_id = algod_client.send_transaction(signed_txn)
print(f"Transaction ID: {tx_id}")

print("Waiting for confirmation...")
confirmed_txn = wait_for_confirmation(algod_client, tx_id, 4)

app_id = confirmed_txn['application-index']
print(f"\n✅ SUCCESS! Contract Deployed!")
print(f"App ID: {app_id}")
print(f"View it on explorer: https://testnet.explorer.perawallet.app/application/{app_id}/")

