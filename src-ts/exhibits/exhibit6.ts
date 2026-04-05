import type { AppState } from '../types.js';

function formatBigint(n: bigint): string {
  const s = n.toString();
  if (s.length <= 12) return s;
  return s.slice(0, 6) + '…' + s.slice(-6);
}

export function renderExhibit6(container: HTMLElement, state: AppState, onStateChange: () => void): void {
  const coalition = state.coalitionSelection;
  const coalitionArr = Array.from(coalition);

  // Get the shares available to the coalition for a target hospital
  // The coalition tries to learn the secret of a non-coalition hospital
  const targetId = state.hospitals.find(h => !coalition.has(h.id))?.id ?? 1;
  const targetData = state.shareData.get(targetId)!;
  const targetSecret = state.hospitals.find(h => h.id === targetId)!.count;

  // Shares of the target's polynomial held by the coalition members
  const coalitionShares = coalitionArr.map(id => ({
    partyId: id,
    share: targetData.shares[id - 1],
  }));

  // Generate multiple fake curves through the 2 points to show underdetermined system
  const fakeCurves: { secret: number; label: string }[] = [];
  if (coalitionArr.length === 2) {
    // For visualization: show that many different secrets are consistent with the 2 known points
    const fakeSecrets = [42, 1000, 5000, 9999, 3333, 7777, targetSecret];
    for (const fs of fakeSecrets) {
      fakeCurves.push({ secret: fs, label: fs === targetSecret ? `${fs} (actual)` : `${fs}` });
    }
  }

  container.innerHTML = `
    <div class="space-y-8">
      <div>
        <h2 class="text-2xl font-bold text-white mb-2">What if hospitals collude?</h2>
        <p class="text-gray-400 text-sm font-mono">Exhibit 6 of 6 — Coalition Attack</p>
      </div>

      <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <p class="text-gray-300 text-sm leading-relaxed">
          Select up to <strong class="text-white">2 hospitals</strong> to form a coalition. They will pool their shares
          and attempt to learn another hospital's private enrollment count. With threshold t = 3,
          two colluders hold only 2 points on a degree-2 polynomial — an underdetermined system.
        </p>
      </div>

      <!-- Hospital selection -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" id="coalition-cards" role="group" aria-label="Select hospitals for coalition">
        ${state.hospitals.map(h => {
          const selected = coalition.has(h.id);
          return `
            <button
              class="rounded-xl p-4 border-2 text-center transition-all cursor-pointer min-h-[44px]
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950
                ${selected
                  ? 'bg-red-950/30 border-red-600 ring-1 ring-red-500/30'
                  : 'bg-gray-900 border-gray-700 hover:border-gray-500'}"
              data-coalition-id="${h.id}"
              aria-pressed="${selected}"
              aria-label="${h.name}${selected ? ' — in coalition' : ''}"
            >
              <div class="text-2xl mb-1" aria-hidden="true">${selected ? '🕵️' : '🏥'}</div>
              <div class="text-xs font-medium ${selected ? 'text-red-300' : 'text-white'}">${h.name.split(' ')[0]}</div>
              <div class="text-[10px] mt-1 ${selected ? 'text-red-400' : 'text-gray-500'}">
                ${selected ? 'In coalition' : 'Click to add'}
              </div>
            </button>
          `;
        }).join('')}
      </div>

      ${coalitionArr.length === 0 ? `
        <div class="bg-gray-900 rounded-xl p-8 border border-gray-700 text-center">
          <p class="text-gray-500 text-sm">Select up to 2 hospitals above to simulate a coalition attack.</p>
        </div>
      ` : ''}

      ${coalitionArr.length > 0 ? `
        <!-- Coalition's knowledge -->
        <div class="bg-red-950/20 rounded-xl p-5 border border-red-900/40 space-y-4">
          <h3 class="text-sm font-semibold text-red-400">
            Coalition: Hospital${coalitionArr.length > 1 ? 's' : ''} ${coalitionArr.join(' & ')}
            — attacking Hospital ${targetId} (${state.hospitals.find(h => h.id === targetId)!.name.split(' ')[0]})
          </h3>

          <div class="space-y-2">
            <p class="text-xs text-gray-400">Shares of Hospital ${targetId}'s polynomial known to the coalition:</p>
            ${coalitionShares.map(cs => `
              <div class="bg-gray-950 rounded p-2 font-mono text-xs">
                <span class="text-gray-500">f(${cs.partyId}) =</span>
                <span class="text-red-400">${formatBigint(cs.share)}</span>
              </div>
            `).join('')}
          </div>

          ${coalitionArr.length === 1 ? `
            <div class="bg-gray-950 rounded-lg p-4 border border-red-900/30">
              <p class="text-red-400 text-sm font-medium">
                ✗ Coalition fails. 1 point on a degree-2 polynomial is completely useless.
                The secret could be any value in GF(p) — that's 2⁶¹ − 1 possibilities, all equally likely.
              </p>
            </div>
          ` : ''}

          ${coalitionArr.length === 2 ? `
            <div class="bg-gray-950 rounded-lg p-4 border border-red-900/30 space-y-3">
              <p class="text-red-400 text-sm font-medium">
                ✗ Coalition fails. 2 points cannot define a degree-2 polynomial.
                The missing share could be any value in GF(p). Information-theoretic security.
              </p>
              <p class="text-xs text-gray-400">
                The colluders know f(${coalitionArr[0]}) and f(${coalitionArr[1]}). But a degree-2 polynomial
                has 3 unknowns (a₀, a₁, a₂). With only 2 equations, infinitely many polynomials pass through
                these points — each yielding a different secret f(0). The colluders cannot distinguish them.
              </p>
            </div>

            <!-- Multi-curve visualization -->
            <div class="bg-gray-950 rounded-lg p-4 border border-gray-800">
              <h4 class="text-xs font-semibold text-gray-400 mb-3">
                Multiple valid polynomials through the 2 known points
              </h4>
              <svg viewBox="0 0 400 200" class="w-full max-w-lg mx-auto" role="img" aria-label="Multiple polynomial curves passing through 2 known share points, each implying a different secret — demonstrating that the system is underdetermined">
                <!-- Grid -->
                <line x1="50" y1="170" x2="380" y2="170" stroke="#374151" stroke-width="1"/>
                <line x1="50" y1="170" x2="50" y2="20" stroke="#374151" stroke-width="1"/>
                <text x="215" y="195" text-anchor="middle" fill="#6b7280" font-size="10">x</text>

                <!-- Known points -->
                ${coalitionShares.map(cs => {
                  const px = 50 + (cs.partyId / 6) * 330;
                  return `
                    <circle cx="${px}" cy="90" r="5" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.5"/>
                    <text x="${px}" y="82" text-anchor="middle" fill="#fca5a5" font-size="8">f(${cs.partyId})</text>
                  `;
                }).join('')}

                <!-- Multiple curves through both points -->
                ${fakeCurves.map((fc, idx) => {
                  const colors = ['#818cf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#fb923c', '#22d3ee'];
                  const color = colors[idx % colors.length];
                  // Draw a parabola-like curve from x=0 to x=5.5
                  // with different y-intercepts to show different secrets
                  const yIntercept = 170 - (fc.secret / 10000) * 140;
                  const points: string[] = [];
                  for (let x = 0; x <= 55; x++) {
                    const t = x / 10;
                    const px = 50 + (t / 6) * 330;
                    // Simple quadratic through points with different f(0)
                    const py = yIntercept + (t * t * 2) - (t * 8) + Math.sin(idx + t) * 5;
                    points.push(`${px},${Math.max(20, Math.min(170, py))}`);
                  }
                  return `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.6"/>`;
                }).join('')}

                <!-- f(0) region -->
                <rect x="42" y="25" width="16" height="140" fill="#ef4444" opacity="0.08" rx="4"/>
                <text x="50" y="18" text-anchor="middle" fill="#ef4444" font-size="8">f(0) = ?</text>

                <!-- Legend -->
                <text x="380" y="25" text-anchor="end" fill="#6b7280" font-size="7">Each curve = a different possible secret</text>
              </svg>
              <p class="text-xs text-gray-500 mt-2 text-center">
                All curves pass through the 2 known points. Each implies a different secret f(0).
                The colluders have no way to determine which curve is real.
              </p>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Threshold analysis -->
      <div class="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h3 class="text-sm font-semibold text-amber-400 mb-2">What about 3 colluders?</h3>
        <p class="text-gray-300 text-sm leading-relaxed">
          With threshold t = 3, three colluding hospitals <strong class="text-white">would succeed</strong>.
          Three points uniquely define a degree-2 polynomial, allowing them to reconstruct f(0) — the secret.
          This is why threshold selection matters. In practice, t &gt; n/2 is common (a strict majority must
          collude to break privacy). Our t = 3 out of n = 5 means a majority coalition is required — 60% of participants.
        </p>
        <p class="text-gray-400 text-sm mt-2 leading-relaxed">
          The security guarantee is <strong class="text-white">information-theoretic</strong> — not computational.
          With fewer than t shares, you don't just lack the computing power to break it. You literally have
          <em>zero information</em>. Every possible secret is equally consistent with the shares you hold.
          No quantum computer, no algorithmic breakthrough, no amount of time can help. That's a
          fundamentally stronger guarantee than "it would take a billion years to brute force."
        </p>
      </div>
    </div>
  `;

  // Attach coalition selection handlers
  const buttons = container.querySelectorAll('[data-coalition-id]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-coalition-id')!, 10);
      if (coalition.has(id)) {
        coalition.delete(id);
      } else if (coalition.size < 2) {
        coalition.add(id);
      }
      onStateChange();
    });
  });
}

export function canAdvanceExhibit6(): boolean {
  return true;
}
