// Token Radar page. Reads window.RADAR (data.js, written by main.ts from the same model),
// renders the ranked board, a detail view per protocol and the filters. No network, no framework.
var DATA = window.RADAR;

var $ = function (id) { return document.getElementById(id); };
var fmt$ = function (n) {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n;
};
var fmtPct = function (n) { return n === null || n === undefined ? '—' : (n > 0 ? '+' : '') + n.toFixed(1) + '%'; };
var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

// ---- farm plans, generated in the page from the row's own record (category, chains, TVL, age),
// the same rules lib/model.ts applies to board.json — never a hand-written list of names.
function capitalFor(tvl) { return tvl >= 5e9 ? 250 : tvl >= 1e9 ? 150 : tvl >= 1e8 ? 100 : 50; }
function holdDaysFor(age) { return age === null ? 45 : age < 90 ? 90 : age < 180 ? 75 : age < 365 ? 60 : 45; }
function actionFor(r, cap, chain) {
  var c = (r.category || '').toLowerCase();
  if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + cap + ' of USDC to ' + r.name + ' on ' + chain + ', then borrow at most 30% of it against your deposit so the wallet shows two distinct actions.';
  if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return "Provide $" + cap + " of liquidity to " + r.name + "'s deepest pool on " + chain + " (check the fee tier it lists first) and leave it in range.";
  if (c.indexOf('bridge') >= 0) return 'Bridge $' + cap + ' of USDC to ' + chain + ' through ' + r.name + ', then route half of it back through a second app so both legs are attributed.';
  if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return "Stake $" + cap + " of the chain's staking asset through " + r.name + ' and keep the liquid receipt in the same wallet, unstaked.';
  if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Deposit $' + cap + ' of USDC as margin on ' + r.name + ', open one small long and one small short at different times, and close both.';
  if (c.indexOf('prediction') >= 0) return 'Fund $' + cap + ' and take both sides of one market on ' + r.name + ' in separate transactions.';
  if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0 || c.indexOf('vault') >= 0) return 'Deposit $' + cap + ' into a ' + r.name + ' vault on ' + chain + ' and hold the receipt shares without auto-compounding them.';
  if (c.indexOf('stable') >= 0) return 'Mint $' + cap + ' of the stable asset through ' + r.name + ' on ' + chain + ', then swap a quarter of it back through the same route.';
  if (c.indexOf('rwa') >= 0) return "Mint $" + cap + " of the protocol's yield asset on " + chain + ' and hold it across at least two weekly cycles.';
  if (c.indexOf('insurance') >= 0) return 'Buy $' + cap + ' of cover from ' + r.name + ' on ' + chain + ' and let one policy lapse naturally rather than cancelling.';
  if (c.indexOf('launchpad') >= 0 || c.indexOf('ido') >= 0) return 'Commit $' + cap + ' to one early allocation on ' + r.name + ' and claim it in full once it opens.';
  if (c.indexOf('nft') >= 0) return "Mint one asset from " + r.name + "'s primary collection on " + chain + ' and hold it without listing.';
  return 'Deposit $' + cap + ' of USDC into ' + r.name + ' on ' + chain + ', then make one small second deposit a week apart.';
}
function farmSteps(r) {
  var chain = r.chains.length ? r.chains[0] : 'its main chain';
  var cap = capitalFor(r.tvl_usd), hold = holdDaysFor(r.age_days);
  var gas = chain === 'Ethereum' ? '$10-25 of gas' : 'under $1 of gas';
  return [
    ['Open a fresh wallet for ' + r.name + ' only and fund it on ' + chain + '; keep its seed phrase offline.', gas, '10 minutes'],
    [actionFor(r, cap, chain), '$' + cap + ' of capital, plus ' + gas + ' per transaction', '20 minutes to set up'],
    ['Make one qualifying action each week (deposit, borrow, swap or vote) from the same wallet, sized at 5-10% of the position.', 'about $0.50-2 of gas a week', '10 minutes a week'],
    ['Hold the position at least ' + hold + ' days' + (r.age_days !== null ? ' (' + r.name + ' has run ' + r.age_days + ' days with no token)' : '') + ' so activity spans several snapshot dates.', 'the $' + cap + ' stays deployed', hold + ' days'],
    ["Track " + r.name + "'s announcements (its own site or docs) for a points programme, and never pay a third party for priority access.", 'free to monitor; never pay to claim', '5 minutes a week'],
    ['Before any airdrop claim, log the wallet, dates and transaction hashes in one place so you can prove the position or unwind it.', 'nothing but the log', '5 minutes'],
    ['On withdrawal, exit in two tranches a day apart to leave a clean on-chain trail and avoid slippage spikes.', 'two gas payments', '10 minutes']
  ];
}

// ---- header, model statement
$('asOf').textContent = DATA.as_of;
$('watchCount').textContent = DATA.watchlist_size;
$('boardCount').textContent = DATA.board_size;
$('mv').textContent = 'Model ' + DATA.model_version + ' — implied value = TVL × ' + DATA.model.base_multiple + ' × size × growth × age × completeness';
$('modelMath').textContent = $('modelMath2').textContent =
  'size = (TVL / $2M)^-0.15 · growth = 1 + clamp(7d, −60…+120)/100 × ' + DATA.model.growth_weight +
  ' · age = 1.35 − min(days, 1095)/1095 × 0.6 · completeness = ×1.2 when TVL, 7d and listing date are all reported';
$('stats').innerHTML =
  stat(fmt$(DATA.rows.reduce(function (m, r) { return Math.max(m, r.implied_value_usd); }, 0)), 'top implied') +
  stat(DATA.rows.length, 'rows ranked') +
  stat(DATA.watchlist_size, 'watchlist') +
  stat(DATA.early_size, 'early radar') +
  stat(DATA.live.length, 'live tokens');
function stat(n, k) { return '<div class="stat"><div class="n">' + n + '</div><div class="k">' + k + '</div></div>'; }

// ---- filter options
var chains = {}, cats = {};
DATA.rows.forEach(function (r) {
  r.chains.forEach(function (c) { chains[c] = 1; });
  if (r.category) cats[r.category] = 1;
});
function fill(sel, obj) {
  Object.keys(obj).sort().forEach(function (k) {
    var o = document.createElement('option'); o.value = k; o.textContent = k; sel.appendChild(o);
  });
}
fill($('chain'), chains); fill($('cat'), cats);

// ---- board rendering
var state = { q: '', scope: 'all', chain: '', cat: '', sort: 'implied' };
function visible() {
  var q = state.q.toLowerCase();
  var rows = DATA.rows.filter(function (r) {
    if (state.scope === 'watch' && !r.on_watchlist) return false;
    if (state.scope === 'early' && r.on_watchlist) return false;
    if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
    if (state.cat && r.category !== state.cat) return false;
    if (q && (r.name + ' ' + r.slug + ' ' + r.chains.join(' ')).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  var key = { implied: 'implied_value_usd', tvl: 'tvl_usd', growth: 'change_7d', age: 'age_days', rank: 'rank' }[state.sort];
  rows = rows.slice().sort(function (a, b) {
    var av = a[key], bv = b[key];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    return bv - av;
  });
  return rows;
}
function growthCell(v) {
  if (v === null || v === undefined) return '<span class="zero">—</span>';
  var cls = v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero';
  return '<span class="' + cls + '">' + fmtPct(v) + '</span>';
}
function renderBoard() {
  var rows = visible();
  $('shown').textContent = rows.length + ' of ' + DATA.rows.length + ' shown';
  $('tbody').innerHTML = rows.map(function (r) {
    var badge = r.on_watchlist ? '<span class="badge watch">watchlist</span>' : '<span class="badge early">early</span>';
    var age = r.age_days === null ? '—' : r.age_days + 'd';
    return '<tr class="row" data-slug="' + esc(r.slug) + '">' +
      '<td>' + r.rank + '</td>' +
      '<td class="l"><b>' + esc(r.name) + '</b>' + badge + '</td>' +
      '<td class="l">' + esc(r.category || '—') + '</td>' +
      '<td class="l">' + r.chains.slice(0, 3).map(function (c) { return '<span class="chaindot">' + esc(c) + '</span>'; }).join('') + '</td>' +
      '<td>' + fmt$(r.tvl_usd) + '</td>' +
      '<td>' + growthCell(r.change_7d) + '</td>' +
      '<td>' + age + '</td>' +
      '<td class="imp">' + fmt$(r.implied_value_usd) + '</td></tr>';
  }).join('');
}
renderBoard();

['q', 'scope', 'chain', 'cat', 'sort'].forEach(function (id) {
  $(id).addEventListener('input', function () {
    state[id] = $(id).value;
    if (id === 'q' || id === 'sort') renderBoard();
  });
  $(id).addEventListener('change', function () { state[id] = $(id).value; renderBoard(); });
});

// column sorting: click a header to switch the sort
var HEADKEY = [null, null, null, null, 'tvl', 'growth', 'age', 'implied'];
Array.prototype.forEach.call($('board').querySelectorAll('th'), function (th, i) {
  th.addEventListener('click', function () {
    if (!HEADKEY[i]) return;
    state.sort = HEADKEY[i]; $('sort').value = HEADKEY[i]; renderBoard();
  });
});

// ---- detail view
var current = null;
$('tbody').addEventListener('click', function (e) {
  var tr = e.target.closest('tr.row');
  if (tr) openDetail(tr.getAttribute('data-slug'));
});
function openDetail(slug) {
  var r = DATA.rows.filter(function (x) { return x.slug === slug; })[0];
  if (!r) return;
  current = r;
  var bars = [
    ['Size (TVL dilution)', r.size_multiplier, Math.max(r.size_multiplier, 1.5)],
    ['Growth (7d momentum)', r.growth_multiplier, Math.max(r.growth_multiplier, 1.5)],
    ['Age (launch optionality)', r.maturity_multiplier, 1.5],
    ['Data completeness', r.certainty_multiplier, 1.25]
  ].map(function (m) {
    var pct = Math.max(4, Math.min(100, m[1] / m[2] * 100));
    return '<div class="mulrow"><span class="k">' + m[0] + '</span><span class="bar"><span class="fill" style="width:' + pct + '%"></span></span><span class="v">×' + m[1].toFixed(2) + '</span></div>';
  }).join('');
  var steps = farmSteps(r).map(function (s) {
    return '<li><div>' + esc(s[0]) + '<span class="ct">Cost: ' + esc(s[1]) + ' · Time: ' + esc(s[2]) + '</span></div></li>';
  }).join('');
  $('detailBody').innerHTML =
    '<div class="dhead"><h2>' + esc(r.name) + '</h2>' +
    '<span class="badge ' + (r.on_watchlist ? 'watch">on the watchlist' : 'early">early radar') + '</span>' +
    '<span class="mono">rank #' + r.rank + ' of ' + DATA.rows.length + '</span></div>' +
    '<div class="dmeta">' +
    stat(fmt$(r.tvl_usd), 'TVL') + stat(fmt$(r.implied_value_usd), 'implied value') +
    stat(fmtPct(r.change_7d), '7d TVL') + stat(r.age_days === null ? 'unknown' : r.age_days + ' days', 'age on DefiLlama') +
    stat(esc(r.category || '—'), 'category') + '</div>' +
    '<div class="grid2">' +
    '<div class="panel"><h3>Why this implied value</h3>' + bars +
    '<p class="fine mono" style="margin-top:12px">' + fmt$(r.tvl_usd) + ' × ' + DATA.model.base_multiple + ' × multipliers ≈ <b style="color:var(--amber)">' + fmt$(r.implied_value_usd) + '</b> implied. ' +
    (r.on_watchlist ? 'On the house watchlist: no token recorded, not a wrapped or staked product.' : 'Below the watchlist floor: an early row the radar found by TVL.') + '</p></div>' +
    '<div class="panel"><h3>Chains &amp; status</h3><p>' +
    r.chains.map(function (c) { return '<span class="chaindot">' + esc(c) + '</span>'; }).join('') +
    '</p><p class="fine">Pre-token: the record carries no market cap, CoinGecko id or symbol. That is what the record says — the protocol may still hold a token it does not carry. Listed: ' + esc(r.listed_at || 'unknown') + '.</p></div>' +
    '</div>' +
    '<div class="panel" style="margin-top:18px"><h3>How to farm it before a launch</h3><ol class="steps">' + steps + '</ol>' +
    '<p class="fine">Plans are generated from the protocol\'s own record — category, chains, TVL and age — sized to what a position costs and how long a qualifying window takes. Nothing here predicts a token will be issued.</p></div>';
  $('viewBoard').hidden = true;
  $('filterBar').style.display = 'none';
  $('detail').hidden = false;
  window.scrollTo(0, 0);
}
$('back').addEventListener('click', function () {
  $('detail').hidden = true;
  $('filterBar').style.display = '';
  $('viewBoard').hidden = false;
});

// ---- live market view
$('liveBody').innerHTML = DATA.live.map(function (r) {
  var ratio = r.mcap_usd && r.tvl_usd ? (r.mcap_usd / r.tvl_usd).toFixed(2) + '×' : '—';
  return '<tr><td class="l"><b>' + esc(r.name) + '</b></td><td class="l">' + esc(r.category || '—') + '</td>' +
    '<td>' + fmt$(r.tvl_usd) + '</td><td>' + (r.mcap_usd ? fmt$(r.mcap_usd) : '—') + '</td>' +
    '<td>' + ratio + '</td><td>' + growthCell(r.change_7d) + '</td></tr>';
}).join('');
$('srcNote').textContent = 'Snapshot ' + DATA.as_of + ' from ' + DATA.source + '. Board covers all ' + DATA.watchlist_size + ' watchlist protocols plus ' + DATA.early_size + ' early rows; ' + DATA.live.length + ' live-token protocols are set aside, not ranked.';

// ---- tabs
Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
  t.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('is-on'); });
    t.classList.add('is-on');
    ['viewBoard', 'viewLive', 'viewAbout'].forEach(function (id) { $(id).hidden = id !== t.getAttribute('data-view'); });
    $('filterBar').style.display = t.getAttribute('data-view') === 'board' ? '' : 'none';
    if (t.getAttribute('data-view') !== 'board') $('detail').hidden = true;
    window.scrollTo(0, 0);
  });
});
