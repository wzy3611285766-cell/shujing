/*!
 * wz-blocks 1.0.0 —— 词块排序题（点块填空 · 判分 · 错题回炉）
 * 无依赖，单文件，纯 DOM。用法见 README.md。
 * 许可：你自己的项目随便用。
 */
(function (global) {
  'use strict';

  var DEFAULTS = {
    autoCheck: true,        // 填满自动判；false 则显示「检查」按钮
    keepWrong: true,        // 答错的题本组结束时再考一遍
    maxRounds: 3,           // 最多回炉几遍（防止一直卡住）
    shuffle: true,          // 打乱块
    showProgress: true,
    labels: {
      hint: '按顺序点下面的块',
      check: '检查',
      next: '下一题',
      right: '拼对了',
      wrong: '顺序不对，正确顺序是：',
      retry: '再过一遍这 {n} 题',
      done: '这一组做完了',
      again: '整组重来',
      round: '第 {n} 遍'
    }
  };

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var s = arguments[i];
      if (!s) continue;
      for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) target[k] = s[k];
    }
    return target;
  }
  function shuffleArr(a) {
    var r = a.slice();
    for (var i = r.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = r[i]; r[i] = r[j]; r[j] = t;
    }
    return r;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fmt(s, n) { return String(s).replace(/\{n\}/g, n); }
  function noMotion() {
    try { return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }

  /**
   * @param {Element} root 容器
   * @param {Object} options
   *   items: [{ title?, prompt?, blocks: string[], note? }]
   *   autoCheck, keepWrong, maxRounds, shuffle, showProgress, labels
   *   onAnswer({ index, ok, item, round })
   *   onRoundEnd({ round, right, wrong })
   *   onFinish({ total, right, wrong, rounds })
   */
  function mount(root, options) {
    if (!root || !root.appendChild) throw new Error('[wz-blocks] mount 需要容器元素');
    var o = assign({}, DEFAULTS, options || {});
    var L = assign({}, DEFAULTS.labels, (options && options.labels) || {});
    var raw = (options && options.items) || [];
    var items = raw.filter(function (it) { return it && it.blocks && it.blocks.length > 1; });
    if (!items.length) throw new Error('[wz-blocks] items 里没有可用的题（每题的 blocks 至少 2 块）');

    /* 每题的「标准答案」就是 blocks 原顺序拼起来的字符串。
       重复块（比如配平里两个 2）不会误判：比的是拼出来的文本，不是点了哪一块。 */
    var deck = items.map(function (it, idx) {
      var blocks = it.blocks.map(function (b) { return String(b); });
      var order = blocks.map(function (_, i) { return i; });
      return {
        index: idx,
        src: it,
        blocks: blocks,
        answer: blocks.join(''),
        order: o.shuffle ? shuffleArr(order) : order
      };
    });

    var st = {
      queue: deck.slice(),
      pos: 0,
      round: 1,
      rounds: 1,
      placed: [],
      checked: null,       // null 未判 / true 对 / false 错
      right: 0,
      wrongCount: 0,
      wrong: [],           // 本遍没拿下的题
      totalRight: 0,
      finished: false
    };

    root.innerHTML = '';
    root.classList.add('wzb');

    /* ---------- 骨架 ---------- */
    var head = el('div', 'wzb-head');
    var roundTag = el('span', 'wzb-round', '');
    var progWrap = el('div', 'wzb-prog');
    var progBar = el('i', 'wzb-bar');
    progWrap.appendChild(progBar);
    var counter = el('span', 'wzb-count', '');
    head.appendChild(roundTag);
    if (o.showProgress) head.appendChild(progWrap);
    head.appendChild(counter);

    var body = el('div', 'wzb-body');
    var titleEl = el('div', 'wzb-title', '');
    var promptEl = el('div', 'wzb-prompt', '');
    var slotsEl = el('div', 'wzb-slots');
    var poolEl = el('div', 'wzb-pool');
    var verdictEl = el('div', 'wzb-verdict');
    verdictEl.hidden = true;
    var foot = el('div', 'wzb-foot');
    var checkBtn = el('button', 'wzb-btn', L.check);
    checkBtn.type = 'button';
    var nextBtn = el('button', 'wzb-btn wzb-btn-main', L.next);
    nextBtn.type = 'button';
    nextBtn.hidden = true;
    foot.appendChild(checkBtn);
    foot.appendChild(nextBtn);

    body.appendChild(titleEl);
    body.appendChild(promptEl);
    body.appendChild(slotsEl);
    body.appendChild(poolEl);
    body.appendChild(verdictEl);
    body.appendChild(foot);

    var doneEl = el('div', 'wzb-done');
    doneEl.hidden = true;

    root.appendChild(head);
    root.appendChild(body);
    root.appendChild(doneEl);

    /* ---------- 渲染 ---------- */
    function cur() { return st.queue[st.pos]; }

    function paintSlotHint() {
      if (st.placed.length) return;
      var h = el('span', 'wzb-hint', L.hint);
      slotsEl.appendChild(h);
    }

    function paint() {
      var q = cur();
      if (!q) return;
      slotsEl.innerHTML = '';
      poolEl.innerHTML = '';
      slotsEl.classList.toggle('is-done', st.placed.length === q.blocks.length);

      if (!st.placed.length) paintSlotHint();
      st.placed.forEach(function (bi, k) {
        var b = el('button', 'wzb-blk is-in', q.blocks[bi]);
        b.type = 'button';
        b.dataset.k = k;
        b.setAttribute('aria-label', '第 ' + (k + 1) + ' 块，点一下退回');
        slotsEl.appendChild(b);
      });

      var used = {};
      st.placed.forEach(function (bi) { used[bi] = 1; });
      q.order.forEach(function (bi) {
        if (used[bi]) return;
        var b = el('button', 'wzb-blk', q.blocks[bi]);
        b.type = 'button';
        b.dataset.b = bi;
        poolEl.appendChild(b);
      });

      var done = st.placed.length === q.blocks.length;
      checkBtn.hidden = o.autoCheck || done || st.checked !== null;
      nextBtn.hidden = st.checked === null;
      slotsEl.setAttribute('aria-label', '已拼 ' + st.placed.length + ' / ' + q.blocks.length + ' 块');

      if (o.showProgress) {
        var pct = st.queue.length ? (st.pos / st.queue.length) * 100 : 0;
        progBar.style.width = pct + '%';
      }
      counter.textContent = (st.pos + 1) + '/' + st.queue.length;
      /* 第一遍不在这里重复题名（下面 .wzb-title 已经有了），只在回炉时标「第 N 遍」 */
      roundTag.textContent = st.rounds > 1 ? fmt(L.round, st.rounds) : '';
    }

    function renderItem() {
      var q = cur();
      if (!q) return finishRound();
      st.placed = [];
      st.checked = null;
      verdictEl.hidden = true;
      verdictEl.className = 'wzb-verdict';
      verdictEl.innerHTML = '';
      titleEl.textContent = q.src.title || '';
      titleEl.hidden = !q.src.title;
      promptEl.textContent = q.src.prompt || '';
      promptEl.hidden = !q.src.prompt;
      paint();
    }

    /* FLIP：块从原位「飞」到新位置 */
    function fly(fromRect, target) {
      if (!target || !fromRect || noMotion()) return;
      var r = target.getBoundingClientRect();
      var dx = fromRect.left - r.left, dy = fromRect.top - r.top;
      if (!dx && !dy) return;
      target.style.transition = 'transform .26s cubic-bezier(.2,.9,.25,1.2)';
      target.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      global.requestAnimationFrame(function () {
        global.requestAnimationFrame(function () {
          target.style.transform = 'translate(0,0)';
        });
      });
      setTimeout(function () {
        target.style.transition = '';
        target.style.transform = '';
      }, 320);
    }

    /* ---------- 交互 ---------- */
    function place(bi, fromEl) {
      var q = cur();
      if (st.checked !== null) return;
      var from = fromEl && fromEl.getBoundingClientRect();
      st.placed.push(bi);
      paint();
      var added = slotsEl.lastElementChild;
      fly(from, added);
      if (st.placed.length === q.blocks.length && o.autoCheck) check();
    }

    function unplace(k) {
      if (st.checked !== null) return;
      var slotEl = slotsEl.querySelector('.wzb-blk[data-k="' + k + '"]');
      var from = slotEl && slotEl.getBoundingClientRect();
      var bi = st.placed[k];
      st.placed.splice(k, 1);
      paint();
      if (bi != null) fly(from, poolEl.querySelector('.wzb-blk[data-b="' + bi + '"]'));
    }

    poolEl.addEventListener('click', function (e) {
      var b = e.target.closest('.wzb-blk');
      if (!b || !poolEl.contains(b)) return;
      place(+b.dataset.b, b);
    });
    slotsEl.addEventListener('click', function (e) {
      var b = e.target.closest('.wzb-blk');
      if (!b || !slotsEl.contains(b)) return;
      unplace(+b.dataset.k);
    });

    /* ---------- 判分 ---------- */
    function check() {
      var q = cur();
      if (!q || st.checked !== null) return;
      if (st.placed.length !== q.blocks.length) return;
      var built = st.placed.map(function (bi) { return q.blocks[bi]; }).join('');
      var ok = built === q.answer;
      st.checked = ok;

      if (ok) { st.right++; st.totalRight++; }
      else {
        st.wrongCount++;
        st.wrong.push(q);
        /* 错的也把正确顺序摆进槽里，让人看清应该是怎么排的 */
        slotsEl.innerHTML = '';
        q.blocks.forEach(function (t) {
          var b = el('button', 'wzb-blk is-in is-fixed', t);
          b.type = 'button';
          b.disabled = true;
          slotsEl.appendChild(b);
        });
        poolEl.innerHTML = '';
      }

      verdictEl.hidden = false;
      verdictEl.className = 'wzb-verdict ' + (ok ? 'is-ok' : 'is-bad');
      verdictEl.innerHTML = ok
        ? '<b>✓ ' + L.right + '</b>'
        : '<b>✕ ' + L.wrong + '</b><span>' + escapeHtml(q.answer) + '</span>';

      nextBtn.hidden = false;
      nextBtn.focus({ preventScroll: true });
      checkBtn.hidden = true;

      if (o.onAnswer) o.onAnswer({ index: q.index, ok: ok, item: q.src, round: st.rounds });
    }

    checkBtn.addEventListener('click', check);

    nextBtn.addEventListener('click', function () {
      st.pos++;
      if (st.pos >= st.queue.length) return finishRound();
      renderItem();
      root.scrollIntoView({ block: 'nearest' });   // 只在容器内滚，别把整页拽走
    });

    /* ---------- 一轮结束 / 错题回炉 ---------- */
    function finishRound() {
      if (o.onRoundEnd) o.onRoundEnd({ round: st.rounds, right: st.right, wrong: st.queue.length - st.right });
      if (o.keepWrong && st.wrong.length && st.rounds < o.maxRounds) return showRetry();
      return finishAll();
    }

    function showRetry() {
      body.hidden = true;
      head.hidden = false;
      doneEl.hidden = false;
      doneEl.innerHTML = '';
      var h = el('div', 'wzb-done-h', fmt(L.retry, st.wrong.length));
      var p = el('div', 'wzb-done-p',
        '本遍 ' + st.queue.length + ' 题 · 答对 ' + st.right + ' · 答错 ' + st.wrong.length);
      var b = el('button', 'wzb-btn wzb-btn-main', fmt(L.retry, st.wrong.length));
      b.type = 'button';
      b.addEventListener('click', function () {
        st.queue = st.wrong.slice();
        st.wrong = [];
        st.right = 0;
        st.pos = 0;
        st.rounds++;
        st.queue.forEach(function (q) {
          if (o.shuffle) q.order = shuffleArr(q.order);
        });
        doneEl.hidden = true;
        body.hidden = false;
        renderItem();
      });
      doneEl.appendChild(h);
      doneEl.appendChild(p);
      doneEl.appendChild(b);
      b.focus({ preventScroll: true });
    }

    function finishAll() {
      st.finished = true;
      body.hidden = true;
      doneEl.hidden = false;
      doneEl.innerHTML = '';
      var rate = (st.right + st.wrongCount) ? Math.round(st.totalRight / (st.totalRight + st.wrongCount) * 100) : 0;
      doneEl.appendChild(el('div', 'wzb-done-h', L.done));
      doneEl.appendChild(el('div', 'wzb-done-p',
        '共 ' + deck.length + ' 题 · 答对 ' + st.totalRight + ' · 答错 ' + st.wrongCount + ' · ' + rate + '%' +
        (st.rounds > 1 ? ' · 过了 ' + st.rounds + ' 遍' : '')));
      var again = el('button', 'wzb-btn', L.again);
      again.type = 'button';
      again.addEventListener('click', function () { reset(); });
      doneEl.appendChild(again);
      if (o.onFinish) {
        o.onFinish({ total: deck.length, right: st.totalRight, wrong: st.wrongCount, rounds: st.rounds });
      }
    }

    /* ---------- 对外 ---------- */
    function reset() {
      st.queue = deck.slice();
      st.pos = 0;
      st.rounds = 1;
      st.right = 0;
      st.wrongCount = 0;
      st.totalRight = 0;
      st.wrong = [];
      st.finished = false;
      st.queue.forEach(function (q) { if (o.shuffle) q.order = shuffleArr(q.order); });
      doneEl.hidden = true;
      body.hidden = false;
      renderItem();
    }

    function destroy() {
      root.innerHTML = '';
      root.classList.remove('wzb');
    }

    renderItem();

    return {
      reset: reset,
      destroy: destroy,
      next: function () { nextBtn.click(); },
      check: check,
      getState: function () {
        return {
          pos: st.pos, total: st.queue.length, round: st.rounds,
          right: st.totalRight, wrong: st.wrongCount, finished: st.finished
        };
      }
    };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  global.WZBlocks = { mount: mount, version: '1.0.0' };
})(window);
