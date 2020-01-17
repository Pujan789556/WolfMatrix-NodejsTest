var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-lc");
app.use(bodyParser.json());

//Disk Storage configuration for multer
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function(req, file, cb) {
        let datetimestamp = Date.now();
        cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1])
    }
});

//multer setup
var upload = multer({
    storage: storage,
    //Filter to accept excel and csv file
    fileFilter: function(req, file, callback) {
        if (['xls', 'xlsx'].indexOf(file.originalname.split('.')[file.originalname.split('.').length - 1]) === -1) {
            return callback(new Error('Wrong extension type. Only xls,xlsx and csv are accepted.').message);
        }
        callback(null, true);
    }
}).single('file');

/**
 * Format JSON transformed excel/csv.
 * @param {json} jsonData The jsonData from excel/csv to be transformed.
 * @return {json} Formatted JSON.
 */
const formatJson = (jsonData) => {
	let formattedData = [];
	jsonData.map(function(data,index){
		let dt = {}
		dt['values'] = [];
		Object.keys(data).forEach(key => {
			if(!key.includes('|')){
				dt[key] = data[key];
			}else{
				let sub_key = key.split('|',2);
				let sub_dt = {};
				sub_dt['keyFigure'] = sub_key[0].toUpperCase(); //Uppercase the keyFigure value
				sub_dt['values'] = [];
				let innerdata = {};
				innerdata['date'] = sub_key[1];
				innerdata['value'] = data[key];
				sub_dt['values'].push(innerdata);
				dt['values'].push(sub_dt);
			}
		});
		formattedData.push(dt);
	});
	return formattedData;
}

//API endpoint to upload file
app.post('/upload', function(req, res) {
    upload(req, res, function(err) {
        if (err) {
            res.json({ error_code: 1, err_desc: err });
            return;
        }
        /** Check if the file is stored or not by multer*/
        if (!req.file) {
            res.json({ error_code: 1, err_desc: "No file Found" })
        }

        //Start Conversion
        /** Check extension of the file 
         * Use appropriate module to convert the file
         */
        if (req.file.originalname.split('.')[req.file.originalname.split('.').length - 1] === 'xlsx') {
            exceltojson = xlsxtojson;
        } else {
            exceltojson = xlstojson;
        }

        try {
            exceltojson({
                input: req.file.path, //the same path where we uploaded our file
                output: null, //since we don't need output.json
                lowerCaseHeaders: true
            }, function(err, result) {
                if (err) {
                    return res.json({ error_code: 1, err_desc: err, data: null });
                }
                res.json(formatJson(result));
            });
        } catch (e) {
            res.json({ error_code: 1, err_desc: "Corupted excel file" });
        }
    })
});

app.get('/', function(req, res) {
    res.sendFile(__dirname + "/index.html");
});


app.listen('3000', function() {
    console.log('running on 3000....')
});