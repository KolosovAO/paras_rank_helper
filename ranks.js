const CARD_SELECTOR = ".card-wrap > .card.bg-transparent";
const ACTIVITY_SELECTOR = "a.font-semibold.z-20";

const getNodeFromSelector = (node, selector) => {
    if (selector === CARD_SELECTOR) {
        return node.children[0].children[0].children[0];
    }

    return node;
};

const isActivityTab = () => window.location.search.includes("tab=activity");

const getLeftOffset = () => isActivityTab() ? 0 : 30;
const getTopOffset = () => 4 - window.scrollY;

let has_ranks = false;

let id_to_rank = {};
let added_nodes = {};

let last_loaded_collection_url;

const fetchRanks = async () => {
    const collection_url = window.location.href.split("/").pop().split("?")[0];
    if (collection_url === last_loaded_collection_url) {
        return;
    }

    last_loaded_collection_url = collection_url;
    id_to_rank = {};
    has_ranks = false;

    const response = await fetch(`https://api.neararity.com/tokens?collection=${collection_url}&page=1&itemsPerPage=3500&keyword=&sortBy=rank`);
    const collection = await response.json();
    if (!collection || !collection.paginated || !collection.paginated.length) {
        console.log("PROBLEM WITH LOAD RANKS");
        return;
    }

    has_ranks = true;
    collection.paginated.forEach(({ index, rank, token_id }) => {
        id_to_rank[index === void 0 ? token_id : index] = rank;
    });
    console.log("RANKS LOADED", id_to_rank);
};

const addRankToNode = (node) => {
    const index = +node.textContent.match(/\d+/)[0];

    if (id_to_rank[index] === void 0) {
        return;
    }

    const { right, top } = node.getBoundingClientRect();

    if (added_nodes[index]) {
        const div = added_nodes[index];
        div.style.left = right - getLeftOffset() + "px";
        div.style.top = top - getTopOffset() + "px";
        return;
    } else {
        const div = document.createElement("DIV");
        div.style.position = "absolute";
        div.style.left = right - getLeftOffset() + "px";
        div.style.top = top - getTopOffset() + "px";
        div.style.color = "red";
        div.style.background = "rgba(0, 0, 0, 0.7)";
        div.style.fontSize = 16;
        div.style.fontWeight = 800;
        div.textContent = id_to_rank[index];
        added_nodes[index] = div;
        document.body.appendChild(div);
    }
};

let old_url = window.location.href;

const observer = new MutationObserver(async records => {
    if (old_url !== window.location.href) {
        console.log("URL CHANGED");
        old_url = window.location.href;

        Object.values(added_nodes).forEach(node => node.remove());
        added_nodes = {};

        if (window.location.href.includes("paras.id/collection")) {
            fetchRanks();
        }
    }

    if (window.location.href.includes("paras.id/collection")) {
        const selector = isActivityTab()
            ? ACTIVITY_SELECTOR
            : CARD_SELECTOR;

        for (const { target } of records) {
            if (has_ranks && target.nodeType === Node.ELEMENT_NODE && target.matches(selector)) {
                addRankToNode(getNodeFromSelector(target, selector));
            }
        }

        [...document.querySelectorAll(selector)]
            .map((target) => getNodeFromSelector(target, selector))
            .forEach(addRankToNode);
    }
});
observer.observe(document.body, {
    childList: true,
    subtree: true,
});

fetchRanks();
