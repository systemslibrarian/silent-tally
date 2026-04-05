use wasm_bindgen::prelude::*;

/// Mersenne prime p = 2^61 - 1
const P: u64 = (1u64 << 61) - 1;

// ---------------------------------------------------------------------------
// GF(p) arithmetic — all operations mod p = 2^61 - 1
// ---------------------------------------------------------------------------

/// Reduce a u64 that may be up to 2*P - 2 into [0, P-1].
#[inline]
fn reduce(x: u64) -> u64 {
    if x >= P { x - P } else { x }
}

/// Addition in GF(p).
#[wasm_bindgen]
pub fn gf_add(a: u64, b: u64) -> u64 {
    reduce(a + b)
}

/// Subtraction in GF(p).  Returns (a - b) mod p.
#[inline]
fn gf_sub(a: u64, b: u64) -> u64 {
    if a >= b { reduce(a - b) } else { P - (b - a) }
}

/// Multiplication in GF(p).
/// Uses u128 intermediate to avoid overflow:  max a*b = (2^61-2)^2 < 2^122.
#[wasm_bindgen]
pub fn gf_mul(a: u64, b: u64) -> u64 {
    let full = (a as u128) * (b as u128);
    mersenne_reduce(full)
}

/// Fast reduction mod Mersenne prime:
///   x mod (2^61-1) = (x >> 61) + (x & (2^61-1)), then normalize.
#[inline]
fn mersenne_reduce(x: u128) -> u64 {
    let lo = (x & (P as u128)) as u64;
    let hi = (x >> 61) as u64;
    reduce(lo + hi)
}

/// Modular exponentiation: base^exp mod p  (square-and-multiply).
fn gf_pow(mut base: u64, mut exp: u64) -> u64 {
    let mut result: u64 = 1;
    base = reduce(base);
    while exp > 0 {
        if exp & 1 == 1 {
            result = gf_mul(result, base);
        }
        exp >>= 1;
        base = gf_mul(base, base);
    }
    result
}

/// Modular inverse via Fermat's little theorem: a^{-1} = a^{p-2} mod p.
/// Panics if a == 0.
#[wasm_bindgen]
pub fn gf_inv(a: u64) -> u64 {
    assert!(a != 0, "Cannot invert zero in GF(p)");
    gf_pow(a, P - 2)
}

// ---------------------------------------------------------------------------
// Cryptographically-secure random field element
// ---------------------------------------------------------------------------

fn random_field_element() -> u64 {
    let mut buf = [0u8; 8];
    getrandom::fill(&mut buf).expect("getrandom failed");
    let val = u64::from_le_bytes(buf);
    val % P
}

// ---------------------------------------------------------------------------
// Shamir Secret Sharing
// ---------------------------------------------------------------------------

/// Generate shares for `secret` among `n_parties` with reconstruction `threshold`.
///
/// Returns a flat array:
///   [ a_1, a_2, ..., a_{t-1}, share_1, share_2, ..., share_n ]
///
/// The first (threshold-1) values are the random polynomial coefficients (for display).
/// The remaining n values are the evaluated shares f(1), f(2), ..., f(n).
#[wasm_bindgen]
pub fn generate_shares(secret: u64, threshold: u8, n_parties: u8) -> Vec<u64> {
    let t = threshold as usize;
    let n = n_parties as usize;
    assert!(t >= 2, "threshold must be >= 2");
    assert!(n >= t, "n_parties must be >= threshold");
    assert!(secret < P, "secret must be < P");

    // Build polynomial coefficients: f(x) = secret + a1*x + a2*x^2 + ...
    let mut coeffs: Vec<u64> = Vec::with_capacity(t);
    coeffs.push(secret);
    for _ in 1..t {
        coeffs.push(random_field_element());
    }

    // Output: first the random coefficients (for exhibit display), then the shares
    let mut result: Vec<u64> = Vec::with_capacity((t - 1) + n);
    for i in 1..t {
        result.push(coeffs[i]);
    }

    // Evaluate polynomial at x = 1, 2, ..., n
    for j in 1..=n {
        let x = j as u64;
        let mut val = coeffs[0];
        let mut x_pow = x;
        for k in 1..t {
            val = gf_add(val, gf_mul(coeffs[k], x_pow));
            x_pow = gf_mul(x_pow, x);
        }
        result.push(val);
    }

    result
}

/// Lagrange interpolation to reconstruct f(0).
///
/// `x_values` and `y_values` must have the same length (= threshold).
/// x_values are 1-based party indices; y_values are the share values.
/// All arithmetic is mod p.
#[wasm_bindgen]
pub fn lagrange_interpolate(x_values: Vec<u64>, y_values: Vec<u64>) -> u64 {
    let n = x_values.len();
    assert_eq!(n, y_values.len(), "x and y arrays must have equal length");
    assert!(n >= 1, "need at least 1 point");

    let mut result: u64 = 0;

    for i in 0..n {
        // Compute Lagrange basis polynomial L_i(0)
        let mut num: u64 = 1; // numerator:   prod_{j≠i} (0 - x_j) = prod_{j≠i} (-x_j)
        let mut den: u64 = 1; // denominator: prod_{j≠i} (x_i - x_j)
        for j in 0..n {
            if i == j {
                continue;
            }
            // numerator *= (0 - x_j) mod p = (P - x_j) mod p
            num = gf_mul(num, gf_sub(0, x_values[j]));
            // denominator *= (x_i - x_j) mod p
            den = gf_mul(den, gf_sub(x_values[i], x_values[j]));
        }
        let basis = gf_mul(num, gf_inv(den));
        result = gf_add(result, gf_mul(y_values[i], basis));
    }

    result
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gf_add() {
        assert_eq!(gf_add(0, 0), 0);
        assert_eq!(gf_add(1, 2), 3);
        // Wraparound: (P-1) + 1 = 0
        assert_eq!(gf_add(P - 1, 1), 0);
        // (P-1) + (P-1) = P - 2
        assert_eq!(gf_add(P - 1, P - 1), P - 2);
    }

    #[test]
    fn test_gf_mul() {
        assert_eq!(gf_mul(0, 12345), 0);
        assert_eq!(gf_mul(1, 12345), 12345);
        assert_eq!(gf_mul(2, 3), 6);
        // (P-1) * (P-1) mod P = 1  (since -1 * -1 = 1)
        assert_eq!(gf_mul(P - 1, P - 1), 1);
    }

    #[test]
    fn test_gf_inv() {
        // inv(1) = 1
        assert_eq!(gf_inv(1), 1);
        // inv(2) * 2 = 1
        let inv2 = gf_inv(2);
        assert_eq!(gf_mul(inv2, 2), 1);
        // inv(12345) * 12345 = 1
        let inv = gf_inv(12345);
        assert_eq!(gf_mul(inv, 12345), 1);
    }

    #[test]
    fn test_roundtrip_single_secret() {
        // Share secret=42 with threshold=3, n=5
        let secret = 42u64;
        let result = generate_shares(secret, 3, 5);
        // result has (t-1)=2 coefficients + 5 shares = 7 elements
        assert_eq!(result.len(), 7);

        let shares = &result[2..]; // skip the 2 coefficients
        // Reconstruct from first 3 shares: x=[1,2,3], y=[shares[0..3]]
        let x = vec![1, 2, 3];
        let y = vec![shares[0], shares[1], shares[2]];
        let recovered = lagrange_interpolate(x, y);
        assert_eq!(recovered, secret);

        // Reconstruct from different subset: x=[2,4,5]
        let x2 = vec![2, 4, 5];
        let y2 = vec![shares[1], shares[3], shares[4]];
        let recovered2 = lagrange_interpolate(x2, y2);
        assert_eq!(recovered2, secret);
    }

    #[test]
    fn test_additive_homomorphism() {
        // Simulate 5 hospitals with known secrets
        let secrets = [1247u64, 983, 2104, 761, 1589];
        let expected_total: u64 = secrets.iter().sum();

        let n: u8 = 5;
        let t: u8 = 3;

        // Generate shares for each hospital
        let mut all_shares: Vec<Vec<u64>> = Vec::new();
        for &s in &secrets {
            let result = generate_shares(s, t, n);
            let shares = result[(t as usize - 1)..].to_vec();
            all_shares.push(shares);
        }

        // Each party j sums the shares it received from all hospitals
        let mut local_sums = vec![0u64; n as usize];
        for j in 0..(n as usize) {
            for hospital in 0..5 {
                local_sums[j] = gf_add(local_sums[j], all_shares[hospital][j]);
            }
        }

        // Reconstruct from first 3 local sums
        let x = vec![1, 2, 3];
        let y = vec![local_sums[0], local_sums[1], local_sums[2]];
        let total = lagrange_interpolate(x, y);
        assert_eq!(total, expected_total);
    }

    #[test]
    fn test_hand_computed_polynomial() {
        // f(x) = 7 + 3x + 5x^2  mod P
        // f(1) = 7 + 3 + 5 = 15
        // f(2) = 7 + 6 + 20 = 33
        // f(3) = 7 + 9 + 45 = 61
        // Reconstruct f(0) from (1,15), (2,33), (3,61)
        let x = vec![1, 2, 3];
        let y = vec![15, 33, 61];
        let result = lagrange_interpolate(x, y);
        assert_eq!(result, 7);
    }
}
