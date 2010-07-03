// Parses xat streams.
//
var net = require('net'),
    sys = require('sys'),
    events = require('events'),
    Xml = require('./node-xml/lib/node-xml');

var XMLSocket = exports.XMLSocket = function(host, port) {
  // This implements flash's XMLSocket protocol. See
  // http://www.adobe.com/support/flash/action_scripts/actionscript_dictionary/actionscript_dictionary860.html
  // for details.
  //
  // This protocol is exceedingly simple: TCP connection, then the server and
  // client send XML strings back and forth. Each XML string is terminated by a
  // \x00 (null) character.
  //
  // This implementation only supports <tags like this with="attributes"/>, no
  // <start> tags or <end /> tags.
  //
  // Events:
  // connected(this)
  // incomingBuffer(this, buffer);
  // incomingTag(element, attrObj, this);
  // unknownTag(element, attrs, this);
  // send(response, this);

  var stream = this.stream = net.createConnection(port, host);

  // Sometimes we don't get enough data for an entire tag. This buffer will keep
  // hold of that until the next data arrives.
  this.buffer = '';

  // A list of tags to respond to. e.g. {'a': function(attrs){}} will run that
  // function when we see an 'a' tag. (This works best with stateless protocols,
  // of course)
  this.callbackTags = {};

  var self = this;
  this.stream.addListener('connect', function() {
      self.emit("connected", self);
    });
  this.stream.addListener('data', function(data) {
      self.incomingBuffer(data);
    });
  this.stream.addListener('error', function(ex) {
      self.emit("error", ex, self);
    });

  // Build parser
  this.parser = new Xml.SaxParser(function(cb) {
      cb.onStartElementNS(function(element, attrs) {
          self.incomingTag(element, attrs);
        });
      // add cb.onEndElementNS if you need
    });
};
sys.inherits(XMLSocket, events.EventEmitter);

XMLSocket.prototype.incomingBuffer = function(buffer) {
  // We got something from the server! Horray.
  this.emit("incomingBuffer", buffer, this);
  var elements = buffer.toString("ascii", 0, buffer.length).split('\x00');
  for (var i=0,l=elements.length; i<l; i++) {
    var element = elements[i];
    if (this.buffer.length) {
      element = this.buffer + element;
      this.buffer = '';
    }
    if (element[element.length-1] != ">") {
      // HACK HACK OH MY GOSH. Save the buffer if we don't have a complete tag.
      this.buffer = element;
    } else {
      this.parser.parseString(element);
    }
  }
};

XMLSocket.prototype.incomingTag = function(element, attrs) {
  // element is a string. "a", "div", whatevah. attrs is a list that looks like
  // [ ["href", "http://google.com"], ["style", "border: 1px solid gold;"] ]
  // We'll pass that in to the callback if it exists.
  var attrObj = {};
  for (var i=0,l=attrs.length; i<l; i++) {
    attrObj[attrs[i][0]] = attrs[i][1];
  }
  if (element in this.callbackTags) {
    this.emit("incomingTag", element, attrObj, this);
    this.callbackTags[element](attrObj, element);
  } else {
    this.emit("unknownTag", element, attrObj, this);
  }
};

XMLSocket.prototype.addTagListener = function(element, callback) {
  // Adds a tag listener. When we see a tag from the server with type 'element',
  // we'll run callback(attrs) for you.
  if (!(element instanceof Array)) {
    element = [element];
  }
  for (var i=0,l=element.length; i<l; i++) {
      this.callbackTags[element[i]] = callback;
  }
};

XMLSocket.prototype.addTagListeners = function(tagTable) {
  // Does the above, but en masse.
  for (var tag in tagTable) {
      if (tagTable.hasOwnProperty(tag)) {
        this.callbackTags[tag] = tagTable[tag];
      }
  }
};

var stringifyTag = exports.stringifyTag = function(element, attrs) {
  var response = '<' + element;
  for (var a in attrs) {
      if (attrs.hasOwnProperty(a)) {
        response += ' ' + a + '="' + (""+attrs[a])
          .replace(new RegExp("&", "g"), '&amp;')
          .replace(new RegExp('"', "g"), '&quot;')
          .replace(new RegExp("'", "g"), '&apos;')
          .replace(new RegExp("<", "g"), '&lt;')
          .replace(new RegExp(">", "g"), '&gt;') + '"';
      }
  }
  response += "/>";
  return response;
};

XMLSocket.prototype.send = function(element, attrs) {
  // Send something to the server.
  // send('div', {'style': "solid gold 1px;"});
  // will send <div style="solid gold 1px;" />\x00
  var response = stringifyTag(element, attrs);
  this.emit("send", response, this);
  this.stream.write(response+"\x00");
};

XMLSocket.prototype.close = function() {
  this.stream.end();
};

