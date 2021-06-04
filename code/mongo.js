var MongoClient = require('mongodb').MongoClient;
var Server = require('mongodb').Server;

var init = require('./init');

var opt = {};

exports.options = function (_opt) {
	for(var p in _opt) {
		opt[p] = _opt[p];
	}
	return exports;
};

init.add(function (next) {

	var log = 'mongo:';

	initDb(function (err, db) {
		if (err) return next(err);
		checkDrop(db, function (err) {
			if (err) return next(err);
			initPost(db, function (err) {
				console.log(log);
				next(err);
			});
		});
	});

	function initDb(next) {
		var server = new Server('localhost', 27017, { /* auto_reconnect: true */ } );
		var client = new MongoClient(server);
		client.open(function (err) {
			if (err) return next(err);
			var db = exports.db = client.db('mongo-test');
			log += ' ' + db.databaseName;
			next(null, db);
		});
	}

	function checkDrop(db, next) {
		if (opt.dropDatabase) {
			log += ' drop-database';
			db.dropDatabase(next);
		} else {
			next();
		}
	}

	function initPost(db, next) {
		var posts;
		var postIdSeed;

		exports.getNewPostId = function () {
			return ++postIdSeed;
		};

		exports.insertPost = function (post, next) {
			posts.insert(post, next);
		};

		exports.updatePost = function (post, next) {
			posts.save(post, next);
		};

		exports.findPost = function (id, next) {
			posts.findOne({ _id: id }, next);
		};

		exports.findPosts = function (page, size, next) {
			var skip = (page - 1) * size;
			posts.find({}).sort({ created: -1 }).skip(skip).limit(size).each(next);
		};

		exports.search = function (tokens, page, size, next) {
			var skip = (page - 1) * size;
			posts.find({ tokens: { $all: tokens } }).sort({ created: -1 }).skip(skip).limit(size).each(next);
		}

		posts = exports.posts = db.collection("posts");
		posts.ensureIndex({ tokens: 1 }, function (err) {
			if (err) return next(err);
			posts.find({}, { _id: 1 }).sort({ _id: -1 }).limit(1).nextObject(function (err, obj) {
				if (err) return next(err);
				postIdSeed = obj ? obj._id : 0;
				console.log('post id seed: ' + postIdSeed);
				next();
			});
		});
	}

});

