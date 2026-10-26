"use strict";

/* =========================================
   NAFORA OS — WINDOW MANAGER
   ========================================= */

(() => {
  const layer = document.getElementById("window-layer");
  const taskbarItems = document.getElementById("taskbar-items");
  const showDesktopButton = document.getElementById("taskbar-show-desktop");
  const homeButton = document.getElementById("taskbar-home");
  const mobileQuery = window.matchMedia("(max-width: 640px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const apps = {
    profile: {
      title: "Profile",
      icon: "◉",
      subtitle: "About me",
      content: `<div data-personal-app="profile"></div>`,
    },

    projects: {
      title: "Projects",
      icon: "▧",
      subtitle: "Selected work",
      content: `<div data-personal-app="projects"></div>`,
    },

    skills: {
      title: "Skills",
      icon: "✳",
      subtitle: "Capabilities & technologies",
      content: `<div data-archive-app="skills"></div>`,
    },

    certificates: {
      title: "Certificates",
      icon: "✧",
      subtitle: "Credentials & achievements",
      content: `<div data-archive-app="certificates"></div>`,
    },
  };

  const windows = new Map();
  let activeId = null;
  let highestZ = 20;
  let nextPosition = 0;
  let desktopHidden = false;
  let previousFocus = null;

  function makeButton(label, symbol, className, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `window-control ${className || ""}`;
    button.textContent = symbol;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.addEventListener("click", action);
    return button;
  }

  function focusWindow(id) {
    const item = windows.get(id);
    if (!item || item.minimized) return;

    activeId = id;

    for (const [key, win] of windows) {
      const active = key === id;
      win.element.classList.toggle("is-focused", active);
      win.element.style.zIndex = active
        ? String(++highestZ)
        : win.element.style.zIndex;
      win.taskButton.classList.toggle("is-active", active);
      win.taskButton.setAttribute("aria-pressed", String(active));
    }
  }

  function updateTaskButton(item) {
    item.taskButton.classList.toggle("is-open", !item.minimized);
    item.taskButton.classList.toggle(
      "is-active",
      item.id === activeId && !item.minimized,
    );

    item.taskButton.setAttribute(
      "aria-label",
      `${item.config.title}${item.minimized ? ", minimized" : ", open"}`,
    );

    item.taskButton.title = item.config.title;
  }

  function createWindow(id) {
    const config = apps[id];
    if (!config) return null;

    const element = document.createElement("section");
    element.className = "os-window";
    element.dataset.windowId = id;
    element.setAttribute("role", "dialog");
    element.setAttribute("aria-label", config.title);
    element.tabIndex = -1;

    const titlebar = document.createElement("header");
    titlebar.className = "window-titlebar";

    const symbol = document.createElement("span");
    symbol.className = "window-app-symbol";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = config.icon;

    const heading = document.createElement("div");
    heading.className = "window-heading";

    const title = document.createElement("strong");
    title.textContent = config.title;

    const subtitle = document.createElement("small");
    subtitle.textContent = config.subtitle;

    heading.append(title, subtitle);

    const controls = document.createElement("div");
    controls.className = "window-controls";

    const content = document.createElement("div");
    content.className = "window-content";

    // Konten merupakan template statis milik aplikasi internal.
    content.innerHTML = config.content;

    const item = {
      id,
      config,
      element,
      titlebar,
      content,
      taskButton: null,
      minimized: false,
      maximized: false,
      previousBounds: null,
    };

    const minimizeButton = makeButton("Minimize", "−", "minimize", () =>
      minimizeWindow(id),
    );

    const maximizeButton = makeButton("Maximize", "□", "maximize", () =>
      toggleMaximize(id),
    );

    const closeButton = makeButton("Close", "×", "close", () =>
      closeWindow(id),
    );

    controls.append(minimizeButton, maximizeButton, closeButton);
    titlebar.append(symbol, heading, controls);
    element.append(titlebar, content);

    const taskButton = document.createElement("button");
    taskButton.type = "button";
    taskButton.className = "taskbar-app";
    taskButton.textContent = config.icon;
    taskButton.title = config.title;
    taskButton.setAttribute("aria-label", config.title);
    taskButton.addEventListener("click", () => {
      const current = windows.get(id);
      if (!current) return;

      if (current.minimized) {
        restoreWindow(id);
      } else if (activeId === id && !desktopHidden) {
        minimizeWindow(id);
      } else {
        desktopHidden = false;
        document.body.classList.remove("workspace-hidden");
        focusWindow(id);
      }
    });

    item.taskButton = taskButton;

    element.addEventListener("pointerdown", () => {
      if (!item.minimized) focusWindow(id);
    });

    // Dragging menggunakan pointer events, termasuk mouse dan stylus.
    // Di layar sentuh kecil, jendela dibuat fullscreen dan tidak di-drag.
    titlebar.addEventListener("pointerdown", (event) => {
      if (mobileQuery.matches || item.maximized) return;
      if (event.button !== 0) return;
      if (event.target.closest("button")) return;

      const rect = element.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const offsetX = startX - rect.left;
      const offsetY = startY - rect.top;

      focusWindow(id);
      titlebar.setPointerCapture(event.pointerId);

      function onMove(moveEvent) {
        const left = Math.max(
          0,
          Math.min(window.innerWidth - 100, moveEvent.clientX - offsetX),
        );

        const top = Math.max(
          0,
          Math.min(window.innerHeight - 110, moveEvent.clientY - offsetY),
        );

        element.style.left = `${left}px`;
        element.style.top = `${top}px`;
      }

      function onUp() {
        if (titlebar.hasPointerCapture(event.pointerId)) {
          titlebar.releasePointerCapture(event.pointerId);
        }

        titlebar.removeEventListener("pointermove", onMove);
        titlebar.removeEventListener("pointerup", onUp);
        titlebar.removeEventListener("pointercancel", onUp);
      }

      titlebar.addEventListener("pointermove", onMove);
      titlebar.addEventListener("pointerup", onUp);
      titlebar.addEventListener("pointercancel", onUp);
    });

    layer.append(element);
    taskbarItems.append(taskButton);

    if (!mobileQuery.matches) {
      const offset = (nextPosition++ % 6) * 24;
      const windowWidth = Math.min(640, window.innerWidth - 48);
      const windowHeight = Math.min(430, window.innerHeight - 150);

      element.style.width = `${Math.max(290, windowWidth)}px`;
      element.style.height = `${Math.max(300, windowHeight)}px`;
      element.style.left = `${Math.max(16, (window.innerWidth - windowWidth) / 2 + offset - 60)}px`;
      element.style.top = `${Math.max(20, (window.innerHeight - windowHeight) / 2 + offset - 40)}px`;
    }

    windows.set(id, item);
    updateTaskButton(item);

    return item;
  }

  function openWindow(id) {
    desktopHidden = false;
    document.body.classList.remove("workspace-hidden");

    let item = windows.get(id);

    if (!item) {
      item = createWindow(id);
    }

    if (!item) return;

    if (item.minimized) {
      restoreWindow(id);
      return;
    }

    focusWindow(id);
    item.element.style.display = "flex";

    if (item.previousFocus === undefined) {
      item.previousFocus = document.activeElement;
    }

    item.element.focus({ preventScroll: true });
    previousFocus = item.element;
  }

  function minimizeWindow(id) {
    const item = windows.get(id);
    if (!item || item.minimized) return;

    item.minimized = true;
    item.element.classList.add("is-minimizing");
    updateTaskButton(item);

    window.setTimeout(
      () => {
        if (item.minimized) {
          item.element.style.display = "none";
          item.element.classList.remove("is-minimizing");
        }
      },
      reducedMotion.matches ? 0 : 190,
    );

    if (activeId === id) {
      activeId = null;

      for (const [otherId, other] of windows) {
        if (otherId !== id && !other.minimized) {
          focusWindow(otherId);
          break;
        }
      }
    }
  }

  function restoreWindow(id) {
    const item = windows.get(id);
    if (!item) return;

    desktopHidden = false;
    document.body.classList.remove("workspace-hidden");
    item.minimized = false;
    item.element.style.display = "flex";
    item.element.classList.remove("is-minimizing");
    updateTaskButton(item);
    focusWindow(id);
  }

  function toggleMaximize(id) {
    const item = windows.get(id);
    if (!item || mobileQuery.matches) return;

    if (!item.maximized) {
      const rect = item.element.getBoundingClientRect();

      item.previousBounds = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };

      item.element.style.left = "12px";
      item.element.style.top = "12px";
      item.element.style.width = `${window.innerWidth - 24}px`;
      item.element.style.height = `${window.innerHeight - 100}px`;
      item.maximized = true;
    } else if (item.previousBounds) {
      const bounds = item.previousBounds;

      item.element.style.left = `${bounds.left}px`;
      item.element.style.top = `${bounds.top}px`;
      item.element.style.width = `${bounds.width}px`;
      item.element.style.height = `${bounds.height}px`;
      item.maximized = false;
    }

    const button = item.element.querySelector(".window-control.maximize");
    button.textContent = item.maximized ? "❐" : "□";
    button.title = item.maximized ? "Restore" : "Maximize";
    button.setAttribute("aria-label", button.title);

    focusWindow(id);
  }

  function closeWindow(id) {
    const item = windows.get(id);
    if (!item) return;

    item.element.classList.add("is-closing");
    item.taskButton.remove();
    windows.delete(id);

    if (activeId === id) activeId = null;

    window.setTimeout(
      () => {
        item.element.remove();

        if (!activeId) {
          for (const [otherId, other] of windows) {
            if (!other.minimized) {
              focusWindow(otherId);
              break;
            }
          }
        }
      },
      reducedMotion.matches ? 0 : 170,
    );
  }

  function showDesktop() {
    desktopHidden = !desktopHidden;
    document.body.classList.toggle("workspace-hidden", desktopHidden);

    if (desktopHidden) {
      activeId = null;

      for (const [, item] of windows) {
        item.element.classList.remove("is-focused");
        item.taskButton.classList.remove("is-active");
        item.taskButton.setAttribute("aria-pressed", "false");
      }
    } else {
      const lastVisible = [...windows.entries()]
        .reverse()
        .find(([, item]) => !item.minimized);

      if (lastVisible) focusWindow(lastVisible[0]);
    }
  }

  // Buka atau fokuskan aplikasi dari desktop.
  document.querySelectorAll(".app-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      openWindow(tile.dataset.app);
    });
  });

  showDesktopButton.addEventListener("click", showDesktop);

  homeButton.addEventListener("click", () => {
    if (desktopHidden) {
      desktopHidden = false;
      document.body.classList.remove("workspace-hidden");
      return;
    }

    showDesktop();
  });

  // Double-click title bar untuk maximize/restore.
  layer.addEventListener("dblclick", (event) => {
    const titlebar = event.target.closest(".window-titlebar");
    if (!titlebar || event.target.closest("button")) return;

    const windowElement = titlebar.closest(".os-window");
    const id = windowElement?.dataset.windowId;

    if (id && !mobileQuery.matches) toggleMaximize(id);
  });

  // Pertahankan jendela dalam batas viewport saat ukuran layar berubah.
  window.addEventListener("resize", () => {
    for (const [, item] of windows) {
      if (mobileQuery.matches) continue;
      if (item.maximized) {
        item.element.style.width = `${window.innerWidth - 24}px`;
        item.element.style.height = `${window.innerHeight - 100}px`;
        continue;
      }

      const rect = item.element.getBoundingClientRect();
      const maxLeft = Math.max(
        0,
        window.innerWidth - Math.min(rect.width, 100),
      );
      const maxTop = Math.max(0, window.innerHeight - 110);

      item.element.style.left = `${Math.min(rect.left, maxLeft)}px`;
      item.element.style.top = `${Math.min(rect.top, maxTop)}px`;
    }
  });

  // API sederhana untuk tahap pengembangan berikutnya.
  window.NaforaOS = Object.freeze({
    open: openWindow,
    close: closeWindow,
    minimize: minimizeWindow,
    restore: restoreWindow,
    getOpenApps: () => [...windows.keys()],
  });
})();
