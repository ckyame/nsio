(function($) {
  $.extend({
    index: {
      data: {
        alive: false, // client is alive
        points: 0,    // getter for client points
        map: {},      // map object (not used)
        canvas: {},   // canvas for entire page (play area)
      },
      templates: {
        shot: 'z-index:999;width:15px;height:15px;display:block;position:absolute;left:{x}px; top:{y}px;'
      },
      init: function() {
        console.log("Game Initializing");
        $.index.renderPopup();        // Gets clients name
        $.index.chatEvents();         // Wire up chat events
        $.index.scoreBoardEvents();   // Wire up scoreboard events
        $.index.positionSync();       // Server side sync for all clients pos
        console.log('Done');
      },
      // Game Events S
      moveAnimate: function() {
        key = requestAnimationFrame($.index.moveAnimate);
        if($.index.data.alive) {
          $(document).scrollLeft($(document).scrollLeft() + xd);
          $(document).scrollTop($(document).scrollTop() + yd);
        }
      },
      positionSync: function() {
        !function t() {
          if(name != '') {
            socket.emit('imoved',
              [$(document).scrollLeft() + ($(window).width()/2),
               $(document).scrollTop() + ($(window).height()/2),
               name,
               $.index.data.points + 15
             ]);
          }
          setTimeout(t, to);
        }();
      },
      gameEvents: function() {
        $.index.data.alive = true;
        name = $('#name').val();
        while(name.indexOf(' ') >= 1) name = name.replace(' ', '');
        socket.emit('pj', name);
        $('.modal, .modal-backdrop').remove();
        $.index.checkCollision();
        socket.on('theymoved', function(xyn) {
          $('#' + xyn[2].replace(' ', '')).attr('style', 'top:' + xyn[1] + 'px;left:' + xyn[0] + 'px;width:' + xyn[3] + 'px;height:' + xyn[3] + 'px;');
        });
        socket.on('theydied', function(id) {
          $('#' + id).remove();
        });
        socket.on('shotFired', function(data) {
          $.index.shotFired(data[0], data[1], data[2], data[3], data[4], data[5]);
        });
        socket.off('kp');
        socket.on('kp', function(name) {
          $('#' + name).remove();
        });
        $(document).on('keydown', function(event) {
          var key = event.keyCode;
          (xd = ((key == 65) ? -speed : ((key == 68) ? speed : 0)),
           yd = ((key == 83) ? speed : ((key == 87) ? -speed : 0)));
          });
        $(document).on('keyup', function(event) {
          var key = event.keyCode;
          (xd = ((key == 65) ? 0 : ((key == 68) ? 0 : xd)),
           yd = ((key == 83) ? 0 : ((key == 87) ? 0 : yd)));
        });
        $.index.data.canvas = document.getElementById('main');
        var ctx = $.index.data.canvas.getContext('2d');
        $.index.data.canvas.addEventListener('click', function(event) {
            var x = event.pageX - $.index.data.canvas.offsetLeft,
                y = event.pageY - $.index.data.canvas.offsetTop;
            var ox = $(document).scrollLeft() + ($(window).width()/2),
                oy = $(document).scrollTop() + ($(window).height()/2);
            var id = x + '' + y + '' + Math.ceil(Math.random(x, y) * (100));
            socket.emit('shotsFired', [x, y, ox+6, oy+6, id, name]);
        }, false);
        if(key < 0)
          $.index.moveAnimate();
      },
      shotFired: function(x, y, ox, oy, id, n) {
        $('body').append('<div class="npb" id="'+id+'"></div>');
        var mx = Math.abs(ox - x);
        var my = Math.abs(oy - y);
        !function go() {
          if($('#' + id).length > 0) {
            var a = requestAnimationFrame(go);
            $('#' + id).attr({n: n, style: $.index.templates.shot.replace('{x}',ox).replace('{y}', oy) });
            //$('#' + id).attr('style', 'z-index:999;width:15px;height:15px;display:block;position:absolute;left:' + ox + 'px; top:' + oy + 'px;');
            function anim() {
              ox = lerp(ox, x, 0.0733);
              oy = lerp(oy, y, 0.0733);
              if(Math.abs(ox - x) > 1 && Math.abs(oy - y) > 1) {
                $('#' + id).attr({style: $.index.templates.shot.replace('{x}', x).replace('{y}', y)});
                //$('#' + id).attr('style', 'z-index:999;width:15px;height:15px;display:block;position:absolute;left:' + ox + 'px; top:' + oy + 'px;');
                setTimeout(anim, 100);
              } else $('#' + id).remove();
            }
            setTimeout(anim, 100);
          }
        }();
      },
      checkCollision: function() {
        function ffc(rect1, rect2) {
          return !(rect1.right < rect2.left ||
                rect1.left > rect2.right ||
                rect1.bottom < rect2.top ||
                rect1.top > rect2.bottom);
        }
        function check() {
          if(name != '') {
            var b = $('[class^=npb]');
            var u = $('#' + name)[0];
            for(var i = 0; i < b.length; i++) {
              if(ffc(b[i].getBoundingClientRect(), u.getBoundingClientRect()) && $.index.data.alive == true) {
                if($(b[i]).hasClass('npb') && $(b[i]).attr('n') != name) {
                  var on = $(b[i]).attr('n');
                  $.index.data.alive = false;
                  $('#' + name).remove();
                  $.index.resetGame();
                  $.index.init();
                  socket.emit('idied', name);
                  socket.emit('scored', on);
                }
              }
            }
          }
          if($.index.data.alive == true) {
            setTimeout(check, 10);
          }
        }
        check();
      },
      // Game Events E
      // Other Events S
      resetGame: function() {
        $(document).off('keydown');
        $(document).off('keyup');
        $('#nbtn').off('click');

        socket.off('createPlayer');
        socket.off('theymoved');
        socket.off('spawn');
        socket.off('scoredUpdate')
        socket.off('imoved');
      },
      renderPopup: function() {
        $.get('/views/home/name.html', function(tmpl) {
          $('body').append(tmpl);
          $('.modal').modal();
          $('#nbtn').on('click', function() {
            $(document).on('g.pc', $.index.gameEvents());
            $(document).trigger('g.pc');
          });
          socket.on('createPlayer', function(nname) {
            if($('#' + nname).length == 0) {
              $('body').append('<div id="' + nname + '" class="' + ((nname == name) ? 'p lp' : 'op') +'"></div>');
            } else {
              $.index.resetGame();
              $.index.init();
            }
          });
        });
      },
      scoreBoardEvents: function() {
        socket.on('scoredUpdate', function(data) {
          for(var j = 0; j < data.length; j++) {
            $('#sbp').append('<li id="sbp_' + data[j].name + '">' + data[j].name + ': ' + data[j].score + '</li>');
          }
        });
        socket.on('sb', function(data) {
          if($('#sbp').children().length == 0) {
            for(var j = 0; j < data.length; j++) {
              $('#sbp').append('<li id="sbp_' + data[j].name + '">' + data[j].name + ': ' + data[j].score + '</li>');
            }
          }
        });
      },
      chatEvents: function() {
        console.log('Chat Initialized');
        $('#cmtb').on('click', function() {
          var message = $('#cmt').val();
          console.log('got message', message)
          socket.emit('sm', name + ': ' + message);
        });
        socket.on('gm', function(msg) {
          if($('.cm').length > 4) $('.cm')[0].remove();
          $('.c').append('<div class="cm">' + msg + '</div>');
        });
      }
      // Other Events E
    }
  });
  console.log('Game Attached');
  $(document).ready($.index.init);
  function lerp (start, end, amt) {
    return (1-amt)*start+amt*end
  }
})(jQuery);
var socket = io(), name = '', timeout, xd = 0, yd = 0, key = -1, speed = 5, to = 10;
