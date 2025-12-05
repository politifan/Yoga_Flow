(() => {
  const root = document.querySelector("[data-dashboard]");
  if (!root) return;

  const uid = root.dataset.uid || "";
  const subsGrid = root.querySelector("[data-subs-grid]");
  const subsEmpty = root.querySelector("[data-subs-empty]");
  const subsFlash = root.querySelector("[data-subs-flash]");
  const usernameForm = root.querySelector("[data-username-form]");
  const usernameInput = root.querySelector("[data-username-input]");
  const usernameFlash = root.querySelector("[data-username-flash]");
  const nameDisplay = root.querySelector("[data-display-name]");
  const avatarImg = root.querySelector("[data-avatar-img]");
  const avatarLetter = root.querySelector("[data-avatar-letter-text]");
  const avatarTriggers = root.querySelectorAll("[data-avatar-trigger]");
  const profileToggles = root.querySelectorAll("[data-profile-toggle]");
  const profileDropdown = root.querySelector("[data-profile-dropdown]");
  const toastStack = document.querySelector("[data-toast-stack]");
  const subToastState = root.dataset.subToast || "";
  const avatarPreviewImg = document.querySelector("[data-avatar-preview-img]");
  const avatarPreviewLetter = document.querySelector("[data-avatar-preview-letter]");
  const avatarInput = document.querySelector("[data-avatar-input]");
  const avatarActions = document.querySelector("[data-avatar-actions]");
  const avatarSave = document.querySelector("[data-avatar-save]");
  const avatarCancel = document.querySelector("[data-avatar-cancel]");
  const avatarFlash = document.querySelector("[data-avatar-flash]");
  const avatarModalBackdrop = document.querySelector("[data-avatar-modal-backdrop]");
  const avatarModal = document.querySelector("[data-avatar-modal]");
  const avatarModalCloseButtons = document.querySelectorAll("[data-avatar-modal-close]");

  const STORAGE_KEY = `yf_subscriptions_${uid}`;
  const CACHE_TTL = 1000 * 60 * 5;
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ["image/png", "image/jpeg"];
  const STATUS_LABELS = {
    active: "Активна",
    pending: "Ожидает оплаты",
    cancelled: "Отменена",
    expired: "Истекла",
  };
  const SUB_TOAST_MESSAGES = {
    ok: "Подписка создана. Проверьте раздел «Мои подписки».",
    cancelled: "Подписка будет отменена в конце текущего периода.",
    exists: "У вас уже есть тариф. Перейдите в раздел «Мои подписки».",
  };

  let pendingAvatarFile = null;
  let currentAvatarUrl = avatarImg && !avatarImg.hasAttribute("hidden") ? avatarImg.src : "";

  const safeParse = (value) => {
    try {
      return value ? JSON.parse(value) : [];
    } catch (err) {
      console.warn("Failed to parse dataset subscriptions", err);
      return [];
    }
  };

  const toggleHidden = (el, shouldHide) => {
    if (!el) return;
    el.classList.toggle("hidden", Boolean(shouldHide));
  };

  const setFlash = (el, message, type = "ok") => {
    if (!el) return;
    el.textContent = message;
    el.classList.remove("hidden", "ok", "err");
    el.classList.add(type === "err" ? "err" : "ok");
  };

  const clearFlash = (el) => {
    if (!el) return;
    el.textContent = "";
    if (!el.classList.contains("hidden")) el.classList.add("hidden");
  };

  const showAvatarPrompt = () => {
    setFlash(avatarFlash, "Выберите фото", "ok");
  };

  const pushToast = (message, type = "ok") => {
    if (!toastStack || !message) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type === "err" ? "err" : "ok"}`;
    toast.textContent = message;
    toastStack.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-4px)";
    }, 3500);
    setTimeout(() => toast.remove(), 4200);
  };

  const renderSubscriptions = (items = []) => {
    if (!subsGrid || !subsEmpty) return;
    subsGrid.innerHTML = "";
    toggleHidden(subsEmpty, items.length > 0);
    toggleHidden(subsGrid, items.length === 0);

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "subscription-card";
      card.tabIndex = 0;
      card.setAttribute("role", "link");
      card.dataset.detailUrl = item.detail_url || "";
      const status = item.status || "pending";
      const statusLabel = STATUS_LABELS[status] || status;
      card.innerHTML = `
        <div class="sub-head">
          <div>
            <p class="muted small">Тариф</p>
            <h3>${item.plan_name || "План"}</h3>
          </div>
          <span class="status-pill status-${status}">${statusLabel}</span>
        </div>
        <p class="price">${item.price_label || "—"}</p>
        <p class="muted small">До ${item.ends_at_display || "—"}</p>
        <div class="sub-actions">
          <a class="btn btn-sm" href="${item.renew_url || "/pricing"}">Продлить</a>
          ${item.is_active ? `<a class="btn-ghost btn-sm" href="${item.cancel_url || "#"}">Отменить</a>` : ""}
        </div>
      `;
      subsGrid.appendChild(card);
    });

    subsGrid.querySelectorAll(".subscription-card").forEach((card) => {
      card.addEventListener("click", (evt) => {
        if (evt.target.closest("a, button")) return;
        const url = card.dataset.detailUrl;
        if (url) window.location.href = url;
      });
      card.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") card.click();
      });
    });
  };

  const cacheSubscriptions = (items) => {
    if (!uid || !window.localStorage) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ cachedAt: Date.now(), data: items })
      );
    } catch (err) {
      console.warn("Unable to cache subscriptions", err);
    }
  };

  const loadCachedSubscriptions = () => {
    if (!uid || !window.localStorage) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.cachedAt > CACHE_TTL) return null;
      return parsed.data || null;
    } catch (err) {
      console.warn("Unable to read cached subscriptions", err);
      return null;
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch("/subscriptions", { headers: { Accept: "application/json" } });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.detail || data.error || "Не удалось получить подписки");
      }
      renderSubscriptions(data.subscriptions || []);
      cacheSubscriptions(data.subscriptions || []);
      clearFlash(subsFlash);
    } catch (err) {
      setFlash(subsFlash, err.message, "err");
    }
  };

  if (subsGrid) {
    const initialSubs = safeParse(root.dataset.subs);
    if (initialSubs.length) {
      renderSubscriptions(initialSubs);
      cacheSubscriptions(initialSubs);
    } else {
      const cached = loadCachedSubscriptions();
      if (cached) renderSubscriptions(cached);
    }
    fetchSubscriptions();
  }

  const syncAvatarDisplay = () => {
    if (currentAvatarUrl && avatarImg) {
      avatarImg.src = currentAvatarUrl;
      avatarImg.removeAttribute("hidden");
      avatarImg.alt = "Аватар";
    } else if (avatarImg) {
      avatarImg.setAttribute("hidden", "true");
    }
    if (avatarLetter) {
      avatarLetter.toggleAttribute("hidden", Boolean(currentAvatarUrl));
    }
  };

  const syncAvatarPreview = (url) => {
    if (url && avatarPreviewImg) {
      avatarPreviewImg.src = url;
      avatarPreviewImg.removeAttribute("hidden");
    } else if (avatarPreviewImg) {
      avatarPreviewImg.setAttribute("hidden", "true");
    }
    if (avatarPreviewLetter) {
      avatarPreviewLetter.toggleAttribute("hidden", Boolean(url));
    }
  };

  const resetAvatarPreview = (clearMessages = true) => {
    pendingAvatarFile = null;
    if (avatarInput) avatarInput.value = "";
    toggleHidden(avatarActions, true);
    syncAvatarPreview(currentAvatarUrl);
    if (clearMessages) clearFlash(avatarFlash);
  };

  const openAvatarModal = () => {
    if (!avatarModalBackdrop) return;
    resetAvatarPreview();
    showAvatarPrompt();
    avatarModalBackdrop.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    avatarModal?.focus?.();
  };

  const closeAvatarModal = () => {
    if (!avatarModalBackdrop) return;
    avatarModalBackdrop.classList.add("hidden");
    document.body.style.overflow = "";
    resetAvatarPreview();
  };

  const validateUsername = (value) => /^[A-Za-zА-Яа-яЁё0-9_-]{3,20}$/.test(value);

  avatarTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      clearFlash(avatarFlash);
      openAvatarModal();
    });
  });

  avatarInput?.addEventListener("change", () => {
    const file = avatarInput.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFlash(avatarFlash, "Поддерживаются только PNG или JPG.", "err");
      avatarInput.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFlash(avatarFlash, "Размер файла не должен превышать 5MB.", "err");
      avatarInput.value = "";
      return;
    }
    pendingAvatarFile = file;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (avatarPreviewImg && evt.target?.result) {
        avatarPreviewImg.src = evt.target.result;
        avatarPreviewImg.removeAttribute("hidden");
      }
      if (avatarPreviewLetter) {
        avatarPreviewLetter.setAttribute("hidden", "true");
      }
      toggleHidden(avatarActions, false);
    };
    reader.readAsDataURL(file);
  });

  avatarCancel?.addEventListener("click", () => {
    resetAvatarPreview();
    closeAvatarModal();
  });

  avatarSave?.addEventListener("click", async () => {
    if (!pendingAvatarFile) return;
    const formData = new FormData();
    formData.append("file", pendingAvatarFile);
    try {
      const res = await fetch("/upload-avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.detail || data.error || "Не удалось загрузить аватар");
      }
      currentAvatarUrl = `${data.avatar_url}?t=${Date.now()}`;
      syncAvatarDisplay();
      syncAvatarPreview(currentAvatarUrl);
      setFlash(avatarFlash, "Аватар обновлен.", "ok");
    } catch (err) {
      setFlash(avatarFlash, err.message || "Ошибка загрузки.", "err");
    } finally {
      pendingAvatarFile = null;
      toggleHidden(avatarActions, true);
    }
  });

  usernameForm?.addEventListener("submit", async (evt) => {
    evt.preventDefault();
    const value = (usernameInput?.value || "").trim();
    if (!validateUsername(value)) {
      setFlash(usernameFlash, "Имя должно быть 3–20 символов (буквы, цифры, _ или -).", "err");
      return;
    }
    try {
      const res = await fetch("/update-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.detail || data.error || "Не удалось сохранить имя");
      }
      setFlash(usernameFlash, "Имя обновлено.", "ok");
      if (nameDisplay) {
        nameDisplay.textContent = `Привет, ${data.username}`;
      }
    } catch (err) {
      setFlash(usernameFlash, err.message || "Ошибка сохранения.", "err");
    }
  });

  const setToggleExpanded = (value) => {
    profileToggles.forEach((btn) => btn.setAttribute("aria-expanded", value ? "true" : "false"));
  };

  const closeDropdown = () => {
    if (!profileDropdown) return;
    profileDropdown.classList.add("hidden");
    setToggleExpanded(false);
  };

  const openDropdown = () => {
    if (!profileDropdown) return;
    profileDropdown.classList.remove("hidden");
    setToggleExpanded(true);
  };

  profileToggles.forEach((btn) => {
    btn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      if (profileDropdown?.classList.contains("hidden")) {
        openDropdown();
      } else {
        closeDropdown();
      }
    });
  });

  document.addEventListener("click", (evt) => {
    if (!profileDropdown || profileDropdown.classList.contains("hidden")) return;
    const clickedToggle = Array.from(profileToggles).some((btn) => btn.contains(evt.target));
    if (profileDropdown.contains(evt.target) || clickedToggle) return;
    closeDropdown();
  });

  avatarModalBackdrop?.addEventListener("click", (evt) => {
    if (evt.target === avatarModalBackdrop) {
      closeAvatarModal();
    }
  });

  avatarModalCloseButtons.forEach((btn) => {
    btn.addEventListener("click", () => closeAvatarModal());
  });

  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape") {
      closeAvatarModal();
      closeDropdown();
    }
  });

  if (subToastState && SUB_TOAST_MESSAGES[subToastState]) {
    pushToast(
      SUB_TOAST_MESSAGES[subToastState],
      subToastState === "ok" ? "ok" : "err"
    );
  }
})();
