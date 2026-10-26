(() => {
  "use strict";

  const cache = new Map();

  const esc = (value = "") =>
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

  function safeURL(value = "") {
    try {
      const url = new URL(value, window.location.href);
      if (["http:", "https:", "mailto:"].includes(url.protocol)) {
        return esc(url.href);
      }
    } catch {
      // URL tidak valid, jangan tampilkan sebagai tautan.
    }
    return "";
  }

  async function readJSON(path) {
    if (!cache.has(path)) {
      cache.set(
        path,
        fetch(path).then((response) => {
          if (!response.ok) {
            throw new Error(`Tidak bisa membaca ${path}`);
          }
          return response.json();
        }),
      );
    }
    return cache.get(path);
  }

  function emptyState(title, message) {
    return `
      <div class="pp-empty">
        <span aria-hidden="true">◇</span>
        <h3>${esc(title)}</h3>
        <p>${esc(message)}</p>
      </div>
    `;
  }

  async function renderProfile(root) {
    const data = await readJSON("data/profile.json");
    const interests = Array.isArray(data.interests) ? data.interests : [];
    const socials = Array.isArray(data.socials) ? data.socials : [];
    const avatarURL = safeURL(data.avatar || "");

    root.innerHTML = `
      <section class="pp-app">
        <header class="pp-profile-hero">
          <div class="pp-avatar">
            ${
              avatarURL
                ? `<img src="${avatarURL}" alt="Foto profil ${esc(data.name)}">`
                : `<span>${esc((data.name || "N").trim().charAt(0))}</span>`
            }
          </div>

          <div class="pp-profile-copy">
            <span class="window-badge">PERSONAL PROFILE</span>
            <h2>${esc(data.name || "Your Name")}<span class="pp-accent">.</span></h2>
            ${
              data.headline
                ? `<p class="pp-headline">${esc(data.headline)}</p>`
                : ""
            }
            ${
              data.location
                ? `<p class="pp-muted">⌖ ${esc(data.location)}</p>`
                : ""
            }
          </div>
        </header>

        <section class="pp-section">
          <h3>About me</h3>
          ${
            data.bio
              ? `<p class="pp-body">${esc(data.bio)}</p>`
              : emptyState(
                  "A story still being written",
                  "Your introduction can be added to data/profile.json.",
                )
          }
        </section>
                
        <a
          class="download-cv"
          href="assets/documents/cv-ahnaf.pdf"
          download="CV-Ahnaf-Ogy-Pratista.pdf"
          aria-label="Download CV Ahnaf Ogy Pratista dalam format PDF"
        >
          <svg
            class="download-cv__icon"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 3v12m-5-5 5 5 5-5M5 17v3h14v-3"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Download CV</span>
        </a>


        ${
          interests.length
            ? `
          <section class="pp-section">
            <h3>Interests</h3>
            <div class="pp-tags">
              ${interests
                .map((item) => `<span class="pp-tag">${esc(item)}</span>`)
                .join("")}
            </div>
          </section>
        `
            : ""
        }

        <section class="pp-section">
          <h3>Find me online</h3>
          ${
            socials.length
              ? `
            <div class="pp-socials">
              ${socials
                .map((item) => {
                  const url = safeURL(item.url || "");
                  return url
                    ? `
                  <a class="pp-social-link"
                    href="${url}" target="_blank"
                    rel="noopener noreferrer">
                    ${esc(item.label || "Visit profile")} ↗
                  </a>
                `
                    : "";
                })
                .join("")}
            </div>
          `
              : emptyState(
                  "No links added yet",
                  "Add your public profile links to data/profile.json.",
                )
          }
        </section>
      </section>
    `;
  }

  async function renderProjects(root) {
    const data = await readJSON("data/projects.json");
    const projects = Array.isArray(data.projects) ? data.projects : [];
    const categories = Array.isArray(data.categories)
      ? data.categories
      : ["All"];

    root.innerHTML = `
      <section class="pp-app">
        <header class="pp-project-heading">
          <span class="window-badge">PROJECT COLLECTION</span>
          <h2>Selected Projects<span class="pp-accent">.</span></h2>
          <p>Ideas, experiments, and things built along the way.</p>
        </header>

        <div class="pp-toolbar">
          <input type="search" data-project-search
            placeholder="Search projects..."
            aria-label="Search projects">

          <select data-project-category aria-label="Filter projects">
            ${categories
              .map(
                (item) => `
              <option value="${esc(item)}">${esc(item)}</option>
            `,
              )
              .join("")}
          </select>
        </div>

        <p class="pp-count" data-project-count aria-live="polite"></p>
        <div class="pp-project-grid" data-project-results></div>
      </section>
    `;

    const results = root.querySelector("[data-project-results]");
    const search = root.querySelector("[data-project-search]");
    const category = root.querySelector("[data-project-category]");
    const count = root.querySelector("[data-project-count]");

    function render() {
      const query = search.value.trim().toLowerCase();
      const selected = category.value;

      const filtered = projects.filter((project) => {
        const text = [
          project.title,
          project.category,
          project.description,
          ...(Array.isArray(project.technologies) ? project.technologies : []),
        ]
          .join(" ")
          .toLowerCase();

        return (
          text.includes(query) &&
          (selected === "All" || project.category === selected)
        );
      });

      count.textContent = `${filtered.length} project${filtered.length === 1 ? "" : "s"}`;

      results.innerHTML = filtered.length
        ? filtered
            .map((project) => {
              const image = project.image ? safeURL(project.image) : "";
              const demo = project.demoUrl ? safeURL(project.demoUrl) : "";
              const source = project.sourceUrl
                ? safeURL(project.sourceUrl)
                : "";
              const technologies = Array.isArray(project.technologies)
                ? project.technologies
                : [];

              return `
              <article class="pp-project-card">
                ${
                  image
                    ? `
                  <div class="pp-project-image">
                    <img src="${image}"
                      alt="${esc(project.title || "Project preview")}"
                      loading="lazy">
                  </div>
                `
                    : `
                  <div class="pp-project-image pp-project-image-empty">
                    <span aria-hidden="true">✳</span>
                  </div>
                `
                }

                <div class="pp-project-content">
                  <div class="pp-project-meta">
                    <span class="pp-tag">${esc(project.category || "Other")}</span>
                    ${
                      project.status
                        ? `<span class="pp-status">${esc(project.status)}</span>`
                        : ""
                    }
                  </div>

                  <h3>${esc(project.title || "Untitled project")}</h3>
                  <p class="pp-body">
                    ${esc(project.description || "Description not added yet.")}
                  </p>

                  ${
                    technologies.length
                      ? `
                    <div class="pp-tags">
                      ${technologies
                        .map(
                          (tech) => `<span class="pp-tag">${esc(tech)}</span>`,
                        )
                        .join("")}
                    </div>
                  `
                      : ""
                  }

                  ${
                    demo || source
                      ? `
                    <div class="pp-project-links">
                      ${
                        demo
                          ? `<a href="${demo}" target="_blank"
                        rel="noopener noreferrer">Live demo ↗</a>`
                          : ""
                      }
                      ${
                        source
                          ? `<a href="${source}" target="_blank"
                        rel="noopener noreferrer">Source code ↗</a>`
                          : ""
                      }
                    </div>
                  `
                      : ""
                  }
                </div>
              </article>
            `;
            })
            .join("")
        : emptyState(
            query || selected !== "All"
              ? "No matching projects"
              : "The collection starts here",
            "Add your actual projects to data/projects.json to display them.",
          );
    }

    search.addEventListener("input", render);
    category.addEventListener("change", render);
    render();
  }

  const renderers = {
    profile: renderProfile,
    projects: renderProjects,
  };

  async function mount(root) {
    if (root.dataset.personalReady === "true") return;

    root.dataset.personalReady = "true";
    root.innerHTML = `<p class="pp-muted">Loading...</p>`;

    try {
      await renderers[root.dataset.personalApp](root);
    } catch (error) {
      console.error(error);
      root.dataset.personalReady = "false";
      root.innerHTML = `
        <div class="pp-empty">
          <h3>Unable to load this app</h3>
          <p>Check the JSON file and open the website using Live Server.</p>
          <button type="button" data-pp-retry>Try again</button>
        </div>
      `;
      root.querySelector("[data-pp-retry]").addEventListener("click", () => {
        mount(root);
      });
    }
  }

  function scan() {
    document.querySelectorAll("[data-personal-app]").forEach((root) => {
      const renderer = renderers[root.dataset.personalApp];
      if (renderer) mount(root);
    });
  }

  function start() {
    scan();
    new MutationObserver(scan).observe(document.body, {
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
