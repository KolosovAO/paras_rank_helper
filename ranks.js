const PAGE_TYPE = {
    ACTIVITY: 1,
    CREATION: 2,
    TOKEN: 3,
    COLLECTION: 4,
}


class RankStorage {
    constructor() {
        this.loaded = {};
        this.loaded_promises = {};

        this.local_collections = new Set([
            "dragonnation.near"
        ]);
    }

    get(collection) {
        return this.loaded[collection];
    }

    load(collection) {
        if (this.loaded_promises[collection]) {
            return this.loaded_promises[collection];
        }

        const is_local = this.local_collections.has(collection);

        const url = is_local
            ? chrome.runtime.getURL(`local/${collection}.json`)
            : `https://api.neararity.com/tokens?collection=${collection}&page=1&itemsPerPage=7777&keyword=&sortBy=rank`;

        console.log("Start load ranks for " + collection);

        return this.loaded_promises[collection] = fetch(url)
            .then((data) => data.json())
            .then((res) => {
                if (is_local) {
                    return res;
                }

                return this._nearRarityParser(res);
            })
            .catch(() => {
                console.log("Problem with load ranks for " + collection, "url: " + url);
                return {};
            })
            .then((ranks) => {
                console.log("Ranks for " + collection, ranks);
                this.loaded[collection] = ranks;
                return ranks;
            });
    }

    _nearRarityParser(res) {
        if (!res || !res.paginated || !res.paginated.length) {
            throw new Error("no data");
        }

        return res.paginated.reduce((acc, { index, rank, token_id }) => {
            const key = index !== void 0 && !isNaN(index) ? index : token_id;
            acc[key] = rank;
            return acc;
        }, {});
    }
}

class Page {
    constructor() {
        this.update();
    }

    update() {
        if (window.location.href === this.url) {
            return;
        }

        this.collection = void 0;
        this.url = window.location.href;
        this.type = this._updateType();
    }

    getSelector() {
        if (this.type === PAGE_TYPE.ACTIVITY) {
            return "a.font-semibold.z-20";
        }

        if (this.type === PAGE_TYPE.TOKEN) {
            return ".overflow-x-hidden > h1";
        }

        return ".card-wrap > .card.bg-transparent";
    }

    addRankToNode(target) {
        const node = this._getTargetNode(target);
        if (node.dataset["x_added_rank"]) {
            return;
        }

        let match = node.textContent.match(/\d+/);
        if (!match) {
            if (page.type === PAGE_TYPE.ACTIVITY) {
                match = node.href && node.href.match(/\d+/);
            }

            if (!match) {
                return;
            }
        }
        const index = +match[0];

        const collection_url = this.type === PAGE_TYPE.CREATION
            ? node.parentNode.children[1].textContent.trim()
            : this.collection;

        const add = (rank) => {
            if (rank === void 0 || node.dataset["x_added_rank"]) {
                return;
            }
            const element = document.createElement(
                this.type === PAGE_TYPE.ACTIVITY ? "SPAN" : "DIV"
            );
            element.style.color = "red";
            element.style.fontSize = this._getFontSize();
            element.style.fontWeight = 800;
            element.textContent = rank;
            node.dataset["x_added_rank"] = 1;
            node.appendChild(element);
        }

        const ranks = rank_storage.get(collection_url);
        if (ranks) {
            add(ranks[index])
        } else {
            rank_storage.load(collection_url).then((ranks) => add(ranks[index]));
        }
    }

    _updateType() {
        if (window.location.href.includes("paras.id/collection")) {
            this.collection = window.location.href.split("/").pop().split("?")[0];
            rank_storage.load(this.collection);

            if (window.location.search.includes("tab=activity")) {
                return PAGE_TYPE.ACTIVITY;
            }

            return PAGE_TYPE.COLLECTION;
        }

        if (window.location.href.match(/\/.+\/(collectibles|creation)/)) {
            return PAGE_TYPE.CREATION;
        }

        if (window.location.href.includes("paras.id/token/")) {
            this.collection = window.location.href.split("/token/")[1].split(":")[0];
            return PAGE_TYPE.TOKEN;
        }
    }

    _getTargetNode(node) {
        if (this.type === PAGE_TYPE.ACTIVITY || this.type === PAGE_TYPE.TOKEN) {
            return node;
        }

        return node.children[0].children[0].children[0];
    }

    _getFontSize() {
        if (this.type === PAGE_TYPE.TOKEN) {
            return "25px";
        }
        return "17px";
    }
}

const rank_storage = new RankStorage();
const page = new Page();

const observer = new MutationObserver((records) => {
    page.update();

    if (page.type) {
        const selector = page.getSelector();

        for (const { target } of records) {
            if (target.nodeType === Node.ELEMENT_NODE && target.matches(selector)) {
                page.addRankToNode(target);
            }
        }

        [...document.querySelectorAll(selector)].forEach((node) => page.addRankToNode(node));
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});
