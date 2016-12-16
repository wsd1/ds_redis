

var redis = require("redis");
const otu_redis_sub = redis.createClient()
const otu_redis_pub = redis.createClient()

otu_redis_sub.on("message", function (channel, message) {
    console.log("Channel fire:" + channel + ": " + message);

	//trigger otu to stop publish
	otu_redis_pub.publish("otu.sub", '{"method":"ChanDiscard", "params":{"channel":"info", "did":255}}');

	otu_redis_sub.unsubscribe();

});



//定阅otu的输出频道
otu_redis_sub.subscribe("otu.pub.info.255");

//触发 otu 向频道发布
otu_redis_pub.publish("otu.sub", "{\"method\":\"ChanSub\", \"params\":{\"channel\":\"info\", \"did\":255}}");









