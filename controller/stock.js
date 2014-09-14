var request = require('request');
var fs = require('fs-extra');
var cheerio = require('cheerio');
var mongoose = require('mongoose');
var iconv = require('iconv-lite');

mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log("connect!");
});

var schema = new mongoose.Schema({
    date: Date,
    stock: [
        {
            id: String,
            name: String,
            endValue: {type:Number},
            startValue: {type:Number},
            buy: {type:Number},
            sell: {type:Number}
        }
    ]
});
var Stock = mongoose.model('Stock', schema);

Stock.findOne({ 'stock.id': '0000' }, 'stock', function (err, stock) {
    if (err) return handleError(err);
    console.log(stock);
})

function saveStockToMongo(date, id, name, endValue, startValue, buy, sell){

    var stock = new Stock({
        date: date,
        stock: [
            {
                id: id,
                name: name,
                endValue: endValue,
                startValue: startValue,
                buy: buy,
                sell: sell
            }
        ]
    });
    var handleError = function(err){
        console.log(err);
    }
    stock.save(function (err) {
        if (err) return handleError(err);
        // saved!
        console.log("saved!");
    })
}


module.exports.requestStockDataByDays = function(res, reverseDay){

    var now = new Date();
    var nowMilleSecond = now.getTime();

    for(day = 0; day<reverseDay; day++){

        var delta = day * 86400000;

        var requestDay = new Date(nowMilleSecond - delta);
        var requestYear = requestDay.getFullYear();
        var requestMonth = requestDay.getMonth() + 1;
        var requestDay = requestDay.getDate();

        requestMonth = requestMonth < 10 ? '0' + requestMonth : requestMonth;
        requestDay = requestDay < 10 ? '0' + requestDay : requestDay;

        requestStockDataByDate(requestYear, requestMonth, requestDay);
    }
}

var requestStockDataByDate = function(year, month, day){

    var options = {
        url: 'http://www.twse.com.tw/ch/trading/exchange/MI_INDEX/MI_INDEX3_print.php?genpage=genpage/Report' + year + month + '/A112' + year + month + day +'ALLBUT0999_1.php&type=html',
        encoding: 'binary'
    };

    console.log('http://www.twse.com.tw/ch/trading/exchange/MI_INDEX/MI_INDEX3_print.php?genpage=genpage/Report' + year + month + '/A112' + year + month + day +'ALLBUT0999_1.php&type=html')


    request(options,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {

                var htmlData = body = iconv.decode(body, 'big5');

                console.log("Start output stock file in: " + year + "/" + month + "/" + day);
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
                    for(i=0; i<$stockTRs.length; i++){

                        var stockTR = $stockTRs.eq(i);
                        var id = stockTR.children().eq(0).text().trim();
                        var name = stockTR.children().eq(1).text().trim();
                        var endValue = stockTR.children().eq(8).text().trim();
                        var startValue = stockTR.children().eq(5).text().trim();
                        var buy = stockTR.children().eq(12).text().trim();
                        var sell = stockTR.children().eq(14).text().trim();

                        endValue = endValue == "--" ? 0 : parseFloat(endValue.replace(/[^0-9 | ^.]/g, ''));;
                        startValue = startValue == "--" ? 0 : parseFloat(startValue.replace(/[^0-9 | ^.]/g, ''));;
                        buy = buy == "--" ? 0 : parseFloat(buy.replace(/[^0-9 | ^.]/g, ''));;
                        sell = sell == "--" ? 0 : parseFloat(sell.replace(/[^0-9 | ^.]/g, ''));;


                        //saveStockToMongo(date, id, name, endValue, startValue, buy, sell);
                    }

                    fs.outputFile('stockData/stock-'+year+month+day+'.html', htmlData, function (err) {
                        if (err) {
                            //callback({ error: 'Error creating file: ' + filePath, errorCode: errorCodes.ERROR_CREATING_FILE });
                            return;
                        }
                        console.log("Finish output stock data.");
                    });
                }else{
                    console.log("No data today");
                }
            }
        }
    );
}


