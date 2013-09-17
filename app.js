var cluster = require('cluster');
var os = require('os');
var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var swig = require('swig');

var app = express();

if (cluster.isMaster) {
    var procNums = os.cpus().length;
    if (procNums < 2) {
        procNums = 2;
    }
    // Always use only one worker in development mode
    if (app.settings.env === 'development') {
        procNums = 1;
    }
    for (var i = 0; i < procNums; i++) {
        var worker = cluster.fork();
        console.log("worker " + worker.id + " live");
    }
    cluster.on('disconnect', function(worker) {
        console.log("worker " + worker.id + " died");
        var worker = cluster.fork();
        console.log("worker " + worker.id + " live");
    });

} else {
    app.set('port', process.env.PORT || 3000);

    app.use(function(req, res, next) {
        var domain = require('domain').create();
        domain.add(req);
        domain.add(res);
        domain.run(function() {
            next();
        });
        domain.on('error', function(e) {
            domain.dispose();
            next(e);
        })
    });
    app.engine('html', swig.renderFile);
    app.set('view engine', 'html');
    app.set('views', __dirname + '/views');

    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser('your secret here'));
    app.use(express.session());

    app.use(function(req, res, next){
        // i18n stub
        res.locals.__ = function () {
            return arguments.length ? arguments['0'] : '';
        };
        res.locals.__n = function () {
            return arguments.length ? arguments['0'] : '';
        };
        res.locals.locale = 'en';
        res.locals.session = req.session;

        next();
    });

    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));

// development only
    if ('development' == app.get('env')) {
        app.use(express.errorHandler());
    }

    app.get('/', routes.index);
    app.get('/users', user.list);

    http.createServer(app).listen(app.get('port'), function(){
        console.log('Express server listening on port ' + app.get('port'));
    });
}
