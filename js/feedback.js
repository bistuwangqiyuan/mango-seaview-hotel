(function () {
  'use strict';

  var modal = document.getElementById('feedback-modal');
  var feedbackForm = document.getElementById('feedback-form');
  var successEl = document.getElementById('feedback-success');
  var writeBtn = document.getElementById('write-review-btn');
  var cancelBtn = document.getElementById('feedback-cancel');
  var submitBtn = document.getElementById('feedback-submit');
  var stars = document.querySelectorAll('.feedback-modal__star');
  var selectedRating = 0;

  // Open modal
  writeBtn.addEventListener('click', function () {
    resetForm();
    modal.showModal();
  });

  // Cancel
  cancelBtn.addEventListener('click', function () { modal.close(); });

  // Close on backdrop click
  modal.addEventListener('click', function (e) {
    if (e.target === modal) modal.close();
  });

  // Close on ESC is handled natively by <dialog>

  // Star rating
  stars.forEach(function (star) {
    star.addEventListener('click', function () {
      selectedRating = parseInt(star.dataset.value);
      updateStars();
    });
    star.addEventListener('mouseenter', function () {
      highlightStars(parseInt(star.dataset.value));
    });
  });

  document.querySelector('.feedback-modal__stars').addEventListener('mouseleave', function () {
    updateStars();
  });

  function highlightStars(n) {
    stars.forEach(function (s) {
      var val = parseInt(s.dataset.value);
      s.classList.toggle('active', val <= n);
    });
  }

  function updateStars() {
    stars.forEach(function (s) {
      var val = parseInt(s.dataset.value);
      s.classList.toggle('active', val <= selectedRating);
      s.setAttribute('aria-checked', val === selectedRating ? 'true' : 'false');
    });
  }

  function resetForm() {
    feedbackForm.reset();
    selectedRating = 0;
    updateStars();
    feedbackForm.hidden = false;
    successEl.hidden = true;
    submitBtn.disabled = false;
  }

  // Submit
  feedbackForm.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!selectedRating) {
      showToast(t('feedbackErrRating'), 'error');
      return;
    }

    var name = document.getElementById('feedback-name').value.trim();
    if (!name) {
      showToast(t('feedbackErrName'), 'error');
      return;
    }

    var content = document.getElementById('feedback-content').value.trim();
    if (!content) {
      showToast(t('feedbackErrContent'), 'error');
      return;
    }

    submitBtn.disabled = true;

    var body = {
      guestName: name,
      guestEmail: document.getElementById('feedback-email').value.trim(),
      rating: selectedRating,
      title: document.getElementById('feedback-review-title').value.trim(),
      content: content,
      lang: getCurrentLang()
    };

    fetch('/api/submit-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    .then(function (r) {
      if (!r.ok) return Promise.reject(r);
      return r.json();
    })
    .then(function () {
      feedbackForm.hidden = true;
      successEl.hidden = false;

      setTimeout(function () {
        modal.close();
        // Reload reviews
        fetch('/api/get-reviews')
          .then(function (r) { return r.ok ? r.json() : []; })
          .then(function (data) {
            if (data.length) {
              var track = document.getElementById('reviews-track');
              if (track) {
                track.innerHTML = data.map(function (r) {
                  var initial = r.guest_name.charAt(0).toUpperCase();
                  var starsStr = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
                  var date = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
                  return '<div class="review-card">' +
                    '<div class="review-card__header">' +
                    '<div class="review-card__avatar">' + initial + '</div>' +
                    '<div><div class="review-card__name">' + escapeHtml(r.guest_name) + '</div>' +
                    '<div class="review-card__date">' + date + '</div></div></div>' +
                    '<div class="review-card__stars">' + starsStr + '</div>' +
                    (r.title ? '<div class="review-card__title">' + escapeHtml(r.title) + '</div>' : '') +
                    '<div class="review-card__content">' + escapeHtml(r.content) + '</div></div>';
                }).join('');
              }
            }
          })
          .catch(function () { /* noop */ });
      }, 2000);
    })
    .catch(function () {
      submitBtn.disabled = false;
      showToast(t('feedbackErrServer'), 'error');
    });
  });

  // Keyboard navigation for stars
  document.querySelector('.feedback-modal__stars').addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      selectedRating = Math.min(5, selectedRating + 1);
      updateStars();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      selectedRating = Math.max(1, selectedRating - 1);
      updateStars();
    }
  });
})();
