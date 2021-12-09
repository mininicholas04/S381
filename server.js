const app = require('express')();
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const fs = require('fs');
const formidable = require('formidable');
const mongourl = 'mongodb+srv://demo:demo123456@cluster0.uuudm.mongodb.net/test?retryWrites=true&w=majority';
const dbName = 'test';
const session = require('cookie-session');
const { nextTick } = require('process');
const { render } = require('ejs');

const SECRETKEY = 'KEY';
const users = new Array(
    { name: 'student', password: '' },
    { name: 'demo', password: '' }
);

//app.use(formidable());
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    name: 'loginSession',
    keys: [SECRETKEY]
}));

const findDocument = (db, criteria, callback) => {
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
            res.status(200).render('details', { inventory: docs[0] });
        });
    });
}
const HandleDelete = (res, criteria) => {
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
            res.status(200).render('delete', { text: 'Document successfully deleted.' });
        });
    });
}

const handle_Edit = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        let cursor = db.collection('inventory').find(DOCID);
        cursor.toArray((err, docs) => {
            client.close();
            assert.equal(err, null);
            res.status(200).render('edit', { inventory: docs[0] });
        });
    });
}

const updateDocument = (criteria, updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        db.collection('inventory').updateOne(criteria, {
            $set: updateDoc
        },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}

const handle_Update = (req, res, criteria) => {
    // Q2
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        var DOCID = {};
        DOCID['_id'] = ObjectID(fields._id);
        var updateDoc = {};
        updateDoc['name'] = fields.name;
        updateDoc['type'] = fields.type;
        updateDoc['quantity'] = fields.quantity;
        updateDoc['street'] = fields.street;
        updateDoc['building'] = fields.building;
        updateDoc['country'] = fields.country;
        updateDoc['zipcode'] = fields.zipcode;
        updateDoc['latitude'] = fields.latitude;
        updateDoc['longitude'] = fields.longitude;
        if (files.photo.size > 0) {
            fs.readFile(files.photo.path, (err, data) => {
                assert.equal(err, null);
                updateDoc['photo'] = new Buffer.from(data).toString('base64');
                updateDocument(DOCID, updateDoc, (results) => {
                    res.status(200).render('info', {
                        message: `Updated ${results.result.nModified} document(s)`
                    })
                });
            });
        } else {
            updateDocument(DOCID, updateDoc, (results) => {
                res.status(200).render('info', {
                    message: `Updated ${results.result.nModified} document(s)`
                })
            });
        }
    })
    // end of Q2
}


app.use((req, res, next) => {
    let d = new Date();
    console.log(`TRACE: ${req.path} was requested at ${d.toLocaleDateString()}`);
    next();
})

app.get('/', (req, res) => {
    //console.log(req.session);
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    } else {
        res.redirect('/home');
    }
});

app.get('/login', (req, res) => {
    res.status(200).render('login', {});
});

app.get('/home', (req, res) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        findDocument(db, {}, (docs) => {
            client.close();
            console.log("Closed DB connection");
            res.render('home', { 'doc': docs, name: req.session.username });
        })
    });
})

app.post('/login', (req, res) => {
    users.forEach((user) => {
        if (user.name == req.body.name && user.password == req.body.password) {
            // correct user name + password
            // store the following name/value pairs in cookie session
            req.session.authenticated = true;        // 'authenticated': true
            req.session.username = req.body.name;	 // 'username': req.body.name		
        }
    })
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session = null;   // clear cookie-session
    res.redirect('/');
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
app.get('/detail', (req, res) => {
    handleDetails(res, req.query);
})

app.get('/map', (req, res) => {
    res.render('map',
        {
            //lat: parseFloat(req.query.latitude),
            //lon: parseFloat(req.query.longitude),
            lat: req.query.lat,
            lon: req.query.lon,
            zoom: req.query.zoom ? req.query.zoom : 15
        })
    res.end();
});

app.get('/delete', (req, res) => {
    HandleDelete(res, req.query);
})

app.get('/edit', (req, res) => {
    handle_Edit(res, req.query);
})


app.post('/update', (req, res) => {
    handle_Update(req, res, req.query);
    console.log(req.query);
})

/* READ
curl -X GET http://localhost:8099/api/inventory/name/harry
*/
app.get('/api/inventory/name/:name', (req, res) => {
    if (req.params.name) {
        let criteria = {};
        criteria['name'] = req.params.name;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({ "error": "missing name" });
    }
})

/* READ
curl -X GET http://localhost:8099/api/inventory/type/xxx
*/
app.get('/api/inventory/type/:type', (req, res) => {
    if (req.params.type) {
        let criteria = {};
        criteria['type'] = req.params.type;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({ "error": "missing type" });
    }
})

app.get('/*', (req, res) => {
    //res.status(404).send(`${req.path} - Unknown request!`);
    res.status(404).render('info', { message: `${req.path} - Unknown request!` });
})

app.listen(process.env.PORT || 8099);