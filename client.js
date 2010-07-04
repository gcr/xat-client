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

// When we get kicked, we won't show lots of things (connection messages, etc)
var firstConnection = true;

function styleUserName(user) {
  return ((user.owner? "@" : "") + user.name);
}

client.addListener('unknownTag', function(element, attrs) {
    sys.puts("??  " + XMLSocket.stringifyTag(element, attrs) + "\n");
  });

client.addListener('connecting', function(host, port, channel) {
    if (firstConnection) {
      sys.puts("-- Connecting to " + host + ":" + port);
    }
  });

client.addListener('joining', function() {
    if (firstConnection) {
      sys.puts("-- Joining...");
    }
  });

client.addListener('channelInfo', function(obj) {
    if (firstConnection) {
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
      sys.print("\n");
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
        sys.print(styleUserName(client.users[uid]));
        split=true;
      }
    }
    sys.print("\n-- Total of " + (numUsers) + " user"+(numUsers!=1?"s":"")+" online ("+numOps+" op"+(numOps!=1?"s":"")+")\n");
    firstConnection = false;
  });

client.addListener('message', function(text, user) {
    sys.puts("<" + styleUserName(user)+ "> " + text);
  });

client.addListener('userJoin', function(user) {
    sys.puts("-- Join: " + styleUserName(user));
  });

client.addListener('userChange', function(old, user) {
    sys.puts("-- User " + styleUserName(old) + " is now " + styleUserName(user));
  });

client.addListener('userPart', function(old) {
    sys.puts("-- Part: " + styleUserName(old));
  });

client.addListener("TCPError", function(ex) {
    sys.puts("!! TCP error: " + ex.message + "\n" + ex.stack);
  });

client.addListener("rejoining", function() {
    sys.puts("-- We were kicked; reconnecting...");
  });

if (DEBUG) {
  client.addListener('incomingTag', function(element, attrs) {
      // Filter out certain well-known mostly implemented tags for DEBUG==1
      if (DEBUG > 1 || ["i", "y", "m", "u", "o", "l", "done"].indexOf(element) == -1) {
        sys.puts("!! " + XMLSocket.stringifyTag(element, attrs));
      }
    });
}

client.connect();
