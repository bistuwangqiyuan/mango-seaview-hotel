(function () {
  'use strict';

  var fab = document.getElementById('chat-fab');
  var panel = document.getElementById('chat-panel');
  var widget = document.getElementById('chat-widget');
  var closeBtn = document.getElementById('chat-close');
  var messagesEl = document.getElementById('chat-messages');
  var chatForm = document.getElementById('chat-form');
  var chatInput = document.getElementById('chat-input');
  var sendBtn = document.getElementById('chat-send');
  var hint = document.getElementById('chat-hint');

  var history = [];
  var lastSendTime = 0;
  var THROTTLE_MS = 2000;
  var isOpen = false;
  var welcomeShown = false;

  // Show hint bubble after 3 seconds on first visit
  setTimeout(function () {
    if (!isOpen) hint.hidden = false;
  }, 3000);

  var hintClose = hint.querySelector('.chat__bubble-close');
  if (hintClose) hintClose.addEventListener('click', function () { hint.hidden = true; });

  function toggleChat() {
    isOpen = !isOpen;
    panel.hidden = !isOpen;
    widget.classList.toggle('chat--open', isOpen);
    hint.hidden = true;

    if (isOpen && !welcomeShown) {
      welcomeShown = true;
      addMessage('ai', t('chatWelcome'));
    }
    if (isOpen) chatInput.focus();
  }

  fab.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  function addMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'chat__msg chat__msg--' + (role === 'user' ? 'user' : 'ai');
    if (role === 'ai') {
      typeWriter(div, text);
    } else {
      div.textContent = text;
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function typeWriter(el, text) {
    var i = 0;
    var speed = 20;
    function tick() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        messagesEl.scrollTop = messagesEl.scrollHeight;
        setTimeout(tick, speed);
      }
    }
    tick();
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'chat__msg chat__msg--typing';
    div.id = 'chat-typing';
    div.innerHTML = '<div class="chat__typing-dots"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    var el = document.getElementById('chat-typing');
    if (el) el.remove();
  }

  function sendMessage(text) {
    if (!text.trim()) return;

    var now = Date.now();
    if (now - lastSendTime < THROTTLE_MS) {
      showToast(t('chatRateLimit'), 'error');
      return;
    }
    lastSendTime = now;

    addMessage('user', text);
    history.push({ role: 'user', content: text });

    chatInput.value = '';
    sendBtn.disabled = true;
    showTyping();

    var lang = getCurrentLang();
    var recentHistory = history.slice(-10);

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: recentHistory, lang: lang })
    })
    .then(function (r) {
      if (!r.ok) return Promise.reject(r);
      return r.json();
    })
    .then(function (data) {
      removeTyping();
      sendBtn.disabled = false;

      var reply = data.reply || t('chatError');
      addMessage('ai', reply);
      history.push({ role: 'assistant', content: reply });

      if (data.action) executeAction(data.action);
    })
    .catch(function (err) {
      removeTyping();
      sendBtn.disabled = false;
      if (!navigator.onLine) {
        addMessage('ai', t('chatNetworkError'));
      } else {
        addMessage('ai', t('chatError'));
      }
    });
  }

  function executeAction(action) {
    if (!action || !action.action) return;

    switch (action.action) {
      case 'scrollTo':
        var target = document.getElementById(action.target);
        if (target) {
          toggleChat();
          setTimeout(function () { target.scrollIntoView({ behavior: 'smooth' }); }, 300);
        }
        break;
      case 'selectRoom':
        toggleChat();
        setTimeout(function () { window.selectRoomAndScroll(action.slug); }, 300);
        break;
      case 'openFeedback':
        toggleChat();
        setTimeout(function () {
          var modal = document.getElementById('feedback-modal');
          if (modal && modal.showModal) modal.showModal();
        }, 300);
        break;
      case 'switchLang':
        if (action.lang && I18N[action.lang]) {
          document.querySelectorAll('.nav__lang-btn').forEach(function (btn) {
            if (btn.dataset.lang === action.lang) btn.click();
          });
        }
        break;
    }
  }

  chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    sendMessage(chatInput.value);
  });

  // Quick question buttons
  var quickQuestions = {
    rooms: { zh: '请介绍一下你们的房型和价格', en: 'What are your room types and prices?', ru: 'Расскажите о номерах и ценах' },
    directions: { zh: '从机场怎么到酒店？', en: 'How do I get to the hotel from the airport?', ru: 'Как добраться из аэропорта?' },
    attractions: { zh: '酒店周边有什么好玩的景点？', en: 'What attractions are nearby?', ru: 'Какие достопримечательности рядом?' },
    booking: { zh: '我想预订房间', en: 'I\'d like to book a room', ru: 'Я хочу забронировать номер' }
  };

  document.querySelectorAll('.chat__quick-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var q = btn.dataset.question;
      var lang = getCurrentLang();
      var text = quickQuestions[q] ? (quickQuestions[q][lang] || quickQuestions[q].zh) : '';
      if (text) sendMessage(text);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) toggleChat();
  });
})();
