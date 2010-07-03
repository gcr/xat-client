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
        self.join(channel, username, avatar, hpage);
      }
    });
};
sys.inherits(XatClient, events.EventEmitter);

XatClient.prototype.join = function(channel, username, avatar, hpage) {
  // sends something like <j2 l4="3603" l3="3561" l2="0" y="2021040961" k="-1703400679" k3="381394543" z="11" p="0" c="100867422" r="1833903872" f="0" u="256409089" m0="0" m1="0" m2="0" d0="0" d3="4992373" N="hotdog0003" n="gcr" a="http://i941.photobucket.com/albums/ad253/hotdog003/dresdencodak.png" h="" v="3" />.
  // j2 is a join message. h is homepage. a is avatar. n is displayed name. v is
  // "w_td_userrev". N is your username "w_registered". d0, d1,... seem to be
  // powers. dx is how many "xats" you have. m0, m1, m2, etc. seem to be "masks".
  // f seems to be an autologin flag (0 if true). "r" is "pass". c is the HTML id
  // (room number maybe? "channel"?) z is always 11. y is the I element above.
  // l2, l3, l4 seem to be timing information.
  this.emit("join", channel, username, avatar, hpage, this);
  this.state="joining";
  this.xmlsock.send("j2", { // Join message
      v: 0, // Some kind of user verification
      h: hpage, // A link
      a: avatar, // Either a URL or a number
      n: username,
      u: 2,
      f: 0,
      c: channel,
      k3: 0,
      k: 0,
      y: this.YI,
      l2: 0,
      l3: 0,
      l4: 2350
    });
};
