(function () {
    var JSON_URL = "trend_detector/data/trends.json";
    var OLD_TRENDS_URL = "trend_detector/data/old_trends.json";
    var OLD_TRENDS_URL_FALLBACK = "trend_detector/data/old_trend.json";
    var GLOSSARY_URL = "trend_detector/data/glossaire.json";
    var GLOSSARY_URL_FALLBACK = "trend_detector/data/glossary.json";
    var THUMBNAILS = [
        "assets/img/thumbnail/skibiditentafruit.png",
        "assets/img/thumbnail/kiki-pitchoune.jpg"
    ];
    var ACCENTS = ["purple", "yellow"];
    var META_TAG_CLASSES = ["trend-tag--purple", "trend-tag--orange", "trend-tag--challenge"];

    function escapeHtml(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function slugify(ti) {
        var base = String(ti || "trend")
            .normalize("NFD")
            .replace(/\p{M}/gu, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        return base || "trend";
    }

    function vigilanceFromDu(du) {
        var n = typeof du === "number" ? du : parseInt(du, 10);
        if (!n || n < 0) n = 1;
        return Math.max(8, Math.min(98, Math.round((Math.min(n, 12) / 12) * 100)));
    }

    function normalizeCover(cover) {
        if (!cover) return "";
        var v = String(cover).trim();
        if (!v) return "";
        if (/^https?:\/\//i.test(v)) return v;
        if (/^(?:\.{1,2}\/|\/|assets\/)/i.test(v)) return v;
        return "";
    }

    function normalizeAll(data) {
        var raw = (data && data.tendances) || [];
        var list = [];
        var byId = {};
        var used = {};

        raw.forEach(function (t, i) {
            var base = slugify(t.ti);
            var id = base;
            var suf = 0;
            while (used[id]) {
                suf += 1;
                id = base + "-" + suf;
            }
            used[id] = true;

            var du = typeof t.du === "number" ? t.du : parseInt(t.du, 10);
            if (isNaN(du)) du = 6;

            var tag = (t.hashtag || "").replace(/^#/, "").trim();
            var m = (t.m || "").trim();

            var trend = {
                id: id,
                ti: t.ti || "",
                m: m,
                d: t.d || "",
                ty: Array.isArray(t.ty) ? t.ty : [],
                v: t.v || "",
                da: t.da || "",
                du: du,
                vigilancePct: vigilanceFromDu(du),
                c: Array.isArray(t.c) ? t.c : [],
                hashtag: tag,
                overallPosts: t["Overall Posts"] || "",
                overallViews: t["Overall Views"] || "",
                viewsPerPost: t["Views / Post"] || "",
                video_views: typeof t.video_views === "number" ? t.video_views : parseInt(t.video_views, 10) || 0,
                cover: normalizeCover(t.cover),
                thumbIndex: i
            };
            list.push(trend);
            byId[id] = trend;
        });

        return { list: list, synthese: data && data.synthese, byId: byId };
    }

    function pickFeatured(list) {
        if (!list.length) return null;
        return list.reduce(function (best, t) {
            var vb = best.video_views || 0;
            var vt = t.video_views || 0;
            return vt > vb ? t : best;
        });
    }

    function thumbnailFor(trend) {
        if (trend && trend.cover) return trend.cover;
        return THUMBNAILS[trend.thumbIndex % THUMBNAILS.length];
    }

    function truncate(text, max) {
        var s = String(text || "").trim();
        if (s.length <= max) return s;
        return s.slice(0, max - 1).trim() + "…";
    }

    function cardHtml(t, index) {
        var accent = ACCENTS[index % ACCENTS.length];
        var thumb = thumbnailFor(t);
        var desc = truncate(t.d, 180);
        /* Indice de vigilance — désactivé temporairement
        var vig = t.vigilancePct;
        var vigilanceHtml =
            "<div class=\"trend-hero__vigilance trend-card__vigilance\" role=\"status\">" +
            "<svg class=\"trend-hero__vigilance-icon\" width=\"18\" height=\"18\" viewBox=\"0 0 18 18\" fill=\"none\" aria-hidden=\"true\">" +
            "<path d=\"M9 2L2 15h14L9 2z\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linejoin=\"round\"/>" +
            "<path d=\"M9 7v4M9 12h.01\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/>" +
            "</svg>" +
            "<span class=\"trend-hero__vigilance-text\">Indice de vigilance : " +
            vig +
            "%</span>" +
            "<span class=\"trend-hero__vigilance-info\" title=\"Information\" aria-label=\"Plus d’informations sur l’indice\">" +
            "<svg width=\"14\" height=\"14\" viewBox=\"0 0 14 14\" fill=\"none\" aria-hidden=\"true\">" +
            "<circle cx=\"7\" cy=\"7\" r=\"6\" stroke=\"currentColor\" stroke-width=\"1.2\"/>" +
            "<path d=\"M7 6v4M7 4h.01\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>" +
            "</svg></span></div>";
        */
        var vigilanceHtml = "";
        return (
            "<article class=\"trend-card trend-card--link\" data-open-trend=\"" +
            escapeHtml(t.id) +
            "\" tabindex=\"0\" role=\"button\" aria-haspopup=\"dialog\" aria-controls=\"trend-sheet\">" +
            "<div class=\"trend-card__media\">" +
            "<img src=\"" +
            escapeHtml(thumb) +
            "\" alt=\"\" width=\"900\" height=\"506\" loading=\"" +
            (index === 0 ? "eager" : "lazy") +
            "\"/>" +
            vigilanceHtml +
            "</div>" +
            "<div class=\"trend-card__accent trend-card__accent--" +
            accent +
            "\" aria-hidden=\"true\"></div>" +
            "<div class=\"trend-card__body\">" +
            "<h2 class=\"trend-card__title\">" +
            escapeHtml(t.ti) +
            "</h2>" +
            "<p class=\"trend-card__desc\">" +
            escapeHtml(desc) +
            "</p>" +
            "<div class=\"trend-card__actions\">" +
            "<span class=\"btn-brutal trend-card__cta\">Lire la suite</span>" +
            "</div>" +
            "</div></article>"
        );
    }

    function detailHtml(t) {
        var accent = ACCENTS[t.thumbIndex % ACCENTS.length];
        var thumb = thumbnailFor(t);
        /* Indice de vigilance — désactivé temporairement
        var vig = t.vigilancePct;
        var vigilanceHtml =
            "<div class=\"trend-hero__vigilance\" role=\"status\">" +
            "<svg class=\"trend-hero__vigilance-icon\" width=\"18\" height=\"18\" viewBox=\"0 0 18 18\" fill=\"none\" aria-hidden=\"true\">" +
            "<path d=\"M9 2L2 15h14L9 2z\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linejoin=\"round\"/>" +
            "<path d=\"M9 7v4M9 12h.01\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/>" +
            "</svg>" +
            "<span class=\"trend-hero__vigilance-text\">Indice de vigilance : " +
            vig +
            "%</span>" +
            "<span class=\"trend-hero__vigilance-info\" title=\"Information\" aria-label=\"Plus d’informations sur l’indice\">" +
            "<svg width=\"14\" height=\"14\" viewBox=\"0 0 14 14\" fill=\"none\" aria-hidden=\"true\">" +
            "<circle cx=\"7\" cy=\"7\" r=\"6\" stroke=\"currentColor\" stroke-width=\"1.2\"/>" +
            "<path d=\"M7 6v4M7 4h.01\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>" +
            "</svg></span></div>";
        */
        var vigilanceHtml = "";
        var play =
            t.v && /^https?:\/\//i.test(t.v)
                ? "<div class=\"trend-hero__player-slot\" hidden aria-hidden=\"true\"></div>" +
                  "<button type=\"button\" class=\"trend-hero__video-close\" hidden aria-label=\"Fermer la vidéo\">" +
                  "<svg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" aria-hidden=\"true\">" +
                  "<path d=\"M5 5l10 10M15 5L5 15\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>" +
                  "</button>" +
                  "<button type=\"button\" class=\"trend-hero__play\" data-trend-video-url=\"" +
                  escapeHtml(t.v) +
                  "\" aria-label=\"Lire la vidéo\">" +
                  "<svg width=\"28\" height=\"28\" viewBox=\"0 0 28 28\" fill=\"none\" aria-hidden=\"true\">" +
                  "<path d=\"M11 8l10 6-10 6V8z\" fill=\"currentColor\"/></svg></button>"
                : "";

        var metaItems = [];
        var mi = 0;
        if (t.da) {
            var cls0 = META_TAG_CLASSES[mi % META_TAG_CLASSES.length];
            mi += 1;
            metaItems.push(
                "<li class=\"trend-detail__meta-row\"><span class=\"trend-detail__meta-key\">Période observée :</span>" +
                    "<span class=\"trend-tag " +
                    cls0 +
                    "\">" +
                    escapeHtml(t.da) +
                    "</span></li>"
            );
        }
        var signal = (t.m && String(t.m).trim()) || "";
        if (!signal && t.hashtag) {
            var h = String(t.hashtag).trim();
            signal = h.indexOf("#") === 0 ? h : "#" + h;
        }
        if (signal) {
            var cls1 = META_TAG_CLASSES[mi % META_TAG_CLASSES.length];
            mi += 1;
            metaItems.push(
                "<li class=\"trend-detail__meta-row\"><span class=\"trend-detail__meta-key\">Hashtag / signal :</span>" +
                    "<span class=\"trend-tag " +
                    cls1 +
                    "\">" +
                    escapeHtml(signal) +
                    "</span></li>"
            );
        }
        if (t.overallViews) {
            var cls2 = META_TAG_CLASSES[mi % META_TAG_CLASSES.length];
            metaItems.push(
                "<li class=\"trend-detail__meta-row\"><span class=\"trend-detail__meta-key\">Vues (agrégat) :</span>" +
                    "<span class=\"trend-tag " +
                    cls2 +
                    "\">" +
                    escapeHtml(t.overallViews) +
                    "</span></li>"
            );
        }
        var metaBlock =
            metaItems.length > 0
                ? "<ul class=\"trend-tags trend-detail__meta-tags\" aria-label=\"Signaux et statistiques\">" +
                  metaItems.join("") +
                  "</ul>"
                : "";

        return (
            "<div class=\"trend-hero\">" +
            "<div class=\"trend-hero__media\">" +
            "<img class=\"trend-hero__poster\" src=\"" +
            escapeHtml(thumb) +
            "\" alt=\"\" width=\"900\" height=\"506\" loading=\"lazy\"/>" +
            vigilanceHtml +
            play +
            "</div>" +
            "<div class=\"trend-hero__divider trend-hero__divider--" +
            accent +
            "\" aria-hidden=\"true\"></div>" +
            "<div class=\"trend-detail__inner\">" +
            metaBlock +
            "<h1 class=\"trend-detail__title\">" +
            escapeHtml(t.ti) +
            "</h1>" +
            "<div class=\"trend-detail__body\">" +
            "<p>" +
            escapeHtml(t.d) +
            "</p></div></div></div>"
        );
    }

    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        return a;
    }

    function buildQuizQuestions(list, count) {
        count = count || 3;
        if (!list || list.length < 3) return null;
        var pool = list.slice();
        var out = [];
        for (var q = 0; q < count; q++) {
            if (pool.length < 3) break;
            var ci = Math.floor(Math.random() * pool.length);
            var correct = pool[ci];
            var others = pool.filter(function (_, i) {
                return i !== ci;
            });
            others = shuffle(others);
            var w1 = others[0];
            var w2 = others[1];
            var opts = shuffle([
                { text: correct.ti, correct: true },
                { text: w1.ti, correct: false },
                { text: w2.ti, correct: false }
            ]);
            var letters = ["A. ", "B. ", "C. "];
            var answers = opts.map(function (o, i) {
                return { text: letters[i] + o.text, correct: o.correct };
            });
            out.push({
                question:
                    "Quelle tendance correspond le mieux à cette description ? « " +
                    truncate(correct.d, 150) +
                    " »",
                answers: answers,
                feedback: "Il s’agit bien de « " + correct.ti + " »."
            });
        }
        return out.length ? out : null;
    }

    function searchHitsHtml(list, max) {
        max = max || 8;
        var dots = ["orange", "purple", "grey", "grey", "grey", "grey"];
        var labels = ["orange", "purple", "muted", "muted", "muted", "muted"];
        var parts = [];
        for (var i = 0; i < Math.min(max, list.length); i++) {
            var t = list[i];
            var di = i % dots.length;
            parts.push(
                "<li>" +
                "<a class=\"search-hit\" href=\"trends.html?trend=" +
                encodeURIComponent(t.id) +
                "\">" +
                "<span class=\"search-hit__dot search-hit__dot--" +
                dots[di] +
                "\" aria-hidden=\"true\"></span>" +
                "<span class=\"search-hit__label search-hit__label--" +
                labels[di] +
                "\">" +
                escapeHtml(t.ti) +
                "</span></a></li>"
            );
        }
        return parts.join("");
    }

    function normalizeOldTrends(data) {
        var arr = Array.isArray(data) ? data : [];
        return arr.map(function (t, i) {
            var title = (t && (t["Titre"] || t.titre || t.title)) || ("Tendance ancienne " + (i + 1));
            var desc = (t && (t["Description"] || t.description)) || "";
            var tag = (t && (t["Tag"] || t.tag)) || "";
            var category = (t && (t["Catégorie"] || t.categorie || t.category)) || "";
            return {
                id: "old-" + slugify(title) + "-" + i,
                title: String(title).trim(),
                description: String(desc).trim(),
                tag: String(tag || "").trim(),
                category: String(category || "").trim()
            };
        });
    }

    function oldTrendCardHtml(item) {
        var meta = [];
        if (item.tag) meta.push("Tag: " + item.tag);
        if (item.category) meta.push("Catégorie: " + item.category);
        return (
            "<article class=\"old-trend-card\">" +
            "<h2 class=\"old-trend-card__title\">" +
            escapeHtml(item.title) +
            "</h2>" +
            (meta.length
                ? "<p class=\"old-trend-card__meta\">" + escapeHtml(meta.join(" · ")) + "</p>"
                : "") +
            "<p class=\"old-trend-card__desc\">" +
            escapeHtml(truncate(item.description, 280) || "Description indisponible.") +
            "</p>" +
            "</article>"
        );
    }

    function normalizeGlossary(data) {
        var arr = Array.isArray(data) ? data : [];
        return arr
            .map(function (it) {
                var mot = (it && (it.mot || it.word || it.term || it.titre)) || "";
                var def = (it && (it.definition || it.def || it.description)) || "";
                return { mot: String(mot).trim(), definition: String(def).trim() };
            })
            .filter(function (it) {
                return it.mot && it.definition;
            });
    }

    window.TrendslatorData = {
        JSON_URL: JSON_URL,
        OLD_TRENDS_URL: OLD_TRENDS_URL,
        GLOSSARY_URL: GLOSSARY_URL,
        load: function () {
            return fetch(JSON_URL, { cache: "no-store" }).then(function (r) {
                if (!r.ok) throw new Error("trends_json");
                return r.json();
            });
        },
        loadOldTrends: function () {
            return fetch(OLD_TRENDS_URL, { cache: "no-store" })
                .then(function (r) {
                    if (r.ok) return r.json();
                    return fetch(OLD_TRENDS_URL_FALLBACK, { cache: "no-store" }).then(function (rf) {
                        if (!rf.ok) throw new Error("old_trends_json");
                        return rf.json();
                    });
                });
        },
        loadGlossary: function () {
            return fetch(GLOSSARY_URL, { cache: "no-store" })
                .then(function (r) {
                    if (r.ok) return r.json();
                    return fetch(GLOSSARY_URL_FALLBACK, { cache: "no-store" }).then(function (rf) {
                        if (!rf.ok) throw new Error("glossary_json");
                        return rf.json();
                    });
                });
        },
        normalizeAll: normalizeAll,
        normalizeOldTrends: normalizeOldTrends,
        oldTrendCardHtml: oldTrendCardHtml,
        normalizeGlossary: normalizeGlossary,
        pickFeatured: pickFeatured,
        thumbnailFor: thumbnailFor,
        truncate: truncate,
        cardHtml: cardHtml,
        detailHtml: detailHtml,
        buildQuizQuestions: buildQuizQuestions,
        searchHitsHtml: searchHitsHtml,
        escapeHtml: escapeHtml
    };
})();
