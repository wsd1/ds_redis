
const util = require('util');
const assert = require('assert');

const deepstream = require('deepstream.io-client-js')

const client = deepstream('localhost:6020').login()



// It will receive rpc in the form of: {did:xx, method:xxx, params:xxx, [id:xxx]}
// 'id' is optional, if not exist or its value set to 0, it means this is just notify, peer is not required to reply. This is cheap lightweight and rapid.

// It will issue call by publishing request to redis "otu.sub" channel. 
// request in the form of: {"method":"DownCall", "params":{"method":"uCast.info","params":{},"id":1986, "did":255}}
client.rpc.provide( 'rpc/otu/call', ( rpc, response ) => {


	var msg_obj = {};
	msg_obj.value = "hahaha"

	console.log(rpc.method);

    response.send(msg_obj);


});








