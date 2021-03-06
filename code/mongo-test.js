var should = require('should');

var init = require('./init');
var mongo = require('./mongo').options({ dropDatabase: true });
var tokenize = require('./tokenizer').tokenize;

before(function (next) {
	init.run(next);
});

describe("db", function () {
	it("should have databaseName", function () {
		mongo.db.databaseName.should.equal('mongo-test');
	});
});

describe("empty post collection", function () {
	it("should exist", function () {
		should(mongo.posts);
	});
	it("should be empty", function (next) {
		mongo.posts.count(function (err, count) {
			should.not.exist(err);
			count.should.equal(0);
			next();
		})
	});
	it("should have one indexes", function (next) {
		mongo.posts.indexes(function (err, index) {
			should.not.exist(err);
			index.should.be.instanceof(Array);
			index.should.be.length(2);
			next();
		});
	});
	it("can make serialized ids", function () {
		var id1 = mongo.getNewPostId();
		var id2 = mongo.getNewPostId();
		should(id1 < id2);
	});
});

describe("post collection", function () {

	describe("inserting", function () {
		it("should success", function (next) {
			var p = {
				created: new Date(50), writer: 'snowman', text: 'text'
			}
			p._id = mongo.getNewPostId();
			mongo.insertPost(p, function (err) {
				should.not.exists(err);
				mongo.posts.count(function (err, count) {
					should.not.exist(err);
					count.should.equal(1);
					next();
				});
			});
		});
	});

	describe("finding by id", function () {
		var p = {
			created: new Date(50), writer: 'snowman', text: 'text'
		}
		it("given empty collection", function (next) {
			mongo.posts.remove(next);
		});
		it("given p", function (next) {
			p._id = mongo.getNewPostId();
			mongo.insertPost(p, next);
		});
		it("should success", function (next) {
			mongo.findPost(p._id, function (err, post) {
				should.not.exist(err);
				post.should.eql(p);
				next();
			});
		});
	});

	describe("paging", function () {
		it("given empty collection", function (next) {
			mongo.posts.remove(next);
		});
		it("given posts", function (next) {
			var rows = [
				{ _id: mongo.getNewPostId(), created: new Date(10), writer: 'snowman', text: 'text1' },
				{ _id: mongo.getNewPostId(), created: new Date(20), writer: 'snowman', text: 'text2' },
				{ _id: mongo.getNewPostId(), created: new Date(30), writer: 'snowman', text: 'text3' },
				{ _id: mongo.getNewPostId(), created: new Date(40), writer: 'snowman', text: 'text4' },
				{ _id: mongo.getNewPostId(), created: new Date(50), writer: 'snowman', text: 'text5' }
			];
			mongo.insertPost(rows, next);
		});
		it("should success", function (next) {
			var posts = [];
			mongo.findPosts(1, 3, function (err, post) {
				should.not.exist(err);
				if (post) {
					posts.push(post);
					return;
				}
				posts.should.have.length(3);
				posts[0].text.should.equal('text5');
				posts[1].text.should.equal('text4');
				posts[2].text.should.equal('text3');
				next();
			});
		});
	});

	describe("updating", function () {
		var p = {
			created: new Date(50), writer: 'snowman', text: 'text'
		};
		it("given empty collection", function (next) {
			mongo.posts.remove(next);
		});
		it("given p", function (next) {
			p._id = mongo.getNewPostId();
			mongo.insertPost(p, next);
		});
		it("should success", function (next) {
			p.writer  = "fireman";
			p.text = 'updated text';
			mongo.updatePost(p, function (err) {
				should.not.exist(err);
				mongo.findPost(p._id, function (err, post) {
					should.not.exist(err);
					post.should.eql(p);
					next();
				});
			});
		});
	});

	describe("searching", function () {
		it("given empty collection", function (next) {
			mongo.posts.remove(next);
		});
		var rows;
		it("given posts", function (next) {
			rows = [
				{ _id: mongo.getNewPostId(), created: new Date(50), writer: 'snowman', text: 'abc def 123' },
				{ _id: mongo.getNewPostId(), created: new Date(40), writer: 'snowman', text: 'def 123 xyz' },
				{ _id: mongo.getNewPostId(), created: new Date(30), writer: '?????????', text: '???????????? ??????' },
				{ _id: mongo.getNewPostId(), created: new Date(20), writer: '?????????', text: '?????????, ????????? ?????? ????????? ??? ?????? ??? ????????? ???' },
				{ _id: mongo.getNewPostId(), created: new Date(10), writer: '?????????', text: '?????????, ???????????? ?????? ????????? ?????? ???????????? ????????? ????????? ??????' }
			];
			rows.forEach(function (row) {
				row.tokens = tokenize(row.writer, row.text);
			});
			mongo.insertPost(rows, next);
		});

		function search(query, next) {
			var posts = [];
			var tokens = tokenize(query);
			mongo.search(tokens, 1, 99, function (err, post) {
				should.not.exist(err);
				if (post) {
					posts.push(post);
					return;
				}
				next(null, posts);
			});
		}

		it("should success", function (next) {
			search('snowman', function (err, posts) {
				should.not.exist(err);
				posts.should.have.length(2);
				posts[0]._id.should.equal(rows[0]._id);
				posts[1]._id.should.equal(rows[1]._id);
				next();
			});
		});
		it("should success", function (next) {
			search('?????????', function (err, posts) {
				should.not.exist(err);
				posts.should.have.length(3);
				posts[0]._id.should.equal(rows[2]._id);
				posts[1]._id.should.equal(rows[3]._id);
				posts[2]._id.should.equal(rows[4]._id);
				next();
			});
		});
		it("should success", function (next) {
			search('def 123', function (err, posts) {
				should.not.exist(err);
				posts.should.have.length(2);
				posts[0]._id.should.equal(rows[0]._id);
				posts[1]._id.should.equal(rows[1]._id);
				next();
			});
		});
		it("should success", function (next) {
			search('abc def 123', function (err, posts) {
				should.not.exist(err);
				posts.should.have.length(1);
				posts[0]._id.should.equal(rows[0]._id);
				next();
			});
		});
		it("should success", function (next) {
			search('?????????', function (err, posts) {
				should.not.exist(err);
				posts.should.have.length(2);
				posts[0]._id.should.equal(rows[3]._id);
				posts[1]._id.should.equal(rows[4]._id);
				next();
			});
		});
		it("should success", function (next) {
			search('????????? ?????????', function (err, posts) {
				should.not.exist(err);
				posts.should.have.length(1);
				posts[0]._id.should.equal(rows[4]._id);
				next();
			});
		});
	});
});