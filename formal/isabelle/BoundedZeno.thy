theory BoundedZeno
  imports Main
begin

theorem two_plus_two: "2 + (2::nat) = 4"
  by simp

theorem zeno_room: "(2::nat) ^ n < 2 ^ Suc n"
  by (induction n) (simp_all add: power_Suc)

end
