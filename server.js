const express = require('express');
const multer = require('multer');
const hbs = require('hbs');
const path = require('path');
const fs = require('fs');
const encryptor = require('file-encryptor');
const MongoClient = require('mongodb').MongoClient;

var key = 'ac123tx';

var app = express();

//var upload = multer({ dest: './uploads/'})

app.set('view engine', 'hbs');

app.get('/home', (req, res) => {
    res.render('index.hbs');
});

var storage = multer.diskStorage({

    destination: function (req, file, callback) {
        callback(null, './uploads/');
    },

    filename: function (req, file, callback) {
        callback(null, file.originalname);
    }
});

app.get('/upload/:collectionName', (req, res) => {
    res.render('uploads.hbs');
});

app.post('/upload/:collectionName', (req, res) => {

    //    res.render('uploads.hbs');

    var collectionName = req.params.collectionName;
    console.log(collectionName);
    var upload = multer({
        storage: storage,
        onFileUploadComplete: function (file) {
            console.log("File Uploaded");
            console.log(file);
        }

    }).single('userFile');

    upload(req, res, (err) => {
        if (!err)
            res.send('file uploaded');
        //        console.log(req.file);
        if (req.file) {
            encryptor.encryptFile(req.file.path, req.file.path + '.dat', key, function (err) {
                // Encryption complete.
                console.log("Encryption Complete");
                MongoClient.connect('mongodb://localhost:27017/Files', (err, client) => {

                    if (err) {
                        return console.log('unable to connect to database');
                    }
                    console.log('connected');
                    var db = client.db('Files');
                    db.collection(collectionName).insertOne({
                        fileName: req.file.originalname,
                        uploadedOn: new Date().toJSON()
                    }, (err, result) => {
                        if (err) return console.log("Unable to insert");

                        console.log(JSON.stringify(result.ops, undefined, 2));
                    });
                    client.close();
                });


                fs.unlink(req.file.path, () => {
                    //done
                });


            });
        }
    })


});

app.get('/download/:collectionName', (req, res) => {

    var collectionName = req.params.collectionName;
    MongoClient.connect('mongodb://localhost:27017/Files', (err, client) => {

        var db = client.db('Files');
        db.collection(collectionName).find().toArray().then((docs) => {
            res.send(docs);
        });

        client.close();
    });
});

app.get('/download/:collectionName/:tag', (req, res) => {
    console.log(req.params.tag);
    var fileTag = req.params.tag;
    var address = '../node-file-upload/uploads/';
    encryptor.decryptFile(address + fileTag + '.dat', address + fileTag, key, () => {
        //        console.log(decryptFile);
        var file = address + req.params.tag;
        res.download(file, () => {
            fs.unlink(file, () => {
                //       console.log("file deleted");
            });

        });
        console.log("file downloaded");
        //        res.send("Downloading");
    });
});

app.listen(3000);
