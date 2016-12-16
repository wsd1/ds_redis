
const util = require('util');
const assert = require('assert');

const deepstream = require('deepstream.io-client-js')
var redis = require("redis");

const client = deepstream('localhost:6020').login()
const otu_redis_sub = redis.createClient()
const otu_redis_pub = redis.createClient()


//订阅计数器
const did_ref_cnt = [];

function did_subscribe(did)	//did 是 string
{
	//取记录，新的就订阅，大于0就不动作，引用加一
	let did_cnt = "number" == typeof(did_ref_cnt[did])? did_ref_cnt[did]:0;
	if(0 == did_cnt)
		otu_redis_sub.subscribe(util.format("otu.pub.%s", did));

	did_ref_cnt[did] = did_cnt+1;
}

function did_unsubscribe(did) //did 是 string
{
	//取记录，引用减一， 小于等于0 就取消订阅，
	let did_cnt = "number" == typeof(did_ref_cnt[did])? did_ref_cnt[did]:0;
	did_cnt--;

	if(did_cnt <= 0){
		otu_redis_sub.unsubscribe(util.format("otu.pub.%s", did));
		delete did_ref_cnt[did];
	}
}

/*

client.record.listen('record/otu/info/*', (match, isSubscribed, response) => {

	//match in form of: otu.info.255
	const ds_ar = match.split('/');
	const ds_did = ds_ar[3]

	if (isSubscribed) {
		console.log("Some one sub:" + match) // 'settings/security'

		//接受订阅
		response.accept()


		//设置redis接受数据后 向record写入
		otu_redis_sub.on("message", function (redis_chan, message) {

		    console.log("Redis fire:" + redis_chan);// + ": " + message);

			// in form: otu.pub.255
			var redis_ar = redis_chan.split('.');
			var redis_did = redis_ar[2];

			//message in form: {"key":"info/devlog/trans", "value":xxxxx}
			//console.log(message);
			const msg_obj = JSON.parse(message);
			assert(msg_obj, "Must be json")
			assert(msg_obj.key, "Must have key")
			assert(msg_obj.value, "Must have value")


			// 订阅的 did和key都需要相同
			if(ds_did == redis_did && msg_obj.key == "info"){
				const record_match = client.record.getRecord(match);
				record_match.whenReady(() => {
					record_match.set(msg_obj.value)
					record_match.discard()
				})
		    }
		});


		//定阅otu的输出频道
		did_subscribe(ds_did);

		//触发 otu 向频道发布
		otu_redis_pub.publish("otu.sub", util.format('{"method":"ChanSub", "params":{"key":"info", "did":%s}}', ds_did) );

	} else {
		console.log("No one sub:" + match) // 'settings/security'

		//没人定阅
		//trigger otu to stop publish
		otu_redis_pub.publish("otu.sub", util.format('{"method":"ChanDiscard", "params":{"key":"info", "did":%s}}', ds_did));

		did_unsubscribe(ds_did);

		client.record.getRecord(match).discard()
	}

});




client.event.listen('event/otu/devlog/*', (eventName, isSubscribed, response) => {

	//match in form of: otu.info.255
	const ds_ar = eventName.split('/');
	const ds_did = ds_ar[3]

	if (isSubscribed) {
		console.log("Some one care: " + eventName) // 'settings/security'

		//接受订阅
		response.accept()

		//设置redis接受数据后 向record写入
		otu_redis_sub.on("message", function (redis_chan, message) {

		    console.log("Redis fire:" + redis_chan);// + ": " + message);

			// in form: otu.pub.255
			var redis_ar = redis_chan.split('.');
			var redis_did = redis_ar[2];

			//message in form: {"key":"info/devlog/trans", "value":xxxxx}
			//console.log(message);
			const msg_obj = JSON.parse(message);
			assert(msg_obj, "Must be json")
			assert(msg_obj.key, "Must have key")
			assert(msg_obj.value, "Must have value")


			// 订阅的 did和key都需要相同
			if(ds_did == redis_did && msg_obj.key == "devlog"){
				client.event.emit(eventName, JSON.stringify(msg_obj.value));
		    }
		});


		//定阅otu的输出频道
		did_subscribe(ds_did);

		//触发 otu 向频道发布
		otu_redis_pub.publish("otu.sub", util.format('{"method":"ChanSub", "params":{"key":"devlog", "did":%s}}', ds_did) );


	} else {
		console.log("No one care about:" + eventName) // 'settings/security'

		//没人定阅
		//trigger otu to stop publish
		otu_redis_pub.publish("otu.sub", util.format('{"method":"ChanDiscard", "params":{"key":"devlog", "did":%s}}', ds_did));

		did_unsubscribe(ds_did);
	}

});

*/

// It will receive rpc in the form of: {did:xx, method:xxx, params:xxx, [id:xxx]}
// 'id' is optional, if not exist or its value set to 0, it means this is just notify, peer is not required to reply. This is cheap lightweight and rapid.

// It will issue call by publishing request to redis "otu.sub" channel. 
// request in the form of: {"method":"DownCall", "params":{"method":"uCast.info","params":{},"id":1986, "did":255}}
client.rpc.provide( 'rpc/otu/call', ( rpc, response ) => {


  	// Turn of automatic acknowledgements. This needs to happen synchronously
  	response.autoAck = false;

	if(!rpc.did){	//not exist or 0
		response.error( 'Invalid did');
		return;
	}
	const ds_did = rpc.did.toString();

//组织指令 向otu订阅的频道发布

	var method_id = 0;
	if("number" != typeof(rpc.id) || rpc.id == 0)
		delete rpc.id;
	
	if(rpc.id)	// not 0 and exist
		method_id = rpc.id;

	const call_obj = {};
	call_obj.method = "DownCall";
	call_obj.params = rpc;

	const call_str = JSON.stringify(call_obj);

//	console.log("call_str:" + call_str)


//处理从redis中订阅的结果
	otu_redis_sub.on("message", function (redis_chan, message) {

	    console.log("Redis ack:" + redis_chan + ": " + message);

		//channel in form of: otu.pub.255
		var redis_ar = redis_chan.split('.');
		var redis_did = redis_ar[2];

		//message in form: {"key":"DnAck", "value":{result:xxx or error:xxx}}
		const msg_obj = JSON.parse(message);
		assert(msg_obj, "Must be json")
		assert(msg_obj.key, "Must have key")
		assert(msg_obj.value, "Must have value")

		// 订阅的 did和key都需要相同
		if(ds_did == redis_did && msg_obj.key == "DnAck"){
		    //response.send(JSON.stringify(msg_obj.value));
		    response.ack();

		    console.log("ret:" + msg_obj.value);
		    response.send(msg_obj.value);
	    	did_unsubscribe(ds_did);

	    }
	});


//定阅otu的输出频道
	did_subscribe(ds_did);




//向otu订阅的频道发布
	// publish to channel 'otu.sub': {"method":"DownCall", "params":{"method":"uCast.info","params":{},"id":1986, "did":255}}
	otu_redis_pub.publish("otu.sub", call_str);
	console.log("Issue down call:" + call_str)


});











