var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-lc");
var csvToJson = require('convert-csv-to-json');
app.use(bodyParser.json());

const fs = require('fs');

//Disk Storage configuration for multer
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './')
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
        if (['xls', 'xlsx', 'csv'].indexOf(file.originalname.split('.')[file.originalname.split('.').length - 1]) === -1) {
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
    jsonData.map(function(data, index) {
        let dt = {}
        dt['values'] = [];
        Object.keys(data).forEach(key => {
            if (!key.includes('|')) {
                dt[key.toLowerCase()] = data[key];
            } else {
                let sub_key = key.split('|', 2);
                let sub_dt = {};
                sub_dt['keyFigure'] = sub_key[0].charAt(0).toUpperCase() + sub_key[0].slice(1); //Uppercase the keyFigure value
                sub_dt['values'] = [];
                let innerdata = {};
                innerdata['date'] = sub_key[1];
                innerdata['value'] = parseInt(data[key]);
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
        if (req.file.originalname.split('.')[req.file.originalname.split('.').length - 1] === 'xlsx' || req.file.originalname.split('.')[req.file.originalname.split('.').length - 1] === 'xls') {
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
                        res.json({ error_code: 1, err_desc: err, data: null });
                        return
                    }
                    let jsonToWrite = JSON.stringify(formatJson(result), null, 2); //Serialize JSON String to redable form

                    //Write formatted json to file data.json 
                    fs.writeFile('data.json', jsonToWrite, (err) => {
                        if (err) {
                            res.json({ error_code: 1, err_desc: err });
                            return;
                        }
                        res.json({ error_code: 0, desc: "JSON file written success!!" })
                    })

                });
            } catch (e) {
                res.json({ error_code: 1, err_desc: "Corupted excel file" });
            }
        } else {
            let result = csvToJson.fieldDelimiter(',').getJsonFromCsv(req.file.path);
            let jsonToWrite = JSON.stringify(formatJson(result), null, 2); //Serialize JSON String to redable form
            //Write formatted json to file data.json 
            fs.writeFile('data.json', jsonToWrite, (err) => {
                if (err) {
                    res.json({ error_code: 1, err_desc: err });
                    return;
                }
                res.json({ error_code: 0, desc: "JSON file written success!!" })
            })
        }


        //Delete the file after conversion success or failed
        try {
            fs.unlinkSync(req.file.path);
        } catch (e) {
            console.log("Couldn't delete the file");
        }
    })
});

//API Endpoint to get data
app.get('/api/data', function(req, res) {
    fs.readFile('data.json', (err, data) => {
        if (err) {
        	res.json({error_code: 1, err_desc: err})
        }
        res.json(JSON.parse(data));
    });
});

app.get('/', function(req, res) {
    res.sendFile(__dirname + "/index.html");
});


app.listen('3000', function() {
    console.log('running on 3000....')
});