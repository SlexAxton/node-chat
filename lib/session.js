var sys = require("sys");

function Session(nick, options) {
	if (nick.length > 50) {
		return;
	}
	if (!/^[a-zA-Z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+$/.test(nick)) {
		return;
	}
	
	this.nick = nick;
	this.id = Math.floor(Math.random() * 1e10).toString();
	this.timestamp = new Date();
	
	if (options) {
		if (options.gravatar) { this.gravatar = options.gravatar; }
		else { this.gravatar = sys.exec("md5 -s '"+nick+"' | sed -e 's/.*= \(.*\)$/\1/'"); }
	}
}

Session.prototype.poke = function() {
	this.timestamp = new Date();
};

Session.prototype.gravatar = function() {
	return this.gravatar;
}

exports.Session = Session;
