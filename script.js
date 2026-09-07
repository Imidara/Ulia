/* =========================================================
   ЮЛІЯ ЗАБІЯКА — GLOBAL SCRIPT
   =========================================================

   ЄДИНИЙ JS ДЛЯ ВСІХ СТОРІНОК:

   index.html
   pro-mene.html
   poeziya.html
   proza.html
   video.html
   knygy.html
   kontakty.html

   JSON:
   - poeziya.json
   - proza.json
   - video.json

   Основні функції:
   - light / dark / system theme
   - mobile navigation
   - page transitions
   - scroll reveal
   - scroll to top
   - poetry
   - poetry search
   - fuzzy search
   - keyboard layout correction
   - highlighting search matches
   - categories
   - hashtags
   - URL filters
   - poem modal
   - modal focus trap
   - favorite poems
   - prose
   - expandable prose cards
   - video
   - lazy loading
   - accessibility
   ========================================================= */

"use strict";


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let allPoems = [];
let allProse = [];
let allVideos = [];

let poetryState = {
  search: "",
  category: "all",
  tag: null
};

let proseState = {
  search: "",
  category: "all",
  tag: null
};

const FAVORITES_KEY = "yulia-zabiyaka-favorite-poems";
const PROSE_FAVORITES_KEY = "yulia-zabiyaka-favorite-prose";

let favoritePoems = new Set();
let favoriteProse = new Set();

let activeModal = null;
let modalPreviousFocus = null;


/* =========================================================
   JSON FETCH + CACHE (sessionStorage)

   - кешує відповіді у sessionStorage, щоб не тягнути
     ті самі JSON-файли повторно при переходах між сторінками
     в межах однієї сесії;
   - захищає від повторного паралельного завантаження
     того самого файлу (dedupe через Map з проміс-кешем).
   ========================================================= */

const JSON_CACHE_PREFIX = "yulia-zabiyaka-json:";

const jsonFetchPromises = new Map();

function readJSONCache(url) {

  try {

    const raw =
      sessionStorage.getItem(
        JSON_CACHE_PREFIX + url
      );

    return raw ? JSON.parse(raw) : null;

  } catch (error) {

    /* sessionStorage недоступний (приватний режим тощо) */
    return null;

  }

}

function writeJSONCache(url, data) {

  try {

    sessionStorage.setItem(
      JSON_CACHE_PREFIX + url,
      JSON.stringify(data)
    );

  } catch (error) {

    /* сховище переповнене або недоступне — не критично */

  }

}

function fetchJSONCached(url) {

  if (jsonFetchPromises.has(url)) {
    return jsonFetchPromises.get(url);
  }

  const promise = (async () => {

    const cached = readJSONCache(url);

    if (cached !== null) {
      return cached;
    }

    const response =
      await fetch(url, {
        cache: "no-store"
      });

    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }

    const data = await response.json();

    writeJSONCache(url, data);

    return data;

  })();

  jsonFetchPromises.set(url, promise);

  /* якщо запит впав — прибираємо з кешу, щоб можна було спробувати ще раз */
  promise.catch(() => {
    jsonFetchPromises.delete(url);
  });

  return promise;

}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  initFavorites();
  initProseFavorites();

  initTheme();
  initPageTransitions();
  initMobileMenu();
  initScrollReveal();
  initScrollToTop();
  initGlobalAccessibility();

  initPoetryPage();
  initProsePage();
  initVideoPage();

});


/* =========================================================
   FAVORITES
   ========================================================= */

function initFavorites() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          FAVORITES_KEY
        ) || "[]"
      );

    if (Array.isArray(saved)) {

      favoritePoems =
        new Set(
          saved.map(
            id => String(id)
          )
        );

    }

  } catch (error) {

    console.warn(
      "Не вдалося прочитати обрані твори:",
      error
    );

    favoritePoems =
      new Set();

  }

}


function saveFavorites() {

  try {

    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(
        Array.from(favoritePoems)
      )
    );

  } catch (error) {

    console.warn(
      "Не вдалося зберегти обрані твори:",
      error
    );

  }

}


function isFavorite(
  poemId
) {

  return favoritePoems.has(
    String(poemId)
  );

}


function toggleFavorite(
  poemId
) {

  const id =
    String(poemId);


  if (
    favoritePoems.has(id)
  ) {

    favoritePoems.delete(id);

  } else {

    favoritePoems.add(id);

  }


  saveFavorites();

  updateFavoriteButtons(
    id
  );


  if (
    poetryState.category ===
    "favorites"
  ) {

    renderPoetry();

  }

}


function updateFavoriteButtons(
  poemId
) {

  const id =
    String(poemId);

  const active =
    isFavorite(id);


  document
    .querySelectorAll(
      `[data-favorite-poem="${CSS.escape(id)}"]`
    )
    .forEach(button => {

      button.classList.toggle(
        "is-favorite",
        active
      );

      button.setAttribute(
        "aria-pressed",
        String(active)
      );

      button.setAttribute(
        "aria-label",
        active
          ? "Видалити з улюблених"
          : "Додати до улюблених"
      );

      button.setAttribute(
        "title",
        active
          ? "Видалити з улюблених"
          : "Додати до улюблених"
      );

      const icon =
        button.querySelector(
          ".favorite-icon"
        );

      if (icon) {

        icon.textContent =
          active
            ? "♥"
            : "♡";

      }

    });

}


/* =========================================================
   FAVORITES — PROSE
   ========================================================= */

function initProseFavorites() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          PROSE_FAVORITES_KEY
        ) || "[]"
      );

    if (Array.isArray(saved)) {

      favoriteProse =
        new Set(
          saved.map(
            id => String(id)
          )
        );

    }

  } catch (error) {

    console.warn(
      "Не вдалося прочитати обрані оповідання:",
      error
    );

    favoriteProse =
      new Set();

  }

}


function saveProseFavorites() {

  try {

    localStorage.setItem(
      PROSE_FAVORITES_KEY,
      JSON.stringify(
        Array.from(favoriteProse)
      )
    );

  } catch (error) {

    console.warn(
      "Не вдалося зберегти обрані оповідання:",
      error
    );

  }

}


function isProseFavorite(
  proseId
) {

  return favoriteProse.has(
    String(proseId)
  );

}


function toggleProseFavorite(
  proseId
) {

  const id =
    String(proseId);


  if (
    favoriteProse.has(id)
  ) {

    favoriteProse.delete(id);

  } else {

    favoriteProse.add(id);

  }


  saveProseFavorites();

  updateProseFavoriteButtons(
    id
  );


  if (
    proseState.category ===
    "favorites"
  ) {

    renderProse();

  }

}


function updateProseFavoriteButtons(
  proseId
) {

  const id =
    String(proseId);

  const active =
    isProseFavorite(id);


  document
    .querySelectorAll(
      `[data-favorite-prose="${CSS.escape(id)}"]`
    )
    .forEach(button => {

      button.classList.toggle(
        "is-favorite",
        active
      );

      button.setAttribute(
        "aria-pressed",
        String(active)
      );

      button.setAttribute(
        "aria-label",
        active
          ? "Видалити з улюблених"
          : "Додати до улюблених"
      );

      button.setAttribute(
        "title",
        active
          ? "Видалити з улюблених"
          : "Додати до улюблених"
      );

      const icon =
        button.querySelector(
          ".favorite-icon"
        );

      if (icon) {

        icon.textContent =
          active
            ? "♥"
            : "♡";

      }

    });

}


/* =========================================================
   THEME
   ========================================================= */

function initTheme() {

  const themeToggle =
    document.getElementById(
      "themeToggle"
    );

  const savedTheme =
    localStorage.getItem(
      "theme"
    );


  const systemDark =
    window.matchMedia &&
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;


  let theme =
    savedTheme === "dark" ||
    savedTheme === "light"
      ? savedTheme
      : systemDark
        ? "dark"
        : "light";


  applyTheme(
    theme,
    false
  );


  if (!themeToggle) {
    return;
  }


  themeToggle.addEventListener(
    "click",
    () => {

      const current =
        document.documentElement
          .getAttribute(
            "data-theme"
          ) || "light";


      const next =
        current === "dark"
          ? "light"
          : "dark";


      applyTheme(
        next,
        true
      );


      localStorage.setItem(
        "theme",
        next
      );

    }
  );


  if (
    window.matchMedia
  ) {

    const media =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );


    const handleSystemTheme =
      event => {

        if (
          localStorage.getItem(
            "theme"
          )
        ) {
          return;
        }


        applyTheme(
          event.matches
            ? "dark"
            : "light",
          true
        );

      };


    if (
      typeof media.addEventListener ===
      "function"
    ) {

      media.addEventListener(
        "change",
        handleSystemTheme
      );

    } else if (
      typeof media.addListener ===
      "function"
    ) {

      media.addListener(
        handleSystemTheme
      );

    }

  }

}


function applyTheme(
  theme,
  animate = true
) {

  const root =
    document.documentElement;


  if (animate) {

    root.classList.add(
      "theme-changing"
    );

    window.setTimeout(
      () => {

        root.classList.remove(
          "theme-changing"
        );

      },
      350
    );

  }


  root.setAttribute(
    "data-theme",
    theme
  );


  const themeToggle =
    document.getElementById(
      "themeToggle"
    );


  if (!themeToggle) {
    return;
  }


  const isDark =
    theme === "dark";


  themeToggle.setAttribute(
    "aria-label",
    isDark
      ? "Увімкнути світлу тему"
      : "Увімкнути темну тему"
  );


  themeToggle.setAttribute(
    "title",
    isDark
      ? "Світла тема"
      : "Темна тема"
  );


  themeToggle.setAttribute(
    "aria-pressed",
    String(isDark)
  );

}


/* =========================================================
   PAGE TRANSITIONS
   ========================================================= */

function initPageTransitions() {

  const body =
    document.body;


  requestAnimationFrame(
    () => {

      body.classList.add(
        "page-ready"
      );

    }
  );


  document.addEventListener(
    "click",
    event => {

      const link =
        event.target.closest("a");


      if (!link) {
        return;
      }


      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }


      if (
        event.button !== undefined &&
        event.button !== 0
      ) {
        return;
      }


      if (
        link.target === "_blank" ||
        link.hasAttribute("download")
      ) {
        return;
      }


      const href =
        link.getAttribute("href");


      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }


      let url;

      try {

        url =
          new URL(
            href,
            window.location.href
          );

      } catch {

        return;

      }


      if (
        url.origin !==
        window.location.origin
      ) {
        return;
      }


      if (
        url.pathname ===
          window.location.pathname &&
        url.search ===
          window.location.search
      ) {
        return;
      }


      event.preventDefault();


      body.classList.add(
        "page-leaving"
      );


      setTimeout(
        () => {

          window.location.href =
            url.href;

        },
        220
      );

    }
  );


  window.addEventListener(
    "pageshow",
    () => {

      body.classList.remove(
        "page-leaving"
      );

      body.classList.add(
        "page-ready"
      );

    }
  );

}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function initMobileMenu() {

  const navToggle =
    document.getElementById(
      "navToggle"
    );

  const mainNav =
    document.getElementById(
      "mainNav"
    );


  if (
    !navToggle ||
    !mainNav
  ) {
    return;
  }


  navToggle.setAttribute(
    "aria-expanded",
    "false"
  );


  navToggle.addEventListener(
    "click",
    () => {

      const isOpen =
        !mainNav.classList.contains(
          "is-open"
        );


      setMobileMenuState(
        isOpen
      );

    }
  );


  mainNav
    .querySelectorAll("a")
    .forEach(link => {

      link.addEventListener(
        "click",
        () => {

          setMobileMenuState(
            false
          );

        }
      );

    });


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape" &&
        mainNav.classList.contains(
          "is-open"
        )
      ) {

        setMobileMenuState(
          false
        );

        navToggle.focus();

      }

    }
  );


  window.addEventListener(
    "resize",
    debounce(
      () => {

        if (
          window.innerWidth > 820
        ) {

          setMobileMenuState(
            false
          );

        }

      },
      100
    )
  );


  function setMobileMenuState(
    isOpen
  ) {

    navToggle.classList.toggle(
      "is-open",
      isOpen
    );

    mainNav.classList.toggle(
      "is-open",
      isOpen
    );

    document.body.classList.toggle(
      "menu-open",
      isOpen
    );


    navToggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );


    navToggle.setAttribute(
      "aria-label",
      isOpen
        ? "Закрити меню"
        : "Відкрити меню"
    );


    if (isOpen) {

      document.body.classList.add(
        "nav-open"
      );

    } else {

      document.body.classList.remove(
        "nav-open"
      );

    }

  }

}


/* =========================================================
   SCROLL REVEAL
   ========================================================= */

function initScrollReveal() {

  const items =
    document.querySelectorAll(
      ".reveal"
    );


  if (!items.length) {
    return;
  }


  const reducedMotion =
    window.matchMedia &&
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;


  if (
    reducedMotion ||
    !("IntersectionObserver" in window)
  ) {

    items.forEach(
      item =>
        item.classList.add(
          "in-view"
        )
    );

    return;

  }


  const observer =
    new IntersectionObserver(
      entries => {

        entries.forEach(
          entry => {

            if (
              entry.isIntersecting
            ) {

              entry.target.classList.add(
                "in-view"
              );

              observer.unobserve(
                entry.target
              );

            }

          }
        );

      },
      {
        threshold: 0.08,
        rootMargin:
          "0px 0px -40px 0px"
      }
    );


  items.forEach(
    item =>
      observer.observe(item)
  );

}


/* =========================================================
   SCROLL TO TOP
   ========================================================= */

function initScrollToTop() {

  const button =
    document.getElementById(
      "toTop"
    );


  if (!button) {
    return;
  }


  function updateButton() {

    button.classList.toggle(
      "show",
      window.scrollY > 500
    );

  }


  window.addEventListener(
    "scroll",
    updateButton,
    {
      passive: true
    }
  );


  updateButton();


  button.addEventListener(
    "click",
    () => {

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }
  );

}


/* =========================================================
   POETRY
   ========================================================= */

function initPoetryPage() {

  const needsPoems =
    document.getElementById(
      "featuredPoem"
    ) ||
    document.getElementById(
      "poetryList"
    );


  if (!needsPoems) {
    return;
  }


  loadPoems();

}


async function loadPoems() {

  try {

    /*
      ВАЖНО:
      Используем именно poeziya.json.
      poems.json НЕ используется.
    */

    const data =
      await fetchJSONCached(
        "poeziya.json"
      );


    if (
      !Array.isArray(data)
    ) {

      throw new Error(
        "poeziya.json має містити масив."
      );

    }


    allPoems =
      data
        .filter(isValidPoem)
        .map(normalizePoem);


    renderFeaturedPoem();
    initPoetryCatalog();


  } catch (error) {

    console.error(
      "Помилка завантаження poeziya.json:",
      error
    );

    showPoemsLoadError();

  }

}


function isValidPoem(
  poem
) {

  return Boolean(
    poem &&
    typeof poem === "object" &&
    poem.id &&
    poem.title &&
    poem.text
  );

}


function normalizePoem(
  poem
) {

  return {

    id:
      String(poem.id),

    title:
      String(poem.title),

    category:
      poem.category
        ? String(poem.category)
        : "other",

    tags:
      Array.isArray(poem.tags)
        ? poem.tags.map(
            tag => String(tag)
          )
        : [],

    text:
      String(poem.text),

    description:
      String(
        poem.description || ""
      )

  };

}


/* =========================================================
   CATEGORY LABELS
   ========================================================= */

const CATEGORY_LABELS = {

  dytiacha:
    "Для дітей",

  liryka:
    "Лірика для дорослих",

  hrystyianska:
    "Християнська поезія",

  other:
    "Поезія"

};


function getCategoryLabel(
  category
) {

  /*
    Ніколи не показуємо "dytiacha"
    як англомовний технічний код.
  */

  return (
    CATEGORY_LABELS[
      String(category)
        .toLowerCase()
    ] ||
    "Поезія"
  );

}


/* =========================================================
   POEM OF THE DAY
   ========================================================= */

/*
  Псевдовипадкове перемішування (mulberry32),
  стабільне для однакового seed —
  тобто однакове для всіх відвідувачів
  в один і той самий день.
*/

function mulberrySeededRandom(
  seed
) {

  let state =
    seed | 0;


  return function () {

    state =
      (state + 0x6D2B79F5) | 0;

    let result =
      Math.imul(
        state ^ (state >>> 15),
        1 | state
      );

    result =
      (
        result +
        Math.imul(
          result ^ (result >>> 7),
          61 | result
        )
      ) ^ result;

    return (
      (result ^ (result >>> 14)) >>> 0
    ) / 4294967296;

  };

}


function getShuffledOrder(
  length,
  seed
) {

  const indices =
    Array.from(
      { length },
      (item, index) => index
    );


  const random =
    mulberrySeededRandom(
      seed
    );


  for (
    let i = indices.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        random() * (i + 1)
      );

    [
      indices[i],
      indices[j]
    ] = [
      indices[j],
      indices[i]
    ];

  }


  return indices;

}


function getPoemOfTheDay(
  poems
) {

  if (!poems.length) {
    return null;
  }


  const startDate =
    new Date(
      2026,
      7,
      24
    );


  startDate.setHours(
    0,
    0,
    0,
    0
  );


  const today =
    new Date();


  today.setHours(
    0,
    0,
    0,
    0
  );


  const dayNumber =
    Math.floor(
      (
        today -
        startDate
      ) /
      86400000
    );


  const length =
    poems.length;


  /*
    Один "цикл" = length днів.
    У межах циклу кожен вірш
    показується рівно один раз,
    але порядок у циклі —
    перетасований і різний
    для кожного циклу.
  */

  const cycle =
    Math.floor(
      dayNumber / length
    );

  const positionInCycle =
    (
      (dayNumber % length) +
      length
    ) %
    length;

  const order =
    getShuffledOrder(
      length,
      cycle
    );

  const index =
    order[positionInCycle];


  return poems[index];

}


/* =========================================================
   FEATURED POEM
   ========================================================= */

function renderFeaturedPoem() {

  const container =
    document.getElementById(
      "featuredPoem"
    );


  if (!container) {
    return;
  }


  const poem =
    getPoemOfTheDay(
      allPoems
    );


  if (!poem) {

    container.innerHTML = `
      <div class="poem-error">
        <p class="poem-eyebrow">
          Вірш дня
        </p>
        <p>
          Поки що немає доступних творів.
        </p>
      </div>
    `;

    return;

  }


  const excerpt =
    getPoemExcerpt(
      poem.text,
      900
    );


  container.innerHTML = `

    <p class="poem-eyebrow">
      Вірш дня
    </p>

    <p class="poem-title">
      «${escapeHTML(poem.title)}»
    </p>

    <p class="poem-text">
      ${highlightText(
        excerpt,
        poetryState.search
      )}
    </p>

    <div class="poem-tags">
      ${poem.tags
        .map(
          tag => `
            <span class="tag">
              #${escapeHTML(tag)}
            </span>
          `
        )
        .join("")}
    </div>

    <div class="poem-actions">

      <button
        type="button"
        class="favorite-button${
          isFavorite(poem.id) ? " is-favorite" : ""
        }"
        data-favorite-poem="${escapeAttribute(
          poem.id
        )}"
        aria-pressed="${isFavorite(
          poem.id
        )}"
        aria-label="${
          isFavorite(poem.id)
            ? "Видалити з улюблених"
            : "Додати до улюблених"
        }"
        title="${
          isFavorite(poem.id)
            ? "Видалити з улюблених"
            : "Додати до улюблених"
        }"
      >
        <span
          class="favorite-icon"
          aria-hidden="true"
        >
          ${isFavorite(poem.id) ? "♥" : "♡"}
        </span>
      </button>

      <a
        class="poem-more"
        href="/poeziya/${encodeURIComponent(
          poem.id
        )}"
      >
        Читати повністю →
      </a>

    </div>

  `;


  bindFavoriteButtons(
    container
  );


  requestAnimationFrame(
    () =>
      container.classList.add(
        "poem-loaded"
      )
  );

}


/* =========================================================
   POETRY CATALOG
   ========================================================= */

function initPoetryCatalog() {

  const list =
    document.getElementById(
      "poetryList"
    );


  if (!list) {
    return;
  }


  readPoetryURLParams();

  initPoetrySearch();
  initCategoryFilters();

  renderPoetryTags();
  renderPoetry();


  const params =
    new URLSearchParams(
      window.location.search
    );


  const poemId =
    params.get("poem");


  if (poemId) {

    openPoemFromURL(
      poemId
    );

  }

}


/* =========================================================
   POETRY URL PARAMETERS
   ========================================================= */

function readPoetryURLParams() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const category =
    params.get("category");

  const tag =
    params.get("tag");


  if (
    category &&
    [
      "all",
      "dytiacha",
      "liryka",
      "hrystyianska",
      "other",
      "favorites"
    ].includes(category)
  ) {

    poetryState.category =
      category;

  }


  if (tag) {

    poetryState.tag =
      tag;

  }


  updateActiveCategory();

}


/* =========================================================
   SEARCH
   ========================================================= */

function initPoetrySearch() {

  const input =
    document.getElementById(
      "poetrySearch"
    );


  const clearButton =
    document.getElementById(
      "clearPoetrySearch"
    );


  if (!input) {
    return;
  }


  input.value =
    poetryState.search;


  input.setAttribute(
    "autocomplete",
    "off"
  );


  input.addEventListener(
    "input",
    debounce(
      () => {

        poetryState.search =
          input.value.trim();

        poetryState.tag =
          null;

        updateActiveTags();
        updateClearButton();

        renderPoetry();

      },
      100
    )
  );


  if (clearButton) {

    clearButton.addEventListener(
      "click",
      () => {

        input.value = "";

        poetryState.search = "";

        updateClearButton();
        renderPoetry();

        input.focus();

      }
    );

  }


  updateClearButton();

}


/* =========================================================
   CLEAR SEARCH
   ========================================================= */

function updateClearButton() {

  const button =
    document.getElementById(
      "clearPoetrySearch"
    );


  if (!button) {
    return;
  }


  button.hidden =
    poetryState.search.length === 0;

}


/* =========================================================
   CATEGORY FILTERS
   ========================================================= */

function initCategoryFilters() {

  const buttons =
    document.querySelectorAll(
      ".filter-button"
    );


  buttons.forEach(
    button => {

      if (
        button.dataset.category ===
        "dytiacha"
      ) {

        /*
          Сам data-category залишається,
          бо це технічний ID.
          Але текст кнопки замінюємо.
        */

        const visibleText =
          button.textContent
            .trim()
            .toLowerCase();


        if (
          visibleText ===
          "dytiacha"
        ) {

          button.textContent =
            "Для дітей";

        }

      }


      button.addEventListener(
        "click",
        () => {

          poetryState.category =
            button.dataset.category ||
            "all";

          poetryState.tag =
            null;

          updateActiveCategory();
          updateActiveTags();
          renderPoetry();
          updatePoetryURL();

        }
      );

    }
  );


  updateActiveCategory();

}


/* =========================================================
   ACTIVE CATEGORY
   ========================================================= */

function updateActiveCategory() {

  document
    .querySelectorAll(
      ".filter-button"
    )
    .forEach(
      button => {

        button.classList.toggle(
          "active",
          button.dataset.category ===
            poetryState.category
        );


        if (
          button.dataset.category ===
          "dytiacha"
        ) {

          const text =
            button.textContent
              .trim()
              .toLowerCase();


          if (
            text === "dytiacha"
          ) {

            button.textContent =
              "Для дітей";

          }

        }

      }
    );

}


/* =========================================================
   TAG CLOUD TOGGLE (згорнути / розгорнути хештеги)
   Спільна для сторінок поезії та прози, для мобільної
   і звичайної версії — просто обмежуємо висоту контейнера
   з тегами та додаємо кнопку "Показати всі / Згорнути".
   ========================================================= */

function setupTagCloudToggle(
  container
) {

  if (!container) {
    return;
  }


  const existingToggle =
    container.nextElementSibling;

  if (
    existingToggle &&
    existingToggle.classList.contains(
      "tag-cloud-toggle"
    )
  ) {

    existingToggle.remove();

  }


  container.classList.add(
    "tag-cloud"
  );

  container.classList.remove(
    "tag-cloud-collapsed"
  );


  const COLLAPSED_HEIGHT = 92;

  const fullHeight =
    container.scrollHeight;


  if (
    fullHeight <=
    COLLAPSED_HEIGHT + 10
  ) {

    /*
      Хештегів мало, вони й так
      вміщаються в два рядки —
      кнопка "показати ще" не потрібна.
    */

    return;

  }


  container.classList.add(
    "tag-cloud-collapsed"
  );


  const toggle =
    document.createElement(
      "button"
    );

  toggle.type = "button";

  toggle.className =
    "tag-cloud-toggle";

  toggle.setAttribute(
    "aria-expanded",
    "false"
  );

  toggle.textContent =
    "Показати всі хештеги ↓";


  toggle.addEventListener(
    "click",
    () => {

      const collapsedNow =
        container.classList.toggle(
          "tag-cloud-collapsed"
        );

      toggle.setAttribute(
        "aria-expanded",
        String(!collapsedNow)
      );

      toggle.textContent =
        collapsedNow
          ? "Показати всі хештеги ↓"
          : "Згорнути хештеги ↑";

    }
  );


  container.insertAdjacentElement(
    "afterend",
    toggle
  );

}


/* =========================================================
   POETRY TAGS
   ========================================================= */

function renderPoetryTags() {

  const container =
    document.getElementById(
      "poetryTags"
    );


  if (!container) {
    return;
  }


  const tagMap =
    new Map();


  allPoems.forEach(
    poem => {

      poem.tags.forEach(
        tag => {

          const normalized =
            normalizeSearchValue(
              tag
            );


          if (
            !normalized ||
            tagMap.has(normalized)
          ) {
            return;
          }


          tagMap.set(
            normalized,
            tag
          );

        }
      );

    }
  );


  const tags =
    Array.from(
      tagMap.values()
    ).sort(
      (a, b) =>
        a.localeCompare(
          b,
          "uk"
        )
    );


  container.innerHTML =
    tags
      .map(
        tag => `

          <button
            type="button"
            class="filter-tag"
            data-tag="${escapeAttribute(tag)}"
          >
            #${escapeHTML(tag)}
          </button>

        `
      )
      .join("");


  container
    .querySelectorAll(
      ".filter-tag"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const tag =
              button.dataset.tag;


            poetryState.tag =
              poetryState.tag === tag
                ? null
                : tag;


            poetryState.search = "";


            const input =
              document.getElementById(
                "poetrySearch"
              );


            if (input) {
              input.value = "";
            }


            updateClearButton();
            updateActiveTags();
            renderPoetry();
            updatePoetryURL();

          }
        );

      }
    );


  updateActiveTags();

  setupTagCloudToggle(
    container
  );

}


/* =========================================================
   ACTIVE TAGS
   ========================================================= */

function updateActiveTags() {

  document
    .querySelectorAll(
      ".filter-tag"
    )
    .forEach(
      button => {

        button.classList.toggle(
          "active",
          poetryState.tag ===
            button.dataset.tag
        );

      }
    );

}


/* =========================================================
   SEARCH ENGINE
   ========================================================= */

function getFilteredPoems() {

  const search =
    normalizeSearchValue(
      poetryState.search
    );


  return allPoems.filter(
    poem => {

      if (
        poetryState.category ===
        "favorites"
      ) {

        if (!isFavorite(poem.id)) {
          return false;
        }

      } else if (
        poetryState.category !==
        "all" &&
        poem.category !==
        poetryState.category
      ) {

        return false;

      }


      if (
        poetryState.tag
      ) {

        const hasTag =
          poem.tags.some(
            tag =>
              normalizeSearchValue(
                tag
              ) ===
              normalizeSearchValue(
                poetryState.tag
              )
          );


        if (!hasTag) {
          return false;
        }

      }


      if (!search) {
        return true;
      }


      const fields = [
        poem.title,
        poem.text,
        poem.category,
        getCategoryLabel(
          poem.category
        ),
        ...poem.tags
      ];


      return fields.some(
        field =>
          fuzzyIncludes(
            field,
            search
          )
      );

    }
  );

}


/* =========================================================
   RENDER POETRY
   ========================================================= */

function renderPoetry() {

  const list =
    document.getElementById(
      "poetryList"
    );


  const empty =
    document.getElementById(
      "poetryEmpty"
    );


  const count =
    document.getElementById(
      "poetryResultsCount"
    );


  if (!list) {
    return;
  }


  const poems =
    getFilteredPoems();


  if (count) {

    count.textContent =
      getResultsText(
        poems.length
      );

  }


  if (!poems.length) {

    list.innerHTML = "";


    if (empty) {
      empty.hidden = false;
    }


    return;

  }


  if (empty) {
    empty.hidden = true;
  }


  list.innerHTML =
    poems
      .map(
        poem =>
          createPoemCard(
            poem
          )
      )
      .join("");


  bindPoetryCards(
    list
  );

}


/* =========================================================
   CREATE POEM CARD
   ========================================================= */

function createPoemCard(
  poem
) {

  const search =
    poetryState.search;


  const excerpt =
    getPoemExcerpt(
      poem.text,
      420
    );


  const favorite =
    isFavorite(
      poem.id
    );


  return `

    <article
      class="poetry-card reveal in-view"
      data-poem-id="${escapeAttribute(
        poem.id
      )}"
      tabindex="0"
      aria-label="Вірш «${escapeAttribute(
        poem.title
      )}»"
    >

      <div class="stitch-divider thin"></div>

      <div class="poetry-card-top">

        <p class="poetry-card-category">
          ${escapeHTML(
            getCategoryLabel(
              poem.category
            )
          )}
        </p>

        <button
          type="button"
          class="favorite-button${
            favorite ? " is-favorite" : ""
          }"
          data-favorite-poem="${escapeAttribute(
            poem.id
          )}"
          aria-pressed="${favorite}"
          aria-label="${
            favorite
              ? "Видалити з улюблених"
              : "Додати до улюблених"
          }"
          title="${
            favorite
              ? "Видалити з улюблених"
              : "Додати до улюблених"
          }"
        >
          <span
            class="favorite-icon"
            aria-hidden="true"
          >
            ${favorite ? "♥" : "♡"}
          </span>
        </button>

      </div>

      <h3>
        ${highlightText(
          poem.title,
          search
        )}
      </h3>

      <p class="poetry-card-text">
        ${highlightText(
          excerpt,
          search
        )}
      </p>

      ${
        poem.description
          ? `
            <p class="poetry-card-description">
              ${highlightText(
                poem.description,
                search
              )}
            </p>
          `
          : ""
      }

      <div class="poetry-card-footer">

        <a
          class="poetry-card-link"
          href="/poeziya/${encodeURIComponent(
            poem.id
          )}"
        >
          Читати →
        </a>

      </div>

      <div
        class="related-by-tag"
        data-owner-id="${escapeAttribute(
          poem.id
        )}"
        data-owner-kind="poeziya"
      ></div>

    </article>

  `;

}


/* =========================================================
   BIND POETRY CARDS
   ========================================================= */

/* =========================================================
   ПОВ'ЯЗАНІ ТВОРИ ЗА ХЕШТЕГОМ
   (клікабельні теги в картках поезії та прози)
   ========================================================= */

let combinedWorksForTagsPromise = null;

function loadCombinedWorksForTags() {

  if (combinedWorksForTagsPromise) {
    return combinedWorksForTagsPromise;
  }

  combinedWorksForTagsPromise = Promise.all([
    fetchJSONCached("poeziya.json"),
    fetchJSONCached("proza.json")
  ]).then(
    ([poemsData, proseData]) => {

      const poemsList =
        (Array.isArray(poemsData) ? poemsData : [])
          .filter(isValidPoem)
          .map(item => ({
            id: String(item.id),
            title: String(item.title),
            tags:
              Array.isArray(item.tags)
                ? item.tags.map(tag => String(tag))
                : [],
            kind: "poeziya"
          }));

      const proseList =
        (Array.isArray(proseData) ? proseData : [])
          .filter(isValidProse)
          .map(item => ({
            id: String(item.id),
            title: String(item.title),
            tags:
              Array.isArray(item.tags)
                ? item.tags.map(tag => String(tag))
                : [],
            kind: "proza"
          }));

      return poemsList.concat(proseList);

    }
  );

  return combinedWorksForTagsPromise;

}


function shuffleArray(
  array
) {

  const result =
    array.slice();

  for (
    let i = result.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [result[i], result[j]] =
      [result[j], result[i]];

  }

  return result;

}


function findRelatedByAnyTag(
  works,
  tags,
  excludeId,
  excludeKind
) {

  const normalizedTags =
    tags.map(normalizeSearchValue);

  return works.filter(
    work => {

      if (
        work.id === excludeId &&
        work.kind === excludeKind
      ) {
        return false;
      }

      return work.tags.some(
        t =>
          normalizedTags.includes(
            normalizeSearchValue(t)
          )
      );

    }
  );

}


function renderRelatedByTag(
  container,
  works,
  ownTags,
  ownerId,
  ownerKind,
  activeTag,
  matches,
  shownCount,
  allLink
) {

  const tagsHTML =
    ownTags
      .map(
        tag => `
          <button
            type="button"
            class="tag related-by-tag-tag${
              activeTag === tag ? " active" : ""
            }"
            data-tag="${escapeAttribute(tag)}"
          >
            #${escapeHTML(tag)}
          </button>
        `
      )
      .join("");

  const allLinkHTML =
    allLink
      ? `
        <a
          class="related-by-tag-all-link"
          href="${escapeAttribute(allLink.href)}"
        >
          ${escapeHTML(allLink.label)}
        </a>
      `
      : "";

  const headHTML = `
    <div class="related-by-tag-head">
      <p class="related-by-tag-title">
        Читати більше за темою:
      </p>
      ${allLinkHTML}
    </div>
    <div class="related-by-tag-tags">
      ${tagsHTML}
    </div>
  `;

  const rerenderWithTag = (
    nextActiveTag
  ) => {

    /*
      При зміні тегу (або скиданні фільтра)
      перемішуємо заново - щоб під різними
      творами показувались різні приклади,
      а не завжди одні й ті самі перші
      за списком збіги.
    */

    const freshMatches =
      shuffleArray(
        findRelatedByAnyTag(
          works,
          nextActiveTag
            ? [nextActiveTag]
            : ownTags,
          ownerId,
          ownerKind
        )
      );

    renderRelatedByTag(
      container,
      works,
      ownTags,
      ownerId,
      ownerKind,
      nextActiveTag,
      freshMatches,
      3,
      allLink
    );

  };

  const bindTagButtons = () => {

    container
      .querySelectorAll(
        ".related-by-tag-tag"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              const clickedTag =
                button.dataset.tag;

              const nextActiveTag =
                activeTag === clickedTag
                  ? null
                  : clickedTag;

              rerenderWithTag(
                nextActiveTag
              );

            }
          );

        }
      );

  };

  if (!matches.length) {

    container.innerHTML = `
      ${headHTML}
      <p class="related-by-tag-empty">
        Інших творів за цією темою поки немає.
      </p>
    `;

    bindTagButtons();

    return;

  }

  const visible =
    matches.slice(0, shownCount);

  const itemsHTML =
    visible
      .map(
        work => `
          <a
            class="related-by-tag-item"
            href="${
              work.kind === "poeziya"
                ? `/poeziya/${encodeURIComponent(work.id)}`
                : `/proza/${encodeURIComponent(work.id)}`
            }"
          >
            ${escapeHTML(work.title)}
          </a>
        `
      )
      .join("");

  const moreHTML =
    matches.length > shownCount
      ? `
        <button
          type="button"
          class="related-by-tag-more"
        >
          Показати ще
        </button>
      `
      : "";

  container.innerHTML = `
    ${headHTML}
    <div class="related-by-tag-list">
      ${itemsHTML}
    </div>
    ${moreHTML}
  `;

  bindTagButtons();

  const moreButton =
    container.querySelector(
      ".related-by-tag-more"
    );

  if (moreButton) {

    moreButton.addEventListener(
      "click",
      () => {

        renderRelatedByTag(
          container,
          works,
          ownTags,
          ownerId,
          ownerKind,
          activeTag,
          matches,
          shownCount + 3,
          allLink
        );

      }
    );

  }

}


function initRelatedByTagBoxes(
  container
) {

  const boxes =
    container.querySelectorAll(
      ".related-by-tag"
    );

  if (!boxes.length) {
    return;
  }

  boxes.forEach(
    box => {

      box.innerHTML = `
        <p class="related-by-tag-loading">
          Завантаження…
        </p>
      `;

    }
  );

  loadCombinedWorksForTags().then(
    works => {

      boxes.forEach(
        box => {

          const ownerId =
            box.dataset.ownerId;

          const ownerKind =
            box.dataset.ownerKind;

          const owner =
            works.find(
              work =>
                work.id === ownerId &&
                work.kind === ownerKind
            );

          const ownTags =
            owner ? owner.tags : [];

          if (!ownTags.length) {
            box.innerHTML = "";
            return;
          }

          const allLinkHref =
            box.dataset.allLinkHref;

          const allLink =
            allLinkHref
              ? {
                  href: allLinkHref,
                  label:
                    box.dataset.allLinkLabel ||
                    "Уся творчість →"
                }
              : null;

          const matches =
            shuffleArray(
              findRelatedByAnyTag(
                works,
                ownTags,
                ownerId,
                ownerKind
              )
            );

          renderRelatedByTag(
            box,
            works,
            ownTags,
            ownerId,
            ownerKind,
            null,
            matches,
            3,
            allLink
          );

        }
      );

    }
  );

}


function bindPoetryCards(
  container
) {

  bindFavoriteButtons(
    container
  );

  initRelatedByTagBoxes(
    container
  );


  container
    .querySelectorAll(
      ".poetry-card"
    )
    .forEach(
      card => {

        card.addEventListener(
          "click",
          event => {

            if (
              event.target.closest(
                "a, button"
              )
            ) {
              return;
            }


            const id =
              card.dataset.poemId;


            if (id) {

              window.location.href =
                "/poeziya/" +
                encodeURIComponent(
                  id
                );

            }

          }
        );


        card.addEventListener(
          "keydown",
          event => {

            if (
              event.key !== "Enter" &&
              event.key !== " "
            ) {
              return;
            }


            if (
              event.target.closest(
                "a, button"
              )
            ) {
              return;
            }


            event.preventDefault();


            const id =
              card.dataset.poemId;


            if (id) {

              window.location.href =
                "/poeziya/" +
                encodeURIComponent(
                  id
                );

            }

          }
        );

      }
    );

}


/* =========================================================
   FAVORITE BUTTONS
   ========================================================= */

function bindFavoriteButtons(
  container
) {

  container
    .querySelectorAll(
      "[data-favorite-poem]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          event => {

            event.stopPropagation();


            toggleFavorite(
              button.dataset.favoritePoem
            );

          }
        );

      }
    );

}


function bindProseFavoriteButtons(
  container
) {

  container
    .querySelectorAll(
      "[data-favorite-prose]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          event => {

            event.stopPropagation();


            toggleProseFavorite(
              button.dataset.favoriteProse
            );

          }
        );

      }
    );

}


/* =========================================================
   RESULTS TEXT
   ========================================================= */

function getResultsText(
  number
) {

  if (
    number === 0
  ) {

    return "Нічого не знайдено";

  }


  if (
    number % 10 === 1 &&
    number % 100 !== 11
  ) {

    return `Знайдено: ${number} твір`;

  }


  if (
    number >= 2 &&
    number <= 4
  ) {

    return `Знайдено: ${number} твори`;

  }


  return `Знайдено: ${number} творів`;

}


/* =========================================================
   RESET POETRY
   ========================================================= */

document.addEventListener(
  "click",
  event => {

    const reset =
      event.target.closest(
        "#resetPoetryFilters"
      );


    if (!reset) {
      return;
    }


    poetryState = {
      search: "",
      category: "all",
      tag: null
    };


    const input =
      document.getElementById(
        "poetrySearch"
      );


    if (input) {
      input.value = "";
    }


    updateClearButton();
    updateActiveCategory();
    updateActiveTags();
    renderPoetry();
    updatePoetryURL();

  }
);


/* =========================================================
   POETRY URL
   ========================================================= */

function updatePoetryURL() {

  const url =
    new URL(
      window.location.href
    );


  url.searchParams.delete(
    "category"
  );

  url.searchParams.delete(
    "tag"
  );


  if (
    poetryState.category !==
    "all"
  ) {

    url.searchParams.set(
      "category",
      poetryState.category
    );

  }


  if (
    poetryState.tag
  ) {

    url.searchParams.set(
      "tag",
      poetryState.tag
    );

  }


  history.replaceState(
    {},
    "",
    url
  );

}


/* =========================================================
   OPEN POEM FROM URL
   ========================================================= */

function openPoemFromURL(
  id
) {

  const poem =
    allPoems.find(
      item =>
        item.id ===
        String(id)
    );


  if (!poem) {
    return;
  }


  const card =
    document.querySelector(
      `[data-poem-id="${CSS.escape(
        String(id)
      )}"]`
    );


  if (!card) {
    return;
  }


  setTimeout(
    () => {

      card.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });


      card.focus({
        preventScroll: true
      });


      openPoem(
        poem.id
      );

    },
    250
  );

}


/* =========================================================
   POEM MODAL
   ========================================================= */

function openPoem(
  id
) {

  const poem =
    allPoems.find(
      item =>
        item.id ===
        String(id)
    );


  if (!poem) {
    return;
  }


  showPoemModal(
    poem
  );

}


function showPoemModal(
  poem
) {

  closeActiveModal();


  modalPreviousFocus =
    document.activeElement;


  const modal =
    document.createElement(
      "div"
    );


  modal.id =
    "poemModal";


  modal.className =
    "poem-modal";


  modal.innerHTML = `

    <div
      class="poem-modal-backdrop"
      data-close-poem
    ></div>

    <div
      class="poem-modal-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="poemModalTitle"
      tabindex="-1"
    >

      <button
        type="button"
        class="poem-modal-close"
        aria-label="Закрити"
        data-close-poem
      >
        ×
      </button>

      <p class="poem-eyebrow">
        ${escapeHTML(
          getCategoryLabel(
            poem.category
          )
        )}
      </p>

      <h2 id="poemModalTitle">
        «${escapeHTML(
          poem.title
        )}»
      </h2>

      <button
        type="button"
        class="favorite-button modal-favorite${
          isFavorite(poem.id) ? " is-favorite" : ""
        }"
        data-favorite-poem="${escapeAttribute(
          poem.id
        )}"
        aria-pressed="${isFavorite(
          poem.id
        )}"
        aria-label="${
          isFavorite(poem.id)
            ? "Видалити з улюблених"
            : "Додати до улюблених"
        }"
      >
        <span
          class="favorite-icon"
          aria-hidden="true"
        >
          ${isFavorite(poem.id) ? "♥" : "♡"}
        </span>

        <span>
          ${
            isFavorite(poem.id)
              ? "В улюблених"
              : "Додати в улюблені"
          }
        </span>
      </button>

      <div class="poem-modal-text">
        ${escapeHTML(
          poem.text
        )}
      </div>

      ${
        poem.description
          ? `
            <p class="poem-modal-description">
              ${escapeHTML(
                poem.description
              )}
            </p>
          `
          : ""
      }

      <div
        class="related-by-tag"
        data-owner-id="${escapeAttribute(
          poem.id
        )}"
        data-owner-kind="poeziya"
        data-all-link-href="poeziya.html"
        data-all-link-label="Уся поезія →"
      ></div>

    </div>

  `;


  document.body.appendChild(
    modal
  );


  activeModal =
    modal;


  initRelatedByTagBoxes(
    modal
  );


  modal
    .querySelectorAll(
      "[data-close-poem]"
    )
    .forEach(
      element => {

        element.addEventListener(
          "click",
          closeModal
        );

      }
    );


  const favoriteButton =
    modal.querySelector(
      "[data-favorite-poem]"
    );


  if (favoriteButton) {

    favoriteButton.addEventListener(
      "click",
      () => {

        toggleFavorite(
          poem.id
        );


        favoriteButton.querySelector(
          "span:last-child"
        ).textContent =
          isFavorite(poem.id)
            ? "В улюблених"
            : "Додати в улюблені";

      }
    );

  }


  document.body.classList.add(
    "modal-open"
  );


  requestAnimationFrame(
    () => {

      modal.classList.add(
        "is-visible"
      );


      const dialog =
        modal.querySelector(
          ".poem-modal-dialog"
        );


      if (dialog) {
        dialog.focus();
      }

    }
  );


  document.addEventListener(
    "keydown",
    handleModalKeydown
  );

}


function handleModalKeydown(
  event
) {

  if (!activeModal) {
    return;
  }


  if (
    event.key === "Escape"
  ) {

    event.preventDefault();

    closeActiveModal();

    return;

  }


  if (
    event.key !== "Tab"
  ) {
    return;
  }


  trapFocus(
    activeModal,
    event
  );

}


function trapFocus(
  container,
  event
) {

  const focusable =
    container.querySelectorAll(
      `
      a[href],
      button:not([disabled]),
      input:not([disabled]),
      textarea:not([disabled]),
      select:not([disabled]),
      [tabindex]:not([tabindex="-1"])
      `
    );


  if (!focusable.length) {
    return;
  }


  const first =
    focusable[0];

  const last =
    focusable[
      focusable.length - 1
    ];


  if (
    event.shiftKey &&
    document.activeElement === first
  ) {

    event.preventDefault();

    last.focus();

  } else if (
    !event.shiftKey &&
    document.activeElement === last
  ) {

    event.preventDefault();

    first.focus();

  }

}


function closeActiveModal() {

  if (!activeModal) {
    return;
  }


  const modal =
    activeModal;


  activeModal = null;


  modal.classList.remove(
    "is-visible"
  );


  document.body.classList.remove(
    "modal-open"
  );


  document.removeEventListener(
    "keydown",
    handleModalKeydown
  );


  setTimeout(
    () => {

      if (
        modal.parentNode
      ) {

        modal.remove();

      }


      if (
        modalPreviousFocus &&
        typeof modalPreviousFocus.focus ===
          "function"
      ) {

        modalPreviousFocus.focus();

      }


      modalPreviousFocus =
        null;

    },
    250
  );

}


function closeModal() {

  closeActiveModal();

}


/* =========================================================
   POEMS LOAD ERROR
   ========================================================= */

function showPoemsLoadError() {

  const featured =
    document.getElementById(
      "featuredPoem"
    );


  if (featured) {

    featured.innerHTML = `

      <div class="poem-error">

        <p class="poem-eyebrow">
          Вірш дня
        </p>

        <p>
          Не вдалося завантажити поезію.
        </p>

      </div>

    `;

  }


  const list =
    document.getElementById(
      "poetryList"
    );


  if (list) {

    list.innerHTML = `

      <div class="poetry-loading">

        <p>
          Не вдалося завантажити
          poeziya.json.
        </p>

        <small>
          Перевірте, що poeziya.json
          знаходиться поруч із HTML-файлами.
        </small>

      </div>

    `;

  }

}


/* =========================================================
   PROSE
   ========================================================= */

function initProsePage() {

  const proseList =
    document.getElementById(
      "proseList"
    );


  const featuredProse =
    document.getElementById(
      "featuredProse"
    );


  if (
    !proseList &&
    !featuredProse
  ) {
    return;
  }


  loadProse();

}


async function loadProse() {

  try {

    /*
      ВАЖНО:
      Для прози використовується proza.json.
    */

    const data =
      await fetchJSONCached(
        "proza.json"
      );


    if (
      !Array.isArray(data)
    ) {

      throw new Error(
        "proza.json має містити масив."
      );

    }


    allProse =
      data
        .filter(isValidProse)
        .map(normalizeProse);


    initProseCatalog();

    renderFeaturedProse();


  } catch (error) {

    console.error(
      "Помилка завантаження proza.json:",
      error
    );


    showProseLoadError();

  }

}


function isValidProse(
  item
) {

  return Boolean(
    item &&
    typeof item === "object" &&
    item.id &&
    item.title &&
    (
      item.text ||
      item.content ||
      item.description
    )
  );

}


function normalizeProse(
  item
) {

  return {

    id:
      String(item.id),

    title:
      String(item.title),

    subtitle:
      String(
        item.subtitle || ""
      ),

    series:
      String(
        item.series || ""
      ),

    category:
      item.category
        ? String(item.category)
        : "other",

    tags:
      Array.isArray(item.tags)
        ? item.tags.map(
            tag => String(tag)
          )
        : [],

    text:
      String(
        item.text ??
        item.content ??
        item.description ??
        ""
      ),

    description:
      String(
        item.description ||
        ""
      )

  };

}


/* =========================================================
   PROSE CATALOG
   ========================================================= */

function initProseCatalog() {

  const list =
    document.getElementById(
      "proseList"
    );


  if (!list) {
    return;
  }


  readProseURLParams();

  initProseSearch();
  initProseCategories();

  renderProseTags();
  renderProse();


  const params =
    new URLSearchParams(
      window.location.search
    );


  const proseId =
    params.get("prose");


  if (proseId) {

    openProseFromURL(
      proseId
    );

  }

}


/* =========================================================
   PROSE URL PARAMETERS
   ========================================================= */

function readProseURLParams() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const tag =
    params.get("tag");


  if (tag) {

    proseState.tag =
      tag;

  }

}


/* =========================================================
   OPEN PROSE FROM URL
   ========================================================= */

function openProseFromURL(
  id
) {

  const card =
    document.querySelector(
      `[data-prose-id="${CSS.escape(
        String(id)
      )}"]`
    );


  if (!card) {
    return;
  }


  setTimeout(
    () => {

      card.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });


      const expandButton =
        card.querySelector(
          ".prose-card-expand"
        );


      if (
        expandButton &&
        expandButton.getAttribute(
          "aria-expanded"
        ) !== "true"
      ) {

        expandButton.click();

      }

    },
    250
  );

}


/* =========================================================
   PROSE SEARCH
   ========================================================= */

function initProseSearch() {

  const input =
    document.getElementById(
      "proseSearch"
    );


  const clearButton =
    document.getElementById(
      "clearProseSearch"
    );


  if (!input) {
    return;
  }


  input.value =
    proseState.search;


  input.addEventListener(
    "input",
    debounce(
      () => {

        proseState.search =
          input.value.trim();


        renderProse();

        if (clearButton) {

          clearButton.hidden =
            !proseState.search;

        }

      },
      100
    )
  );


  if (clearButton) {

    clearButton.hidden =
      !proseState.search;


    clearButton.addEventListener(
      "click",
      () => {

        input.value = "";

        proseState.search = "";

        clearButton.hidden =
          true;

        renderProse();

        input.focus();

      }
    );

  }

}


/* =========================================================
   PROSE CATEGORIES
   ========================================================= */

function initProseCategories() {

  document
    .querySelectorAll(
      "#proseCategories .filter-button"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            proseState.category =
              button.dataset.category ||
              "all";

            updateProseActiveCategory();

            renderProse();

          }
        );

      }
    );


  updateProseActiveCategory();

}


/* =========================================================
   ACTIVE PROSE CATEGORY
   ========================================================= */

function updateProseActiveCategory() {

  document
    .querySelectorAll(
      "#proseCategories .filter-button"
    )
    .forEach(
      item =>
        item.classList.toggle(
          "active",
          (item.dataset.category || "all") ===
            proseState.category
        )
    );

}


/* =========================================================
   PROSE TAGS
   ========================================================= */

function renderProseTags() {

  const container =
    document.getElementById(
      "proseTags"
    );


  if (!container) {
    return;
  }


  const tagMap =
    new Map();


  allProse.forEach(
    item => {

      item.tags.forEach(
        tag => {

          const normalized =
            normalizeSearchValue(
              tag
            );


          if (
            !normalized ||
            tagMap.has(normalized)
          ) {
            return;
          }


          tagMap.set(
            normalized,
            tag
          );

        }
      );

    }
  );


  const tags =
    Array.from(
      tagMap.values()
    ).sort(
      (a, b) =>
        a.localeCompare(
          b,
          "uk"
        )
    );


  container.innerHTML =
    tags
      .map(
        tag => `

          <button
            type="button"
            class="filter-tag"
            data-tag="${escapeAttribute(tag)}"
          >
            #${escapeHTML(tag)}
          </button>

        `
      )
      .join("");


  container
    .querySelectorAll(
      ".filter-tag"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const tag =
              button.dataset.tag;


            proseState.tag =
              proseState.tag === tag
                ? null
                : tag;


            proseState.search = "";


            const input =
              document.getElementById(
                "proseSearch"
              );


            const clearButton =
              document.getElementById(
                "clearProseSearch"
              );


            if (input) {
              input.value = "";
            }


            if (clearButton) {
              clearButton.hidden = true;
            }


            updateActiveProseTags();
            renderProse();

          }
        );

      }
    );


  updateActiveProseTags();

  setupTagCloudToggle(
    document.getElementById(
      "proseTags"
    )
  );

}


function updateActiveProseTags() {

  const container =
    document.getElementById(
      "proseTags"
    );


  if (!container) {
    return;
  }


  container
    .querySelectorAll(
      ".filter-tag"
    )
    .forEach(
      button => {

        button.classList.toggle(
          "active",
          proseState.tag ===
            button.dataset.tag
        );

      }
    );

}


/* =========================================================
   FILTER PROSE
   ========================================================= */

function getFilteredProse() {

  const search =
    normalizeSearchValue(
      proseState.search
    );


  return allProse.filter(
    item => {

      if (
        proseState.category ===
        "favorites"
      ) {

        if (!isProseFavorite(item.id)) {
          return false;
        }

      } else if (
        proseState.category !==
        "all" &&
        item.category !==
        proseState.category
      ) {

        return false;

      }


      if (
        proseState.tag &&
        !item.tags.some(
          tag =>
            normalizeSearchValue(tag) ===
            normalizeSearchValue(proseState.tag)
        )
      ) {

        return false;

      }


      if (!search) {
        return true;
      }


      const fields = [
        item.title,
        item.text,
        item.description,
        item.category,
        ...item.tags
      ];


      return fields.some(
        field =>
          fuzzyIncludes(
            field,
            search
          )
      );

    }
  );

}


/* =========================================================
   RESET PROSE
   ========================================================= */

document.addEventListener(
  "click",
  event => {

    const reset =
      event.target.closest(
        "#resetProseFilters"
      );


    if (!reset) {
      return;
    }


    proseState = {
      search: "",
      category: "all",
      tag: null
    };


    const input =
      document.getElementById(
        "proseSearch"
      );


    if (input) {
      input.value = "";
    }


    const clearButton =
      document.getElementById(
        "clearProseSearch"
      );


    if (clearButton) {
      clearButton.hidden = true;
    }


    updateProseActiveCategory();
    updateActiveProseTags();
    renderProse();

  }
);


/* =========================================================
   RENDER PROSE
   ========================================================= */

function renderProse() {

  const list =
    document.getElementById(
      "proseList"
    );


  const empty =
    document.getElementById(
      "proseEmpty"
    );


  const count =
    document.getElementById(
      "proseResultsCount"
    );


  if (!list) {
    return;
  }


  const prose =
    getFilteredProse();


  if (count) {

    count.textContent =
      prose.length
        ? `Знайдено: ${prose.length}`
        : "Нічого не знайдено";

  }


  if (!prose.length) {

    list.innerHTML = "";


    if (empty) {
      empty.hidden = false;
    }


    return;

  }


  if (empty) {
    empty.hidden = true;
  }


  list.innerHTML =
    prose
      .map(
        item =>
          createProseCard(
            item
          )
      )
      .join("");


  bindProseCards(
    list
  );

}


/* =========================================================
   CREATE PROSE CARD
   ========================================================= */

function createProseCard(
  item
) {

  const search =
    proseState.search;


  const paragraphs =
    splitTextIntoParagraphs(
      item.text
    );


  /*
    Перший абзац показуємо у collapsed state.
    Уся історія знаходиться в DOM,
    тому при розкритті вона з'являється
    без повторного завантаження JSON.
  */

  const preview =
    paragraphs.length
      ? paragraphs[0]
      : item.text;


  const favorite =
    isProseFavorite(
      item.id
    );


  return `

    <article
      class="prose-card reveal in-view"
      data-prose-id="${escapeAttribute(
        item.id
      )}"
    >

      <div class="stitch-divider thin"></div>

      <button
        type="button"
        class="favorite-button${
          favorite ? " is-favorite" : ""
        }"
        data-favorite-prose="${escapeAttribute(
          item.id
        )}"
        aria-pressed="${favorite}"
        aria-label="${
          favorite
            ? "Видалити з улюблених"
            : "Додати до улюблених"
        }"
        title="${
          favorite
            ? "Видалити з улюблених"
            : "Додати до улюблених"
        }"
      >
        <span
          class="favorite-icon"
          aria-hidden="true"
        >
          ${favorite ? "♥" : "♡"}
        </span>
      </button>

      <p class="prose-card-category">
        ${escapeHTML(
          getProseCategoryLabel(
            item.category
          )
        )}
      </p>

      ${
        item.series
          ? `
            <p class="prose-card-series">
              ${highlightText(
                "Серія: " + item.series,
                search
              )}
            </p>
          `
          : ""
      }

      <h3>
        ${highlightText(
          item.title,
          search
        )}
      </h3>

      ${
        item.subtitle
          ? `
            <p class="prose-card-subtitle">
              ${highlightText(
                item.subtitle,
                search
              )}
            </p>
          `
          : ""
      }

      <div class="prose-card-content">

        <div class="prose-card-preview">
          ${highlightText(
            preview,
            search
          )}
        </div>

        <div
          class="prose-card-full"
          hidden
        >
          ${paragraphs
            .map(
              paragraph => `
                <p>
                  ${highlightText(
                    paragraph,
                    search
                  )}
                </p>
              `
            )
            .join("")}

          ${
            item.description
              ? `
                <p class="prose-card-description">
                  ${highlightText(
                    item.description,
                    search
                  )}
                </p>
              `
              : ""
          }
        </div>

      </div>

      <div
        class="related-by-tag"
        data-owner-id="${escapeAttribute(
          item.id
        )}"
        data-owner-kind="proza"
      ></div>

      <button
        type="button"
        class="prose-card-expand"
        aria-expanded="false"
      >
        <span class="prose-expand-label">
          Читати повністю
        </span>

        <span
          class="prose-expand-icon"
          aria-hidden="true"
        >
          ↓
        </span>
      </button>

      <a
        class="poetry-card-link"
        href="/proza/${encodeURIComponent(
          item.id
        )}"
      >
        Постійне посилання →
      </a>

    </article>

  `;

}


/* =========================================================
   PROSE CARD BINDING
   ========================================================= */

function bindProseCards(
  container
) {

  bindProseFavoriteButtons(
    container
  );

  initRelatedByTagBoxes(
    container
  );


  container
    .querySelectorAll(
      ".prose-card-expand"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const card =
              button.closest(
                ".prose-card"
              );


            if (!card) {
              return;
            }


            const full =
              card.querySelector(
                ".prose-card-full"
              );


            const preview =
              card.querySelector(
                ".prose-card-preview"
              );


            const expanded =
              button.getAttribute(
                "aria-expanded"
              ) === "true";


            button.setAttribute(
              "aria-expanded",
              String(!expanded)
            );


            if (full) {
              full.hidden =
                expanded;
            }


            if (preview) {
              preview.hidden =
                !expanded;
            }


            card.classList.toggle(
              "is-expanded",
              !expanded
            );


            const label =
              button.querySelector(
                ".prose-expand-label"
              );


            if (label) {

              label.textContent =
                expanded
                  ? "Читати повністю"
                  : "Згорнути";

            }


            const icon =
              button.querySelector(
                ".prose-expand-icon"
              );


            if (icon) {

              icon.textContent =
                expanded
                  ? "↓"
                  : "↑";

            }

          }
        );

      }
    );

}


/* =========================================================
   PROSE CATEGORY LABELS
   ========================================================= */

const PROSE_CATEGORY_LABELS = {

  other:
    "Проза",

  opovidannya:
    "Оповідання",

  novel:
    "Роман",

  essay:
    "Есе",

  kazka:
    "Казка",

  dytiacha:
    "Для дітей"

};


function getProseCategoryLabel(
  category
) {

  return (
    PROSE_CATEGORY_LABELS[
      String(category).toLowerCase()
    ] ||
    "Проза"
  );

}


/* =========================================================
   FEATURED PROSE
   ========================================================= */

function renderFeaturedProse() {

  const container =
    document.getElementById(
      "featuredProse"
    );


  if (
    !container ||
    !allProse.length
  ) {
    return;
  }


  const item =
    allProse[0];


  container.innerHTML = `

    <article class="prose-featured-card">

      <p class="prose-card-category">
        ${escapeHTML(
          getProseCategoryLabel(
            item.category
          )
        )}
      </p>

      <h2>
        ${escapeHTML(
          item.title
        )}
      </h2>

      <div class="prose-featured-text">
        ${splitTextIntoParagraphs(
          item.text
        )
          .map(
            paragraph => `
              <p>
                ${escapeHTML(
                  paragraph
                )}
              </p>
            `
          )
          .join("")}
      </div>

    </article>

  `;

}


/* =========================================================
   PROSE ERROR
   ========================================================= */

function showProseLoadError() {

  const list =
    document.getElementById(
      "proseList"
    );


  if (!list) {
    return;
  }


  list.innerHTML = `

    <div class="prose-loading">

      <p>
        Не вдалося завантажити proza.json.
      </p>

      <small>
        Перевірте, що proza.json
        знаходиться поруч із HTML-файлами.
      </small>

    </div>

  `;

}


/* =========================================================
   VIDEO
   ========================================================= */

function initVideoPage() {

  const videoList =
    document.getElementById(
      "videoList"
    );


  const featuredVideo =
    document.getElementById(
      "featuredVideo"
    );


  if (
    !videoList &&
    !featuredVideo
  ) {
    return;
  }


  loadVideos();

}


async function loadVideos() {

  try {

    const data =
      await fetchJSONCached(
        "video.json"
      );


    if (
      !Array.isArray(data)
    ) {

      throw new Error(
        "video.json має містити масив."
      );

    }


    allVideos =
      data
        .filter(isValidVideo)
        .map(normalizeVideo);


    renderFeaturedVideo();
    renderVideoList();


  } catch (error) {

    console.error(
      "Помилка завантаження video.json:",
      error
    );


    showVideosLoadError();

  }

}


function isValidVideo(
  video
) {

  return Boolean(
    video &&
    typeof video === "object" &&
    video.id &&
    video.title &&
    video.youtube
  );

}


function normalizeVideo(
  video
) {

  return {

    id:
      String(video.id),

    title:
      String(video.title),

    description:
      video.description
        ? String(video.description)
        : "",

    type:
      video.type
        ? String(video.type)
        : "video",

    youtube:
      String(video.youtube)

  };

}


/* =========================================================
   VIDEO LABELS
   ========================================================= */

const VIDEO_TYPE_LABELS = {

  featured:
    "Вибране відео",

  song:
    "Пісня за мотивами поезії",

  reading:
    "Читання поезії",

  video:
    "Відео за мотивами творчості"

};


function getVideoTypeLabel(
  type
) {

  return (
    VIDEO_TYPE_LABELS[type] ||
    VIDEO_TYPE_LABELS.video
  );

}


/* =========================================================
   YOUTUBE
   ========================================================= */

function extractYouTubeId(
  value
) {

  const input =
    String(value || "").trim();


  /*
    Підтримуються:
    - dQw4w9WgXcQ
    - https://www.youtube.com/watch?v=...
    - https://youtu.be/...
    - https://www.youtube.com/embed/...
  */

  if (
    /^[a-zA-Z0-9_-]{11}$/.test(
      input
    )
  ) {

    return input;

  }


  try {

    const url =
      new URL(input);


    if (
      url.hostname.includes(
        "youtu.be"
      )
    ) {

      return (
        url.pathname
          .replace(
            /^\/+/,
            ""
          )
          .split("/")[0]
      );

    }


    if (
      url.searchParams.has("v")
    ) {

      return url.searchParams.get(
        "v"
      );

    }


    const parts =
      url.pathname.split(
        "/"
      );


    const embedIndex =
      parts.indexOf(
        "embed"
      );


    if (
      embedIndex !== -1
    ) {

      return parts[
        embedIndex + 1
      ];

    }

  } catch {

    return input;

  }


  return input;

}


function getYouTubeURL(
  value
) {

  const id =
    extractYouTubeId(
      value
    );


  return (
    "https://www.youtube.com/watch?v=" +
    encodeURIComponent(id)
  );

}


function getYouTubeThumbnail(
  value
) {

  const id =
    extractYouTubeId(
      value
    );


  return (
    "https://i.ytimg.com/vi/" +
    encodeURIComponent(id) +
    "/hqdefault.jpg"
  );

}


/* =========================================================
   FEATURED VIDEO
   ========================================================= */

function renderFeaturedVideo() {

  const container =
    document.getElementById(
      "featuredVideo"
    );


  if (!container) {
    return;
  }


  const video =
    allVideos.find(
      item =>
        item.type ===
        "featured"
    ) ||
    allVideos[0];


  if (!video) {

    container.innerHTML = `

      <div class="video-error">
        <p>
          Поки що немає доступних відео.
        </p>
      </div>

    `;

    return;

  }


  container.innerHTML =
    createFeaturedVideoHTML(
      video
    );


  requestAnimationFrame(
    () =>
      container.classList.add(
        "video-loaded"
      )
  );

}


function createFeaturedVideoHTML(
  video
) {

  return `

    <article
      class="video-featured-card"
    >

      <a
        class="video-featured-media"
        href="${escapeAttribute(
          getYouTubeURL(
            video.youtube
          )
        )}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Дивитися відео «${escapeAttribute(
          video.title
        )}» на YouTube"
      >

        <img
          src="${escapeAttribute(
            getYouTubeThumbnail(
              video.youtube
            )
          )}"
          alt="Відео «${escapeAttribute(
            video.title
          )}»"
          loading="eager"
          decoding="async"
        >

        <span
          class="video-play"
          aria-hidden="true"
        >
          ▶
        </span>

      </a>


      <div class="video-featured-info">

        <p class="video-eyebrow">
          ${escapeHTML(
            getVideoTypeLabel(
              video.type
            )
          )}
        </p>

        <h3>
          ${escapeHTML(
            video.title
          )}
        </h3>

        <p class="video-description">
          ${escapeHTML(
            video.description
          )}
        </p>

        <a
          class="video-button btn"
          href="${escapeAttribute(
            getYouTubeURL(
              video.youtube
            )
          )}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Дивитися на YouTube
          <span aria-hidden="true">
            →
          </span>
        </a>

      </div>

    </article>

  `;

}


/* =========================================================
   VIDEO LIST
   ========================================================= */

function renderVideoList() {

  const list =
    document.getElementById(
      "videoList"
    );


  if (!list) {
    return;
  }


  const videos =
    allVideos.filter(
      video =>
        video.type !==
        "featured"
    );


  if (!videos.length) {

    list.innerHTML = `

      <div class="video-empty">

        <span aria-hidden="true">
          ✦
        </span>

        <p>
          Інших відео поки що немає.
        </p>

      </div>

    `;

    return;

  }


  list.innerHTML =
    videos
      .map(
        video =>
          createVideoCard(
            video
          )
      )
      .join("");

}


function createVideoCard(
  video
) {

  return `

    <article
      class="video-card reveal in-view"
      data-video-id="${escapeAttribute(
        video.id
      )}"
    >

      <a
        class="video-card-media"
        href="${escapeAttribute(
          getYouTubeURL(
            video.youtube
          )
        )}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Дивитися «${escapeAttribute(
          video.title
        )}» на YouTube"
      >

        <img
          src="${escapeAttribute(
            getYouTubeThumbnail(
              video.youtube
            )
          )}"
          alt="Відео «${escapeAttribute(
            video.title
          )}»"
          loading="lazy"
          decoding="async"
        >

        <span
          class="video-play"
          aria-hidden="true"
        >
          ▶
        </span>

      </a>


      <div class="video-card-body">

        <p class="video-card-type">
          ${escapeHTML(
            getVideoTypeLabel(
              video.type
            )
          )}
        </p>

        <h3>
          ${escapeHTML(
            video.title
          )}
        </h3>

        <p class="video-card-description">
          ${escapeHTML(
            video.description
          )}
        </p>

        <a
          class="video-card-link"
          href="${escapeAttribute(
            getYouTubeURL(
              video.youtube
            )
          )}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Дивитися →
        </a>

      </div>

    </article>

  `;

}


/* =========================================================
   VIDEO ERROR
   ========================================================= */

function showVideosLoadError() {

  const featured =
    document.getElementById(
      "featuredVideo"
    );


  if (featured) {

    featured.innerHTML = `

      <div class="video-error">

        <p>
          Не вдалося завантажити відео.
        </p>

        <small>
          Перевірте, що video.json
          знаходиться поруч із video.html.
        </small>

      </div>

    `;

  }


  const list =
    document.getElementById(
      "videoList"
    );


  if (list) {
    list.innerHTML = "";
  }

}


/* =========================================================
   SEARCH NORMALIZATION
   ========================================================= */

function normalizeSearchValue(
  value
) {

  return String(
    value || ""
  )
    .toLocaleLowerCase(
      "uk-UA"
    )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[’'`]/g,
      ""
    )
    .trim();

}


/* =========================================================
   KEYBOARD LAYOUT CORRECTION
   ========================================================= */

const UK_TO_EN = {
  й: "q",
  ц: "w",
  у: "e",
  к: "r",
  е: "t",
  н: "y",
  г: "u",
  ш: "i",
  щ: "o",
  з: "p",
  х: "[",
  ї: "]",
  ф: "a",
  і: "s",
  в: "d",
  а: "f",
  п: "g",
  р: "h",
  о: "j",
  л: "k",
  д: "l",
  ж: ";",
  є: "'",
  я: "z",
  ч: "x",
  с: "c",
  м: "v",
  и: "b",
  т: "n",
  ь: "m",
  б: ",",
  ю: "."
};


const EN_TO_UK = {
  q: "й",
  w: "ц",
  e: "у",
  r: "к",
  t: "е",
  y: "н",
  u: "г",
  i: "ш",
  o: "щ",
  p: "з",
  "[": "х",
  "]": "ї",
  a: "ф",
  s: "і",
  d: "в",
  f: "а",
  g: "п",
  h: "р",
  j: "о",
  k: "л",
  l: "д",
  ";": "ж",
  "'": "є",
  z: "я",
  x: "ч",
  c: "с",
  v: "м",
  b: "и",
  n: "т",
  m: "ь",
  ",": "б",
  ".": "ю"
};


function convertKeyboardLayout(
  value,
  map
) {

  return String(
    value || ""
  )
    .toLowerCase()
    .split("")
    .map(
      char =>
        map[char] ||
        char
    )
    .join("");

}


function getSearchVariants(
  value
) {

  const normalized =
    normalizeSearchValue(
      value
    );


  if (!normalized) {
    return [];
  }


  const ukToEn =
    normalizeSearchValue(
      convertKeyboardLayout(
        normalized,
        UK_TO_EN
      )
    );


  const enToUk =
    normalizeSearchValue(
      convertKeyboardLayout(
        normalized,
        EN_TO_UK
      )
    );


  return [
    normalized,
    ukToEn,
    enToUk
  ].filter(
    (item, index, array) =>
      item &&
      array.indexOf(item) ===
        index
  );

}


/* =========================================================
   FUZZY SEARCH
   ========================================================= */

function fuzzyIncludes(
  value,
  query
) {

  const text =
    normalizeSearchValue(
      value
    );


  const variants =
    getSearchVariants(
      query
    );


  if (!text) {
    return false;
  }


  return variants.some(
    variant => {

      if (
        text.includes(variant)
      ) {

        return true;

      }


      /*
        Для коротких слів
        не допускаємо занадто
        вільного пошуку.
      */

      if (
        variant.length < 4
      ) {

        return false;

      }


      /*
        Перевіряємо слова
        на невелику кількість
        помилок.
      */

      const words =
        text.split(
          /\s+/
        );


      return words.some(
        word =>
          levenshteinDistance(
            word,
            variant
          ) <=
            (
              variant.length >= 7
                ? 2
                : 1
            )
      );

    }
  );

}


/* =========================================================
   LEVENSHTEIN
   ========================================================= */

function levenshteinDistance(
  a,
  b
) {

  const first =
    String(a);

  const second =
    String(b);


  if (
    first === second
  ) {
    return 0;
  }


  if (!first.length) {
    return second.length;
  }


  if (!second.length) {
    return first.length;
  }


  let previous =
    Array.from(
      {
        length:
          second.length + 1
      },
      (_, index) =>
        index
    );


  for (
    let i = 1;
    i <= first.length;
    i++
  ) {

    const current =
      [i];


    for (
      let j = 1;
      j <= second.length;
      j++
    ) {

      const insert =
        current[j - 1] + 1;

      const remove =
        previous[j] + 1;

      const replace =
        previous[j - 1] +
        (
          first[i - 1] ===
          second[j - 1]
            ? 0
            : 1
        );


      current[j] =
        Math.min(
          insert,
          remove,
          replace
        );

    }


    previous =
      current;

  }


  return previous[
    second.length
  ];

}


/* =========================================================
   HIGHLIGHT SEARCH
   ========================================================= */

function highlightText(
  text,
  query
) {

  const source =
    String(text || "");


  if (
    !query ||
    !query.trim()
  ) {

    return escapeHTML(
      source
    );

  }


  const variants =
    getSearchVariants(
      query
    )
      .filter(
        value =>
          value.length >= 2
      )
      .sort(
        (a, b) =>
          b.length -
          a.length
      );


  if (!variants.length) {

    return escapeHTML(
      source
    );

  }


  /*
    Важливо:
    спочатку escape,
    потім працюємо тільки
    з безпечним HTML.
  */

  let result =
    escapeHTML(
      source
    );


  variants.forEach(
    variant => {

      const escapedVariant =
        escapeHTML(
          variant
        );


      if (!escapedVariant) {
        return;
      }


      const regex =
        new RegExp(
          escapeRegExp(
            escapedVariant
          ),
          "gi"
        );


      result =
        result.replace(
          regex,
          match =>
            `<mark class="search-highlight">${match}</mark>`
        );

    }
  );


  return result;

}


/* =========================================================
   TEXT HELPERS
   ========================================================= */

function getPoemExcerpt(
  text,
  maxLength
) {

  const value =
    String(
      text || ""
    );


  if (
    value.length <=
    maxLength
  ) {

    return value;

  }


  return (
    value
      .slice(
        0,
        maxLength
      )
      .trimEnd() +
    "…"
  );

}


function splitTextIntoParagraphs(
  text
) {

  return String(
    text || ""
  )
    .split(
      /\n\s*\n/
    )
    .map(
      paragraph =>
        paragraph.trim()
    )
    .filter(
      Boolean
    );

}


/* =========================================================
   HTML SECURITY
   ========================================================= */

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  );

}


function escapeRegExp(
  value
) {

  return String(
    value
  ).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

}


/* =========================================================
   ACCESSIBILITY
   ========================================================= */

function initGlobalAccessibility() {

  /*
    Не дозволяємо кнопкам без type
    випадково відправляти форми.
  */

  document
    .querySelectorAll(
      "button:not([type])"
    )
    .forEach(
      button =>
        button.setAttribute(
          "type",
          "button"
        )
    );


  /*
    Додаємо aria-current
    до активного пункту навігації.
  */

  const currentPath =
    window.location.pathname;


  document
    .querySelectorAll(
      "#mainNav a"
    )
    .forEach(
      link => {

        try {

          const linkURL =
            new URL(
              link.href,
              window.location.href
            );


          if (
            linkURL.pathname ===
            currentPath
          ) {

            link.setAttribute(
              "aria-current",
              "page"
            );

          }

        } catch {

          /* ignore */

        }

      }
    );

}


/* =========================================================
   DEBOUNCE
   ========================================================= */

function debounce(
  callback,
  delay = 150
) {

  let timeout;


  return function (...args) {

    clearTimeout(
      timeout
    );


    timeout =
      setTimeout(
        () => {

          callback.apply(
            this,
            args
          );

        },
        delay
      );

  };

}


/* =========================================================
   FINAL KEYBOARD SUPPORT
   ========================================================= */

document.addEventListener(
  "keydown",
  event => {

    /*
      Escape закриває меню,
      якщо воно відкрите.
    */

    if (
      event.key === "Escape"
    ) {

      const nav =
        document.getElementById(
          "mainNav"
        );


      const toggle =
        document.getElementById(
          "navToggle"
        );


      if (
        nav &&
        nav.classList.contains(
          "is-open"
        )
      ) {

        nav.classList.remove(
          "is-open"
        );


        document.body.classList.remove(
          "menu-open",
          "nav-open"
        );


        if (toggle) {

          toggle.classList.remove(
            "is-open"
          );

          toggle.setAttribute(
            "aria-expanded",
            "false"
          );

          toggle.focus();

        }

      }

    }

  }
);
