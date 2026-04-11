# silent-tally

## 1. What It Is

silent-tally is a browser demo of Multi-Party Computation for secure summation using Shamir Secret Sharing, GF(p) arithmetic over $p = 2^{61}-1$, additive homomorphism, and Lagrange interpolation. It solves the problem of computing a combined enrollment total across five hospitals without disclosing each hospital's private input. The protocol is threshold MPC with $t=3, n=5$, where fewer than three shares cannot reconstruct a secret. The privacy guarantee shown in this demo is information-theoretic for the underlying sharing model.

## 2. When to Use It

- Use it when multiple organizations must publish an aggregate total but cannot reveal individual inputs, because additive homomorphism lets them compute the sum from shares.
- Use it when you need threshold trust rather than a single trusted server, because reconstruction requires at least $t$ participants.
- Use it for educational or prototype workflows that need concrete Shamir and Lagrange mechanics in-browser, because the demo exposes real share generation and interpolation steps.
- Do not use it for production-critical deployments without an external audit, because this repository is a demo implementation rather than an audited system.

## 3. Live Demo

Live demo: https://systemslibrarian.github.io/crypto-lab-silent-tally/

The demo walks through six exhibits: private input entry, share generation, distribution, reconstruction, and coalition testing. You can edit each hospital enrollment value, step through the protocol, and observe how totals are reconstructed without revealing raw inputs. The primary controls are the hospital enrollment inputs and the exhibit navigation buttons.

## 4. How to Run Locally

```bash
git clone https://github.com/systemslibrarian/crypto-lab-silent-tally.git
cd crypto-lab-silent-tally
npm install
npm run dev
```

No environment variables are required.

## 5. Part of the Crypto-Lab Suite

This project is part of the broader crypto-lab suite at https://systemslibrarian.github.io/crypto-lab/.

*So whether you eat or drink or whatever you do, do it all for the glory of God.* — 1 Corinthians 10:31
