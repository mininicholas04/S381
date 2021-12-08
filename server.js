const app = require('express')();
const bp = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const fs = require('fs');
const formidable = require('formidable');
const mongourl = 'mongodb+srv://nicholas:Jasmine123@cluster0.qafzx.mongodb.net/test?retryWrites=true&w=majority';
const dbName = 'test';
const session = require('cookie-session');
const { nextTick } = require('process');
const { render } = require('ejs');

const SECRETKEY = 'KEY';
const users = new Array(
	{name: 'student'},
	{name: 'demo'}
);


app.use(bp.urlencoded({ extended: true }))
app.use(bp.json())
app.use(session({
    name: 'loginSession',
    keys: [SECRETKEY]
}));
const findDocument = (db,criteria, callback) => {
    let cursor = db.collection('inventory').find(criteria);
    cursor.toArray((err, docs) => {
        assert.equal(err, null);
        console.log(`findDocument: ${docs.length}`);
        callback(docs);
    });
}
const insertDocument = (db, doc, callback) => {
    db.collection('inventory').
        insertOne(doc, (err, results) => {
            assert.equal(err, null);
            console.log(`Inserted`);
            callback();
        });
}
const deleteDocument = (db, doc, callback) => {
    db.collection('inventory').
        deleteOne(doc, (err, results) => {
            assert.equal(err, null);
            console.log(`Deleted`);
            callback();
        });
}
const handleDetails = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        findDocument(db, DOCID, (docs) => {  // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('details', {inventory: docs[0]});
        });
    });
}
const HandleDelete = (res,criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        deleteDocument(db, DOCID, (docs) => {  // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('delete', {text: 'Document successfully deleted.'});
        });
    });
}
app.set('view engine', 'ejs');
app.get('/', (req, res) => {
    res.redirect('/login');
});
app.get('/login', (req, res) => {
    res.render('login');
});
app.get('/home', (req, res) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        findDocument(db,{}, (docs) => {
            client.close();
            console.log("Closed DB connection");
            res.render('home', { 'doc': docs });
        })
    });
})

app.post('/login', (req, res) => {
    users.forEach((user) => {
        if (user.name == req.body.username) {
            res.redirect('/home')
        }})
        res.render("login");
});


app.get('/create', (req, res) => { res.render('create') })

app.post('/create', (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        fs.readFile(files.photo.path, (err, data) => {
            let DOC = {
                "name": fields.name,
                "type": fields.type,
                "quantity": fields.quantity,
                "street": fields.street,
                "building": fields.building,
                "country": fields.country,
                "zipcode": fields.zipcode,
                "latitude": fields.latitude,
                "longitude": fields.longitude
            };
            if (files.photo.size > 0) {
                DOC["photo"] = new Buffer.from(data).toString('base64')
            };
            const client = new MongoClient(mongourl);
            client.connect((err) => {
                assert.equal(null, err);
                console.log("Connected successfully to server");
                const db = client.db(dbName);
                insertDocument(db, DOC, () => {
                    client.close();
                    console.log("Closed DB connection");
                    res.render('insert', { text: 'Document created' });
                })
            })
        })
    })

})
app.get('/detail',(req,res)=>{
    handleDetails(res,req.query);
})

app.get('/map',(req,res)=>{
    res.render('map',
    {lat :parseFloat(req.query.latitude),
     lon :parseFloat(req.query.longitude),
    zoom :req.query.zoom? req.query.zoom:15
    })
    res.end();
});
app.get('/delete',(req,res)=>{
    HandleDelete(res,req.query);
})

app.get('/edit',(req,res)=>{
    
})


app.listen(process.env.PORT || 8099);