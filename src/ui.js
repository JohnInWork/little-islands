const paths = {
  heart: '<path d="M12 20S3 14.6 3 8.8a4.8 4.8 0 0 1 9-2.2 4.8 4.8 0 0 1 9 2.2C21 14.6 12 20 12 20Z" fill="currentColor" stroke="none"/>',
  coin: '<circle cx="12" cy="12" r="8.8" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="6.1" stroke="var(--coin-line, #fff2bd)"/><path d="m12 8 2.6 4L12 16l-2.6-4Z" fill="var(--coin-line, #fff2bd)" stroke="none"/>',
  sword: '<path d="m14 3 6-1-1 6-9.5 9.5-5-5L14 3Z" fill="currentColor" fill-opacity=".13"/><path d="m7 11 6 6M10 14l7-7M8 16l-5 5m0-3 3 3"/>',
  skill: '<path d="m13 3 7-1-1 7-9 9-6-6 9-9Z" fill="currentColor" fill-opacity=".15"/><path d="m6 11 7 7m-4-3-6 6M2 17l5 5M6 3l-3 3m0-4 4 4m12 9 2 2m-2 0 2-2"/>',
  potion: '<path d="M9 3h6m-5 0v5l-5.6 7.6A4 4 0 0 0 7.6 22h8.8a4 4 0 0 0 3.2-6.4L14 8V3"/><path d="M6 15h12l1.4 2.1a2 2 0 0 1-1.7 3.1H6.3a2 2 0 0 1-1.7-3.1L6 15Z" fill="currentColor" stroke="none"/><path d="M8 12h.01"/>',
  flag: '<path d="M6 21V4m0 0c5-5 8 5 14 0v10c-6 5-9-5-14 0" fill="currentColor" fill-opacity=".12"/><path d="M3 21h7"/>',
  skull: '<path d="M5 16a8.4 8.4 0 1 1 14 0v4H5v-4Z" fill="currentColor" fill-opacity=".12"/><circle cx="8.5" cy="11" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.5" cy="11" r="1.5" fill="currentColor" stroke="none"/><path d="m11 15 1-1 1 1m-4 4v2m6-2v2"/>',
  check: '<path d="m5 12 4.5 4.5L20 6" stroke-width="2.8"/>',
  pause: '<path d="M8 5v14m8-14v14" stroke-width="3.8"/>',
  play: '<path d="m8 4 12 8-12 8V4Z" fill="currentColor" stroke="none"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6" stroke-width="2.6"/>',
  restart: '<path d="M4 10a8 8 0 1 1 .5 6M4 3v7h7"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5V4Z" fill="currentColor" fill-opacity=".12"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 4-6 5H2v6h3l6 5V4Z" fill="currentColor" fill-opacity=".12"/><path d="m16 9 6 6m0-6-6 6"/>',
  trophy: '<path d="M7 3h10v6a5 5 0 0 1-10 0V3Z" fill="currentColor" fill-opacity=".15"/><path d="M7 5H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4m-4 3v5m-4 1h8"/>',
  pickaxe: '<path d="m5 20 11-12M4 7C9 0 17 3 22 11c-6-4-12-6-18-4Z" fill="currentColor" fill-opacity=".15"/>',
  chest: '<path d="M3 11h18v10H3V11Zm0 0V8a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v3m-9-8v8" fill="currentColor" fill-opacity=".1"/><path d="M10 10h4v5h-4z" fill="var(--cream, #fff9e9)"/>',
  fire: '<path d="M13 2c0 6 8 7 7 13a8 8 0 0 1-16 0c0-4 3-6 5-9 0 4 2 4 2 4s3-3 2-8Z" fill="currentColor" fill-opacity=".15"/><path d="M12 13c-2 2-3 3-3 5a3 3 0 0 0 6 0c0-2-3-3-3-5Z" fill="currentColor" stroke="none"/>',
  portal: '<path d="M4 21V10a8 8 0 0 1 16 0v11M1 21h22M8 21V10a4 4 0 0 1 8 0v11"/><path d="m11 13 2 2-2 2"/>',
  tap: '<path d="M9 13V6a2 2 0 0 1 4 0v6-2a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v4c0 3-2 6-5 6h-4c-3 0-5-3-7-6l-2-3a2 2 0 0 1 3-2l3 2Z" fill="currentColor" fill-opacity=".13"/><path d="M5 5a6 6 0 0 1 12-1" opacity=".6"/>',
  hex: '<path d="m12 2 9 5v10l-9 5-9-5V7Z"/>',
};

export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.hex}</svg>`;
}

const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, Number(value) || 0));
const display = value => Math.round(Number(value) || 0).toLocaleString('ru-RU');
const actionIcons = { mine: 'pickaxe', mining: 'pickaxe', ore: 'pickaxe', collect: 'pickaxe', collecting: 'pickaxe', fight: 'sword', fighting: 'sword', attack: 'sword', chest: 'chest', loot: 'chest', fire: 'fire', heal: 'heart', camp: 'fire', portal: 'portal', move: 'flag', walking: 'flag' };

export function createUI(handlers = {}) {
  const root = document.getElementById('app');
  if (!root) throw new Error('UI root #app is missing');
  let state = { hp: 24, maxHp: 24, coins: 0, level: 1, kills: 0, totalKills: 3, potions: 2, attack: 4, muted: false, skillCooldown: 0, skillMaxCooldown: 8, busy: false, action: '', actionProgress: 0 };
  let resultState = null;
  let modal = null;
  let priorFocus = null;
  let readyTimer;
  let disposed = false;
  const timers = new Set();
  const controller = new AbortController();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const button = (name, symbol, label, extra = '') => `<button type="button" class="icon-button ${extra}" data-do="${name}" aria-label="${label}">${icon(symbol)}</button>`;

  root.innerHTML = `
    <div class="scene-vignette" aria-hidden="true"></div>
    <section class="game-hud is-loading" data-game-scene aria-label="Состояние героя">
      <div class="hud-top">
        <div class="vitality charm" role="meter" aria-label="Здоровье героя" aria-valuemin="0" aria-valuemax="24" aria-valuenow="24">
          <span class="vitality-heart">${icon('heart')}</span>
          <div class="vitality-body"><strong class="hp-number" data-value="hp">24</strong><div class="hp-track"><i class="hp-fill"></i><i class="hp-segments"></i></div></div>
        </div>
        <div class="hud-tools"><div class="coin-purse charm" aria-label="Монеты">${icon('coin')}<strong data-value="coins">0</strong></div>${button('mute', 'sound', 'Выключить звук', 'small-button sound-button')}${button('pause', 'pause', 'Пауза', 'small-button')}</div>
      </div>
      <div class="island-progress" aria-label="Прогресс острова">
        <div class="island-number">${icon('flag')}<strong data-value="level">1</strong></div>
        <div class="guardians" role="img" aria-label="Побеждено монстров: 0 из 3"></div>
      </div>
      <div class="tap-hint" hidden aria-hidden="true"><i></i><span>${icon('tap')}</span></div>
      <div class="bottom-hud">
        <div class="action-progress" hidden role="progressbar" aria-label="Действие героя" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="action-icon">${icon('pickaxe')}</span><div class="action-track"><i></i></div></div>
        <div class="hero-actions" role="group" aria-label="Способности героя">
          <button type="button" class="power-button skill-button" data-do="skill" aria-label="Круговой удар"><i class="cooldown-ring" aria-hidden="true"></i><span class="power-face">${icon('skill')}</span><span class="cooldown-number" hidden></span><span class="power-spark" aria-hidden="true">${icon('hex')}</span></button>
          <button type="button" class="power-button heal-button" data-do="heal" aria-label="Выпить лечебное зелье"><span class="power-face">${icon('potion')}</span><span class="charge-count" data-value="potions">2</span></button>
        </div>
      </div>
    </section>
    <div class="float-layer" aria-hidden="true"></div>
    <div class="modal-backdrop" data-modal="pause" hidden>
      <section class="pause-sheet" role="dialog" aria-modal="true" aria-label="Пауза">
        <div class="pause-emblem" aria-hidden="true">${icon('flag')}</div>
        <div class="pause-actions">${button('resume', 'play', 'Продолжить игру', 'resume-button')}${button('mute', 'sound', 'Выключить звук', 'pause-sound')}${button('restart', 'restart', 'Начать остров заново', 'restart-button')}</div>
      </section>
    </div>
    <div class="modal-backdrop" data-modal="result" hidden>
      <section class="result-sheet" role="dialog" aria-modal="true" aria-label="Остров завершён">
        <div class="result-rays" aria-hidden="true"></div>
        <div class="result-trophy">${icon('trophy')}</div>
        <div class="result-island">${icon('flag')}<strong data-result="level">1</strong></div>
        <div class="result-loot">${icon('coin')}<strong data-result="earned">+0</strong></div>
        <div class="upgrade-grid" role="group" aria-label="Улучшения героя">
          ${['attack', 'hp', 'potion'].map((kind, i) => `<button type="button" class="upgrade-card" data-upgrade="${kind}" aria-label="${['Улучшить меч', 'Увеличить здоровье', 'Добавить лечебное зелье'][i]}"><span class="upgrade-art">${icon(['sword', 'heart', 'potion'][i])}</span><span class="upgrade-gain">+<b>${[1, 4, 1][i]}</b></span><span class="upgrade-cost">${icon('coin')}<b>0</b></span></button>`).join('')}
        </div>
        <div class="result-footer"><span class="result-wallet">${icon('coin')}<strong data-result="coins">0</strong></span><button type="button" class="next-button" data-do="next" aria-label="Следующий остров">${icon('arrow')}</button></div>
      </section>
    </div>
    <div class="game-loading" role="status" aria-label="Загрузка острова">
      <div class="loading-island"><i></i><i></i><i></i><i></i><i></i><i></i><span>${icon('flag')}</span></div>
      <div class="loading-track"><i></i></div><strong class="loading-number">0</strong>
    </div>`;

  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  const hud = $('.game-hud');
  const hpFill = $('.hp-fill');
  const hpMeter = $('.vitality');
  const skill = $('[data-do="skill"]');
  const heal = $('[data-do="heal"]');
  const guardians = $('.guardians');
  const action = $('.action-progress');
  const hintElement = $('.tap-hint');
  const loader = $('.game-loading');
  const floatLayer = $('.float-layer');
  const resultModal = $('[data-modal="result"]');
  const pauseModal = $('[data-modal="pause"]');

  function defer(callback, delay) {
    const timer = setTimeout(() => { timers.delete(timer); if (!disposed) callback(); }, delay);
    timers.add(timer);
    return timer;
  }

  function bump(element, className = 'is-bumping') {
    if (!element || reducedMotion.matches) return;
    element.classList.remove(className);
    // WAAPI restarts feedback without forcing a synchronous layout read.
    element.getAnimations().filter(animation => animation.id === 'hud-feedback').forEach(animation => animation.cancel());
    const animation = element.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: .3 }, { transform: 'scale(1)' }], { duration: 350, easing: 'cubic-bezier(.2,.8,.2,1)' });
    animation.id = 'hud-feedback';
  }

  function focusModal(element) {
    priorFocus = document.activeElement;
    hud.inert = true;
    const pins = document.getElementById('world-pins');
    if (pins) pins.inert = true;
    element.hidden = false;
    const first = element.querySelector('[data-do="resume"]') || element.querySelector('[data-do="next"]') || element.querySelector('button:not(:disabled)');
    first?.focus({ preventScroll: true });
  }

  function closeModal(element) {
    element.hidden = true;
    if (modal?.element !== element) return;
    modal = null;
    hud.inert = false;
    const pins = document.getElementById('world-pins');
    if (pins) pins.inert = false;
    if (priorFocus?.isConnected && !priorFocus.closest('[hidden]')) priorFocus.focus({ preventScroll: true });
  }

  function paintResult() {
    if (!resultState) return;
    const data = resultState;
    const costs = data.upgradeCosts || { attack: 10, hp: 10, potion: 10 };
    const gains = { attack: 1, hp: 4, potion: 1, ...data.upgradeGains };
    resultModal.classList.toggle('is-defeat', !data.won);
    $('.result-trophy').innerHTML = icon(data.won ? 'trophy' : 'skull');
    $('[data-result="level"]').textContent = display(data.level);
    $('[data-result="earned"]').textContent = `+${display(data.coinsEarned)}`;
    $('[data-result="coins"]').textContent = display(data.coins);
    $('.result-sheet').setAttribute('aria-label', data.won ? 'Остров пройден. Улучшите героя и продолжите' : 'Герой побеждён. Улучшите героя и попробуйте снова');
    const nextButton = $('[data-do="next"]');
    nextButton.innerHTML = icon(data.won ? 'arrow' : 'restart');
    nextButton.setAttribute('aria-label', data.won ? 'Следующий остров' : 'Попробовать снова');
    for (const upgrade of $$('[data-upgrade]')) {
      const kind = upgrade.dataset.upgrade;
      const cost = Number(costs[kind]) || 0;
      upgrade.querySelector('.upgrade-cost b').textContent = display(cost);
      upgrade.querySelector('.upgrade-gain b').textContent = display(gains[kind]);
      upgrade.disabled = (Number(data.coins) || 0) < cost || !Number.isFinite(Number(costs[kind]));
      const names = { attack: 'Сила меча', hp: 'Максимальное здоровье', potion: 'Запас зелий' };
      upgrade.setAttribute('aria-label', `${names[kind]}: +${gains[kind]}, цена ${cost} монет`);
    }
  }

  function update(next = {}) {
    const old = state;
    state = { ...state, ...next };
    for (const name of ['hp', 'coins', 'level', 'potions']) {
      if (state[name] !== old[name] || !old._painted) {
        const element = $(`[data-value="${name}"]`);
        element.textContent = display(state[name]);
        if (name === 'coins' && state[name] > old[name]) bump(element);
      }
    }
    const ratio = clamp(state.hp / Math.max(1, state.maxHp));
    hpFill.style.transform = `scaleX(${ratio})`;
    hpMeter.classList.toggle('is-low', ratio <= .3);
    hpMeter.setAttribute('aria-valuenow', state.hp);
    hpMeter.setAttribute('aria-valuemax', state.maxHp);
    if (state.hp < old.hp) bump(hpMeter);
    if (state.kills !== old.kills || state.totalKills !== old.totalKills || !old._painted) {
      const total = Math.max(1, Math.round(state.totalKills));
      guardians.innerHTML = Array.from({ length: Math.min(total, 7) }, (_, index) => `<span class="guardian ${index < state.kills ? 'is-cleared' : ''}">${icon(index < state.kills ? 'check' : 'skull')}</span>`).join('');
      guardians.setAttribute('aria-label', `Побеждено монстров: ${state.kills} из ${total}`);
    }
    const cooldown = Math.max(0, Number(state.skillCooldown) || 0);
    skill.style.setProperty('--cooldown', clamp(cooldown / Math.max(.1, state.skillMaxCooldown)));
    skill.disabled = cooldown > 0 || state.hp <= 0 || state.canSkill === false;
    skill.classList.toggle('is-ready', cooldown <= 0 && state.hp > 0 && state.canSkill !== false);
    const cooldownNumber = $('.cooldown-number');
    cooldownNumber.hidden = cooldown <= 0;
    cooldownNumber.textContent = Math.ceil(cooldown);
    heal.disabled = state.potions <= 0 || state.hp >= state.maxHp || state.hp <= 0;
    heal.setAttribute('aria-label', `Выпить лечебное зелье. Осталось: ${state.potions}`);
    if (state.muted !== old.muted || !old._painted) {
      for (const control of $$('[data-do="mute"]')) {
        control.innerHTML = icon(state.muted ? 'muted' : 'sound');
        control.setAttribute('aria-label', state.muted ? 'Включить звук' : 'Выключить звук');
        control.setAttribute('aria-pressed', String(!state.muted));
      }
    }
    const actionName = typeof state.action === 'string' ? state.action : state.action?.type;
    action.hidden = !state.busy || !actionName || actionName === 'move' || actionName === 'walking';
    if (actionName !== old.action || !old._painted) $('.action-icon').innerHTML = icon(actionIcons[actionName] || 'pickaxe');
    const progress = clamp(state.actionProgress);
    $('.action-track i').style.transform = `scaleX(${progress})`;
    action.setAttribute('aria-valuenow', Math.round(progress * 100));
    if (resultState && modal?.name === 'result') {
      for (const key of ['coins', 'attack', 'maxHp', 'upgradeCosts', 'upgradeGains']) if (next[key] !== undefined) resultState[key] = next[key];
      paintResult();
    }
    state._painted = true;
  }

  const callbacks = { heal: 'onHeal', skill: 'onSkill', mute: 'onMute', pause: 'onPause', resume: 'onResume', restart: 'onRestart', next: 'onNext' };
  root.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target || target.disabled) return;
    event.stopPropagation();
    if (target.dataset.upgrade) {
      bump(target);
      handlers.onUpgrade?.(target.dataset.upgrade);
    } else if (callbacks[target.dataset.do]) handlers[callbacks[target.dataset.do]]?.();
  }, { signal: controller.signal });
  root.addEventListener('pointerdown', event => {
    if (event.target.closest('button,.modal-backdrop')) event.stopPropagation();
  }, { signal: controller.signal });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (modal?.name === 'pause') handlers.onResume?.();
      else if (!modal) handlers.onPause?.();
      event.preventDefault();
    }
    if (event.key === 'Tab' && modal) {
      const buttons = [...modal.element.querySelectorAll('button:not(:disabled)')];
      const first = buttons[0];
      const last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || !modal.element.contains(document.activeElement))) {
        last?.focus(); event.preventDefault();
      } else if (!event.shiftKey && (document.activeElement === last || !modal.element.contains(document.activeElement))) {
        first?.focus(); event.preventDefault();
      }
    }
  }, { signal: controller.signal });

  update();
  return {
    update,
    showResult(data) {
      resultState = { ...data };
      paintResult();
      if (modal?.name === 'result') return;
      pauseModal.hidden = true;
      modal = { name: 'result', element: resultModal };
      focusModal(resultModal);
      hintElement.hidden = true;
    },
    updateResult(data) { resultState = { ...resultState, ...data }; paintResult(); },
    hideResult() { closeModal(resultModal); resultState = null; },
    showPause() {
      if (modal?.name === 'result' || modal?.name === 'pause') return;
      modal = { name: 'pause', element: pauseModal };
      focusModal(pauseModal);
    },
    hidePause() { closeModal(pauseModal); },
    loading(progress = 0) {
      clearTimeout(readyTimer);
      loader.hidden = false;
      loader.classList.remove('is-ready');
      const value = clamp(progress > 1 ? progress / 100 : progress);
      $('.loading-track i').style.transform = `scaleX(${value})`;
      $('.loading-number').textContent = Math.round(value * 100);
    },
    ready() {
      $('.loading-track i').style.transform = 'scaleX(1)';
      $('.loading-number').textContent = '100';
      loader.classList.add('is-ready');
      hud.classList.remove('is-loading');
      readyTimer = defer(() => { loader.hidden = true; }, reducedMotion.matches ? 10 : 650);
    },
    floatText({ x, y, text, color = '#fff9e9' }) {
      const particle = document.createElement('span');
      particle.className = 'float-text';
      particle.textContent = String(text);
      particle.style.left = `${clamp(x, 16, innerWidth - 16)}px`;
      particle.style.top = `${clamp(y, 16, innerHeight - 16)}px`;
      particle.style.color = color;
      floatLayer.appendChild(particle);
      while (floatLayer.childElementCount > 32) floatLayer.firstElementChild.remove();
      defer(() => particle.remove(), reducedMotion.matches ? 500 : 1250);
    },
    hint(show = true) { hintElement.hidden = !show; },
    destroy() {
      disposed = true;
      controller.abort();
      const pins = document.getElementById('world-pins');
      if (pins) pins.inert = false;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      root.innerHTML = '';
    },
  };
}
