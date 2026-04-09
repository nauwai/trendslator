(function () {
    function initGlossary() {
        var scrollEl = document.getElementById("glossary-scroll");
        var indexEl = document.getElementById("glossary-index");
        if (!scrollEl || !indexEl) return;

        var sections = scrollEl.querySelectorAll(".glossary-section");
        var scrubPointerId = null;
        var scrubStartY = 0;
        var scrubMode = false;
        var lastScrubLetter = "";
        var suppressIndexLinkClick = false;

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
            }
            setActiveLetter(letter);
        }

        function applyScrub(clientY, clientX) {
            var letter = letterFromIndexPoint(clientY, clientX);
            if (!letter || letter === lastScrubLetter) return;
            lastScrubLetter = letter;
            scrollToLetter(letter, true);
        }

        function syncActiveFromScroll() {
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

        scrollEl.addEventListener("scroll", syncActiveFromScroll, { passive: true });
        syncActiveFromScroll();

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

        indexEl.querySelectorAll('a[href^="#glossary-letter-"]').forEach(function (a) {
            a.addEventListener("click", function (e) {
                e.preventDefault();
                var id = a.getAttribute("href").slice(1);
                var target = document.getElementById(id);
                if (target) {
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                var letter = id.replace("glossary-letter-", "");
                if (letter.length === 1) setActiveLetter(letter);
            });
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

        var input = document.getElementById("glossary-search-input");
        var cancel = document.getElementById("glossary-search-cancel");
        if (cancel && input) {
            cancel.addEventListener("click", function () {
                input.value = "";
                input.blur();
            });
        }

        if (window.location.hash === "#glossary-letter-D") {
            var d = document.getElementById("glossary-letter-D");
            if (d) {
                requestAnimationFrame(function () {
                    d.scrollIntoView({ behavior: "auto", block: "start" });
                    syncActiveFromScroll();
                });
            }
        }
    }

    function initSearchPage() {
        var input = document.getElementById("search-page-input");
        var cancel = document.getElementById("search-page-cancel");
        if (cancel && input) {
            cancel.addEventListener("click", function () {
                input.value = "";
                input.blur();
            });
        }
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
            document.getElementById("search-trends-list");

        if (document.getElementById("tt-quiz-question")) {
            initHomeQuiz(STATIC_QUIZ_QUESTIONS);
        }

        if (!T || !needsData) {
            return;
        }

        T.load()
            .then(function (data) {
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
        initTrendSheet();
        trendslatorHydrate();
        registerServiceWorker();
    });
})();
