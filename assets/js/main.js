(function () {
    function initGlossary() {
        var scrollEl = document.getElementById("glossary-scroll");
        var indexEl = document.getElementById("glossary-index");
        if (!scrollEl || !indexEl) return;

        var sections = scrollEl.querySelectorAll(".glossary-section");
        var links = indexEl.querySelectorAll(".glossary-index__link[data-letter]");

        function setActiveLetter(letter) {
            links.forEach(function (link) {
                var on = link.getAttribute("data-letter") === letter;
                link.classList.toggle("glossary-index__link--active", on);
            });
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
        var root = document.getElementById("trend-sheet");
        if (!root) return;

        var panel = document.getElementById("trend-sheet-panel");
        var backdrop = root.querySelector(".trend-sheet__backdrop");
        var scroller = document.getElementById("trend-sheet-scroller");
        var handle = document.getElementById("trend-sheet-handle");
        var openers = document.querySelectorAll("[data-open-trend]");
        var contents = root.querySelectorAll(".trend-sheet__content[data-trend-id]");

        var startY = 0;
        var dragY = 0;
        var dragging = false;
        var startedInHandle = false;

        function pointInRect(cy, cx, rect) {
            if (!rect || rect.width === 0) return false;
            return cy >= rect.top && cy <= rect.bottom && cx >= rect.left && cx <= rect.right;
        }

        function showTrend(id) {
            contents.forEach(function (el) {
                el.hidden = el.getAttribute("data-trend-id") !== id;
            });
        }

        function openSheet(id) {
            showTrend(id);
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
                    contents.forEach(function (el) {
                        el.hidden = true;
                    });
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

        openers.forEach(function (el) {
            el.addEventListener("click", function () {
                openSheet(el.getAttribute("data-open-trend"));
            });
            el.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openSheet(el.getAttribute("data-open-trend"));
                }
            });
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
                startedInHandle = pointInRect(startY, e.touches[0].clientX, handle.getBoundingClientRect());
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

    function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) return;
        navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
    }

    document.addEventListener("DOMContentLoaded", function () {
        initGlossary();
        initSearchPage();
        initTrendSheet();
        registerServiceWorker();
    });
})();
