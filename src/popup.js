const mainList = document.getElementById('rows')
const template = document.getElementById('rule-row')

const hostInput = document.getElementById('host')
const pathInput = document.getElementById('path')


let taburl = null

function deleteMe(targetRule) {
	return function() {
		for (const [i, rule] of CURRENT_RULES.entries()) {
			if ( rule === targetRule ) {
				CURRENT_RULES.splice(i, 1)
				mainList.removeChild(mainList.querySelectorAll('.row')[i])
				storeRules()
				break
			}
		}
	}
}

function popup_main() {
	mainList.innerHTML = ""

	for ( const rule of CURRENT_RULES ) {
		let elt = template.content.cloneNode(true)
		elt.querySelector('.host').innerText = rule.host
		elt.querySelector('.path').innerText = rule.path
		elt.querySelector('.delete-rule').addEventListener('click', deleteMe(rule))

		if ( taburl && urlMatch(taburl, rule) ) {
			elt.querySelector('.row').classList.add("current")
		}

		mainList.appendChild(elt)
	}
}


function storeRules() {
	chrome.storage.sync.set({"rules": CURRENT_RULES})
}


chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
	taburl = new URL(tabs[0].url)
	popup_main()

	if ( /^http/.test(taburl.protocol) ) {
		hostInput.value = taburl.host
		pathInput.value = taburl.pathname
	}
})

document.getElementById("reset").addEventListener("click", function() {
	chrome.storage.sync.clear(() => {
		loadRules().then(popup_main)
	})
})

document.getElementById("add-rule").addEventListener("click", (event) => {
	event.preventDefault()

	const rule = {
		"host": hostInput.value,
		"path": pathInput.value,
	}

	if ( rule.host.length > 0 && rule.path.length > 0 ) {
		CURRENT_RULES.push(rule)
		storeRules()
		popup_main()
	}
})

function enableOnPage(event) {
	const button = this

	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const tab = tabs[0];
	
		chrome.scripting.executeScript({
			target: {tabId: tab.id},
			function: main,
		}, (results) => {
			const changed = results[0].result

			if ( changed ) {
				button.innerText += " ✓"
			} else {
				button.innerText += " ✖"
			}

			//button.removeEventListener("click", enableOnPage)
			button.setAttribute("disabled", "")
		})
	})
}
document.getElementById("enable-on-page").addEventListener("click", enableOnPage)

loadRules().then(popup_main)
