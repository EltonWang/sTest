var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs-extra');
var cheerio = require('cheerio');
var _ = require('underscore');
var Iconv  = require('iconv').Iconv;
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log("connect!");
});

var schema = new mongoose.Schema({ name: 'string', size: 'string' });
var Tank = mongoose.model('Tank', schema);
var small = new Tank({ name: 'hello' });
small.save(function (err) {
    if (err) return handleError(err);
    // saved!
    console.log("saved!");
})

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/public', express.static(__dirname + '/public'));

app.use(function(err, req, res, next){
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

/**
 * Submits the request and calls the callback with the response.
 * @param user
 * @param service
 * @param formData
 * @param callback
 */
var submitFormRequest = function (url, formData, callback) {
    var url = deploymentEnvironment.getUrl(user.environment, service);
    var basicAuthorization = user.basicAuthorization;
    var options = {
        url: url,
        headers: {
            'Content-Type': 'text\/xml',
            'Authorization': 'Basic ' + basicAuthorization
        },
        body: JSON.stringify(formData)
    };

    if (config.proxy.enabled) {
        options.proxy = config.proxy.url;
    }

    if (user.cookies) {
        options.headers.Cookie = user.cookies.join(',');
    }
    GLOBAL.WorkEmitter.emit("start_waiting", "network");
    request.post(options, function (error, response, body) {
        GLOBAL.WorkEmitter.emit("wait_fulfilled");
        setCookies(user, response);
        callback(error, response, body);
    });
};

app.get('/', function(req, res) {

    var options = {
        url: 'http://www.twse.com.tw/ch/trading/exchange/MI_INDEX/MI_INDEX3_print.php?genpage=genpage/Report201408/A11220140803ALLBUT0999_1.php&type=html',
        encoding: null
    };



    request(options,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {

                var iconv = new Iconv('BIG5', 'UTF-8//IGNORE');
                var htmlData = body;
                var body = iconv.convert(body)


                var $ = cheerio.load(body, {
                    normalizeWhitespace: true,
                    xmlMode: true,
                    decodeEntities: false
                });
                var $stockTRs = $('#tbl-containerx tbody tr');
                console.log("# of stocks: " + $stockTRs.length);

                if($stockTRs.length){
                    //var first = $stockTRs[0].children[0];
                    //console.log($stockTRs[0].children[0])

                    //console.log($stockTRs.children().first().text())

                    for(i=0; i<$stockTRs.length; i++){
                        var stockTR = $stockTRs.eq(i);
                        var id = stockTR.children().eq(0).text();
                        var name = stockTR.children().eq(1).text();
                        //console.log(id)
                        //console.log(name)
                    }


                    console.log("response!");

                    fs.outputFile('stock-xxxxxx.html', htmlData, function (err) {
                        if (err) {
                            //callback({ error: 'Error creating file: ' + filePath, errorCode: errorCodes.ERROR_CREATING_FILE });
                            return;
                        }

                    });
                }else{
                    console.log("No data today");
                }


            }
        });

    res.render('index', { 'title': 'The index page!' });
});

app.listen(4000);
console.log('app is listening at localhost:4000');

module.exports = app;
