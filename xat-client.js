// Parses xat streams.
//
var net = require('net'),
    sys = require('sys'),
    events = require('events'),
    Xml = require('./node-xml/lib/node-xml');

function findAttr(attr, list) {
  // return value from the first matched attr in list
  // findAttr('foo', [ ['bar', 1], ['foo', 2] ] => 2
  for (var i=0,l=list.length; i<l; i++) {
    if (list[i][0] == attr) {
      return list[i][1]; } } }



var XatClient = exports.XatClient = function(host, channel, username, avatar, hpage) {
  this.state = "negotiating";
  var stream = this.stream = net.createConnection(10037, host);
  var self = this;

  this.stream.addListener('connect', function() {
      stream.write("<y m=\"1\" />\x00");
      self.emit("connected", this);
    });
  this.stream.addListener('data', function(data) {
      self.incomingBuffer(data);
    });

  // Build parser
  // TODO: it doesn't work with some elements.
  this.parser = new Xml.SaxParser(function(cb) {
      cb.onStartElementNS(function(element, attrs) {
          switch(element) {
              case 'case':
                // code
                break;
              case 'y':
                self.YI = findAttr('i', attrs);
                self.YC = findAttr('c', attrs);
                if (self.state == 'negotiating') {
                  self.join(channel, username, avatar, hpage);
                }
                break;
              
              default:
                self.emit("unknownElement", this, element, attrs);
          }
        });
    });
};
sys.inherits(XatClient, events.EventEmitter);

XatClient.prototype.incomingBuffer = function(buffer) {
  // Process this buffer
  this.emit("incomingBuffer", this, buffer);
  var elements = buffer.toString("ascii", 0, buffer.length).split('\x00');
  for (var i=0,l=elements.length; i<l; i++) {
    this.parser.parseString(elements[i]);
    sys.puts(elements[i]);
  }
};

XatClient.prototype.join = function(channel, username, avatar, hpage) {
  // sends something like <j2 l4="3603" l3="3561" l2="0" y="2021040961" k="-1703400679" k3="381394543" z="11" p="0" c="100867422" r="1833903872" f="0" u="256409089" m0="0" m1="0" m2="0" d0="0" d3="4992373" N="hotdog0003" n="gcr" a="http://i941.photobucket.com/albums/ad253/hotdog003/dresdencodak.png" h="" v="3" />.
  // j2 is a join message. h is homepage. a is avatar. n is displayed name. v is
  // "w_td_userrev". N is your username "w_registered". d0, d1,... seem to be
  // powers. dx is how many "xats" you have. m0, m1, m2, etc. seem to be "masks".
  // f seems to be an autologin flag (0 if true). "r" is "pass". c is the HTML id
  // (room number maybe? "channel"?) z is always 11. y is the I element above.
  // l2, l3, l4 seem to be timing information.
  this.emit("join", this, channel, username, avatar, hpage);
  var packet = '<j2 v="0" h="'+hpage+'" a="'+avatar+'" n="'+username+'" u="2" f="0" c="'+channel+'" k3="0" k="0" y="'+this.YI+'" l2="0" l3="0" l4="2350"/>\x00';
  // l4 is getTimer() minus previous getTimer()

  sys.puts("Sending ... " + packet);

  this.stream.write(packet);
};
