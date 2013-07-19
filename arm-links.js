javascript:
var debug = true;
var ArmLinks = {

	debugMessage: function(message) {
		if (debug) {
			alert("DEBUG: "+message);
		}
	},

	init: function() {
		var allLinks = document.getElementsByTagName("a");
		for (var i = 0; i < allLinks.length; i++) {
			if (/\bi=ban\b.*\bu=\d+/.test(allLinks[i].href)) {
				ArmLinks.debugMessage("Adding onclick event to "+allLinks[i].innerHTML);
				allLinks[i].onclick = ArmLinks.onclick;
			}
		}
	},

	form2xhr: function(t) {
		return {
			url: t.match(/<form[^>]+id="confirm"[^>]+action="([^"]+)/)[1].replace(/&amp;/g, '&'),
			method: "POST",
			headers: { "Content-type": "application/x-www-form-urlencoded" },
			data: t.match(/<input type="hidden"[^>]+/g).map(function(i) {
				var m = i.match(/name="([^"]+)"\s+value="([^"]*)"/);
				return encodeURIComponent(m[1]) + "=" + encodeURIComponent(m[2]);
			}).concat("confirm=Yes").join("&")

		};

	},

	onclick: function(ev) {
		if (/\bi=ban\b.*\bu=\d+/.test(ev.target.href) && confirm("Do you want to ban this user and clear all his posts?")) {
			ev.preventDefault();
			var link = ev.target;
			var uid = link.href.match(/\bu=(\d+)/)[1];
			var userName = link.parentNode.getElementsByTagName("span")[0].textContent;
			ArmLinks.debugMessage("uid ["+uid+"], userName ["+userName+"]");
			link.innerHTML = "...";
			var del = document.getElementById("del-posts");
			if (!del) {
				del = document.createElement("span");
				del.id = "del-posts";
				link.parentNode.insertBefore(del, link.nextSibling);
			}
			try {
				var deleting = null, total = deleted = 0, canDelete = false;

				/* retrieve posts */
				var getPostsRequest = new XMLHttpRequest();
				ArmLinks.debugMessage("Search URL is /search.php?author_id=" + uid + "&sr=posts");
				getPostsRequest.open("GET", "/search.php?author_id=" + uid + "&sr=posts", false);
				getPostsRequest.send();
				if (getPostsRequest.responseText.match(/\bf=\d+.*\bp=(\d+)#p\1/g)) {
					deleting = getPostsRequest.responseText.match(/\bf=\d+.*\bp=(\d+)#p\1/g)
						.map(function(s) { var m = s.match(/\b(f=\d+).*\b(p=\d+)/); return m[1] + "&" + m[2]; });
					/* make unique */
					for (var j = deleting.length; j-- > 0;) {
						var pos = deleting.indexOf(deleting[j]);
						if (pos > -1 && pos < j) deleting.splice(j, 1);
					}
					total = deleting.length;
					if (canDelete) deletePosts();
				} else {
					ArmLinks.debugMessage("No posts found to delete");
				}

				/* request ban */
				var req = {
					method:"POST",
					url: "/mcp.php?i=ban&mode=user&u=" + uid,
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					data: "ban=" + userName + "&banlength=0&banlengthother=&banreason=spam&bangivereason=&banexclude=0&bansubmit=Submit",
				};
				var xmlHttpRequest = new XMLHttpRequest();
				ArmLinks.debugMessage("Ban request URL is "+req.url);
				xmlHttpRequest.open(req.method, req.url, false);
				xmlHttpRequest.setRequestHeader('Content-Type', req.headers['Content-Type']);
				xmlHttpRequest.send(req.data);
				ArmLinks.debugMessage("Ban request result was "+xmlHttpRequest.responseText);
				try {
					/* confirm ban */
					req = ArmLinks.form2xhr(xmlHttpRequest.responseText);
					ArmLinks.debugMessage("Ban confirm URL is "+req.url+" with body "+req.data);
					xmlHttpRequest.open(req.method, req.url, false);
					xmlHttpRequest.send(req.data);
					if (/banlist.*updated.*success/.test(xmlHttpRequest.responseText)) {
						link.innerHTML = "BANNED";
					} else {
						ArmLinks.debugMessage("Couldn't ban; result page was "+xmlHttpRequest.responseText);
						link.innerHTML = "ERROR";
					}
					canDelete = true;
					if (deleting) deletePosts();
				} catch(e) {
					ArmLinks.debugMessage("Ban attempt threw exception: "+e);
					link.innerHTML = "ERROR";
					canDelete = true;
				}

				function deletePosts() {
					var id = deleting.shift();
					if (!id) {
						del.innerHTML += " (DONE)";
						return;
					}
					var xmlHttpRequest = new XMLHttpRequest();
					xmlHttpRequest.open("GET", "/posting.php?mode=delete&" + id);
					xmlHttpRequest.send();
					try {
						var req = ArmLinks.form2xhr(xmlHttpRequest.responseText);
						xmlHttpRequest.open(req.method, req.url, false);
						xmlHttpRequest.send(req.data);
						if (/successf/.test(xmlHttpRequest.responseText))
							del.innerHTML = " Deleted posts " + ((++deleted) + "/" + total);

						deletePosts();
					} catch(e) {
						alert(e + "\n" + req.url + "\n" + xmlHttpRequest.responseText.replace(/[\s\S]*<body>|<[^>]+>/g, ''));
					}
				}

			} catch(e) { alert(e) }
		}
	},

};

ArmLinks.init();
