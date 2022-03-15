const CARD_SELECTOR = ".card-wrap > .card.bg-transparent";
const ACTIVITY_SELECTOR = "a.font-semibold.z-20";

const getNodeFromSelector = (node, selector) => {
    if (selector === CARD_SELECTOR) {
        return node.children[0].children[0].children[0];
    }

    return node;
};

const isActivityTab = () => window.location.search.includes("tab=activity");
const isProfilePage = () => window.location.href.match(/\/.+\/collectibles/);
const isCollectionPage = () => window.location.href.includes("paras.id/collection");

let added_nodes = {};

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

const addRankToNode = (node) => {
    const index = +node.textContent.match(/\d+/)[0];

    const collection_url = isProfilePage()
        ? node.parentNode.children[1].textContent.trim()
        : window.location.href.split("/").pop().split("?")[0];

    const addRankToNode = (rank) => {
        if (rank === void 0 || added_nodes[`${collection_url}_${index}`]) {
            return;
        }
        const element = document.createElement(isActivityTab() ? "SPAN" : "DIV");
        element.style.color = "red";
        element.style.fontSize = "17px";
        element.style.fontWeight = 800;
        element.textContent = rank;
        added_nodes[`${collection_url}_${index}`] = element;
        node.appendChild(element);
    }

    if (loaded_ranks[collection_url]) {
        addRankToNode(loaded_ranks[collection_url][index])
    } else {
        getRanks(collection_url).then((ranks) => addRankToNode(ranks[index]));
    }
};

let old_url = window.location.href;

const observer = new MutationObserver(async records => {
    if (old_url !== window.location.href) {
        console.log("URL CHANGED");
        old_url = window.location.href;

        added_nodes = {};

        if (isCollectionPage()) {
            const collection_url = window.location.href.split("/").pop().split("?")[0];
            getRanks(collection_url);
        }
    }

    if (isCollectionPage() || isProfilePage()) {
        const selector = isActivityTab()
            ? ACTIVITY_SELECTOR
            : CARD_SELECTOR;

        for (const { target } of records) {
            if (target.nodeType === Node.ELEMENT_NODE && target.matches(selector)) {
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

if (isCollectionPage()) {
    const collection_url = window.location.href.split("/").pop().split("?")[0];
    getRanks(collection_url);
}
