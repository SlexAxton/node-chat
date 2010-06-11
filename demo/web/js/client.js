(function($){
	function linkify(inputText) {
	    // Test for gists
	    if (inputText.substr(0,6) === '/gist ') {
		var gistId = $.trim(inputText.substr(6));
		return '<div style="width:600px;height:400px;"><script src="http://gist.github.com/'+ gistId +'.js"></scr'+'ipt></div>';
	    }
	
	    //URLs starting with http://, https://, or ftp://
	    var replacePattern1 = /\b((https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[a-zA-Z0-9-_\.]+\.(jpg|gif|png))\b/gim;
	    var replacedText = inputText.replace(replacePattern1, '<img src="$1" />');
	    
	    var replacePattern1point5 = /\b((https?|ftp):\/\/(?![-A-Z0-9+&@#\/%?=~_|!:,.;]+\.(jpg|gif|png))[-A-Z0-9+&@#\/%?=~_|!:,.;]*\b[\/]?)/gim;
	    replacedText = replacedText.replace(replacePattern1point5, '<a href="$1" target="_blank">$1</a>');
	
	    return replacedText;
	}
	function htmlencode(str) {
		return str.replace(/[&<>"']/g, function($0) {
		    return "&" + {"&":"amp", "<":"lt", ">":"gt", '"':"quot", "'":"#39"}[$0] + ";";
		});
	}
	
	$.fn.extend({
		linkify: function(){
			return this.each(function(){
				var $this = $(this);
				$this.html(linkify(htmlencode($this.text())));
			});
		}
	});
})(jQuery);

(function($) {

var title = document.title,
	colors  = ["green", "orange", "yellow", "red", "fuschia", "blue"],
	channel = nodeChat.connect("/chat"),
	gravatars = {},
	log,
	message,
	history = [""],
	history_pos = -1;

// TODO: handle connectionerror

$(function() {
	log = $("#chat-log");
	message = $("#message");
	
	// Add a button that can be easily styled
	$("<a></a>", {
		id: "submit",
		text: "Send",
		href: "#",
		click: function(event) {
			event.preventDefault();
			$(this).closest("form").submit();
		}
	})
	.appendTo("#entry fieldset");
	
	// Add a message indicator when a nickname is clicked
	$("#users").delegate("li", "click", function() {
		message
			.val($(this).text() + ": " + message.val())
			.focus();
	});
});

function userDisplay(nick) {
	return '<img src="'+gravatars[nick]+'" class="gravatar"/><p class="nickname">'+nick+'</p>';
}

// new message posted to channel
// - add to the chat log
$(channel).bind("msg", function(event, message) {
	var time = formatTime(message.timestamp),
		row = $("<div></div>")
			.addClass("chat-msg");
	
	$("<span></span>")
		.addClass("chat-time")
		.text(time)
		.appendTo(row);
	
	$("<span></span>")
		.addClass("chat-nick")
		.html(userDisplay(message.nick))
		.appendTo(row);
	
	$("<span></span>")
		.addClass("chat-text")
		.text(message.text)
		.linkify()
		.appendTo(row);
	
	row.appendTo(log);
})
// another user joined the channel
// - add to the chat log
.bind("join", function(event, message) {
	var time = formatTime(message.timestamp),
		row = $("<div></div>")
			.addClass("chat-msg chat-system-msg");
	
	$("<span></span>")
		.addClass("chat-time")
		.text(time)
		.appendTo(row);
	
	$("<span></span>")
		.addClass("chat-nick")
		.text(message.nick)
		.appendTo(row);
	
	$("<span></span>")
		.addClass("chat-text")
		.text("joined the room")
		.appendTo(row);
	
	row.appendTo(log);
})
// another user joined the channel
// - add to the user list
.bind("join", function(event, message) {
	gravatars[message.nick] = "http://www.gravatar.com/avatar/"+(message.text)+"?d=identicon&s=30";
	var added = false,
		nick  = '<li class="'+colors[0]+'">'+userDisplay(message.nick)+'</li>';
	colors.push(colors.shift());
	$("#users > li").each(function() {
		if (message.nick == this.innerHTML) {
			added = true;
			return false;
		}
		if (message.nick < this.innerHTML) {
			added = true;
			nick.insertBefore(this);
			return false;
		}
	});
	if (!added) {
		$("#users").append(nick);
	}
})
// another user left the channel
// - add to the chat log
.bind("part", function(event, message) {
	var time = formatTime(message.timestamp),
		row = $("<div></div>")
			.addClass("chat-msg chat-system-msg");
	
	$("<span></span>")
		.addClass("chat-time")
		.text(time)
		.appendTo(row);
	
	$("<span></span>")
		.addClass("chat-nick")
		.text(message.nick)
		.appendTo(row);
	
	$("<span></span>")
		.addClass("chat-text")
		.text("left the room")
		.appendTo(row);
	
	row.appendTo(log);
})
// another user left the channel
// - remove from the user list
.bind("part", function(event, message) {
	$("#users > li").each(function() {
		if (new RegExp(message.nick).exec(this.innerHTML)) {
			$(this).remove();
			return false;
		}
	});
	delete gravatars[message.nick];
})

// Auto scroll list to bottom
.bind("join part msg", function() {
	// auto scroll if we're within 50 pixels of the bottom
	if (log.scrollTop() + 50 >= log[0].scrollHeight - log.height()) {
		window.setTimeout(function() {
			log.scrollTop(log[0].scrollHeight);
		}, 10);
	}
});

// handle login (choosing a nick)
$(function() {
	
	// fix browsers where submission won't happen... ? // TODO: figure out why this happens?!
	$('#nick, #email').keyup(function(e){
		if(e.keyCode === 13) {
			$('#login').submit();
		}
	});
	
	// handle gist button
	$('#insertGist').click(function(){
		message.val("/gist ").focus();
	});
	
	function loginError(error) {
		login
			.addClass("error")
			.find("label:first")
				.text(error + " Please choose another:")
			.end()
			.find("input:first")
				.focus();
	}
	
	var login = $("#login");
	login.submit(function() {
		var nick  = $.trim($("#nick").val()),
		    email = $.trim($("#email").val());
		
		// TODO: move the check into nodechat.js
		if (!nick.length || !/^[a-zA-Z0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+$/.test(nick)) {
			loginError("Invalid Nickname.");
			return false;
		}
		
		channel.join(nick, {
			gravatar: MD5(email),
			success: function() {
				$("body")
					.removeClass("login")
					.addClass("channel");
				message.focus();
			},
			error: function() {
				loginError("Nickname in use.");
			}
		});
		
		return false;
	});
	login.find("input:first").focus();
});

// handle sending a message and message history
$(function() {
	$("#channel form").submit(function() {
		var msg = message.val();
		channel.send(msg);
		
		message.val("").focus();
		
		// store message history
		history[history.length-1] = msg;
		history.push("");
		history_pos = history.length - 1;
		
		return false;
	});
	message.keyup(function(e){
		var UP   = 38,
		    DOWN = 40,
		    nextIndex;
		
		if (e.keyCode === UP) {
			// save the current message if we're already typing
			if (history_pos === (history.length-1)) {
				history[history.length-1] = message.val();
			}
			nextIndex = history_pos - 1;
			if (nextIndex >= 0 && nextIndex < history.length) {
				isInHistory = true;
				history_pos--;
				message.val(history[nextIndex]);
			}
		}
		else if (e.keyCode === DOWN) {
			nextIndex = history_pos + 1
			if (nextIndex >= 0 && nextIndex < history.length) {
				history_pos++;
				message.val(history[nextIndex]);
			}
		}
	});
});

// update the page title to show if there are unread messages
$(function() {
	var focused = true,
		unread = 0;
	
	$(window)
		.blur(function() {
			focused = false;
		})
		.focus(function() {
			focused = true;
			unread = 0;
			document.title = title;
		});
	
	$(channel).bind("msg", function(event, message) {
		if (!focused) {
			unread++;
			document.title = "(" + unread + ") " + title;
		}
	});
});

// notify the chat server that we're leaving if we close the window
$(window).unload(function() {
	channel.part();
});

function formatTime(timestamp) {
	var date = new Date(timestamp),
		hours = date.getHours(),
		minutes = date.getMinutes(),
		ampm = "AM";
	
	if (hours > 12) {
		hours -= 12;
		ampm = "PM";
	}
	
	if (minutes < 10) {
		minutes = "0" + minutes;
	}
	
	return hours + ":" + minutes + " " + ampm;
}

})(jQuery);
