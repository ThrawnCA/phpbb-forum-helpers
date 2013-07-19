javascript:
var BannedMemberHighlighter = {
   init: function() {
      banPage = BannedMemberHighlighter.retrieveBanPage();
      BannedMemberHighlighter.highlightBannedMembers(banPage);
      BannedMemberHighlighter.markSuspiciousMembers(banPage);
      BannedMemberHighlighter.addSelectAndContinueButton();
   },

   retrieveBanPage: function() {
      return BannedMemberHighlighter.retrievePage("/mcp.php?i=140").responseText;
   },

   retrieveMemberPageXML: function(url) {
      var req = BannedMemberHighlighter.retrievePage(url);
      if (req.responseXML) return req.responseXML;
      else {
         parser = new DOMParser();
         return parser.parseFromString(req.responseText, "text/xml");
      }
   },

   retrievePage: function(url) {
      var req = new XMLHttpRequest();
      req.open("GET", url, false);
      req.send();
      return req;
   },

   isMemberProfileLink: function(href) {
      return /memberlist\.php\?mode=viewprofile/.test(href);
   },

   isBanned: function(text, banPage) {
      return banPage.match("<option value=\"[0-9]+\">"+BannedMemberHighlighter.escapeRegExp(text)+"</option>");
   },

   makeYellow: function(element) {
      element.style.setProperty("color", "#CCCC00", "");
   },

   highlightBannedMembers: function(banPage) {
      if (/memberlist\.php/.test(window.location)) {
         var allSpans = document.getElementsByTagName("span");
         for (var i = 0; i < allSpans.length; i++) {
            if (/^[a-zA-Z0-9]+$/.test(allSpans[i].innerHTML) && BannedMemberHighlighter.isBanned(allSpans[i].innerHTML, banPage)) {
               BannedMemberHighlighter.makeYellow(allSpans[i]);
            }
         }
      }
      var allLinks = document.getElementsByTagName("a");
      for (var i = 0; i < allLinks.length; i++) {
         if (BannedMemberHighlighter.isMemberProfileLink(allLinks[i].href) && BannedMemberHighlighter.isBanned(allLinks[i].innerHTML, banPage)) {
            BannedMemberHighlighter.makeYellow(allLinks[i]);
         }
      }
   },
   
   markSuspiciousMembers: function(banPage) {
      if (/memberlist\.php.*form=mcp_ban/.test(window.location)) {
         var allRows = document.getElementsByTagName("tr");
         for (var i = 0; i < allRows.length; i++) {
            var row = allRows[i];
            var memberLink = row.getElementsByTagName("a")[0];
            if (BannedMemberHighlighter.isMemberProfileLink(memberLink.href) && !BannedMemberHighlighter.isBanned(memberLink.innerHTML, banPage)) {
               var cells = row.getElementsByTagName("td");
               /* don't bother checking other profile data if there is a website */
               if (cells[2].getElementsByTagName("a").length == 0) {
                  var profilePage = BannedMemberHighlighter.retrieveMemberPageXML(memberLink.href);
                  var overviewList = profilePage.getElementById("viewprofile").getElementsByTagName("dl")[0];
                  var headings = overviewList.getElementsByTagName("dt");
                  var values = overviewList.getElementsByTagName("dd");
                  for (var j = 0; j < headings.length; j++) {
                     if (headings[j].innerHTML == "Occupation:" || headings[j].innerHTML == "Interests:") {
                        cells[2].appendChild(headings[j]);
                        cells[2].appendChild(values[j]);
                     }
                  }
                  var allDivs = profilePage.getElementsByTagName("div");
                  for (var d = 0; d < allDivs.length; d++) {
                     var div = allDivs[d];
                     if (div.className == "signature") {
                        div.innerHTML = "Signature: "+div.innerHTML;
                        cells[2].appendChild(div);
                     }
                  }
               }
               if (cells[1].innerHTML == "0") {
                  /* recheck for links after adding profile data */
                  if (/\bhref\b/.test(cells[2].innerHTML)) {
                     cells[0].getElementsByTagName("input")[0].checked = true;
                  }
               }
            }
         }
      }
   },

   selectAndContinue: function() {
     users = document.getElementById("results").user;
      if (typeof(users.length) == "undefined") {
         if (users.checked) {
            insert_user(users.value);
         }
      } else if (users.length > 0) {
         var markedCount = 0;
         for (i = 0; i < users.length; i++) {
            if (users[i].checked) {
               insert_user(users[i].value);
               markedCount++;
            }
         }
         alert("Selected "+markedCount+" members.");
      }
   },

   addSelectAndContinueButton: function() {
      button = document.createElement("input");
      button.type = "button";
      button.id = "submitAndContinue";
      button.name = "submitAndContinue";
      button.value = "Select Marked and Continue";
      document.getElementById("results").appendChild(button);

      button.onclick = BannedMemberHighlighter.selectAndContinue;
   },
   
   escapeRegExp: function(str) {
      return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
   },
};
BannedMemberHighlighter.init();

