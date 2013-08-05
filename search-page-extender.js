javascript:
var SearchPageExtender = {
	NEW_PAGES: 2,
	ROWS_PER_PAGE: 25,
	debug: true,

	debugMessage: function(message) {
		if (SearchPageExtender.debug) {
			alert("DEBUG: "+message);
		}
	},

	init: function() {
		if (/\/memberlist.php/.test(window.location)) {
			SearchPageExtender.addPages(SearchPageExtender.NEW_PAGES);
		}
	},

	addPages: function(newPages) {
		currentRows = parseInt(document.getElementsByTagName("tr").length - 1);
		SearchPageExtender.debugMessage("Current rows: "+currentRows);
		if (/\bstart=[0-9]+\b/.test(window.location)) {
			startRow = parseInt(window.location.href.match(/\bstart=([0-9]+)\b/)[1]);
			SearchPageExtender.debugMessage("Found start parameter "+startRow);
			currentPage = (currentRows + startRow) / SearchPageExtender.ROWS_PER_PAGE;
			searchURL = window.location.href;
		} else {
			currentPage = currentRows / SearchPageExtender.ROWS_PER_PAGE;
			searchURL = window.location.href + "&start=0";
		}
		SearchPageExtender.debugMessage("Current page: "+currentPage);
		pageRequest = new XMLHttpRequest();
		for (i = currentPage; i < currentPage + newPages; i++) {
			searchURL = searchURL.replace(/start=[0-9]+\b/, "start="+(i * SearchPageExtender.ROWS_PER_PAGE));
			SearchPageExtender.debugMessage("Retrieving page "+searchURL);
			pageRequest.open("GET", searchURL, false);
			pageRequest.send();
			rows = pageRequest.responseText.replace(/[\r\n]/g, " ").match(/<tr\b.*>(.*)<\/tr>/gi);
			SearchPageExtender.debugMessage("Retrieved rows: "+rows);
		}
	},
};
SearchPageExtender.init();
