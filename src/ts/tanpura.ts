// eq 2. y(x, t) = the summation from i to M of u_i(x) * \y_i(t)

// eq 4 effect of frequency depndent damping
// gamma(beta_i) = 2 * rho * A[sigma_0 + (sigma_1 + sigma_3 * beta_i ^ 2)|beta_i|]

const gamma = (beta_i: number, {
  rho = 1,
  A = 1,
  sigma_1 = 1,
  sigma_3 = 1,
  sigma_0 = 1,
}: {
  rho?: number,
  A?: number,
  sigma_1?: number,
  sigma_3?: number,
  sigma_0?: number,
} = {}): number => {

  const extMult = 2 * rho * A;
  const added = sigma_1 + sigma_3 * (beta_i ** 2);
  const bracketed = sigma_0 + added * Math.abs(beta_i);
  return extMult * bracketed;
}

console.log(gamma(5.5555))