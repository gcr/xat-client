// Parses xat streams.
/*jslint bitwise: false */
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
  // --------- Events: -------
  // userChange(oldObj, newObj): User changed
  // userJoin(newObj): User joined the channel
  // userPart(userObj): User left the channel
  // joining(channel, username, avatar, hpage): Joining the channel
  // joined(): Userlist, channel list has been downloaded.
  // message(text, user): We got a message from somebody
  // channelInfo({background:...}): We've received information about the channel.
  //
  // Debug events:
  // incomingTag(elementName, attrs): Every command (debug)
  // TCPError(exception): Server closed our command (more precisely, net.Stream
  //                      threw an exception). We'll reconnect.
  // unknownTag(elementName, attrs): We ignored it
  // connecting(host, port, channel): Trying to connect
  // connected(): Server connected
  // rejoining(): Server kicked us either through closing our connection or
  //              sending an <idle /> tag.
  //
  this.channel = channel;
  this.username = username;
  this.avatar = avatar;
  this.hpage = hpage;
  this.rejoining = false;
};
sys.inherits(XatClient, events.EventEmitter);

XatClient.prototype.getHost = function() {
  var sock  = ["174.36.242.26", "174.36.242.34", "174.36.242.42", "69.4.231.250"];
      // sock2 seems to be used for redirection
      //sock2=["208.43.218.82", "174.36.56.202", "174.36.4.146", "174.36.56.186"];
  // TODO: blatant copy+paste here
  return sock[(parseInt(this.channel, 10) & 96) >> 5];
};

XatClient.prototype.getPort = function() {
  var chan = parseInt(this.channel, 10);
  return 10007 + (chan%32);
};

XatClient.prototype.connect = function() {
  // Establish the XMLSocket connection. (You must call this yourself!)
  var host = this.getHost(), port = this.getPort();
  this.emit("connecting", host, port, this.channel, this);
  var xmlsock = this.xmlsock = new XMLSocket.XMLSocket(host, ""+port);
  this.state = "negotiating";
  // a user has {
  //     'user_id': {name:, avatar:, hpage},
  //     ...
  // }
  this.users = {};

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
      self.emit("connected", self);
    });
  xmlsock.addListener('error', function(exception) {
      self.emit("TCPError", exception, self);
      if (self.state == "joined") {
        self.rejoin();
      }
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
      // We got kicked. Server will send <idle /> and close the connection.
      self.rejoin();
    });
  xmlsock.addTagListener(["u", "g", "o"], function(attrs, element) {
      // User update. attrs.u is the user ID (split by _), n is display name, a
      // is avatar, h is homepage.
      // f is status. Last 3 bits: {1: mainowner, 2:
      // moderator, 3: member, 4: owner}. If f & 16: banned.
      //                                     f & 64: forever.
      // s: whether the user is "new" or not.
      //
      // <u>: Implies the user is online.
      // <o>: Implies the user is no longer online (e.g. for sending initial
      //      recent messages)
      var uId = attrs.u.split("_")[0],
          newUserObj = {name: attrs.n,
                        avatar: attrs.a,
                        hpage: attrs.h,
                        owner: "124".indexOf(attrs.f) != -1, // HACK
                        real: attrs.N,
                        uid: uId,
                        old: element == "o"
                      };

      if (self.state == "joined") {
        if (self.users[uId]) {
          // Changed user
          self.emit("userChange", self.users[uId], newUserObj, self);
        } else {
          // New user
          self.emit("userJoin", newUserObj, self);
        }
      }
      self.users[uId] = newUserObj;
    });
  xmlsock.addTagListener("l", function(attrs) {
      // A user left.
      var uId = attrs.u.split("_")[0];
      if (uId in self.users) {
        self.emit("userPart", self.users[uId]);
        delete self.users[uId];
      }
    });
  xmlsock.addTagListener("done", function() {
      // The server will stream a user list to us (<u> for online users, <o> for
      // old users), the last few messages (as <m> tags), and then this tag to
      // signal that it's done.
      self.rejoining = false;
      self.emit("joined", self);
      self.state = "joined";
      // Remove old users
      for (var k in self.users) {
          if (self.users.hasOwnProperty(k) && self.users[k].old) {
            delete self.users[k];
          }
      }
    });
  xmlsock.addTagListener(["m", "p", "c", "z"], function(attrs, element) {
      // A message.
      // <m> is a message, <p> and <z> is a private message, <c> is a control message
      // attrs.t is text (treated specially if there's a / at the
      // beginning), attrs.u is the user ID (split by _ and take the first).
      var uId = attrs.u.split("_")[0];
      if (!self.rejoining) {
        self.emit("message", attrs.t, self.users[uId] || {name: "(unknown) "+uId}, self);
      }
      // TODO: what to do when we don't have a user?
    });
  xmlsock.addTagListener("i", function(attrs) {
      // Channel info. attrs.b is a string like
      // "http://i47.tinypic.com/307s39e.png;=;=1;=;="
      var bak = attrs.b.split(";");
      // bak[0] is background; the rest are worthless things like sound control,
      // colors, radio.
      self.emit("channelInfo", {background: bak[0]});
    });
};

XatClient.prototype.join = function() {
  // See chat.as3:14142
  this.emit("joining", this.channel, this.username, this.avatar, this.hpage, this);
  this.state="joining";
  this.xmlsock.send("j2", { // Join message
      v: 0, // Some kind of user revision number.
            // Perhaps clients who have an older user revision will update
            // their local copy (not sure). It's saved inside the flash
            // cookie; it can't possibly be that important. (This is sent in
            // other users' <u v="..."> tags when they join.)
            //
            // this and other information (dt, d0, ..., k0, ...) may be
            // updated if the server sends you a <v> tag.
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

XatClient.prototype.rejoin = function() {
  this.rejoining = true; // messages and user events will not be sent
  this.emit("rejoining", this);
  this.xmlsock.close();
  this.connect();
};
