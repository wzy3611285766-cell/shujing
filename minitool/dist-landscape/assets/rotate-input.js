/* 竖屏容器里把 app 旋转 90° 后，事件坐标的换算层。
   clientX/clientY 报的是视口坐标，浏览器不会因为 CSS 变换而改变它；
   游戏内部按元素坐标算方向与落点，直接用就会出现「上滑变右滑」。
   映射（顺时针 90°）：元素 x = 视口高 - clientY，元素 y = clientX。 */
(function () {
  var mq = window.matchMedia('(orientation:portrait)');

  function fix(t) {
    if (!t) return;
    var x = t.clientX, y = t.clientY;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    var u = window.innerHeight - y;
    var v = x;
    try {
      Object.defineProperty(t, 'clientX', { value: u, configurable: true });
      Object.defineProperty(t, 'clientY', { value: v, configurable: true });
      Object.defineProperty(t, 'pageX', { value: u + window.pageXOffset, configurable: true });
      Object.defineProperty(t, 'pageY', { value: v + window.pageYOffset, configurable: true });
    } catch (e) { /* 某些实现不允许覆写，保持原值 */ }
  }

  function on(e) {
    if (!mq.matches) return;                 // 真横屏时坐标本来就是对的
    var i;
    if (e.touches) for (i = 0; i < e.touches.length; i++) fix(e.touches[i]);
    if (e.changedTouches) for (i = 0; i < e.changedTouches.length; i++) fix(e.changedTouches[i]);
    if (typeof e.clientX === 'number') fix(e);
  }

  var types = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel',
               'touchstart', 'touchmove', 'touchend', 'touchcancel',
               'mousedown', 'mousemove', 'mouseup', 'click'];
  for (var k = 0; k < types.length; k++) {
    document.addEventListener(types[k], on, true);
  }
})();
