from pyteal import *

APPROVAL_VERSION = 8

WIFI_PAYEE_KEY = Bytes("payee")
WIFI_ASSET_KEY = Bytes("asset_id")
WIFI_MIN_PAYMENT_KEY = Bytes("min_payment")
WIFI_SESSION_COUNT_KEY = Bytes("session_count")


def approval_program() -> Expr:
    router = Router(
        "NexPager_wifi_access",
        BareCallActions(no_op=OnCompleteAction.create_only(Approve())),
    )

    @router.method
    def configure_wifi(
        payee: abi.Address,
        asset_id: abi.Uint64,
        min_payment: abi.Uint64,
    ) -> Expr:
        return Seq(
            Assert(Txn.sender() == Global.creator_address()),
            App.globalPut(WIFI_PAYEE_KEY, payee.get()),
            App.globalPut(WIFI_ASSET_KEY, asset_id.get()),
            App.globalPut(WIFI_MIN_PAYMENT_KEY, min_payment.get()),
            App.globalPut(WIFI_SESSION_COUNT_KEY, Int(0)),
        )

    @router.method
    def record_session(
        user: abi.Address,
        payment_reference: abi.String,
        amount: abi.Uint64,
    ) -> Expr:
        return Seq(
            Assert(amount.get() >= App.globalGet(WIFI_MIN_PAYMENT_KEY)),
            App.globalPut(WIFI_SESSION_COUNT_KEY, App.globalGet(WIFI_SESSION_COUNT_KEY) + Int(1)),
            Log(
                Concat(
                    Bytes("user:"),
                    user.get(),
                    Bytes("|ref:"),
                    payment_reference.get(),
                )
            ),
            Approve(),
        )

    return router.compile_program(version=APPROVAL_VERSION)


def clear_state_program() -> Expr:
    return Approve()


if __name__ == "__main__":
    approval, clear, contract = approval_program()
    print("APPROVAL PROGRAM TEAL:\n", approval)
    print("CLEAR STATE PROGRAM TEAL:\n", clear)
