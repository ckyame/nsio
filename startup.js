const http = require('http');
const jsonparse = require('jsonparse');
const ncache = require('node-cache');
const express = require('express')
const path = require('path')
const cors = require('cors')

const myCache = new ncache();
const hostname = '127.0.0.1';
const port = 3000;
const cacheDuration = 10000;
const app = express()
const _root = '/Users/christopherkyame/Desktop/Atom/game';

const server = app.listen(3000, () => console.log('Server Started on: ' + port));
const io = require('socket.io').listen(server);

console.log('IO Attached: ', io.engine);

// memory scoreboard
var scored = [];

// Active players
var players = [];

// Statics + CORS
app.use(express.static(path.join(__dirname, 'fe')))
app.use(cors())

// Main Page
app.get('/', (req, res) => res.sendFile(_root + '/fe/views/home/index.html'));

// IO Events
io.on('connection', function(socket) {
  console.log('a user connected: ' + socket.id + ': ', socket.client.conn.remoteAddress);
  players.push({ id: socket.id, name: '' });

  setTimeout(function() {
    io.emit('sb', scored);
  } , 3000);
  socket.on('disconnect', function() {
    var pname = '';
    for(var i = 0; i < players.length; i++) {
      if(players[i].id == socket.id) {
        pname = players[i].name;
      }
    }
    socket.emit('kp', pname);
    console.log('a user disconnected');
  });
  socket.on('pj', function(name) {
    console.log(socket.id + ' is ' + name);
    scored.push({ name: name, score: 0 });
    for(var i = 0; i < players.length; i++) {
      if(players[i].id === socket.id) {
        players[i].name = name;
      }
      console.log('Player ' + i + ': ', players[i]);
    }
    io.emit('createPlayer', name);
    io.emit('scoredUpdate', scored);
  });
  socket.on('imoved', function(xyn) {
    io.emit('theymoved', xyn);
  });
  socket.on('idied', function(id) {
    io.emit('theydied', id);
  });
  socket.on('sm', function(m) {
    console.log('got message', m)
    io.emit('gm', m);
  });
  socket.on('scored', function(data) {
    var e = false, n = '', p = 0;
    for(var i = 0; i < scored.length; i++) {
      var player = scored[i].name;
      if(player == data) {
        n = player;
        p = scored[i].score++;
        e = true;
      }
    }
    if(e == false) {
      scored.push({ name: data, score: 1  });
      n = data;
      p = 1;
    }
    io.emit('scoredUpdate', scored);
  });
  socket.on('shotsFired', function(data) {
    io.emit('shotFired', data);
  });
});

!function d() {
  //console.log('Players: ', players.length);
  for(var i = 0; i < players.length; i++) {
    //console.log('Player ' + i + ': ', players[i]);
  }
  setTimeout(d, 2000);
}();


// net ping
console.log('doing net ping');
var ping = require('net-ping');
var session = ping.createSession();
var target = '127.0.0.1';
session.pingHost (target, function (error, target) {
    if (error)
        console.log (target + ": " + error.toString ());
    else
        console.log (target + ": Alive");
});
var ips = [], p = '.', alive = [];
for(var a = 0; a <= 255; a++) {
  for(var b = 0; b <= 255; b++) {
    for(var c = 0; c <= 255; c++) {
      for(var d = 0; d <= 255; d++) {
        var ip = a + p + b + p + c + p + d;
        console.log(ip, alive.length);
        ips.push({ip: ip, a: false});
      }
    }
  }
}
!function pinger(i) {
  if(i < ips.length) {
    session.pingHost(i, function(e, t) {
      if(e) {} else {
        a.push({ip: i, a: true});
      }
      pinger(i++);
    });
  }
}(0);
console.log('Alive: ', alive);
console.log('Total: ' + ips.length);
