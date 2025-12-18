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
  const nameInput = form?.querySelector("input[name='name']");
  const phoneInput = form?.querySelector("input[name='phone']");
  const emailInput = form?.querySelector("input[name='email']");
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

  const getErrorNode = (input, createIfMissing = false) => {
    if (!input) return null;
    const next = input.nextElementSibling;
    const isErrorNode = next?.classList?.contains("consult-error-text");
    if (isErrorNode) return next;
    if (!createIfMissing) return null;
    const note = document.createElement("div");
    note.className = "consult-error-text small";
    note.style.display = "none";
    input.insertAdjacentElement("afterend", note);
    return note;
  };

  const setFieldError = (input, message = "") => {
    if (!input) return;
    const hasError = Boolean(message);
    const note = getErrorNode(input, hasError);
    input.classList.toggle("consult-input-error", hasError);
    if (hasError) {
      input.setAttribute("aria-invalid", "true");
      if (note) {
        note.textContent = message;
        note.style.display = "block";
      }
    } else {
      input.removeAttribute("aria-invalid");
      if (note) {
        note.textContent = "";
        note.style.display = "none";
      }
    }
  };

  const getValidationMessage = (input) => {
    if (!input) return "";
    const raw = (input.value || "").trim();
    switch (input.name) {
      case "name": {
        const lettersOnly = raw.replace(/[^A-Za-zА-Яа-яЁё]/g, "");
        if (lettersOnly.length < 2) {
          return "Введите имя минимум из 2 букв";
        }
        return "";
      }
      case "email": {
        if (!raw) return "Укажите email";
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailPattern.test(raw)) {
          return "Проверьте формат email";
        }
        return "";
      }
      case "phone": {
        const digits = raw.replace(/\D/g, "");
        if (digits.length < 10 || digits.length > 15) {
          return "Нужен номер с 10–15 цифрами";
        }
        const allowedPattern = /^[+\d()\s-]+$/;
        if (!allowedPattern.test(raw)) {
          return "Только цифры, пробелы, + ( ) и -";
        }
        const plusCount = (raw.match(/\+/g) || []).length;
        if (plusCount > 1 || (plusCount === 1 && raw.trim()[0] !== "+")) {
          return "Знак + можно только один раз в начале";
        }
        const openBrackets = (raw.match(/\(/g) || []).length;
        const closeBrackets = (raw.match(/\)/g) || []).length;
        if (openBrackets !== closeBrackets) {
          return "Закройте скобки в номере";
        }
        const firstClose = raw.indexOf(")");
        const firstOpen = raw.indexOf("(");
        if (firstClose !== -1 && (firstOpen === -1 || firstClose < firstOpen)) {
          return "Скобки стоят в неправильном порядке";
        }
        const bracketGroups = raw.match(/\(([^)]+)\)/g) || [];
        for (const group of bracketGroups) {
          const insideDigits = group.replace(/\D/g, "");
          if (insideDigits.length < 2 || insideDigits.length > 5) {
            return "Код в скобках должен быть 2–5 цифр";
          }
        }
        return "";
      }
      default:
        return "";
    }
  };

  let isPhoneDeleting = false;
  const formatPhoneValue = (value, { allowOpenBracket = false } = {}) => {
    if (value == null) return "";
    const raw = String(value);
    const hasPlus = raw.trim().startsWith("+");
    let digits = raw.replace(/\D/g, "");
    if (!digits) return hasPlus ? "+" : "";

    let country = "";
    if (hasPlus && digits) {
      country = `+${digits[0]}`;
      digits = digits.slice(1);
    } else if (digits) {
      country = digits[0];
      digits = digits.slice(1);
    }

    const area = digits.slice(0, 3);
    digits = digits.slice(3);
    const block1 = digits.slice(0, 3);
    digits = digits.slice(3);
    const block2 = digits.slice(0, 2);
    digits = digits.slice(2);
    const block3 = digits.slice(0, 2);
    digits = digits.slice(2);
    const extraBlocks = digits.match(/.{1,2}/g) || [];

    let result = country;
    if (area) {
      const shouldClose = area.length === 3 && (!allowOpenBracket || block1.length > 0 || block2.length > 0 || block3.length > 0 || extraBlocks.length > 0);
      result += ` (${area}${shouldClose ? ")" : ""}`;
    }
    if (block1) {
      result += ` ${block1}`;
    }
    if (block2) {
      result += `-${block2}`;
    }
    if (block3) {
      result += `-${block3}`;
    }
    if (extraBlocks.length) {
      result += `-${extraBlocks.join("-")}`;
    }
    return result.trim();
  };

  const validateField = (input) => {
    const message = getValidationMessage(input);
    setFieldError(input, message);
    return !message;
  };

  const validateForm = () => {
    let valid = true;
    [nameInput, emailInput, phoneInput].forEach((input) => {
      if (!validateField(input)) valid = false;
    });
    if (!valid) {
      setFlash("Исправьте выделенные поля", "err");
    }
    return valid;
  };

  const clearValidation = () => {
    [nameInput, emailInput, phoneInput].forEach((input) => {
      setFieldError(input, "");
    });
  };

  const bindFieldValidation = (input) => {
    if (!input) return;
    if (input === phoneInput) {
      input.addEventListener("keydown", (evt) => {
        if (evt.key === "Backspace" || evt.key === "Delete") {
          isPhoneDeleting = true;
        } else {
          isPhoneDeleting = false;
        }
      });
    }
    input.addEventListener("blur", () => validateField(input));
    input.addEventListener("input", () => {
      if (input === phoneInput) {
        const formatted = formatPhoneValue(input.value, { allowOpenBracket: isPhoneDeleting });
        isPhoneDeleting = false;
        if (formatted !== input.value) {
          input.value = formatted;
        }
      }
      if (input.classList.contains("consult-input-error")) {
        validateField(input);
      }
      clearFlash();
    });
  };
  bindFieldValidation(nameInput);
  bindFieldValidation(emailInput);
  bindFieldValidation(phoneInput);

  const openModal = (planId = "undecided", planName = "Undecided yet") => {
    // Открываем консультацию для выбранного плана
    if (consultCompleted) return;
    clearFlash();
    clearValidation();
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
              showPlanWarning(card, "You can't have more than one tariff");
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
    const isValid = validateForm();
    if (!isValid) return;
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
        throw new Error(data.detail || data.error || "Failed to submit request");
      }
    if (inlineSuccess) {
      inlineSuccess.classList.remove("hidden");
    }
    toggleHidden(form, true);
    form.reset();
    handleCallTimeChange();
      clearValidation();
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
