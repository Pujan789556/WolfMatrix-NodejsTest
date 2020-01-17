var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
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
        if (['xls', 'xlsx', 'csv'].indexOf(file.originalname.split('.')[file.originalname.split('.').length - 1]) === -1) {
            return callback(new Error('Wrong extension type. Only xls,xlsx and csv are accepted.').message);
        }
        callback(null, true);
    }
}).single('file');


//API endpoint to upload file
app.post('/upload', function(req, res) {
    upload(req, res, function(err) {
        if (err) {
            res.json({ error_code: 1, err_desc: err });
            return;
        }
        res.json({ error_code: 0, err_desc: null });
    })
});

app.get('/', function(req, res) {
    res.sendFile(__dirname + "/index.html");
});


app.listen('3000', function() {
    console.log('running on 3000....')
});