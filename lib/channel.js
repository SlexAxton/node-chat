var EventEmitter = require("events").EventEmitter,
	sys = require("sys"),
	Session = require("./session").Session;

function Channel(options) {
	EventEmitter.call(this);
	
	if (!options || !options.basePath) {
		return false;
	}
	
	this.basePath = options.basePath;
	this.messageBacklog = parseInt(options.messageBacklog) || 200;
	this.sessionTimeout = (parseInt(options.sessionTimeout) || 60) * 1000;
	
	this.nextMessageId = 0;
	this.messages = [];
	this.callbacks = [];
	this.sessions = {};
	
	var channel = this;
	setInterval(function() {
		channel.flushCallbacks();
		channel.expireOldSessions();
	}, 1000);
}
sys.inherits(Channel, EventEmitter);

extend(Channel.prototype, {
	appendMessage: function(nick, type, text) {
		var id = ++this.nextMessageId,
			message = {
				id: id,
				nick: nick,
				type: type,
				text: text,
				timestamp: (new Date()).getTime()
			};
		this.messages.push(message);
		this.emit(type, message);
		
		while (this.callbacks.length > 0) {
			this.callbacks.shift().callback([message]);
		}
		
		while (this.messages.length > this.messageBacklog) {
			this.messages.shift();
		}
		
		return id;
	},
	
	query: function(since, callback) {
		var matching = [],
			length = this.messages.length;
		for (var i = 0; i < length; i++) {
			if (this.messages[i].id > since) {
				matching = this.messages.slice(i);
				break;
			}
		}
		
		if (matching.length) {
			callback(matching);
		} else {
			this.callbacks.push({
				timestamp: new Date(),
				callback: callback
			});
		}
	},
	
	flushCallbacks: function() {
		var now = new Date();
		while (this.callbacks.length && now - this.callbacks[0].timestamp > this.sessionTimeout * 0.75) {
			this.callbacks.shift().callback([]);
		}
	},
	
	createSession: function(nick, options) {
		var session = new Session(nick, options);
		if (!session) {
			return;
		}
		
		//nick = nick.toLowerCase();
		for (var i in this.sessions) {
			if (this.sessions[i].nick && this.sessions[i].nick.toLowerCase() === nick.toLowerCase()) {
				return;
			}
		}
		
		this.sessions[session.id] = session;
		session.since = this.appendMessage(nick, "join", session.gravatar);
		
		return session;
	},
	
	destroySession: function(id) {
		if (!id || !this.sessions[id]) {
			return false;
		}
		
		var eventId = this.appendMessage(this.sessions[id].nick, "part");
		delete this.sessions[id];
		return eventId;
	},
	
	expireOldSessions: function() {
		var now = new Date();
		for (var session in this.sessions) {
			if (this.sessions[session]){
				if (now - this.sessions[session].timestamp > this.sessionTimeout) {
					this.destroySession(session);
				}
			}
		}
	}
});

exports.Channel = Channel;



function extend(obj, props) {
	for (var prop in props) {
		obj[prop] = props[prop];
	}
}
