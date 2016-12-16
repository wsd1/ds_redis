

const deepstream = require('deepstream.io-client-js')
const client = deepstream('localhost:6020').login()


client.record.listen('otu.pub.info.*', (match, isSubscribed, response) => {

	if (isSubscribed) {
		console.log("Some one sub:" + match)

		response.accept()

		//This programe can detect at-least-one-subscribe and last-one-unsubscribe
		//But if I uncomment the line below, at-least-one-subscribe can not be detected.  weird ~ ~

		var r = client.record.getRecord(match)
		r.set("info", "Magic happeding");
		r.discard()

	}

	else {
		console.log("No one sub:" + match)

		client.record.getRecord(match).discard()
	}

})




















