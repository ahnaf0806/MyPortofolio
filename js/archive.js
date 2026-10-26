(() => {
  "use strict";

  const loadedData = new Map();

  const escapeHTML = (value = "") =>
    String(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );

  async function loadJSON(path) {
    if (!loadedData.has(path)) {
      loadedData.set(
        path,
        fetch(path).then((response) => {
          if (!response.ok) {
            throw new Error(`Gagal memuat ${path}`);
          }
          return response.json();
        }),
      );
    }

    return loadedData.get(path);
  }

  function makeToolbar(categories, placeholder) {
    return `
      <div class="archive-toolbar">
        <label class="archive-search">
          <span aria-hidden="true">⌕</span>
          <input type="search" data-search
            placeholder="${escapeHTML(placeholder)}"
            aria-label="${escapeHTML(placeholder)}">
        </label>
        <select data-category aria-label="Filter kategori">
          ${categories
            .map(
              (category) => `
            <option value="${escapeHTML(category)}">
              ${escapeHTML(category)}
            </option>
          `,
            )
            .join("")}
        </select>
      </div>
      <p class="archive-count" data-count aria-live="polite"></p>
    `;
  }

  function makeEmpty(message) {
    return `
      <div class="archive-empty">
        <span class="archive-empty-icon" aria-hidden="true">◇</span>
        <h3>${escapeHTML(message)}</h3>
        <p>Tambahkan data melalui file JSON untuk menampilkan koleksi di sini.</p>
      </div>
    `;
  }

  async function initSkills(root) {
    const data = await loadJSON("data/skills.json");
    const skills = Array.isArray(data.skills) ? data.skills : [];
    const categories = Array.isArray(data.categories)
      ? data.categories
      : ["All"];

    root.innerHTML = `
      <section class="archive-app">
        <div class="archive-intro">
          <span class="window-badge">CAPABILITIES</span>
          <h2>My Skills<span class="archive-accent">.</span></h2>
          <p>Skills, tools, and things I'm learning.</p>
        </div>
        ${makeToolbar(categories, "Search skills...")}
        <div class="archive-grid" data-results></div>
      </section>
    `;

    const results = root.querySelector("[data-results]");
    const search = root.querySelector("[data-search]");
    const category = root.querySelector("[data-category]");
    const count = root.querySelector("[data-count]");

    function render() {
      const query = search.value.trim().toLowerCase();
      const selected = category.value;

      const filtered = skills.filter((skill) => {
        const text = [skill.name, skill.category, skill.description]
          .join(" ")
          .toLowerCase();

        return (
          text.includes(query) &&
          (selected === "All" || skill.category === selected)
        );
      });

      count.textContent = `${filtered.length} skill${filtered.length === 1 ? "" : "s"}`;

      results.innerHTML = filtered.length
        ? filtered
            .map(
              (skill) => `
                        <article class="archive-card skill-card">
              <div class="archive-card-top">
                ${
                  skill.logo
                    ? `<img src="${escapeHTML(skill.logo)}" alt="${escapeHTML(skill.name || "Skill logo")}" class="archive-card-logo" loading="lazy">`
                    : `<span class="archive-card-symbol">✳</span>`
                }
                <span class="archive-tag">${escapeHTML(skill.category || "Other")}</span>
              </div>
              <h3>${escapeHTML(skill.name || "Untitled skill")}</h3>
            
              ${
                skill.description
                  ? `<p>${escapeHTML(skill.description)}</p>`
                  : ""
              }
              ${
                skill.level
                  ? `<span class="skill-level">${escapeHTML(skill.level)}</span>`
                  : ""
              }
            </article>
          `,
            )
            .join("")
        : makeEmpty(
            query || selected !== "All"
              ? "No matching skills"
              : "Your skills collection is waiting",
          );
    }

    search.addEventListener("input", render);
    category.addEventListener("change", render);
    render();
  }

  async function initCertificates(root) {
    const data = await loadJSON("data/certificates.json");
    const certificates = Array.isArray(data.certificates)
      ? data.certificates
      : [];
    const categories = Array.isArray(data.categories)
      ? data.categories
      : ["All"];

    root.innerHTML = `
      <section class="archive-app">
        <div class="archive-intro">
          <span class="window-badge">CREDENTIALS</span>
          <h2>Certificates<span class="archive-accent">.</span></h2>
          <p>Courses, credentials, and achievements.</p>
        </div>
        ${makeToolbar(categories, "Search certificates...")}
        <div class="archive-grid certificate-grid" data-results></div>
      </section>
    `;

    const results = root.querySelector("[data-results]");
    const search = root.querySelector("[data-search]");
    const category = root.querySelector("[data-category]");
    const count = root.querySelector("[data-count]");

    function render() {
      const query = search.value.trim().toLowerCase();
      const selected = category.value;

      const filtered = certificates.filter((item) => {
        const text = [item.title, item.issuer, item.category, item.description]
          .join(" ")
          .toLowerCase();

        return (
          text.includes(query) &&
          (selected === "All" || item.category === selected)
        );
      });

      count.textContent = `${filtered.length} certificate${filtered.length === 1 ? "" : "s"}`;

      results.innerHTML = filtered.length
        ? filtered
            .map((item) => {
              const file = item.file || "";
              const safeFile = escapeHTML(file);
              const isImage = /\.(png|jpe?g|webp|gif|svg)$/i.test(file);
              const preview = item.thumbnail || (isImage ? file : "");

              return `
              <article class="archive-card certificate-card">
                <div class="certificate-preview">
                  ${
                    preview
                      ? `<img src="${escapeHTML(preview)}"
                        alt="Preview: ${escapeHTML(item.title)}"
                        loading="lazy">`
                      : `<span class="certificate-placeholder">✧</span>`
                  }
                </div>
                <div class="certificate-info">
                  <span class="archive-tag">${escapeHTML(item.category || "Other")}</span>
                  <h3>${escapeHTML(item.title || "Untitled certificate")}</h3>
                  ${
                    item.issuer
                      ? `<p class="certificate-issuer">${escapeHTML(item.issuer)}</p>`
                      : ""
                  }
                  ${
                    item.date
                      ? `<p class="certificate-date">${escapeHTML(item.date)}</p>`
                      : ""
                  }
                  ${
                    item.description
                      ? `<p>${escapeHTML(item.description)}</p>`
                      : ""
                  }
                  ${
                    file
                      ? `<a class="certificate-link"
                         href="${safeFile}"
                         target="_blank"
                         rel="noopener noreferrer">
                         View certificate ↗
                       </a>`
                      : `<span class="certificate-unavailable">
                         File not added yet
                       </span>`
                  }
                </div>
              </article>
            `;
            })
            .join("")
        : makeEmpty(
            query || selected !== "All"
              ? "No matching certificates"
              : "Your certificate collection is waiting",
          );
    }

    search.addEventListener("input", render);
    category.addEventListener("change", render);
    render();
  }

  const initializers = {
    skills: initSkills,
    certificates: initCertificates,
  };

  async function mount(root) {
    if (root.dataset.archiveReady === "true") return;

    root.dataset.archiveReady = "true";
    root.innerHTML = `<div class="archive-loading">Loading collection...</div>`;

    try {
      await initializers[root.dataset.archiveApp](root);
    } catch (error) {
      console.error(error);
      root.innerHTML = `
        <div class="archive-error">
          <h3>Unable to load this collection</h3>
          <p>Pastikan file JSON tersedia dan website dibuka melalui Live Server.</p>
          <button type="button" data-retry>Try again</button>
        </div>
      `;

      root.querySelector("[data-retry]").addEventListener("click", () => {
        root.dataset.archiveReady = "false";
        mount(root);
      });
    }
  }

  function scan() {
    document.querySelectorAll("[data-archive-app]").forEach((root) => {
      if (initializers[root.dataset.archiveApp]) mount(root);
    });
  }

  const observer = new MutationObserver(scan);

  function start() {
    scan();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
