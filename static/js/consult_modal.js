(() => {
  // Модалка консультации и ограничения по тарифам
  const modal = document.querySelector("[data-consult-modal]");
  if (!modal) return;

  const uid = document.body?.dataset.uid || "";
  const CONSULT_DONE_KEY = "yf_consult_done";
  let consultCompleted = false;

  const successModal = document.querySelector("[data-consult-success]");
  const backdrop = modal.querySelector("[data-consult-backdrop]");
  const closeButtons = modal.querySelectorAll("[data-consult-close]");
  const form = modal.querySelector("[data-consult-form]");
  const planInput = modal.querySelector("[data-consult-plan]");
  const planLabel = modal.querySelector("[data-consult-plan-label]");
  const flash = modal.querySelector("[data-consult-flash]");
  const triggers = document.querySelectorAll("[data-plan-trigger], [data-consult-trigger]");
  const consultStatus = modal.dataset.consultStatus || "";
  const callTimeSelect = modal.querySelector("[data-call-time]");
  const submitButton = modal.querySelector("[data-consult-submit]");
  const defaultSubmitText = submitButton?.textContent?.trim() || "Book my consultation";
  const inlineSuccess = modal.querySelector("[data-consult-inline-success]");
  let selectedPlanId = "undecided";
  let selectedPlanName = "Undecided yet";
  let subsCache = null;
  const savedDone = (() => {
    try {
      return window.localStorage?.getItem(CONSULT_DONE_KEY) === "1";
    } catch (_) {
      return false;
    }
  })();
  consultCompleted = savedDone;

  const successBackdrop = successModal?.querySelector("[data-consult-success-backdrop]");
  const successCloseButtons = successModal?.querySelectorAll("[data-consult-success-close]") || [];

  // Вспомогательные функции
  const toggleHidden = (el, shouldHide) => el?.classList.toggle("hidden", Boolean(shouldHide));
  const isVisible = (el) => Boolean(el && !el.classList.contains("hidden"));
  const syncBodyScroll = () => {
    const lockScroll = isVisible(modal) || isVisible(successModal);
    document.body.style.overflow = lockScroll ? "hidden" : "";
  };

  const setFlash = (message, type = "ok") => {
    if (!flash) return;
    flash.textContent = message;
    flash.classList.remove("ok", "err", "hidden");
    flash.classList.add(type === "err" ? "err" : "ok");
  };

  const clearFlash = () => {
    if (!flash) return;
    flash.textContent = "";
    flash.classList.add("hidden");
  };

  const resetInlineSuccess = () => {
    if (!inlineSuccess) return;
    inlineSuccess.classList.add("hidden");
  };

  const resetSubmitText = () => {
    if (!submitButton) return;
    submitButton.textContent = defaultSubmitText;
  };

  const handleCallTimeChange = () => {
    if (!submitButton || !callTimeSelect) return;
    const selected = callTimeSelect.selectedOptions?.[0];
    const buttonTime = selected?.dataset.buttonTime;
    if (buttonTime) {
      submitButton.textContent = `Book for ${buttonTime}`;
    } else {
      resetSubmitText();
    }
  };
  const setSubmitting = (value) => {
    if (!submitButton) return;
    submitButton.disabled = value;
    if (value) {
      submitButton.textContent = "Sending...";
    } else {
      handleCallTimeChange();
    }
  };

  const openModal = (planId = "undecided", planName = "Undecided yet") => {
    // Открываем консультацию для выбранного плана
    if (consultCompleted) return;
    clearFlash();
    resetInlineSuccess();
    toggleHidden(form, false);
    if (planInput) planInput.value = planId;
    if (planLabel) planLabel.textContent = planName;
    selectedPlanId = planId;
    selectedPlanName = planName;
    toggleHidden(modal, false);
    toggleHidden(successModal, true);
    handleCallTimeChange();
    syncBodyScroll();
    form?.querySelector("input[name='name']")?.focus?.();
  };

  const closeModal = () => {
    toggleHidden(modal, true);
    syncBodyScroll();
    clearFlash();
  };

  const openSuccessModal = () => {
    toggleHidden(modal, true);
    toggleHidden(successModal, false);
    syncBodyScroll();
  };

  const closeSuccessModal = () => {
    toggleHidden(successModal, true);
    syncBodyScroll();
  };

  const markCompleted = () => {
    // Фиксируем завершенную консультацию в localStorage и закрываем окна
    consultCompleted = true;
    try {
      window.localStorage?.setItem(CONSULT_DONE_KEY, "1");
    } catch (_) {
      /* ignore */
    }
    closeModal();
    closeSuccessModal();
  };

  const fetchUserSubs = async () => {
    // Загружаем подписки юзера для проверки ограничения в 1 тариф
    if (!uid) return [];
    if (subsCache) return subsCache;
    try {
      const res = await fetch("/subscriptions", { headers: { Accept: "application/json" } });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.detail || data.error || "Failed to load subscriptions");
      }
      subsCache = data.subscriptions || [];
      return subsCache;
    } catch (err) {
      console.warn("Subs fetch failed, proceeding without cache", err);
      subsCache = [];
      return subsCache;
    }
  };

  const showPlanWarning = (card, message = "To select a tariff, you must register") => {
    // Мини-баннер внутри карточки тарифа
    if (!card) return;
    // Remove existing warning if present
    const existing = card.querySelector(".plan-warning");
    if (existing) existing.remove();
    const note = document.createElement("div");
    note.className = "plan-warning";
    note.textContent = message;
    card.appendChild(note);
    // auto-remove after animation
    setTimeout(() => note.remove(), 2800);
  };

  triggers.forEach((btn) => {
    btn.addEventListener("click", async (evt) => {
      evt.preventDefault();
      const planId = btn.dataset.planId || "undecided";
      const planName = btn.dataset.planName || btn.dataset.planLabel || "Undecided yet";
      const card = btn.closest(".plan-card");

      // Logged-in users go straight to subscription flow
      if (uid) {
        try {
          const subs = await fetchUserSubs();
          const current = subs.find((s) => (s.status || "pending") !== "cancelled" && (s.status || "") !== "expired");
          if (current) {
            if (current.plan_id === planId) {
              showPlanWarning(card, "You already have this plan");
            } else {
              showPlanWarning(card, "To select a tariff, you must register");
            }
            return;
          }
          openModal(planId, planName);
        } catch (err) {
          // If anything went wrong, still try to open the modal so the user can proceed
          openModal(planId, planName);
        }
        return;
      }

      // Not logged in — show prompt to register
      showPlanWarning(card);
    });
  });

  closeButtons.forEach((btn) => btn.addEventListener("click", closeModal));
  backdrop?.addEventListener("click", closeModal);
  successCloseButtons.forEach((btn) => btn.addEventListener("click", closeSuccessModal));
  successBackdrop?.addEventListener("click", closeSuccessModal);
  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape") {
      if (isVisible(successModal)) {
        closeSuccessModal();
      } else {
        closeModal();
      }
    }
  });

  callTimeSelect?.addEventListener("change", handleCallTimeChange);
  handleCallTimeChange();

  if (consultCompleted) {
    closeModal();
    closeSuccessModal();
  }

  form?.addEventListener("submit", async (evt) => {
    // Отправка заявки на консультацию + создание подписки + редирект
    evt.preventDefault();
    clearFlash();
    resetInlineSuccess();
    setSubmitting(true);
    try {
      const formData = new FormData(form);
      const res = await fetch("/consult", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.detail || data.error || "Не удалось отправить заявку");
    }
    if (inlineSuccess) {
      inlineSuccess.classList.remove("hidden");
    }
    toggleHidden(form, true);
    form.reset();
    handleCallTimeChange();
      // create subscription and redirect
      const subRes = await fetch("/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ plan_id: selectedPlanId || "undecided" }),
      });
      if (!subRes.ok) {
        throw new Error("Failed to create subscription");
      }
      setTimeout(() => {
        window.location.href = "/dashboard?sub=ok";
      }, 1000);
    } catch (err) {
      setFlash(err.message || "Failed to submit. Please try again.", "err");
    } finally {
      setSubmitting(false);
    }
  });

  if (consultStatus === "ok") {
    markCompleted();
  }
})();
