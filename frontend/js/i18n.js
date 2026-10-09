/* =============================================================
   i18n.js  –  English / Tagalog language selector
   Requires translations.js to be loaded first.

   - Adds a "Select Language" dropdown (top-right of every page,
     or inside <div id="languageSwitcher"></div> if you add one)
   - Remembers the choice (localStorage key: appLanguage), so the
     chosen language carries over to every page.
   - Translates static text AND text created later by your other
     scripts (results, recommendations, modals, tutorial popup),
     without editing those scripts.
   - Never translates the user's password (.hidden-password, inputs).
   ============================================================= */
(function (root) {

    const STORAGE_KEY = "appLanguage";
    const LANGUAGES = { en: "English", tl: "Filipino (Tagalog)" };

    const DICT = root.I18N_TL || { exact: {}, patterns: [], clauses: [] };


    // =========================================================
    // TRANSLATOR CORE
    // =========================================================

    const norm = (s) => String(s).replace(/\s+/g, " ").trim();

    const exactMap = new Map();
    Object.keys(DICT.exact).forEach((k) => {
        exactMap.set(norm(k).toLowerCase(), DICT.exact[k]);
    });

    const missing = new Set();

    function applyRule(rule, text, tr) {
        const [re, out] = rule;
        const m = text.match(re);
        if (!m) return null;
        return typeof out === "function" ? out(m, tr) : text.replace(re, out);
    }

    // one sentence/whole string: exact -> patterns -> clauses
    function translatePiece(core) {

        const hit = exactMap.get(core.toLowerCase());
        if (hit !== undefined && hit !== null) return hit;

        for (const rule of DICT.patterns) {
            const out = applyRule(rule, core, tr);
            if (out !== null) return out;
        }

        let changed = false;
        let result = core;
        for (const [re, out] of (DICT.clauses || [])) {
            const next = result.replace(re, out);
            if (next !== result) {
                changed = true;
                result = next;
            }
        }
        return changed ? result : null;
    }

    // used inside patterns for small sub-pieces; falls back to original
    function tr(text) {
        const t = translatePiece(norm(text));
        return t === null ? text : t;
    }

    // full translation of a string, or null if nothing matched
    function translate(text) {

        const core = norm(text);
        if (!core) return null;

        // entries set to null = intentionally keep in English
        if (exactMap.get(core.toLowerCase()) === null) return null;

        let out = translatePiece(core);

        // long auto-generated paragraphs: translate sentence by sentence
        if (out === null && /[.!?]\s+[A-Z]/.test(core)) {
            const parts = core.split(/(?<=[.!?])\s+(?=[A-Z])/);
            let any = false;
            const done = parts.map((p) => {
                const t = translatePiece(p);
                if (t !== null) any = true;
                return t === null ? p : t;
            });
            if (any) out = done.join(" ");
        }

        if (out === null) {
            if (/[A-Za-z]{3}/.test(core)) missing.add(core);
            return null;
        }

        // keep ALL-CAPS look (e.g. button labels)
        if (core.length > 3 && /[A-Z]/.test(core) && core === core.toUpperCase()) {
            out = out.toUpperCase();
        }
        return out;
    }


    // =========================================================
    // STATE
    // =========================================================

    let lang = "en";
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && LANGUAGES[saved]) lang = saved;
    } catch (e) { /* storage blocked */ }

    const SKIP =
        "script,style,textarea,input,select,option,[data-no-i18n],.hidden-password,.i18n-switcher";
    const ATTRS = ["placeholder", "title", "alt", "aria-label"];

    const origText = new WeakMap();   // text node -> original English
    const shownText = new WeakMap();  // text node -> text we wrote
    const origAttr = new WeakMap();   // element -> { attr: english }
    const shownAttr = new WeakMap();  // element -> { attr: written }

    let busy = false;
    let observer = null;


    // =========================================================
    // APPLY TO TEXT NODES
    // =========================================================

    function processText(node) {

        const parent = node.parentElement;
        if (!parent || parent.closest(SKIP)) return;

        const current = node.nodeValue;

        // changed by someone else => it's a new English original
        if (shownText.get(node) !== current) {
            origText.set(node, current);
            shownText.delete(node);
        }

        const original = origText.get(node);
        if (original === undefined) return;

        const t = lang === "en" ? null : translate(original);

        if (t === null) {
            if (shownText.has(node)) {
                node.nodeValue = original;
                shownText.delete(node);
            }
            return;
        }

        const lead = original.match(/^\s*/)[0];
        const trail = original.match(/\s*$/)[0];
        const value = lead + t + trail;

        if (node.nodeValue !== value) node.nodeValue = value;
        shownText.set(node, value);
    }


    // =========================================================
    // APPLY TO ATTRIBUTES
    // =========================================================

    function processElementAttrs(el) {

        if (el.closest && el.closest(SKIP) && !isButtonInput(el)) return;

        const attrs = ATTRS.slice();
        if (isButtonInput(el)) attrs.push("value");

        const o = origAttr.get(el) || {};
        const s = shownAttr.get(el) || {};

        attrs.forEach((a) => {

            if (!el.hasAttribute(a)) return;

            const cur = el.getAttribute(a);

            if (s[a] !== cur) {
                o[a] = cur;
                delete s[a];
            }

            const original = o[a];
            if (original === undefined) return;

            const t = lang === "en" ? null : translate(original);

            if (t === null) {
                if (s[a] !== undefined) {
                    el.setAttribute(a, original);
                    delete s[a];
                }
                return;
            }

            el.setAttribute(a, t);
            s[a] = t;
        });

        origAttr.set(el, o);
        shownAttr.set(el, s);
    }

    function isButtonInput(el) {
        return el.tagName === "INPUT" &&
            /^(button|submit|reset)$/i.test(el.getAttribute("type") || "");
    }


    // =========================================================
    // WALK A SUBTREE
    // =========================================================

    function walk(rootNode) {

        if (!rootNode) return;

        if (rootNode.nodeType === Node.TEXT_NODE) {
            processText(rootNode);
            return;
        }

        if (rootNode.nodeType !== Node.ELEMENT_NODE) return;

        processElementAttrs(rootNode);

        rootNode
            .querySelectorAll("[placeholder],[title],[alt],[aria-label],input[type=button],input[type=submit],input[type=reset]")
            .forEach(processElementAttrs);

        const walker = document.createTreeWalker(
            rootNode,
            NodeFilter.SHOW_TEXT
        );

        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(processText);
    }

    function processTitle() {
        const t = document.querySelector("title");
        if (t && t.firstChild) processText(t.firstChild);
    }

    function run(rootNode) {
        busy = true;
        try {
            walk(rootNode || document.body);
            processTitle();
        } finally {
            if (observer) observer.takeRecords();
            busy = false;
        }
    }


    // =========================================================
    // WATCH FOR TEXT ADDED / CHANGED BY OTHER SCRIPTS
    // =========================================================

    function startObserver() {

        observer = new MutationObserver((records) => {

            if (busy) return;

            busy = true;
            try {
                records.forEach((r) => {
                    if (r.type === "childList") {
                        r.addedNodes.forEach(walk);
                    } else if (r.type === "characterData") {
                        processText(r.target);
                    } else if (r.type === "attributes") {
                        processElementAttrs(r.target);
                    }
                });
            } finally {
                observer.takeRecords();
                busy = false;
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ATTRS.concat(["value"])
        });
    }


    // =========================================================
    // LANGUAGE SWITCH
    // =========================================================

    function setLanguage(code) {

        if (!LANGUAGES[code]) return;

        lang = code;

        try { localStorage.setItem(STORAGE_KEY, code); } catch (e) { }

        document.documentElement.lang = code === "tl" ? "tl" : "en";

        const select = document.getElementById("i18nSelect");
        if (select && select.value !== code) select.value = code;

        run(document.body);

        document.dispatchEvent(
            new CustomEvent("languagechange", { detail: { language: code } })
        );
    }


    // =========================================================
    // SWITCHER UI
    // =========================================================

    function buildSwitcher() {

        if (document.getElementById("i18nSelect")) return;

        const style = document.createElement("style");
        style.textContent = `
            .i18n-switcher{display:inline-flex;align-items:center;gap:6px;
                font:600 13px/1 system-ui,Segoe UI,Roboto,sans-serif;
                background:rgba(15,23,42,.85);color:#fff;border:1px solid rgba(255,255,255,.25);
                border-radius:999px;padding:6px 10px;backdrop-filter:blur(6px)}
            .i18n-switcher.i18n-floating{position:fixed;top:12px;right:12px;z-index:99999}
            .i18n-switcher select{background:transparent;color:inherit;border:0;
                font:inherit;cursor:pointer;outline:none}
            .i18n-switcher select option{color:#111;background:#fff}
        `;
        document.head.appendChild(style);

        const wrap = document.createElement("label");
        wrap.className = "i18n-switcher";
        wrap.setAttribute("data-no-i18n", "");

        const icon = document.createElement("span");
        icon.textContent = "🌐";
        icon.setAttribute("aria-hidden", "true");

        const select = document.createElement("select");
        select.id = "i18nSelect";
        select.setAttribute("aria-label", "Select Language / Pumili ng Wika");

        Object.keys(LANGUAGES).forEach((code) => {
            const opt = document.createElement("option");
            opt.value = code;
            opt.textContent = LANGUAGES[code];
            select.appendChild(opt);
        });

        select.value = lang;
        select.addEventListener("change", () => setLanguage(select.value));

        wrap.appendChild(icon);
        wrap.appendChild(select);

        const slot = document.getElementById("languageSwitcher");

        if (slot) {
            slot.appendChild(wrap);
        } else {
            wrap.classList.add("i18n-floating");
            document.body.appendChild(wrap);
        }
    }


    // =========================================================
    // alert() / confirm() MESSAGES
    // =========================================================

    ["alert", "confirm"].forEach((name) => {
        const original = root[name] && root[name].bind(root);
        if (!original) return;
        root[name] = function (message) {
            const t = lang === "en" ? null : translate(String(message));
            return original(t === null ? message : t);
        };
    });


    // =========================================================
    // INIT
    // =========================================================

    function init() {
        document.documentElement.lang = lang === "tl" ? "tl" : "en";
        buildSwitcher();
        startObserver();
        run(document.body);
    }

    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", init);
        } else {
            init();
        }

        // keep several open tabs/pages in sync
        window.addEventListener("storage", (e) => {
            if (e.key === STORAGE_KEY && LANGUAGES[e.newValue]) {
                setLanguage(e.newValue);
            }
        });
    }


    // =========================================================
    // PUBLIC API
    // =========================================================

    const api = {
        setLanguage,
        getLanguage: () => lang,
        translate,                              // I18N.translate("text")
        missing: () => {                        // list untranslated English
            const list = Array.from(missing).sort();
            console.log(list.length + " untranslated text(s):");
            console.log(list.join("\n"));
            return list;
        }
    };

    root.I18N = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;

})(typeof window !== "undefined" ? window : globalThis);