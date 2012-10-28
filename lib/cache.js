var Q = require("q"),
	ueberDB = require("ueberDB"),
	url = require("url"),
	RequestResult = require("./request").RequestResult;

var CacheDatabase = function(type, dbSettings, wrapperSettings, logger) {
	this.uedb = new ueberDB.database(type, dbSettings, wrapperSettings, logger);
	this.initDefer = null;
};

CacheDatabase.prototype = {
	init : function() {
		if(this.initDefer !== null) {
			return this.initDefer.promise;
		}
		
		this.initDefer = Q.defer();
		this.uedb.init(this.initDefer.resolve);
		
		return this.initDefer.promise;
	},
	
	set : function(key, value) {
		var defer = Q.defer();
		
		this.uedb.set(key, value, null, function() {
			defer.resolve();
		});
		
		return defer.promise;
	},
	
	get : function(key) {
		var defer = Q.defer();
		
		this.uedb.get(key, function(err, value) {
			err ? defer.reject(err) : defer.resolve(value);
		});
		
		return defer.promise;
	},
	
	del : function(key) {
		var defer = Q.defer();
		
		this.uedb.remove(key, null, function() {
			defer.resolve();
		});
		
		return defer.promise;
	}
};

var CacheManager = function(database) {
	this.db = database;
};

CacheManager.prototype = {
	computeKey : function(request, options) {
		if(typeof options !== "undefined") {
			if(typeof options.ignoreQueryString === "boolean" && options.ignoreQueryString === true) {
				return url.parse(request.url).pathname;
			}
		}
		
		return request.url;
	},
	
	cache : function(request, result, options) {
		var self = this,
			defer = Q.defer();
		
		this.db.init().then(function() {
			var key = self.computeKey(request, options),
				data = RequestResult.serialize(result);
			
			self.db.set(key, data).then(defer.resolve);
		});
		
		return defer.promise;
	},
	
	get : function(request, options) {
		var self = this,
			defer = Q.defer();
			
		this.db.init().then(function() {
			var key = self.computeKey(request, options);
			
			self.db.get(key).then(function(data) {
				if(typeof data !== "undefined") {
					defer.resolve(RequestResult.unserialize(data));
				}
				else {
					defer.resolve();
				}
			},
			defer.reject);
		});
		
		return defer.promise;
	}
};

exports.CacheManager = CacheManager;
exports.CacheDatabase = CacheDatabase;