javascript:
var debug = false;
var ArmLinks = {

	debugMessage: function(message) {
		if (debug) {
			alert("DEBUG: "+message);
		}
	},

	isBanLink: function(href) {
		return /\bi=ban\b.*\bu=\d+/.test(href);
	},

	isMemberProfileLink: function(href) {
		return /memberlist\.php\?mode=viewprofile/.test(href);
	},

	init: function() {
		var allLinks = document.getElementsByTagName("a");
		for (var i = 0; i < allLinks.length; i++) {
			if (ArmLinks.isBanLink(allLinks[i].href)) {
				ArmLinks.debugMessage("Adding onclick event to "+allLinks[i].innerHTML);
				allLinks[i].onclick = ArmLinks.onclick;
			} else if (ArmLinks.isMemberProfileLink(allLinks[i].href)) {
				userId = allLinks[i].href.match(/\bu=\d+/)[0].match(/\d+/);
				banLink = document.createElement("a");
				banLink.href = "/mcp.php?i=ban&mode=user&u="+userId+"&bk_username="+allLinks[i].innerHTML;
				banLink.id = "ban"+userId;
				banLink.name = "ban"+userId;
				banLink.innerHTML = " [Hammer!]";
				allLinks[i].parentNode.insertBefore(banLink, allLinks[i].nextSibling);

				banLink.onclick = ArmLinks.onclick;
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
			var userName;
			if (/\bbk_username=/.test(ev.target.href)) {
				userName = ev.target.href.match(/\bbk_username=([^&]+)/)[1];
			} else {
				userName = link.parentNode.getElementsByTagName("span")[0].textContent;
			}
			ArmLinks.debugMessage("uid ["+uid+"], userName ["+userName+"]");
			link.innerHTML = "...";
			var del = document.getElementById("del-posts");
			if (!del) {
				del = document.createElement("span");
				del.id = "del-posts";
				link.parentNode.insertBefore(del, link.nextSibling);
			}
			try {
				var deleting = null, total = deleted = 0, canDelete = false, req;

				function deletePosts() {
					var id = deleting.shift();
					if (!id) {
						del.innerHTML += " (DONE)";
						return;
					}
					req = {
						method: "GET",
						url: "/posting.php?mode=delete&" + id
					};
					var deleteRequest = new XMLHttpRequest();
					deleteRequest.open(req.method, req.url, false);
					deleteRequest.send();
					try {
						req = ArmLinks.form2xhr(deleteRequest.responseText);
						var deleteConfirmRequest = new XMLHttpRequest();
						deleteConfirmRequest.open(req.method, req.url, false);
						deleteConfirmRequest.setRequestHeader('Content-type', req.headers['Content-type']);
						deleteConfirmRequest.setRequestHeader('Content-length', req.data.length);
						deleteConfirmRequest.setRequestHeader('Connection', 'close');
						deleteConfirmRequest.send(req.data);
						if (/successf/.test(deleteConfirmRequest.responseText)) {
							del.innerHTML = " Deleted posts " + ((++deleted) + "/" + total);
						} else {
							ArmLinks.debugMessage("Could not delete; response was "+deleteConfirmRequest.responseText);
						}

						deletePosts();
					} catch(e) {
						alert(e + "\n" + req.url + "\n" + deleteRequest.responseText.replace(/[\s\S]*<body>|<[^>]+>/g, ''));
					}
				}

				/* retrieve posts */
				req = {
					method: "GET",
					url: "/search.php?author_id=" + uid + "&sr=posts"
				};
				var getPostsRequest = new XMLHttpRequest();
				ArmLinks.debugMessage("Search URL is /search.php?author_id=" + uid + "&sr=posts");
				getPostsRequest.open(req.method, req.url, false);
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
					deletePosts();
				} else {
					ArmLinks.debugMessage("No posts found to delete");
				}

				/* request ban */
				req = {
					method:"POST",
					url: "/mcp.php?i=ban&mode=user&u=" + uid,
					headers: { 'Content-type': 'application/x-www-form-urlencoded' },
					data: "ban=" + userName + "&banlength=0&banlengthother=&banreason=spam&bangivereason=&banexclude=0&bansubmit=Submit",
				};
				var banRequest = new XMLHttpRequest();
				ArmLinks.debugMessage("Ban request URL is "+req.url+" with content type "+req.headers['Content-type']);
				banRequest.open(req.method, req.url, false);
				banRequest.setRequestHeader('Content-type', req.headers['Content-type']);
				banRequest.setRequestHeader('Content-length', req.data.length);
				banRequest.setRequestHeader('Connection', 'close');
				banRequest.send(req.data);
				ArmLinks.debugMessage("Ban request result was "+banRequest.responseText);
				try {
					/* confirm ban */
					req = ArmLinks.form2xhr(banRequest.responseText);
					var banConfirmRequest = new XMLHttpRequest();
					ArmLinks.debugMessage("Ban confirm URL is "+req.url+", body "+req.data+", content type "+req.headers['Content-type']);
					banConfirmRequest.open(req.method, req.url, false);
					banConfirmRequest.setRequestHeader('Content-type', req.headers['Content-type']);
					banConfirmRequest.setRequestHeader('Content-length', req.data.length);
					banConfirmRequest.setRequestHeader('Connection', 'close');
					banConfirmRequest.send(req.data);
					if (/banlist.*updated.*success/.test(banConfirmRequest.responseText)) {
						link.innerHTML = "BANNED";
					} else {
						ArmLinks.debugMessage("Couldn't ban; result page was "+banConfirmRequest.responseText);
						link.innerHTML = "ERROR";
					}
					canDelete = true;
					if (deleting) deletePosts();
				} catch(e) {
					ArmLinks.debugMessage("Ban attempt threw exception: "+e);
					link.innerHTML = "ERROR";
					canDelete = true;
				}

			} catch(e) { alert(e) }
		}
	},

};

ArmLinks.init();
