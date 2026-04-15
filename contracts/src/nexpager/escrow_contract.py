from pyteal import *

APPROVAL_VERSION = 8

# Global State Keys
VENUE_WALLET = Bytes("venue_wallet")
RATE_PER_MINUTE = Bytes("rate_per_min")
TOTAL_EARNED = Bytes("total_earned")

def approval_program() -> Expr:
    router = Router(
        "NexPager_Escrow",
        BareCallActions(
            no_op=OnCompleteAction.create_only(
                Seq(
                    App.globalPut(VENUE_WALLET, Txn.sender()),
                    App.globalPut(RATE_PER_MINUTE, Int(1666)),
                    App.globalPut(TOTAL_EARNED, Int(0)),
                    Approve(),
                )
            ),
        ),
    )

    @router.method
    def buy_wifi_time() -> Expr:
        return Seq(
            Assert(Global.group_size() == Int(2)),
            Assert(Gtxn[1].type_enum() == TxnType.Payment),
            Assert(Gtxn[1].receiver() == Global.current_application_address()),
            Assert(Gtxn[1].amount() >= App.globalGet(RATE_PER_MINUTE)),

            App.globalPut(TOTAL_EARNED, App.globalGet(TOTAL_EARNED) + Gtxn[1].amount()),
            
            Log(Concat(Bytes("WIFI_BOUGHT_FOR:"), Txn.sender())),
            Approve(),
        )

    @router.method
    def claim_funds() -> Expr:
        return Seq(
            Assert(Txn.sender() == App.globalGet(VENUE_WALLET)),
            
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.Payment,
                TxnField.receiver: App.globalGet(VENUE_WALLET),
                TxnField.amount: Int(0),
                TxnField.close_remainder_to: App.globalGet(VENUE_WALLET),
                TxnField.fee: Int(0)
            }),
            InnerTxnBuilder.Submit(),
            Approve(),
        )

    return router.compile_program(version=APPROVAL_VERSION)

def clear_state_program() -> Expr:
    return Approve()

if __name__ == "__main__":
    approval, clear, contract = approval_program()
    print("APPROVAL PROGRAM TEAL:\n", approval)
    print("CLEAR STATE PROGRAM TEAL:\n", clear)
