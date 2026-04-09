(function () {
    function initGlossary() {
        var scrollEl = document.getElementById("glossary-scroll");
        var indexEl = document.getElementById("glossary-index");
        if (!scrollEl || !indexEl) return;

        var scrubPointerId = null;
        var scrubStartY = 0;
        var scrubMode = false;
        var lastScrubLetter = "";
        var suppressIndexLinkClick = false;

        function getSections() {
            return scrollEl.querySelectorAll(".glossary-section");
        }

        function setActiveLetter(letter) {
            indexEl.querySelectorAll("[data-letter]").forEach(function (el) {
                var on = el.getAttribute("data-letter") === letter;
                if (el.matches("a.glossary-index__link")) {
                    el.classList.toggle("glossary-index__link--active", on);
                } else {
                    el.classList.toggle("glossary-index__letter--active", on);
                    el.classList.toggle("glossary-index__letter--inactive", !on);
                }
            });
        }

        function syncIndexLinks() {
            indexEl.querySelectorAll("[data-letter]").forEach(function (el) {
                var letter = el.getAttribute("data-letter");
                var exists = !!document.getElementById("glossary-letter-" + letter);
                if (el.matches("a.glossary-index__link")) {
                    if (!exists) {
                        var span = document.createElement("span");
                        span.className = "glossary-index__letter glossary-index__letter--inactive";
                        span.setAttribute("data-letter", letter);
                        span.textContent = letter;
                        el.replaceWith(span);
                    }
                } else if (exists) {
                    var a = document.createElement("a");
                    a.href = "#glossary-letter-" + letter;
                    a.className = "glossary-index__link";
                    a.setAttribute("data-letter", letter);
                    a.textContent = letter;
                    el.replaceWith(a);
                }
            });
        }

        function letterFromIndexPoint(clientY, clientX) {
            var rect = indexEl.getBoundingClientRect();
            if (clientX < rect.left - 32 || clientX > rect.right + 16) return null;
            var y = Math.min(rect.bottom, Math.max(rect.top, clientY));
            var ratio = (y - rect.top) / Math.max(1, rect.height - 1);
            var idx = Math.min(25, Math.max(0, Math.floor(ratio * 26)));
            return String.fromCharCode(65 + idx);
        }

        function scrollToLetter(letter, instant) {
            var target = document.getElementById("glossary-letter-" + letter);
            if (target) {
                if (instant) {
                    var margin = 12;
                    scrollEl.scrollTop = Math.max(0, target.offsetTop - margin);
                } else {
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                setActiveLetter(letter);
            }
        }

        function applyScrub(clientY, clientX) {
            var letter = letterFromIndexPoint(clientY, clientX);
            if (!letter || letter === lastScrubLetter) return;
            lastScrubLetter = letter;
            scrollToLetter(letter, true);
        }

        function syncActiveFromScroll() {
            var sections = getSections();
            if (!sections.length) return;
            var st = scrollEl.scrollTop;
            var threshold = 32;
            var current = sections[0].getAttribute("data-letter");
            for (var i = 0; i < sections.length; i++) {
                var sec = sections[i];
                if (sec.offsetTop - threshold <= st) {
                    current = sec.getAttribute("data-letter");
                }
            }
            setActiveLetter(current);
        }

        function badgeClass(index) {
            var arr = ["glossary-badge--orange", "glossary-badge--yellow", "glossary-badge--purple"];
            return arr[index % arr.length];
        }

        function esc(s) {
            return String(s == null ? "" : s)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        }

        function renderGlossary(entries) {
            var loading = document.getElementById("glossary-loading");
            if (loading) loading.remove();

            if (!entries.length) {
                scrollEl.innerHTML =
                    '<p class="trends-loading">Aucun terme disponible dans le glossaire.</p>';
                return;
            }

            entries.sort(function (a, b) {
                return a.mot.localeCompare(b.mot, "fr", { sensitivity: "base" });
            });
            var grouped = {};
            entries.forEach(function (item) {
                var letter = item.mot.charAt(0).toUpperCase();
                if (!/^[A-Z]$/.test(letter)) letter = "A";
                if (!grouped[letter]) grouped[letter] = [];
                grouped[letter].push(item);
            });

            var letters = Object.keys(grouped).sort();
            var parts = [];
            letters.forEach(function (letter) {
                parts.push(
                    '<section id="glossary-letter-' +
                        letter +
                        '" class="glossary-section" data-letter="' +
                        letter +
                        '" aria-label="Lettre ' +
                        letter +
                        '">'
                );
                grouped[letter].forEach(function (item, idx) {
                    var isExpandable = item.definition.length > 90;
                    var shortDef = isExpandable
                        ? item.definition.slice(0, 89).trim() + "…"
                        : item.definition;
                    var panelId = "glossary-panel-" + letter + "-" + idx;
                    var common =
                        '<span class="glossary-badge ' +
                        badgeClass(idx) +
                        '">' +
                        esc(item.mot) +
                        "</span>" +
                        '<p class="glossary-snippet">' +
                        esc(shortDef) +
                        "</p>" +
                        (isExpandable
                            ? '<span class="glossary-chevron" aria-hidden="true">' +
                              '<svg width="12" height="12" viewBox="0 0 12 12" fill="none">' +
                              '<path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />' +
                              "</svg></span>"
                            : '<span class="glossary-chevron" aria-hidden="true"></span>');
                    if (isExpandable) {
                        parts.push(
                            '<button type="button" class="glossary-row" aria-expanded="false" aria-controls="' +
                                panelId +
                                '" data-search="' +
                                esc((item.mot + " " + item.definition).toLowerCase()) +
                                '">' +
                                common +
                                "</button>" +
                                '<div class="glossary-panel" id="' +
                                panelId +
                                '" hidden><p class="glossary-definition">' +
                                esc(item.definition) +
                                "</p></div>"
                        );
                    } else {
                        parts.push(
                            '<article class="glossary-row glossary-row--static" data-search="' +
                                esc((item.mot + " " + item.definition).toLowerCase()) +
                                '">' +
                                common +
                                "</article>"
                        );
                    }
                });
                parts.push("</section>");
            });

            scrollEl.innerHTML = parts.join("");
            syncIndexLinks();
            syncActiveFromScroll();
        }

        function bindGlossaryAccordionAndSearch() {
            scrollEl.addEventListener("click", function (e) {
                var row = e.target.closest("button.glossary-row");
                if (!row) return;
                var expanded = row.getAttribute("aria-expanded") === "true";
                var panelId = row.getAttribute("aria-controls");
                var panel = panelId ? document.getElementById(panelId) : null;
                row.setAttribute("aria-expanded", expanded ? "false" : "true");
                row.classList.toggle("is-open", !expanded);
                if (panel) panel.hidden = expanded;
            });

            var input = document.getElementById("glossary-search-input");
            var cancel = document.getElementById("glossary-search-cancel");
            if (cancel && input) {
                cancel.addEventListener("click", function () {
                    input.value = "";
                    input.dispatchEvent(new Event("input"));
                    input.blur();
                });
                input.addEventListener("input", function () {
                    var q = input.value.trim().toLowerCase();
                    scrollEl.querySelectorAll(".glossary-row").forEach(function (row) {
                        var panelId = row.getAttribute("aria-controls");
                        var panel = panelId ? document.getElementById(panelId) : null;
                        var haystack = row.getAttribute("data-search") || "";
                        var show = !q || haystack.indexOf(q) !== -1;
                        row.style.display = show ? "" : "none";
                        if (panel) {
                            panel.hidden = true;
                            panel.style.display = show ? "" : "none";
                        }
                        if (row.matches("button.glossary-row")) {
                            row.setAttribute("aria-expanded", "false");
                            row.classList.remove("is-open");
                        }
                    });
                    scrollEl.querySelectorAll(".glossary-section").forEach(function (sec) {
                        var visible = !!sec.querySelector('.glossary-row:not([style*="display: none"])');
                        sec.style.display = visible ? "" : "none";
                    });
                    syncActiveFromScroll();
                });
            }
        }

        scrollEl.addEventListener("scroll", syncActiveFromScroll, { passive: true });

        indexEl.addEventListener(
            "click",
            function (e) {
                if (!suppressIndexLinkClick) return;
                if (e.target.closest('a[href^="#glossary-letter-"]')) {
                    e.preventDefault();
                }
                suppressIndexLinkClick = false;
            },
            true
        );

        indexEl.addEventListener("click", function (e) {
            var a = e.target.closest('a[href^="#glossary-letter-"]');
            if (!a) return;
            e.preventDefault();
            var id = a.getAttribute("href").slice(1);
            var target = document.getElementById(id);
            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
            var letter = id.replace("glossary-letter-", "");
            if (letter.length === 1) setActiveLetter(letter);
        });

        indexEl.addEventListener("pointerdown", function (e) {
            if (typeof e.button === "number" && e.button !== 0) return;
            scrubPointerId = e.pointerId;
            scrubStartY = e.clientY;
            scrubMode = false;
            lastScrubLetter = "";
            indexEl.setPointerCapture(e.pointerId);
        });

        indexEl.addEventListener("pointermove", function (e) {
            if (scrubPointerId !== e.pointerId) return;
            if (!scrubMode && Math.abs(e.clientY - scrubStartY) > 6) {
                scrubMode = true;
                indexEl.classList.add("glossary-index--scrubbing");
            }
            if (scrubMode) {
                e.preventDefault();
                applyScrub(e.clientY, e.clientX);
            }
        });

        indexEl.addEventListener("pointerup", function (e) {
            if (scrubPointerId !== e.pointerId) return;
            scrubPointerId = null;
            indexEl.classList.remove("glossary-index--scrubbing");
            try {
                indexEl.releasePointerCapture(e.pointerId);
            } catch (err) {}
            if (scrubMode) {
                suppressIndexLinkClick = true;
                syncActiveFromScroll();
            }
            scrubMode = false;
            lastScrubLetter = "";
        });

        indexEl.addEventListener("pointercancel", function (e) {
            if (scrubPointerId !== e.pointerId) return;
            scrubPointerId = null;
            indexEl.classList.remove("glossary-index--scrubbing");
            scrubMode = false;
            lastScrubLetter = "";
            try {
                indexEl.releasePointerCapture(e.pointerId);
            } catch (err2) {}
        });

        bindGlossaryAccordionAndSearch();

        var T = window.TrendslatorData;
        if (T && typeof T.loadGlossary === "function") {
            T.loadGlossary()
                .then(function (data) {
                    renderGlossary(T.normalizeGlossary(data));
                })
                .catch(function () {
                    var loading = document.getElementById("glossary-loading");
                    if (loading) {
                        loading.textContent = "Impossible de charger le glossaire.";
                    }
                    syncIndexLinks();
                });
        } else {
            syncIndexLinks();
            syncActiveFromScroll();
        }
    }

    function initSearchPage() {
        var input = document.getElementById("search-page-input");
        var cancel = document.getElementById("search-page-cancel");
        var globalRoot = document.getElementById("search-global-results");
        var helpEl = document.getElementById("search-global-help");
        var refreshBtn = document.getElementById("search-refresh-btn");
        if (!input || !globalRoot) return;

        var T = window.TrendslatorData;
        var store = { trends: [], old: [], glossary: [] };

        function esc(s) {
            return String(s == null ? "" : s)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        }

        function hit(text, q) {
            return String(text || "").toLowerCase().indexOf(q) !== -1;
        }

        function renderGroups(groups, q) {
            if (!q) {
                globalRoot.innerHTML = "";
                if (helpEl) {
                    helpEl.textContent =
                        "Tape un mot pour rechercher dans toutes les données (trends, anciennes trends, glossaire).";
                }
                return;
            }
            var hasAny = groups.some(function (g) {
                return g.items.length > 0;
            });
            if (!hasAny) {
                globalRoot.innerHTML =
                    '<p class="search-global-help">Aucun résultat pour « ' + esc(q) + " ».</p>";
                return;
            }
            globalRoot.innerHTML = groups
                .map(function (g) {
                    if (!g.items.length) return "";
                    return (
                        '<section class="search-global-group">' +
                        '<h3 class="search-global-group__title">' +
                        esc(g.title) +
                        " (" +
                        g.items.length +
                        ")</h3>" +
                        '<ul class="search-global-list">' +
                        g.items
                            .map(function (it) {
                                var isLink = !!it.href;
                                var tag = isLink ? "a" : "div";
                                var href = isLink ? ' href="' + esc(it.href) + '"' : "";
                                return (
                                    "<li><" +
                                    tag +
                                    ' class="search-global-item"' +
                                    href +
                                    ">" +
                                    '<p class="search-global-item__title">' +
                                    esc(it.title) +
                                    "</p>" +
                                    (it.meta
                                        ? '<p class="search-global-item__meta">' + esc(it.meta) + "</p>"
                                        : "") +
                                    (it.snippet
                                        ? '<p class="search-global-item__snippet">' +
                                          esc(it.snippet) +
                                          "</p>"
                                        : "") +
                                    "</" +
                                    tag +
                                    "></li>"
                                );
                            })
                            .join("") +
                        "</ul></section>"
                    );
                })
                .join("");
        }

        function filterAll(q) {
            var qq = q.toLowerCase();
            var trends = store.trends
                .filter(function (t) {
                    return hit(t.ti, qq) || hit(t.d, qq) || hit(t.m, qq) || hit((t.ty || []).join(" "), qq);
                })
                .slice(0, 20)
                .map(function (t) {
                    return {
                        title: t.ti,
                        meta: "Trend du moment",
                        snippet: t.d,
                        href: "trends.html?trend=" + encodeURIComponent(t.id)
                    };
                });

            var old = store.old
                .filter(function (t) {
                    return hit(t.title, qq) || hit(t.description, qq) || hit(t.tag, qq) || hit(t.category, qq);
                })
                .slice(0, 20)
                .map(function (t) {
                    return {
                        title: t.title,
                        meta: [t.tag, t.category].filter(Boolean).join(" · ") || "Ancienne trend",
                        snippet: t.description,
                        href: "trends.html?tab=old"
                    };
                });

            var glossary = store.glossary
                .filter(function (g) {
                    return hit(g.mot, qq) || hit(g.definition, qq);
                })
                .slice(0, 20)
                .map(function (g) {
                    var letter = g.mot.charAt(0).toUpperCase();
                    return {
                        title: g.mot,
                        meta: "Glossaire",
                        snippet: g.definition,
                        href: "glossaire.html#glossary-letter-" + encodeURIComponent(letter)
                    };
                });

            renderGroups(
                [
                    { title: "Trends du moment", items: trends },
                    { title: "Anciennes trends", items: old },
                    { title: "Glossaire", items: glossary }
                ],
                q
            );
        }

        function loadSearchData() {
            if (!T) {
                if (helpEl) helpEl.textContent = "Module de recherche indisponible.";
                return;
            }
            Promise.all([
                T.load().catch(function () {
                    return null;
                }),
                T.loadOldTrends().catch(function () {
                    return null;
                }),
                T.loadGlossary().catch(function () {
                    return null;
                })
            ]).then(function (res) {
                var trendsRaw = res[0];
                var oldRaw = res[1];
                var glossRaw = res[2];
                store.trends = trendsRaw ? T.normalizeAll(trendsRaw).list : [];
                store.old = oldRaw ? T.normalizeOldTrends(oldRaw) : [];
                store.glossary = glossRaw ? T.normalizeGlossary(glossRaw) : [];
                filterAll(input.value.trim());
            });
        }

        if (cancel) {
            cancel.addEventListener("click", function () {
                input.value = "";
                filterAll("");
                input.blur();
            });
        }
        input.addEventListener("input", function () {
            filterAll(input.value.trim());
        });
        if (refreshBtn) {
            refreshBtn.addEventListener("click", function () {
                loadSearchData();
            });
        }

        loadSearchData();
    }

    function initTrendsTabs() {
        var tabs = document.querySelectorAll("[data-trends-tab]");
        if (!tabs.length) return;
        var panelNew = document.getElementById("trends-panel-new");
        var panelOld = document.getElementById("trends-panel-old");

        function activate(name) {
            tabs.forEach(function (btn) {
                var on = btn.getAttribute("data-trends-tab") === name;
                btn.classList.toggle("is-active", on);
                btn.setAttribute("aria-selected", on ? "true" : "false");
            });
            if (panelNew) panelNew.hidden = name !== "new";
            if (panelOld) panelOld.hidden = name !== "old";
        }

        tabs.forEach(function (btn) {
            btn.addEventListener("click", function () {
                activate(btn.getAttribute("data-trends-tab"));
            });
        });

        var requested = new URLSearchParams(window.location.search).get("tab");
        activate(requested === "old" ? "old" : "new");
    }

    function initTrendSheet() {
        window.TrendslatorOpenSheet = function () {};

        var root = document.getElementById("trend-sheet");
        if (!root) return;

        var panel = document.getElementById("trend-sheet-panel");
        var backdrop = root.querySelector(".trend-sheet__backdrop");
        var scroller = document.getElementById("trend-sheet-scroller");
        var handle = document.getElementById("trend-sheet-handle");
        var contentEl = document.getElementById("trend-sheet-dynamic");

        var startY = 0;
        var dragY = 0;
        var dragging = false;
        var startedInHandle = false;

        function pointInRect(cy, cx, rect) {
            if (!rect || rect.width === 0) return false;
            return cy >= rect.top && cy <= rect.bottom && cx >= rect.left && cx <= rect.right;
        }

        function resolveTrend(id) {
            var map = window.__trendById;
            return map && map[id] ? map[id] : null;
        }

        function showTrend(id) {
            var t = resolveTrend(id);
            var T = window.TrendslatorData;
            if (!contentEl || !t || !T) return false;
            contentEl.innerHTML = T.detailHtml(t);
            contentEl.setAttribute("data-trend-id", id);
            contentEl.hidden = false;
            return true;
        }

        function openSheet(id) {
            if (!showTrend(id)) return;
            scroller.scrollTop = 0;
            panel.style.transition = "";
            panel.style.transform = "";
            panel.classList.remove("is-dragging");
            root.classList.add("is-open");
            root.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
        }

        function closeSheet() {
            panel.classList.remove("is-dragging");
            panel.style.transition = "transform 0.34s cubic-bezier(0.32, 0.72, 0, 1)";
            panel.style.transform = "translateY(110%)";
            document.body.style.overflow = "";

            panel.addEventListener(
                "transitionend",
                function onTE(ev) {
                    if (ev.propertyName !== "transform") return;
                    panel.removeEventListener("transitionend", onTE);
                    root.classList.remove("is-open");
                    root.setAttribute("aria-hidden", "true");
                    panel.style.transition = "";
                    panel.style.transform = "";
                    if (contentEl) {
                        contentEl.hidden = true;
                        contentEl.innerHTML = "";
                    }
                },
                { once: true }
            );
        }

        function snapPanelOpen() {
            panel.classList.remove("is-dragging");
            panel.style.transition = "transform 0.22s ease-out";
            panel.style.transform = "translateY(0)";
            panel.addEventListener(
                "transitionend",
                function onSnap(ev) {
                    if (ev.propertyName !== "transform") return;
                    panel.removeEventListener("transitionend", onSnap);
                    panel.style.transition = "";
                    panel.style.transform = "";
                },
                { once: true }
            );
        }

        window.TrendslatorOpenSheet = openSheet;

        document.addEventListener("click", function (e) {
            var el = e.target.closest("[data-open-trend]");
            if (!el) return;
            openSheet(el.getAttribute("data-open-trend"));
        });

        document.addEventListener("keydown", function (e) {
            if (e.key !== "Enter" && e.key !== " ") return;
            var el = e.target.closest("[data-open-trend]");
            if (!el) return;
            e.preventDefault();
            openSheet(el.getAttribute("data-open-trend"));
        });

        backdrop.addEventListener("click", closeSheet);

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && root.classList.contains("is-open")) {
                closeSheet();
            }
        });

        panel.addEventListener(
            "touchstart",
            function (e) {
                if (!root.classList.contains("is-open")) return;
                startY = e.touches[0].clientY;
                startedInHandle =
                    handle &&
                    pointInRect(startY, e.touches[0].clientX, handle.getBoundingClientRect());
                dragging = true;
                dragY = 0;
                panel.classList.add("is-dragging");
            },
            { passive: true }
        );

        panel.addEventListener(
            "touchmove",
            function (e) {
                if (!dragging || !root.classList.contains("is-open")) return;
                var y = e.touches[0].clientY;
                var dy = y - startY;
                var st = scroller.scrollTop;

                if (startedInHandle) {
                    if (dy > 0) {
                        e.preventDefault();
                        dragY = dy;
                        panel.style.transform = "translateY(" + dy + "px)";
                    }
                    return;
                }

                if (st > 0) return;
                if (dy > 0) {
                    e.preventDefault();
                    dragY = dy;
                    panel.style.transform = "translateY(" + dy + "px)";
                }
            },
            { passive: false }
        );

        function onTouchEnd() {
            if (!dragging) return;
            dragging = false;
            if (!root.classList.contains("is-open")) {
                panel.classList.remove("is-dragging");
                return;
            }
            var threshold = Math.min(110, window.innerHeight * 0.16);
            if (dragY > threshold) {
                closeSheet();
            } else if (dragY > 0) {
                snapPanelOpen();
            } else {
                panel.classList.remove("is-dragging");
                panel.style.transform = "";
            }
            dragY = 0;
            startedInHandle = false;
        }

        panel.addEventListener("touchend", onTouchEnd, { passive: true });
        panel.addEventListener("touchcancel", onTouchEnd, { passive: true });
    }

    var STATIC_QUIZ_QUESTIONS = [
        {
            question: 'Que signifie l\'expression "C\'est ciao" ?',
            answers: [
                { text: "A. C'est l'heure de manger", correct: false },
                { text: "B. C'est terminé / c'est raté", correct: true },
                { text: "C. C'est dommage", correct: false }
            ],
            feedback: 'Exact. "C\'est ciao" veut dire que c\'est fini, mort, terminé.'
        },
        {
            question: 'Que veut dire "être en goumin" ?',
            answers: [
                { text: "A. Être en chagrin d'amour", correct: true },
                { text: "B. Être très en colère", correct: false },
                { text: "C. Être très riche", correct: false }
            ],
            feedback: 'Bien vu. "Goumin" renvoie au chagrin d\'amour.'
        },
        {
            question: 'Quand quelqu\'un dit "cheh", il veut dire quoi ?',
            answers: [
                { text: "A. Je suis choqué", correct: false },
                { text: "B. Bien fait pour toi", correct: true },
                { text: "C. Viens ici", correct: false }
            ],
            feedback: 'Oui. "Cheh" exprime clairement le "bien fait".'
        }
    ];

    var homeQuizBound = false;
    var quizState = { items: STATIC_QUIZ_QUESTIONS, current: 0, locked: false };

    function escapeQuizHtml(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function initHomeQuiz(questions) {
        var questionEl = document.getElementById("tt-quiz-question");
        var optionsEl = document.getElementById("tt-quiz-options");
        var feedbackEl = document.getElementById("tt-quiz-feedback");
        var nextBtn = document.getElementById("tt-quiz-next");
        if (!questionEl || !optionsEl || !feedbackEl || !nextBtn) return;

        quizState.items =
            questions && questions.length >= 3 ? questions : STATIC_QUIZ_QUESTIONS;
        quizState.current = 0;
        quizState.locked = false;

        function renderQuestion() {
            var item = quizState.items[quizState.current];
            quizState.locked = false;
            questionEl.textContent = item.question;
            feedbackEl.textContent = "";
            nextBtn.hidden = true;
            optionsEl.innerHTML = item.answers
                .map(function (a) {
                    return (
                        '<button type="button" class="tt-quiz-btn" data-correct="' +
                        !!a.correct +
                        '">' +
                        escapeQuizHtml(a.text) +
                        "</button>"
                    );
                })
                .join("");
        }

        function handleAnswer(btn) {
            if (quizState.locked) return;
            quizState.locked = true;
            var item = quizState.items[quizState.current];
            var isCorrect = btn.getAttribute("data-correct") === "true";
            var buttons = optionsEl.querySelectorAll(".tt-quiz-btn");

            buttons.forEach(function (button) {
                var correct = button.getAttribute("data-correct") === "true";
                button.classList.add("is-disabled");
                if (correct) button.classList.add("is-correct");
                if (button === btn && !isCorrect) button.classList.add("is-wrong");
            });

            feedbackEl.textContent = isCorrect
                ? item.feedback
                : "Pas tout à fait. La bonne réponse est surlignée en jaune.";

            nextBtn.hidden = false;
        }

        if (!homeQuizBound) {
            homeQuizBound = true;
            optionsEl.addEventListener("click", function (e) {
                var btn = e.target.closest(".tt-quiz-btn");
                if (!btn || btn.classList.contains("is-disabled")) return;
                handleAnswer(btn);
            });
            nextBtn.addEventListener("click", function () {
                quizState.current = (quizState.current + 1) % quizState.items.length;
                renderQuestion();
            });
        }

        renderQuestion();
    }

    function trendslatorHydrate() {
        var T = window.TrendslatorData;
        var needsData =
            document.getElementById("home-featured-root") ||
            document.getElementById("trends-cards-root") ||
            document.getElementById("search-trends-list") ||
            document.getElementById("old-trends-root");

        if (document.getElementById("tt-quiz-question")) {
            initHomeQuiz(STATIC_QUIZ_QUESTIONS);
        }

        if (!T || !needsData) {
            return;
        }

        Promise.all([
            T.load().catch(function () {
                return null;
            }),
            T.loadOldTrends().catch(function () {
                return null;
            })
        ])
            .then(function (results) {
                var data = results[0];
                var oldData = results[1];
                if (!data) throw new Error("trends_missing");
                var norm = T.normalizeAll(data);
                window.__trendById = norm.byId;

                var featuredRoot = document.getElementById("home-featured-root");
                if (featuredRoot) {
                    var f = T.pickFeatured(norm.list);
                    if (f) {
                        var img = document.getElementById("home-featured-img");
                        var titleEl = document.getElementById("home-featured-title");
                        var descEl = document.getElementById("home-featured-desc");
                        var linkEl = document.getElementById("home-featured-link");
                        if (img) {
                            img.src = T.thumbnailFor(f);
                            img.alt = "Illustration — " + f.ti;
                        }
                        if (titleEl) titleEl.textContent = f.ti;
                        if (descEl) descEl.textContent = f.d;
                        if (linkEl) linkEl.href = "trends.html?trend=" + encodeURIComponent(f.id);
                        var mot = f.hashtag || (f.m && f.m.replace(/^#\s*/, "")) || f.ti.split(/\s+/)[0];
                        var wh = document.getElementById("word-of-day-highlight");
                        var wd = document.getElementById("word-of-day-definition");
                        if (wh) wh.textContent = mot;
                        if (wd) wd.textContent = f.d;
                    }
                }

                var trendsRoot = document.getElementById("trends-cards-root");
                var loadingEl = document.getElementById("trends-loading");
                if (trendsRoot) {
                    trendsRoot.innerHTML = norm.list
                        .map(function (t, i) {
                            return T.cardHtml(t, i);
                        })
                        .join("");
                    trendsRoot.hidden = false;
                    if (loadingEl) loadingEl.hidden = true;

                    var tid = new URLSearchParams(window.location.search).get("trend");
                    if (tid && norm.byId[tid] && typeof window.TrendslatorOpenSheet === "function") {
                        requestAnimationFrame(function () {
                            window.TrendslatorOpenSheet(tid);
                        });
                    }
                }

                var oldRoot = document.getElementById("old-trends-root");
                var oldLoadingEl = document.getElementById("old-trends-loading");
                if (oldRoot) {
                    var oldItems = T.normalizeOldTrends(oldData || []);
                    if (oldItems.length) {
                        oldRoot.innerHTML = oldItems.map(T.oldTrendCardHtml).join("");
                        oldRoot.hidden = false;
                        if (oldLoadingEl) oldLoadingEl.hidden = true;
                    } else if (oldLoadingEl) {
                        oldLoadingEl.textContent = "Aucune ancienne trend disponible.";
                    }
                }

                var searchUl = document.getElementById("search-trends-list");
                if (searchUl) {
                    searchUl.innerHTML = T.searchHitsHtml(norm.list, 12);
                }

                var dynQuiz = T.buildQuizQuestions(norm.list, 3);
                if (document.getElementById("tt-quiz-question")) {
                    initHomeQuiz(dynQuiz || STATIC_QUIZ_QUESTIONS);
                }
            })
            .catch(function () {
                window.__trendById = window.__trendById || {};
                if (document.getElementById("tt-quiz-question")) {
                    initHomeQuiz(STATIC_QUIZ_QUESTIONS);
                }
                var titleEl = document.getElementById("home-featured-title");
                if (titleEl && titleEl.textContent.indexOf("Chargement") !== -1) {
                    titleEl.textContent = "Tendances indisponibles";
                }
                var descEl = document.getElementById("home-featured-desc");
                if (descEl && !descEl.textContent.trim()) {
                    descEl.textContent =
                        "Ouvrez la page Trends une fois le fichier trend_detector/data/trends.json accessible (serveur local ou déploiement).";
                }
                var whFail = document.getElementById("word-of-day-highlight");
                if (whFail && /\u2026|^\s*$/.test(whFail.textContent.trim())) {
                    whFail.textContent = "—";
                }
                var wdFail = document.getElementById("word-of-day-definition");
                if (wdFail && !wdFail.textContent.trim()) {
                    wdFail.textContent =
                        "Les tendances n’ont pas pu être chargées. Vérifiez la connexion ou le chemin trend_detector/data/trends.json.";
                }
                var loadingEl = document.getElementById("trends-loading");
                if (loadingEl) {
                    loadingEl.textContent = "Impossible de charger les tendances. Vérifiez la connexion.";
                }
                var oldLoadingEl = document.getElementById("old-trends-loading");
                if (oldLoadingEl) {
                    oldLoadingEl.textContent =
                        "Impossible de charger les anciennes trends.";
                }
                var searchUlFail = document.getElementById("search-trends-list");
                if (searchUlFail && !searchUlFail.querySelector("a.search-hit")) {
                    searchUlFail.innerHTML =
                        "<li><span class=\"search-hit__label search-hit__label--muted\">Impossible de charger les tendances.</span></li>";
                }
            });
    }

    function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) return;
        navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
    }

    document.addEventListener("DOMContentLoaded", function () {
        initGlossary();
        initSearchPage();
        initTrendsTabs();
        initTrendSheet();
        trendslatorHydrate();
        registerServiceWorker();
    });
})();
