Require Import Lia.

Theorem two_plus_two : 2 + 2 = 4.
Proof. reflexivity. Qed.

Lemma pow2_positive : forall n : nat, 0 < 2 ^ n.
Proof.
  intro n. induction n; simpl; lia.
Qed.

Theorem zeno_room : forall n : nat, 2 ^ n < 2 ^ S n.
Proof.
  intro n.
  change (2 ^ n < 2 * 2 ^ n).
  pose proof (pow2_positive n).
  nia.
Qed.
