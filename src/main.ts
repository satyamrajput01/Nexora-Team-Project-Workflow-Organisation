import './index.css';
/**
 * Nexora - Product Landing Page Interaction Engine
 * Semantic, accessible, vanilla TypeScript implementation.
 */

// Initialize when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  initStickyHeader();
  initMobileNavigation();
  initProductPreview();
  initPricingToggle();
  initFaqAccordion();
  initActionModal();
  initAnchorScroll();
});

/* -------------------------------------------------------------------------- */
/* 1. Sticky Header Elevation                                                 */
/* -------------------------------------------------------------------------- */
function initStickyHeader(): void {
  const header = document.getElementById('site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 16) {
      header.classList.add('shadow-xs', 'border-slate-300');
      header.classList.remove('border-slate-200');
    } else {
      header.classList.remove('shadow-xs', 'border-slate-300');
      header.classList.add('border-slate-200');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* -------------------------------------------------------------------------- */
/* 2. Accessible Mobile Navigation                                            */
/* -------------------------------------------------------------------------- */
function initMobileNavigation(): void {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const closeBtn = document.getElementById('mobile-menu-close');
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('.mobile-nav-link');

  if (!toggleBtn || !menu) return;

  const openMenu = () => {
    menu.classList.remove('hidden');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    closeBtn?.focus();
  };

  const closeMenu = () => {
    menu.classList.add('hidden');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    toggleBtn.focus();
  };

  toggleBtn.addEventListener('click', () => {
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  closeBtn?.addEventListener('click', closeMenu);

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.classList.contains('hidden')) {
      closeMenu();
    }
  });

  // Focus trap within mobile menu
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    const focusable = menu.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href]:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  });
}

/* -------------------------------------------------------------------------- */
/* 3. Interactive Product Interface Preview                                   */
/* -------------------------------------------------------------------------- */
function initProductPreview(): void {
  const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.preview-tab-btn'));
  const viewPanels = document.querySelectorAll<HTMLElement>('.preview-view-panel');
  const taskCheckboxes = document.querySelectorAll<HTMLInputElement>('.preview-task-checkbox');
  const progressBar = document.getElementById('preview-progress-bar');
  const progressText = document.getElementById('preview-progress-text');
  const filterBtns = document.querySelectorAll<HTMLButtonElement>('.preview-filter-btn');
  const taskRows = document.querySelectorAll<HTMLElement>('.preview-task-row');

  // Tab switching with ARIA keyboard support (Arrow keys)
  tabButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      switchTab(btn);
    });

    btn.addEventListener('keydown', (e) => {
      let targetIndex = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        targetIndex = (index + 1) % tabButtons.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        targetIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      }

      if (targetIndex !== -1) {
        e.preventDefault();
        const targetBtn = tabButtons[targetIndex];
        targetBtn.focus();
        switchTab(targetBtn);
      }
    });
  });

  function switchTab(btn: HTMLButtonElement) {
    const targetView = btn.getAttribute('data-view');
    if (!targetView) return;

    tabButtons.forEach((b) => {
      const isActive = b === btn;
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      b.setAttribute('tabindex', isActive ? '0' : '-1');
      if (isActive) {
        b.classList.add('bg-white', 'text-slate-900', 'shadow-xs');
        b.classList.remove('text-slate-600', 'hover:text-slate-900');
      } else {
        b.classList.remove('bg-white', 'text-slate-900', 'shadow-xs');
        b.classList.add('text-slate-600', 'hover:text-slate-900');
      }
    });

    viewPanels.forEach((panel) => {
      if (panel.id === `preview-panel-${targetView}`) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });
  }

  // Interactive Task Completion & Live Progress Calculation
  const updateProgress = () => {
    if (!taskCheckboxes.length || !progressBar || !progressText) return;
    const total = taskCheckboxes.length;
    let completed = 0;
    taskCheckboxes.forEach((cb) => {
      if (cb.checked) completed++;
      const label = cb.closest('label')?.querySelector('.task-title-text');
      if (label) {
        if (cb.checked) {
          label.classList.add('line-through', 'text-slate-400');
          label.classList.remove('text-slate-800');
        } else {
          label.classList.remove('line-through', 'text-slate-400');
          label.classList.add('text-slate-800');
        }
      }
    });

    const percent = Math.round((completed / total) * 100);
    progressBar.style.width = `${percent}%`;
    const progressContainer = progressBar.parentElement;
    if (progressContainer) {
      progressContainer.setAttribute('aria-valuenow', percent.toString());
    }
    progressText.textContent = `${completed} of ${total} deliverables completed (${percent}%)`;
  };

  taskCheckboxes.forEach((cb) => {
    cb.addEventListener('change', updateProgress);
  });
  updateProgress();

  // Task filtering with accessible aria-pressed state
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');
      filterBtns.forEach((b) => {
        const active = b === btn;
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (active) {
          b.classList.add('bg-slate-200', 'text-slate-900');
          b.classList.remove('bg-slate-100', 'text-slate-600');
        } else {
          b.classList.remove('bg-slate-200', 'text-slate-900');
          b.classList.add('bg-slate-100', 'text-slate-600');
        }
      });

      taskRows.forEach((row) => {
        const category = row.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          row.classList.remove('hidden');
        } else {
          row.classList.add('hidden');
        }
      });
    });
  });
}

/* -------------------------------------------------------------------------- */
/* 4. Interactive Pricing Switcher                                            */
/* -------------------------------------------------------------------------- */
function initPricingToggle(): void {
  const switchBtn = document.getElementById('billing-switch');
  const pricePro = document.getElementById('price-pro');
  const priceTeam = document.getElementById('price-team');
  const intervalPro = document.getElementById('interval-pro');
  const intervalTeam = document.getElementById('interval-team');
  const notePro = document.getElementById('note-pro');
  const noteTeam = document.getElementById('note-team');
  const annualSavingsBadge = document.getElementById('annual-savings-text');

  if (!switchBtn || !pricePro || !priceTeam) return;

  let isAnnual = false;

  const updatePricing = () => {
    switchBtn.setAttribute('aria-checked', isAnnual ? 'true' : 'false');
    switchBtn.setAttribute(
      'aria-label',
      isAnnual
        ? 'Billing interval: annual billing active, saving 16%'
        : 'Billing interval: monthly billing active'
    );

    const switchIndicator = switchBtn.querySelector('.switch-handle');
    if (switchIndicator) {
      if (isAnnual) {
        switchIndicator.classList.add('translate-x-5');
        switchIndicator.classList.remove('translate-x-0');
      } else {
        switchIndicator.classList.remove('translate-x-5');
        switchIndicator.classList.add('translate-x-0');
      }
    }

    if (isAnnual) {
      pricePro.textContent = '$10';
      priceTeam.textContent = '$20';
      if (intervalPro) intervalPro.textContent = '/ user / month';
      if (intervalTeam) intervalTeam.textContent = '/ user / month';
      if (notePro) notePro.textContent = 'Billed annually at $120/year per user (Save $24/year)';
      if (noteTeam) noteTeam.textContent = 'Billed annually at $240/year per user (Save $48/year)';
      if (annualSavingsBadge) annualSavingsBadge.classList.add('text-teal-700', 'font-semibold');
    } else {
      pricePro.textContent = '$12';
      priceTeam.textContent = '$24';
      if (intervalPro) intervalPro.textContent = '/ user / month';
      if (intervalTeam) intervalTeam.textContent = '/ user / month';
      if (notePro) notePro.textContent = 'Billed monthly at $144/year per user';
      if (noteTeam) noteTeam.textContent = 'Billed monthly at $288/year per user';
      if (annualSavingsBadge) annualSavingsBadge.classList.remove('text-teal-700', 'font-semibold');
    }
  };

  switchBtn.addEventListener('click', () => {
    isAnnual = !isAnnual;
    updatePricing();
  });

  // Clicking label text also toggles
  const monthlyLabel = document.getElementById('label-monthly');
  const annualLabel = document.getElementById('label-annual');

  monthlyLabel?.addEventListener('click', () => {
    if (isAnnual) {
      isAnnual = false;
      updatePricing();
      switchBtn.focus();
    }
  });

  annualLabel?.addEventListener('click', () => {
    if (!isAnnual) {
      isAnnual = true;
      updatePricing();
      switchBtn.focus();
    }
  });
}

/* -------------------------------------------------------------------------- */
/* 5. Accessible FAQ Accordion                                                */
/* -------------------------------------------------------------------------- */
function initFaqAccordion(): void {
  const accordions = document.querySelectorAll<HTMLElement>('.faq-item');

  accordions.forEach((item) => {
    const trigger = item.querySelector<HTMLButtonElement>('.faq-trigger');
    const content = item.querySelector<HTMLElement>('.faq-content');
    const icon = item.querySelector<SVGElement>('.faq-chevron');

    if (!trigger || !content) return;

    trigger.addEventListener('click', () => {
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

      // Toggle current item
      if (isExpanded) {
        trigger.setAttribute('aria-expanded', 'false');
        content.classList.remove('is-open');
        icon?.classList.remove('rotate-180');
      } else {
        trigger.setAttribute('aria-expanded', 'true');
        content.classList.add('is-open');
        icon?.classList.add('rotate-180');
      }
    });
  });
}

/* -------------------------------------------------------------------------- */
/* 6. Action CTA Modal (Signup / Demo Inquiry)                                */
/* -------------------------------------------------------------------------- */
function initActionModal(): void {
  const modal = document.getElementById('action-modal');
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close-btn');
  const modalForm = document.getElementById('action-form') as HTMLFormElement | null;
  const modalTitle = document.getElementById('modal-title');
  const planSelect = document.getElementById('form-plan') as HTMLSelectElement | null;
  const formSuccess = document.getElementById('form-success-state');
  const resetBtn = document.getElementById('modal-reset-btn');
  const submitBtn = modalForm?.querySelector<HTMLButtonElement>('button[type="submit"]');

  if (!modal || !modalForm) return;

  let activeTrigger: HTMLElement | null = null;

  const openModal = (planName = 'free', titleText = 'Get started with Nexora') => {
    activeTrigger = document.activeElement as HTMLElement | null;

    if (modalTitle) modalTitle.textContent = titleText;
    if (planSelect) {
      if (planName === 'team') planSelect.value = 'team';
      else if (planName === 'pro') planSelect.value = 'pro';
      else planSelect.value = 'free';
    }

    // Reset view
    modalForm.classList.remove('hidden');
    formSuccess?.classList.add('hidden');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Focus first input
    const firstInput = modalForm.querySelector<HTMLInputElement>('#form-email');
    setTimeout(() => firstInput?.focus(), 50);
  };

  const closeModal = () => {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    activeTrigger?.focus();
  };

  // Attach triggers
  document.querySelectorAll<HTMLElement>('[data-action-trigger]').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const plan = trigger.getAttribute('data-plan') || 'free';
      const label = trigger.getAttribute('data-title') || 'Get started with Nexora';
      openModal(plan, label);
    });
  });

  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', closeModal);

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Focus trap inside modal
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  });

  // Form Validation & Submission
  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('form-email') as HTMLInputElement | null;
    const nameInput = document.getElementById('form-name') as HTMLInputElement | null;
    const termsInput = document.getElementById('form-terms') as HTMLInputElement | null;

    const emailError = document.getElementById('error-email');
    const nameError = document.getElementById('error-name');
    const termsError = document.getElementById('error-terms');

    let isValid = true;

    // Email validation
    const emailVal = emailInput?.value.trim() || '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailRegex.test(emailVal)) {
      isValid = false;
      if (emailError) {
        emailError.textContent = 'Please enter a valid work email address.';
        emailError.classList.remove('hidden');
      }
      emailInput?.setAttribute('aria-invalid', 'true');
    } else {
      if (emailError) emailError.classList.add('hidden');
      emailInput?.setAttribute('aria-invalid', 'false');
    }

    // Name validation
    const nameVal = nameInput?.value.trim() || '';
    if (!nameVal || nameVal.length < 2) {
      isValid = false;
      if (nameError) {
        nameError.textContent = 'Please enter your full name (at least 2 characters).';
        nameError.classList.remove('hidden');
      }
      nameInput?.setAttribute('aria-invalid', 'true');
    } else {
      if (nameError) nameError.classList.add('hidden');
      nameInput?.setAttribute('aria-invalid', 'false');
    }

    // Terms validation
    if (!termsInput?.checked) {
      isValid = false;
      if (termsError) {
        termsError.textContent = 'You must agree to the Terms of Service to proceed.';
        termsError.classList.remove('hidden');
      }
      termsInput?.setAttribute('aria-invalid', 'true');
    } else {
      if (termsError) termsError.classList.add('hidden');
      termsInput?.setAttribute('aria-invalid', 'false');
    }

    if (!isValid) return;

    // Prevent duplicate submission
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying...';
    }

    setTimeout(() => {
      // Honest Demo Submission Handling
      modalForm.classList.add('hidden');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Validate Form (Frontend Demo)';
      }

      if (formSuccess) {
        formSuccess.classList.remove('hidden');
        const confirmEmail = document.getElementById('success-user-email');
        if (confirmEmail) {
          confirmEmail.textContent = emailVal; // Safe textContent to avoid XSS
        }
        const confirmPlan = document.getElementById('success-user-plan');
        if (confirmPlan && planSelect) {
          confirmPlan.textContent = planSelect.options[planSelect.selectedIndex].text;
        }
        // Announce to screen readers and set focus to confirmation button
        setTimeout(() => resetBtn?.focus(), 50);
      }
    }, 200);
  });

  resetBtn?.addEventListener('click', () => {
    modalForm.reset();
    modalForm.classList.remove('hidden');
    formSuccess?.classList.add('hidden');
    const firstInput = modalForm.querySelector<HTMLInputElement>('#form-email');
    firstInput?.focus();
  });
}

/* -------------------------------------------------------------------------- */
/* 7. Accessible Anchor Scroll with Offset                                    */
/* -------------------------------------------------------------------------- */
function initAnchorScroll(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerHeight = 72;
        const targetPosition = targetEl.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
      }
    });
  });
}
