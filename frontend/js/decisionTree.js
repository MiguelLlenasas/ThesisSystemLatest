const DecisionTree = (() => {
    let renderedTree = null;

    /* =========================================================
       LANGUAGE HELPER & TRANSLATIONS
       ========================================================= */
    function getCurrentLang() {
        return localStorage.getItem("app_lang") || "en";
    }

    function getTranslations(lang = "en") {
        if (lang === "tl") {
            return {
                noAttackVector: "Walang natukoy na mga katangian ng pag-atake.",
                defaultTreeExplanation: "Sinuri ng Decision Tree ang feature vector at tinahak ang mga node upang marating ang klasipikasyong ito.",
                dictExplanation: (hasDict) => 
                    `Tinahak ng Decision Tree ang mga root condition node at sinuri ang <strong>dictionary_present = ${hasDict ? 1 : 0}</strong>. Dahil tumugma ang password sa isang kilalang salita sa diksiyonaryo nang walang malaking pagbabago sa tuntunin, nagwakas ang daanan sa <strong>DICTIONARY</strong> leaf node.`,
                ruleExplanation: 
                    `Sinuri ng modelo ang mga kondisyon ng feature nang hakbang-hakbang at nakakita ng mga pagbabago sa istruktura (tulad ng leetspeak substitution, numeric suffix, o pag-uulit ng karakter). Ang daanan ng desisyon ay lumampas sa purong pagtukoy sa diksiyonaryo at napunta sa <strong>RULE-BASED</strong> classification node.`,
                bruteExplanation: (length) => 
                    `Laktawan ng pagtawid ang mga node ng pagtutugma sa diksiyonaryo dahil sa mababang koneksyon sa salita, sinuri ang haba (${length} karakter) at espasyo ng karakter, at nagwakas sa <strong>BRUTE-FORCE</strong> leaf node.`,
                structuralText: (length, classCount, hasLeetspeak, hasDict) => {
                    let text = `Ang password na ito ay may haba na ${length} karakter at gumagamit ng ${classCount} (na) uri ng karakter. `;
                    if (hasLeetspeak) {
                        text += `Natukoy sa pagsusuri sa istruktura ang mga kapalit na karakter kung saan ang mga simbolo o numero ay ipinalit sa karaniwang titik. `;
                    }
                    if (hasDict) {
                        text += `Ang pangunahing arkitektura nito ay nagmula sa isang kilalang salita sa diksiyonaryo, na nagpapababa sa pangkalahatang pagiging kumplikado ng istruktura.`;
                    } else {
                        text += `Ang kawalan ng salita mula sa diksiyonaryo ay nagdidirekta sa pagsusuri ng istruktura sa mga sukatan ng haba at espasyo ng karakter.`;
                    }
                    return text;
                }
            };
        }

        return {
            noAttackVector: "No attack characteristics identified.",
            defaultTreeExplanation: "The Decision Tree evaluated the feature vector and traversed the nodes to reach this classification.",
            dictExplanation: (hasDict) => 
                `The Decision Tree navigated through root condition nodes and evaluated <strong>dictionary_present = ${hasDict ? 1 : 0}</strong>. Because the password matched a known word entry without significant rule modifications, the path terminated directly at the <strong>DICTIONARY</strong> leaf node.`,
            ruleExplanation: 
                `The model evaluated the feature conditions step-by-step and detected structural modifications (such as leetspeak substitutions, numeric suffixes, or character repetitions). The decision path branched past pure dictionary detection and resolved into the <strong>RULE-BASED</strong> classification node.`,
            bruteExplanation: (length) => 
                `The traversal bypassed dictionary matching nodes due to low word connection, evaluated length (${length} characters) and character space, and concluded at the <strong>BRUTE-FORCE</strong> leaf node.`,
            structuralText: (length, classCount, hasLeetspeak, hasDict) => {
                let text = `This password spans ${length} characters and utilizes ${classCount} character class(es). `;
                if (hasLeetspeak) {
                    text += `The structural evaluation mapped character substitutions where symbols or numbers replaced standard alphabetic letters. `;
                }
                if (hasDict) {
                    text += `Its core architecture originates from a recognized dictionary root, reducing overall structural complexity.`;
                } else {
                    text += `The absence of a dictionary root directs the structural evaluation entirely toward length and character space metrics.`;
                }
                return text;
            }
        };
    }

    function getRealChildEdges(node) {
        if (
            !node ||
            !Array.isArray(node.children) ||
            !node.children.length
        ) {
            return [];
        }

        return node.children
            .filter(
                marker =>
                    marker &&
                    Array.isArray(marker.children) &&
                    marker.children.length
            )
            .map(marker => ({
                node: marker.children[0],
                branch:
                    marker.branch ||
                    marker.name ||
                    "",
                taken: marker.taken === true
            }))
            .filter(edge => edge.node);
    }

    function initializeDecisionTree() {
        attachHologramClickNotifier();
    }

    function attachHologramClickNotifier() {
        const hologram =
            document.querySelector(
                ".decision-tree-hologram"
            );

        if (!hologram) {
            return;
        }

        if (
            hologram.dataset.clickNotifierAttached ===
            "true"
        ) {
            return;
        }

        hologram.dataset.clickNotifierAttached =
            "true";

        function notifyHologramClicked() {
            document.dispatchEvent(
                new CustomEvent(
                    "decisionTree:hologramClicked"
                )
            );
        }

        hologram.addEventListener(
            "click",
            notifyHologramClicked
        );

        hologram.addEventListener(
            "keydown",
            event => {
                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    notifyHologramClicked();
                }
            }
        );
    }

    function updateDecisionTree(data) {
        if (!data) {
            return;
        }

        window.latestAnalysisData = data;

        const tree =
            data.actual_model_decision_path;

        if (!tree) {
            return;
        }

        updateExplanation(data);
        renderDecisionTree(tree);
        animateTreeTraversal(data);
    }

    function updateExplanation(data) {
        const explanation = document.getElementById("decisionExplanation");
        const attackVector = document.getElementById("attackVector");
        const structuralInsights = document.getElementById("structuralInsights");

        if (!explanation) return;

        const assessment = data.security_assessment || {};
        const lang = getCurrentLang();
        const t = getTranslations(lang);

        // 1. Unang iche-check kung may explicit na custom DT explanation mula sa backend
        let vulnerabilityExplanation = data.decision_tree_explanation;

        // 2. Kung wala, mag-generate ng hiwalay at Decision-Tree-specific narrative batay sa napiling wika
        if (!vulnerabilityExplanation) {
            vulnerabilityExplanation = generateTreeSpecificExplanation(data, lang);
        }

        explanation.innerHTML = censorPassword(vulnerabilityExplanation, data.password);

        if (attackVector) {
            attackVector.innerHTML = censorPassword(assessment.attack_vector || t.noAttackVector, data.password);
        }

        if (structuralInsights) {
            const length = data.features?.length || data.length || 0;
            const classCount = data.features?.character_class_count || 1;
            const hasLeetspeak = !!data.features?.has_leetspeak;
            const hasDict = data.features?.dictionary_present === 1;

            const structuralText = t.structuralText(length, classCount, hasLeetspeak, hasDict);
            structuralInsights.innerHTML = censorPassword(structuralText, data.password);
        }

        activatePasswordReveal();
    }

    // Bagong helper function para sa Decision Tree-specific logic na may kasamang wika
    function generateTreeSpecificExplanation(data, lang) {
        const type = data.vulnerability;
        const length = data.features?.length || data.length || 0;
        const hasDict = data.features?.dictionary_present === 1;
        const t = getTranslations(lang);

        if (type === "DICTIONARY") {
            return t.dictExplanation(hasDict);
        }

        if (type === "RULE-BASED") {
            return t.ruleExplanation;
        }

        if (type === "BRUTE-FORCE") {
            return t.bruteExplanation(length);
        }

        return t.defaultTreeExplanation;
    }

    function renderDecisionTree(tree) {
        const nodeContainer =
            document.getElementById(
                "decisionTreeNodes"
            );

        const branchContainer =
            document.getElementById(
                "decisionTreeBranches"
            );

        const svg =
            document.querySelector(
                ".dt-tree-svg"
            );

        if (
            !nodeContainer ||
            !branchContainer ||
            !svg
        ) {
            return;
        }

        renderedTree = tree;

        nodeContainer.innerHTML = "";
        branchContainer.innerHTML = "";

        svg.setAttribute(
            "viewBox",
            "20 0 250 250"
        );

        svg.setAttribute(
            "preserveAspectRatio",
            "xMidYMid meet"
        );

        let idCounter = 0;

        function getDepth(
            node,
            visited = new Set()
        ) {
            if (!node || visited.has(node)) {
                return 0;
            }

            visited.add(node);

            const edges =
                getRealChildEdges(node);

            if (!edges.length) {
                return 1;
            }

            return (
                1 +
                Math.max(
                    ...edges.map(edge =>
                        getDepth(
                            edge.node,
                            new Set(visited)
                        )
                    )
                )
            );
        }

        const depth =
            getDepth(tree);

        const verticalStep =
            Math.min(
                30,
                220 /
                Math.max(
                    depth - 1,
                    1
                )
            );

        function createNode(
            node,
            x,
            y
        ) {
            const circle =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "circle"
                );

            const id =
                `n${idCounter++}`;

            node._domId = id;

            circle.setAttribute(
                "cx",
                x
            );

            circle.setAttribute(
                "cy",
                y
            );

            circle.setAttribute(
                "r",
                node.final
                    ? "4.5"
                    : "3.5"
            );

            circle.setAttribute(
                "vector-effect",
                "non-scaling-stroke"
            );

            circle.classList.add(
                "dt-node"
            );

            circle.dataset.id =
                id;

            if (node === tree) {
                circle.classList.add(
                    "dt-root"
                );
            } else if (
                node.type ===
                "decision"
            ) {
                circle.classList.add(
                    "dt-question"
                );
            } else if (
                node.final
            ) {
                circle.classList.add(
                    "dt-node--leaf"
                );
            }

            circle.addEventListener(
                "click",
                event => {
                    event.stopPropagation();

                    document.dispatchEvent(
                        new CustomEvent(
                            "decisionTree:nodeClicked",
                            {
                                detail: {
                                    node,
                                    tree
                                }
                            }
                        )
                    );
                }
            );

            nodeContainer.appendChild(
                circle
            );

            return {
                x,
                y,
                id
            };
        }

        function createBranch(
            x1,
            y1,
            x2,
            y2,
            childId,
            choice
        ) {
            const line =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "line"
                );

            line.setAttribute(
                "x1",
                x1
            );

            line.setAttribute(
                "y1",
                y1
            );

            line.setAttribute(
                "x2",
                x2
            );

            line.setAttribute(
                "y2",
                y2
            );

            line.setAttribute(
                "vector-effect",
                "non-scaling-stroke"
            );

            line.classList.add(
                "dt-branch"
            );

            line.dataset.id =
                childId;

            line.dataset.choice =
                choice;

            line.addEventListener(
                "click",
                event => {
                    event.stopPropagation();

                    document.dispatchEvent(
                        new CustomEvent(
                            "decisionTree:branchClicked",
                            {
                                detail: {
                                    branch:
                                        choice,
                                    nodeId:
                                        childId,
                                    tree
                                }
                            }
                        )
                    );
                }
            );

            branchContainer.appendChild(
                line
            );
        }

        function build(
            node,
            x,
            y,
            visited = new Set()
        ) {
            if (
                !node ||
                visited.has(node)
            ) {
                return null;
            }

            const nextVisited =
                new Set(visited);

            nextVisited.add(node);

            const current =
                createNode(
                    node,
                    x,
                    y
                );

            const edges =
                getRealChildEdges(
                    node
                );

            if (!edges.length) {
                return current;
            }

            const gap =
                Math.min(
                    42,
                    90 /
                    Math.max(
                        edges.length,
                        1
                    )
                );

            edges.forEach(
                (
                    edge,
                    index
                ) => {
                    let childX;

                    if (
                        edges.length ===
                        1
                    ) {
                        childX = x;
                    } else {
                        childX =
                            x +
                            (
                                (
                                    index -
                                    (
                                        edges.length -
                                        1
                                    ) / 2
                                ) *
                                gap
                            );
                    }

                    childX =
                        Math.min(
                            214,
                            Math.max(
                                6,
                                childX
                            )
                        );

                    const childY =
                        y +
                        verticalStep;

                    const childPosition =
                        build(
                            edge.node,
                            childX,
                            childY,
                            nextVisited
                        );

                    if (!childPosition) {
                        return;
                    }

                    createBranch(
                        current.x,
                        current.y,
                        childPosition.x,
                        childPosition.y,
                        childPosition.id,
                        edge.branch
                    );
                }
            );

            return current;
        }

        build(
            tree,
            100,
            3
        );
    }

    function animateTreeTraversal(data) {
        const nodes =
            document.querySelectorAll(
                ".dt-node"
            );

        const branches =
            document.querySelectorAll(
                ".dt-branch"
            );

        if (!nodes.length) {
            return;
        }

        nodes.forEach(
            node => {
                node.classList.remove(
                    "active"
                );

                node.classList.remove(
                    "dt-result"
                );
            }
        );

        branches.forEach(
            branch => {
                branch.classList.remove(
                    "active"
                );
            }
        );

        const tree =
            renderedTree;

        if (!tree) {
            return;
        }

        const pathIds = [];

        if (tree._domId) {
            pathIds.push(
                tree._domId
            );
        }

        let current = tree;
        const visited = new Set();

        while (
            current &&
            !current.final &&
            !visited.has(current)
        ) {
            visited.add(current);

            const edges =
                getRealChildEdges(
                    current
                );

            const takenEdge =
                edges.find(
                    edge =>
                        edge.taken
                );

            if (
                !takenEdge ||
                !takenEdge.node
            ) {
                break;
            }

            if (
                !takenEdge.node._domId
            ) {
                break;
            }

            pathIds.push(
                takenEdge.node._domId
            );

            current =
                takenEdge.node;
        }

        pathIds.forEach(
            (
                id,
                index
            ) => {
                setTimeout(
                    () => {
                        const node =
                            document.querySelector(
                                `.dt-node[data-id="${CSS.escape(id)}"]`
                            );

                        if (node) {
                            node.classList.add(
                                "active"
                            );
                        }

                        if (
                            index >
                            0
                        ) {
                            const branch =
                                document.querySelector(
                                    `.dt-branch[data-id="${CSS.escape(id)}"]`
                                );

                            if (branch) {
                                branch.classList.add(
                                    "active"
                                );
                            }
                        }
                    },
                    index * 500
                );
            }
        );

        setTimeout(
            () => {
                highlightResult(
                    data.vulnerability,
                    pathIds[
                    pathIds.length - 1
                    ]
                );
            },
            pathIds.length * 500
        );
    }

    function highlightResult(
        vulnerability,
        finalId
    ) {
        if (!finalId) {
            return;
        }

        const finalNode =
            document.querySelector(
                `.dt-node[data-id="${CSS.escape(finalId)}"]`
            );

        if (!finalNode) {
            return;
        }

        finalNode.classList.add(
            "dt-result"
        );

        finalNode.dataset.result =
            vulnerability || "";
    }

    function censorPassword(
        text,
        password
    ) {
        if (!text) {
            return "-";
        }

        if (!password) {
            return text;
        }

        const regex =
            new RegExp(
                "(['\"])" +
                escapeRegex(
                    password
                ) +
                "\\1",
                "g"
            );

        const maskedPassword =
            "*".repeat(
                password.length
            );

        return text.replace(
            regex,
            `<span class="hidden-password" data-password="${escapeHtmlAttr(password)}">${maskedPassword}</span>`
        );
    }

    function escapeRegex(
        string
    ) {
        return String(string).replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
    }

    function escapeHtmlAttr(
        string
    ) {
        return String(string)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#39;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            );
    }

    function activatePasswordReveal() {
        const hiddenPasswords =
            document.querySelectorAll(
                ".hidden-password"
            );

        hiddenPasswords.forEach(
            item => {
                if (
                    item.dataset
                        .listenerAttached
                ) {
                    return;
                }

                item.dataset
                    .listenerAttached =
                    "true";

                const password =
                    item.dataset.password ||
                    "";

                if (!password) {
                    return;
                }

                const masked =
                    "*".repeat(
                        password.length
                    );

                item.textContent =
                    masked;

                const show =
                    () => {
                        item.textContent =
                            password;
                    };

                const hide =
                    () => {
                        item.textContent =
                            masked;
                    };

                item.addEventListener(
                    "pointerdown",
                    show
                );

                item.addEventListener(
                    "pointerup",
                    hide
                );

                item.addEventListener(
                    "pointerleave",
                    hide
                );

                item.addEventListener(
                    "pointercancel",
                    hide
                );

                item.addEventListener(
                    "touchstart",
                    show,
                    {
                        passive: true
                    }
                );

                item.addEventListener(
                    "touchend",
                    hide
                );

                item.addEventListener(
                    "touchcancel",
                    hide
                );
            }
        );
    }

    return {
        initializeDecisionTree,
        updateDecisionTree
    };
})();

window.initializeDecisionTree =
    DecisionTree.initializeDecisionTree;

window.updateDecisionTree =
    DecisionTree.updateDecisionTree;