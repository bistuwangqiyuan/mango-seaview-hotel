(function () {
  'use strict';

  var form = document.getElementById('booking-form');
  var payBtn = document.getElementById('booking-pay-btn');
  var overlay = document.getElementById('loading-overlay');
  var checkinInput = document.getElementById('booking-checkin');
  var checkoutInput = document.getElementById('booking-checkout');
  var roomSelect = document.getElementById('booking-room-type');
  var roomsSelect = document.getElementById('booking-rooms');
  var currencySelect = document.getElementById('booking-currency');

  var summaryRoom = document.getElementById('summary-room');
  var summaryDates = document.getElementById('summary-dates');
  var summaryRooms = document.getElementById('summary-rooms');
  var summarySubtotal = document.getElementById('summary-subtotal');
  var summaryFee = document.getElementById('summary-fee');
  var summaryTotal = document.getElementById('summary-total');

  var today = new Date().toISOString().split('T')[0];
  checkinInput.min = today;

  checkinInput.addEventListener('change', function () {
    if (checkinInput.value) {
      var next = new Date(checkinInput.value);
      next.setDate(next.getDate() + 1);
      checkoutInput.min = next.toISOString().split('T')[0];
      if (checkoutInput.value && checkoutInput.value <= checkinInput.value) {
        checkoutInput.value = next.toISOString().split('T')[0];
      }
    }
    updateSummary();
  });

  checkoutInput.addEventListener('change', updateSummary);
  roomSelect.addEventListener('change', updateSummary);
  roomsSelect.addEventListener('change', updateSummary);
  currencySelect.addEventListener('change', function () {
    updateSummary();
    if (window.roomsData) {
      var grid = document.getElementById('rooms-grid');
      if (grid && grid.children.length) {
        document.querySelectorAll('.room-card__price').forEach(function (el) {
          var card = el.closest('.room-card');
          var btn = card.querySelector('[data-room]');
          if (btn) {
            var slug = btn.dataset.room;
            var room = window.roomsData.find(function (r) { return r.slug === slug; });
            if (room) {
              var cur = currencySelect.value;
              el.textContent = (cur === 'USD' ? '$' + room.price_usd : '¥' + room.price_cny) + t('roomPerNight');
            }
          }
        });
      }
    }
  });

  document.addEventListener('langchange', updateSummary);

  function getSelectedRoom() {
    if (!window.roomsData || !roomSelect.value) return null;
    var id = parseInt(roomSelect.value);
    return window.roomsData.find(function (r) { return r.id === id; });
  }

  function calcNights() {
    if (!checkinInput.value || !checkoutInput.value) return 0;
    var ci = new Date(checkinInput.value);
    var co = new Date(checkoutInput.value);
    var diff = (co - ci) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : 0;
  }

  function formatPrice(amount, cur) {
    if (cur === 'USD') return '$' + amount.toLocaleString('en-US');
    return '¥' + amount.toLocaleString('zh-CN');
  }

  function updateSummary() {
    var room = getSelectedRoom();
    var nights = calcNights();
    var numRooms = parseInt(roomsSelect.value) || 1;
    var cur = currencySelect.value;
    var lang = getCurrentLang();

    if (!room) {
      summaryRoom.textContent = '--';
      summaryDates.textContent = '--';
      summaryRooms.textContent = '--';
      summarySubtotal.textContent = '--';
      summaryFee.textContent = '--';
      summaryTotal.textContent = '--';
      payBtn.textContent = t('bookingPayBtn');
      return;
    }

    var name = room['name_' + lang] || room.name_zh;
    var price = cur === 'USD' ? room.price_usd : room.price_cny;
    var subtotal = price * nights * numRooms;
    var fee = Math.round(subtotal * 0.05);
    var total = subtotal + fee;

    summaryRoom.textContent = name + '  ' + formatPrice(price, cur) + t('roomPerNight');
    summaryDates.textContent = nights > 0 ? checkinInput.value + ' → ' + checkoutInput.value + '  ' + nights + t('bookingSummaryNights') : '--';
    summaryRooms.textContent = numRooms + t('bookingSummaryRoomUnit');
    summarySubtotal.textContent = nights > 0 ? formatPrice(subtotal, cur) : '--';
    summaryFee.textContent = nights > 0 ? formatPrice(fee, cur) : '--';
    summaryTotal.textContent = nights > 0 ? formatPrice(total, cur) : '--';

    if (nights > 0 && total > 0) {
      payBtn.textContent = t('bookingPayBtn') + ' ' + formatPrice(total, cur);
    } else {
      payBtn.textContent = t('bookingPayBtn');
    }
  }

  function validateForm() {
    var fields = ['booking-checkin', 'booking-checkout', 'booking-room-type', 'booking-name', 'booking-email'];
    var valid = true;

    fields.forEach(function (id) {
      var el = document.getElementById(id);
      el.classList.remove('is-error');
    });

    if (!checkinInput.value || checkinInput.value < today) {
      checkinInput.classList.add('is-error');
      showToast(t('bookingErrDatePast'), 'error');
      return false;
    }
    if (!checkoutInput.value || checkoutInput.value <= checkinInput.value) {
      checkoutInput.classList.add('is-error');
      showToast(t('bookingErrDate'), 'error');
      return false;
    }
    if (!roomSelect.value) {
      roomSelect.classList.add('is-error');
      showToast(t('bookingErrRoom'), 'error');
      return false;
    }
    var nameEl = document.getElementById('booking-name');
    if (!nameEl.value.trim()) {
      nameEl.classList.add('is-error');
      showToast(t('bookingErrRequired'), 'error');
      return false;
    }
    var emailEl = document.getElementById('booking-email');
    if (!emailEl.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
      emailEl.classList.add('is-error');
      showToast(t('bookingErrEmail'), 'error');
      return false;
    }
    return true;
  }

  payBtn.addEventListener('click', function () {
    if (!validateForm()) return;

    payBtn.disabled = true;
    overlay.hidden = false;

    var body = {
      roomTypeId: parseInt(roomSelect.value),
      checkIn: checkinInput.value,
      checkOut: checkoutInput.value,
      rooms: parseInt(roomsSelect.value),
      guests: parseInt(document.getElementById('booking-guests').value),
      guestName: document.getElementById('booking-name').value.trim(),
      guestEmail: document.getElementById('booking-email').value.trim(),
      guestPhone: document.getElementById('booking-phone').value.trim(),
      specialRequests: document.getElementById('booking-requests').value.trim(),
      currency: currencySelect.value,
      lang: getCurrentLang()
    };

    fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    .then(function (r) {
      if (!r.ok) return r.json().then(function (err) { return Promise.reject(err); });
      return r.json();
    })
    .then(function (data) {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL');
      }
    })
    .catch(function (err) {
      overlay.hidden = true;
      payBtn.disabled = false;
      showToast(err.message || t('bookingErrServer'), 'error');
    });
  });
})();
