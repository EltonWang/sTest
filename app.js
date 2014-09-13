var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs-extra');
var cheerio = require('cheerio');
var _ = require('underscore');
//var Iconv  = require('iconv').Iconv;
var mongoose = require('mongoose');
var iconv = require('iconv-lite');



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

app.get('/', function(req, res) {
    res.render('index', { 'title': 'The index page!' });
});

function saveDataToMongo(){
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
}

app.get('/initial', function(req, res) {

    var options = {
        url: 'http://www.twse.com.tw/ch/trading/exchange/MI_INDEX/MI_INDEX3_print.php?genpage=genpage/Report201409/A11220140912ALLBUT0999_1.php&type=html',
        encoding: 'binary'
    };

    request(options,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {

                //var iconv = new Iconv('BIG5', 'UTF-8//IGNORE');


                // Convert from js string to an encoded buffer.
                //var buf = iconv.encode(body, 'big5');
                // Convert from an encoded buffer to js string.
                //body = iconv.decode(body, 'utf8');

                htmlData = body = iconv.decode(body, 'big5');
                //console.log(htmlData)



                //var body = iconv.convert(body)
                console.log("Change file encoding charset to utf8...");
                var rePattern = new RegExp(/charset=big5"/gi);
                var htmlData = htmlData.replace(rePattern, 'charset=utf8"');


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
                        //console.log(id);
                        //console.log(name);
                    }


                    console.log("response!");

                    fs.outputFile('stockData/stock-xxxxxx.html', htmlData, function (err) {
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
