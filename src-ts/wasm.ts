import init, {
  gf_add,
  gf_mul,
  gf_inv,
  generate_shares,
  lagrange_interpolate,
} from '../pkg/silent_tally.js';

let initialized = false;

export async function initWasm(): Promise<void> {
  if (initialized) return;
  await init();
  initialized = true;
}

export const wasm = {
  gf_add(a: bigint, b: bigint): bigint {
    return gf_add(a, b);
  },
  gf_mul(a: bigint, b: bigint): bigint {
    return gf_mul(a, b);
  },
  gf_inv(a: bigint): bigint {
    return gf_inv(a);
  },
  generate_shares(secret: bigint, threshold: number, nParties: number): BigUint64Array {
    return generate_shares(secret, threshold, nParties);
  },
  lagrange_interpolate(xValues: BigUint64Array, yValues: BigUint64Array): bigint {
    return lagrange_interpolate(xValues, yValues);
  },
};
