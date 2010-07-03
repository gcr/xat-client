// Parses xat streams.
//
var net = require('net'),
    sys = require('sys'),
    events = require('events'),
    XMLSocket = require('./flash-xmlsocket');

var XatClient = exports.XatClient = function(channel, username, avatar, hpage) {
  // Here's a XatClient that uses the XMLSocket protocol.
  //
  // Not much is known about it. Joining and basic user tracking should be
  // supported. Seems to be a read-only medium for now though.
  //
  this.channel = channel;
  this.username = username;
  this.avatar = avatar;
  this.hpage = hpage;
  this.connect();
};
sys.inherits(XatClient, events.EventEmitter);

XatClient.prototype.connect = function() {
  // TODO: if we were idled, don't log old messages
  var xmlsock = this.xmlsock = new XMLSocket.XMLSocket('174.36.242.42', 10037);
  this.state = "negotiating";

  // Let's pass on event handlers for debug purposes.
  var self = this;
  xmlsock.addListener("incomingTag", function(element, attrs) {
      self.emit("incomingTag", element, attrs, self);
    });
  xmlsock.addListener("unknownTag", function(element, attrs) {
      self.emit("unknownTag", element, attrs, self);
    });
  xmlsock.addListener('connected', function() {
      xmlsock.send("y", {"m":1});
      self.emit("connected", this);
    });

  // What operations will the server send us? Listen for some tags
  xmlsock.addTagListener("y", function(attrs) {
      // <y> seems to be some kind of authentication, protocol setup, and the
      // like.
      self.YI = attrs.i; // This is a 'challenge' that's used in joining a room
                         // (see self.join()).
      self.YC = attrs.c;
      if (self.state == 'negotiating') {
        self.join();
      }
    });
  xmlsock.addTagListener("idle", function() {
      this.emit("idled", this);
      this.xmlsock.close();
      this.connect();
    });
};

XatClient.prototype.join = function() {
  // See chat.as3:14142
  this.emit("join", this.channel, this.username, this.avatar, this.hpage, this);
  this.state="joining";
  this.xmlsock.send("j2", { // Join message
      v: 0, // Some kind of user revision number.
            // Perhaps clients who have an older user revision will update
            // their local copy (not sure). It's saved inside the flash
            // cookie; it can't possibly be that important. (This is sent in
            // other users' <u v="..."> tags when they join.)
      h: this.hpage, // A link
      a: this.avatar, // Either a URL or a number
      n: this.username,
      u: 2,
      // N: registered user name (not going to bother with that)
      f: 0,
      c: this.channel,
      k3: 0,
      k: 0,
      y: this.YI,
      l2: 0,
      l3: 0,
      l4: 2350
    });
};
