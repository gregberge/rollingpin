var Q = require("q"),
	url = require("url"),
	RequestResult = require("../request").RequestResult,
	CacheControl = require("./cache-control").CacheControl;

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
	
	computeTTL : function(result) {
		CacheControl.parseHeaders(result.headers);
		
		return 10;
	},
	
	cache : function(request, result, options) {
		var self = this,
			defer = Q.defer();
		
		this.db.init().then(function() {
			var key = self.computeKey(request, options),
				ttl = self.computeTTL(result),
				data = RequestResult.serialize(result);
				
			self.db.set(key, data, 200).then(defer.resolve);
		},
		defer.reject);
		
		return defer.promise;
	},
	
	get : function(request, options) {
		var self = this,
			defer = Q.defer();
			
		this.db.init().then(function() {
			var key = self.computeKey(request, options);
			
			self.db.get(key).then(function(data) {
				if(data) {
					defer.resolve(RequestResult.unserialize(data));
				}
				else {
					defer.reject();
				}
			},
			defer.reject);
		});
		
		return defer.promise;
	}
};

exports.CacheManager = CacheManager;