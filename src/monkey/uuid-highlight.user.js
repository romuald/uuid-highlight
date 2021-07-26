// ==UserScript==
// @name         UUID Highlight
// @namespace    https://chivil.com
// @version      1.0
// @description  "Highlight" (colorize) UUIDs on various issue tracker to help you distinguish one from another. Each UUID get its own color so a repeating one is easier to find
// @author       Romuald Brunet <romual@chivil.com>
// @homepage     https://chivil.com/monkeys/
// @updateURL    https://chivil.com/monkeys/uuid-highlight.meta.js
// @downloadURL  https://chivil.com/monkeys/uuid-highlight.user.js
// @icon         https://chivil.com/monkeys/uuid-highlight-icon16.png
// @icon64       https://chivil.com/monkeys/uuid-highlight-icon64.png
// @match        http://phabricator.*/T*
// @match        https://phabricator.*/T*
// @match        http://gitlab.*/*/issues/*
// @match        https://gitlab.*/*/issues/*
// @match        http://jira.*/*
// @match        https://jira.*/*
// @match        https://github.com/*/issues/*
// @grant        none
// ==/UserScript==

function uuid_main() {
    const UUID = /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/i;

    const UUIDNodes = {} // { $uuid: [] }
    const allNodes = () => Object.values(UUIDNodes).reduce((a, b) => [...a, ...b], [])

    // Recursively extract text nodes from a tree
    function text_from(node) {
        const extract = (node) => [...node.childNodes].reduce(
            (acc, childnode) => [
                ...acc,
                childnode.nodeType === Node.TEXT_NODE ? childnode : null,
                ...extract(childnode),
                ...(childnode.shadowRoot ? extract(childnode.shadowRoot) : [])],
            [])

        return extract(node).filter(node => node && UUID.test(node.textContent))
    }

    // Highlight nodes with same UUID as the one being hovered
    function highlightOthers(event) {
        for ( const node of UUIDNodes[this.textContent] ) {
            if ( node !== this ) {
                node.style.backgroundColor = node.dataset.uuidcolor
                node.style.color = "white"
            }
        }
    }

    // Remove highlight set by highlightOthers
    function unHighlightOthers(event) {
        for ( const node of UUIDNodes[this.textContent] ) {
            if ( node !== this ) {
                node.style.backgroundColor = ""
                node.style.color = node.dataset.uuidcolor
            }
        }
    }


    function createUUIDNode(uuid) {
        const node = document.createElement('span')
        node.innerText = uuid
        node.addEventListener('mouseenter', highlightOthers)
        node.addEventListener('mouseleave', unHighlightOthers)

        if ( UUIDNodes[uuid] ) {
            UUIDNodes[uuid].push(node)
        } else {
            UUIDNodes[uuid] = [node]
        }

        return node
    }

    function highlightUUIDs() {
        const root = document.body
        let nodes = text_from(root)

        for (const node of nodes) {
            // Already handled
            if ( typeof(node.parentNode.dataset.uuidcolor) !== "undefined" ) {
                return
            }

            if ( node.tagName === 'TEXTAREA' || node.tagName == 'INPUT' ) {
                return
            }

            const newNode = document.createElement('span')

            let currentNode = node
            let text = node.textContent
            let match
            while ( match = UUID.exec(text) ) {
                const before = text.substring(0, match.index)
                const after = text.substring(match.index + match[0].length, text.length)

                const UUIDNode = createUUIDNode(match[0])

                if ( before.length > 0 ) {
                    newNode.appendChild(document.createTextNode(before))
                }
                newNode.appendChild(UUIDNode)

                text = after
            }

            if ( text.length > 0 ) {
                newNode.appendChild(document.createTextNode(text))
            }

            node.parentNode.replaceChild(newNode, node)
        }

        const start = Math.random() * 360 >> 0 // start with random color
        const length = Object.keys(UUIDNodes).length
        const increment = 360 / length
        let hue = start

        for ( const nodes of Object.values(UUIDNodes) ) {
            const color = `hsl(${hue}, 50%, 50%)`
            hue += increment
            
            for ( const node of nodes ) {
                node.style.color = node.dataset.uuidcolor = color
            }

        }
    
        return nodes.length > 0
    }

    const ret = highlightUUIDs()

    setTimeout(() => delayedGlobalObserver(highlightUUIDs), 5)

    function delayedGlobalObserver(callback, timeout, options) {
        // Generic mutation observer
        timeout = timeout ? timeout : 50
        options = options ? options : {attributes: false,
                                       childList: true,
                                       subtree: true}

        let mTimeout = null
        function myCallback(...args) {
            observer.disconnect()

            try {
                callback.bind(this, ...args).apply()
            } finally {
                startObserving()
            }
        }

        const observer = new MutationObserver(function(...args) {
            clearTimeout(mTimeout)

            const bound = myCallback.bind(observer, ...args)
            mTimeout = window.setTimeout(() => bound.apply(), timeout)
        })

        function startObserving() {
            observer.observe(document.body, options)
        }
        startObserving()
    }

    return ret
}

uuid_main()