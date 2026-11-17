Require Import Lia.

Theorem two_plus_two : 2 + 2 = 4.
Proof. reflexivity. Qed.

Theorem zeno_room : forall n : nat, 2 ^ n < 2 ^ S n.
Proof. intro n. lia. Qed.
