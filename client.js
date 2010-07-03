// Xat client
var XatClient = require('./xat-client').XatClient,
    sys = require('sys'),
    XMLSocket = require('./flash-xmlsocket'),

    DEBUG = 1, // 0: no debug. 1: display unknown tags. 2: display every incoming message.
    //CHANNEL = '1913106'; // xat help
    CHANNEL = '100867422'; // lights board

var client = new XatClient(CHANNEL, 'gcr_bot', '235', 'http://google.com');
//client.xmlsock.addListener("incomingBuffer", function(buffer) {
//    sys.puts(sys.inspect(buffer.toString("ascii", 0, buffer.length)));
//  });

client.addListener('unknownTag', function(element, attrs) {
    sys.puts("??  " + XMLSocket.stringifyTag(element, attrs) + "\n");
  });

client.addListener('connecting', function(host, port, channel) {
    sys.puts("-- Connecting to " + host + ":" + port);
  });

client.addListener('joining', function() {
    sys.puts("-- Joining...");
  });

client.addListener('channelInfo', function(obj) {
    sys.print("-- Channel info: ");
    var split=false;
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        if (split) {
          sys.print(", ");
        }
        sys.print(k + ": " + obj[k]);
        split=true;
      }
    }
  });

client.addListener('joined', function() {
    sys.print("-- Userlist: ");
    var split=false;
    var numUsers=0, numOps=0;
    for (var uid in client.users) {
      if (client.users.hasOwnProperty(uid) && !client.users[uid].old) {
        numUsers++;
        if (client.users[uid].owner) {
          numOps++;
        }
        if (split) {sys.print(",  ");}
        sys.print((client.users[uid].owner? "@" : "") + client.users[uid].name);
        split=true;
      }
    }
    sys.print("\n-- Total of " + (numUsers+numOps) + " users online ("+numOps+" ops)\n-- Join to channel synched.\n");
  });

client.addListener('message', function(text, user) {
    sys.puts("<" +
        (user.owner? "@" : "") +
        user.name + "> " + text);
  });

client.addListener('userJoin', function(user) {
    sys.puts("-- Join: " + user.name);
  });

client.addListener('userChange', function(old, user) {
    sys.puts("-- User " + old.name + " changed his nick to " + user.name + " (website: " + user.hpage + ")");
  });

client.addListener('userPart', function(old) {
    sys.puts("-- Part: " + old.name);
  });

client.addListener("idle", function() {
    sys.puts("-- We were idled; reconnecting...");
  });

if (DEBUG) {
  client.addListener('incomingTag', function(element, attrs) {
      if (DEBUG > 1 || ["y", "m", "u", "o", "l", "done"].indexOf(element) == -1) {
        sys.puts("!! " + XMLSocket.stringifyTag(element, attrs));
      }
    });
}

client.connect();
