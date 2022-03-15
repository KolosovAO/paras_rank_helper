const PAGE_TYPE = {
    ACTIVITY: 1,
    CREATION: 2,
    TOKEN: 3,
    COLLECTION: 4,
}


// Ranks
const loaded_ranks = {};
const loaded_ranks_promises = {};

const getRanks = (collection_url) => {
    if (loaded_ranks_promises[collection_url]) {
        return loaded_ranks_promises[collection_url];
    }

    console.log("Start load ranks for " + collection_url);

    return loaded_ranks_promises[collection_url] =
        fetch(`https://api.neararity.com/tokens?collection=${collection_url}&page=1&itemsPerPage=3500&keyword=&sortBy=rank`)
            .then((res) => res.json())
            .then((collection) => {
                if (!collection || !collection.paginated || !collection.paginated.length) {
                    throw new Error("no data");
                }

                const ranks = collection.paginated.reduce((acc, { index, rank, token_id }) => {
                    acc[index === void 0 ? token_id : index] = rank;
                    return acc;
                }, {});
                loaded_ranks[collection_url] = ranks;

                console.log("Ranks for " + collection_url, ranks);
                return ranks;
            })
            .catch(() => {
                console.log("Problem with load ranks for " + collection_url);
                return {};
            });
};
//

class Page {
    constructor() {
        this.update();
    }

    update() {
        if (window.location.href === this.url) {
            return;
        }

        this.collection = void 0;
        this.added_nodes = {};
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
        const index = +node.textContent.match(/\d+/)[0];

        const collection_url = this.type === PAGE_TYPE.CREATION
            ? node.parentNode.children[1].textContent.trim()
            : this.collection;

        const add = (rank) => {
            if (rank === void 0 || this.added_nodes[`${collection_url}_${index}`]) {
                return;
            }
            const element = document.createElement(
                this.type === PAGE_TYPE.ACTIVITY ? "SPAN" : "DIV"
            );
            element.style.color = "red";
            element.style.fontSize = this._getFontSize();
            element.style.fontWeight = 800;
            element.textContent = rank;
            this.added_nodes[`${collection_url}_${index}`] = element;
            node.appendChild(element);
        }

        if (loaded_ranks[collection_url]) {
            add(loaded_ranks[collection_url][index])
        } else {
            getRanks(collection_url).then((ranks) => add(ranks[index]));
        }
    }

    _updateType() {
        if (window.location.href.includes("paras.id/collection")) {
            this.collection = window.location.href.split("/").pop().split("?")[0];
            getRanks(this.collection);

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
