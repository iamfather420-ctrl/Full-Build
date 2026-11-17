def pow2 : Nat → Nat
  | 0 => 1
  | n + 1 => 2 * pow2 n

theorem pow2_succ (n : Nat) : pow2 (n + 1) = 2 * pow2 n := rfl

theorem pow2_pos : ∀ n : Nat, 0 < pow2 n
  | 0 => Nat.zero_lt_one
  | n + 1 => by
      rw [pow2_succ]
      exact Nat.mul_pos (by decide : (0 : Nat) < 2) (pow2_pos n)

theorem zeno_room (n : Nat) : pow2 n < pow2 (n + 1) := by
  rw [pow2_succ]
  have h : 0 < pow2 n := pow2_pos n
  have step : pow2 n * 1 < pow2 n * 2 := Nat.mul_lt_mul_of_pos_left (by decide : (1 : Nat) < 2) h
  simpa [Nat.mul_comm, Nat.mul_one] using step