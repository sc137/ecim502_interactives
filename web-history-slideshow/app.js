(() => {
      const slides = Array.from(document.querySelectorAll('.slide'));
      const previousButton = document.getElementById('previousButton');
      const nextButton = document.getElementById('nextButton');
      const slideStatus = document.getElementById('slideStatus');
      const progressBar = document.getElementById('progressBar');
      const progressTrack = document.querySelector('.progress-track');
      const ariaLiveAnnouncer = document.getElementById('ariaLiveAnnouncer');
      const fullscreenButton = document.getElementById('fullscreenButton');
      const helpButton = document.getElementById('helpButton');
      const helpPanel = document.getElementById('helpPanel');
      const helpCloseButton = document.getElementById('helpCloseButton');
      const infoButtons = Array.from(document.querySelectorAll('.info-button'));
      let currentIndex = 0;
      let lastFocusedElement = null;

      document.querySelectorAll('a[target="_blank"]').forEach((link) => {
        const newTabNotice = document.createElement('span');
        newTabNotice.className = 'visually-hidden';
        newTabNotice.textContent = ' (opens in new tab)';
        link.append(newTabNotice);
      });

      const announce = (message) => {
        ariaLiveAnnouncer.textContent = '';
        window.setTimeout(() => { ariaLiveAnnouncer.textContent = message; }, 80);
      };

      const closeAllPopovers = (exceptButton = null) => {
        infoButtons.forEach((button) => {
          if (button === exceptButton) return;
          const popover = document.getElementById(button.getAttribute('aria-controls'));
          button.setAttribute('aria-expanded', 'false');
          popover.hidden = true;
        });
      };

      const positionPopover = (button, popover) => {
        if (window.matchMedia('(max-width: 760px)').matches) {
          popover.classList.remove('popover-below');
          popover.style.removeProperty('--popover-max-height');
          popover.style.removeProperty('--popover-shift-x');
          return;
        }

        const slide = button.closest('.slide');
        const buttonBounds = button.getBoundingClientRect();
        const slideBounds = slide.getBoundingClientRect();
        const edgeInset = 16;
        const popoverGap = 12;
        const topBoundary = Math.max(slideBounds.top, edgeInset);
        const bottomBoundary = Math.min(slideBounds.bottom, window.innerHeight - edgeInset);
        const spaceAbove = buttonBounds.top - topBoundary - popoverGap;
        const spaceBelow = bottomBoundary - buttonBounds.bottom - popoverGap;
        const openBelow = spaceBelow > spaceAbove;
        const availableHeight = Math.max(80, openBelow ? spaceBelow : spaceAbove);

        popover.classList.toggle('popover-below', openBelow);
        popover.style.setProperty('--popover-max-height', availableHeight + 'px');

        popover.style.setProperty('--popover-shift-x', '0px');
        const popoverBounds = popover.getBoundingClientRect();
        const leftBoundary = Math.max(slideBounds.left + edgeInset, edgeInset);
        const rightBoundary = Math.min(slideBounds.right - edgeInset, window.innerWidth - edgeInset);
        let horizontalShift = 0;

        if (popoverBounds.left < leftBoundary) {
          horizontalShift = leftBoundary - popoverBounds.left;
        }
        if (popoverBounds.right + horizontalShift > rightBoundary) {
          horizontalShift -= popoverBounds.right + horizontalShift - rightBoundary;
        }

        popover.style.setProperty('--popover-shift-x', horizontalShift + 'px');
      };

      const showSlide = (requestedIndex, updateHash = true) => {
        const nextIndex = Math.max(0, Math.min(requestedIndex, slides.length - 1));
        currentIndex = nextIndex;
        closeAllPopovers();
        slides.forEach((slide, index) => {
          slide.hidden = index !== currentIndex;
          if (index === currentIndex) slide.scrollTop = 0;
        });

        const slideNumber = currentIndex + 1;
        const title = slides[currentIndex].dataset.title;
        previousButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex === slides.length - 1;
        slideStatus.textContent = 'Slide ' + slideNumber + ' of ' + slides.length + ': ' + title;
        progressBar.style.width = ((slideNumber / slides.length) * 100) + '%';
        progressTrack.setAttribute('aria-valuenow', String(slideNumber));
        if (updateHash) history.replaceState(null, '', '#slide-' + slideNumber);
      };

      previousButton.addEventListener('click', () => showSlide(currentIndex - 1));
      nextButton.addEventListener('click', () => showSlide(currentIndex + 1));

      infoButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          const willOpen = button.getAttribute('aria-expanded') !== 'true';
          closeAllPopovers(willOpen ? button : null);
          const popover = document.getElementById(button.getAttribute('aria-controls'));
          button.setAttribute('aria-expanded', String(willOpen));
          popover.hidden = !willOpen;
          if (willOpen) positionPopover(button, popover);
        });
      });

      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        document.querySelectorAll('.detail').forEach((detail) => {
          const button = detail.querySelector('.info-button');
          const popover = document.getElementById(button.getAttribute('aria-controls'));
          let closeTimer = null;

          const cancelPendingClose = () => {
            if (closeTimer !== null) {
              window.clearTimeout(closeTimer);
              closeTimer = null;
            }
          };

          const scheduleClose = () => {
            cancelPendingClose();
            closeTimer = window.setTimeout(() => {
              button.setAttribute('aria-expanded', 'false');
              popover.hidden = true;
              closeTimer = null;
            }, 250);
          };

          detail.addEventListener('pointerenter', () => {
            cancelPendingClose();
            closeAllPopovers(button);
            button.setAttribute('aria-expanded', 'true');
            popover.hidden = false;
            positionPopover(button, popover);
          });
          detail.addEventListener('pointerleave', scheduleClose);
          popover.addEventListener('pointerenter', cancelPendingClose);
        });
      }

      window.addEventListener('resize', () => {
        const openButton = infoButtons.find((button) => button.getAttribute('aria-expanded') === 'true');
        if (!openButton) return;
        const popover = document.getElementById(openButton.getAttribute('aria-controls'));
        positionPopover(openButton, popover);
      });

      document.addEventListener('click', (event) => {
        if (!event.target.closest('.detail')) closeAllPopovers();
      });
      fullscreenButton.addEventListener('click', async () => {
        try {
          if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
          else await document.exitFullscreen();
        } catch (error) {
          fullscreenButton.disabled = true;
          fullscreenButton.setAttribute('aria-label', 'Full screen is not available in this browser');
          fullscreenButton.title = 'Full screen is not available in this browser';
        }
      });
      if (!document.fullscreenEnabled || typeof document.documentElement.requestFullscreen !== 'function') {
        fullscreenButton.disabled = true;
        fullscreenButton.setAttribute('aria-label', 'Full screen is not available in this browser');
        fullscreenButton.title = 'Full screen is not available in this browser';
      }
      document.addEventListener('fullscreenchange', () => {
        const isFullscreen = Boolean(document.fullscreenElement);
        fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Exit full screen' : 'Enter full screen');
        fullscreenButton.title = isFullscreen ? 'Exit full screen' : 'Enter full screen';
      });

      const openHelp = () => {
        lastFocusedElement = document.activeElement;
        helpPanel.hidden = false;
        helpButton.setAttribute('aria-expanded', 'true');
        helpButton.setAttribute('aria-label', 'Hide navigation help');
        helpCloseButton.focus();
      };
      const closeHelp = () => {
        helpPanel.hidden = true;
        helpButton.setAttribute('aria-expanded', 'false');
        helpButton.setAttribute('aria-label', 'Show navigation help');
        if (lastFocusedElement) lastFocusedElement.focus();
      };
      helpButton.addEventListener('click', openHelp);
      helpCloseButton.addEventListener('click', closeHelp);

      document.addEventListener('keydown', (event) => {
        if (!helpPanel.hidden) {
          if (event.key === 'Escape') closeHelp();
          if (event.key === 'Tab' && document.activeElement !== helpCloseButton) {
            event.preventDefault();
            helpCloseButton.focus();
          }
          return;
        }
        if (event.key === 'Escape') { closeAllPopovers(); return; }
        if (event.target.closest('button, a, input, select, textarea, [contenteditable="true"]')) return;
        if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
          event.preventDefault();
          showSlide(currentIndex + 1);
        } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
          event.preventDefault();
          showSlide(currentIndex - 1);
        } else if (event.key === 'Home') {
          event.preventDefault();
          showSlide(0);
        } else if (event.key === 'End') {
          event.preventDefault();
          showSlide(slides.length - 1);
        }
      });

      let touchStartX = null;
      document.getElementById('slideStage').addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0].clientX;
      }, { passive: true });
      document.getElementById('slideStage').addEventListener('touchend', (event) => {
        if (touchStartX === null) return;
        const difference = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(difference) > 70) showSlide(currentIndex + (difference < 0 ? 1 : -1));
        touchStartX = null;
      }, { passive: true });

      const hashMatch = window.location.hash.match(/^#slide-(\d+)/);
      const initialIndex = hashMatch ? Number(hashMatch[1]) - 1 : 0;
      showSlide(initialIndex, false);
    })();
