//
// Shinobi - DeepStack Face Recognition Plugin
// Copyright (C) 2021 Elad Bar
//
// Base Init >>
var fs = require('fs');
var config = require('./conf.json')
const request = require("request")
var s
const {
		workerData
	} = require('worker_threads');

if(workerData && workerData.ok === true){
	try{
		s = require('../pluginWorkerBase.js')(__dirname,config)
	}catch(err){
		console.log(err)
		try{
			s = require('./pluginWorkerBase.js')(__dirname,config)
		}catch(err){
			console.log(err)
			return console.log(config.plug,'WORKER : Plugin start has failed. pluginBase.js was not found.')
		}
	}
}else{
	try{
		s = require('../pluginBase.js')(__dirname,config)
	}catch(err){
		console.log(err)
		try{
			s = require('./pluginBase.js')(__dirname,config)
		}catch(err){
			console.log(err)
			return console.log(config.plug,'Plugin start has failed. pluginBase.js was not found.')
		}
	}

	const {
		haltMessage,
		checkStartTime,
		setStartTime,
	} = require('../pluginCheck.js')

	if(!checkStartTime()){
		console.log(haltMessage,new Date())
		s.disconnectWebSocket()
		return
	}
	setStartTime()
}
// Base Init />>

var deepStackHost = config.deepStack["host"]
var deepStackPort = config.deepStack["port"]
var deepStackIsSSL = config.deepStack["isSSL"]
var deepStackApiKey = config.deepStack["apiKey"]
var deepStackProtocol = deepStackIsSSL ? "https" : "http"

var baseUrl = `${deepStackProtocol}://${deepStackHost}:${deepStackPort}/v1`
var objectDetectionUrl = `${baseUrl}/vision/detection`
var faceListUrl = `${baseUrl}/vision/face/list`
var faceRecognitionUrl = `${baseUrl}/vision/face/recognize`

function startUp() {
	try {
		console.log(`Host: ${deepStackHost}`)
		console.log(`Port: ${deepStackPort}`)
		console.log(`Protocol: ${deepStackProtocol}`)
		console.log(`API Key: ${deepStackApiKey}`)
		
		console.log("DeepStack URL")
		console.log(`Face List: ${faceListUrl}`)
		console.log(`Face Recognition: ${faceRecognitionUrl}`)
		console.log(`Object Detection: ${objectDetectionUrl}`)
		
		var form = {}
			
		if(deepStackApiKey) {
			form["api_key"] = deepStackApiKey
		}
		
		request.post({url:faceListUrl, formData:form}, function(err,res,body){
			var response = JSON.parse(body)
			
			var success = response["success"]
			var facesArr = response["faces"]
			var faceStr = facesArr.join(",")
			
			if(success) {
				console.log(`DeepStack loaded with the following faces: ${faceStr}`)
			} else {
				console.log(`Failed to connect to DeepStack server, Error: ${err}`)
			}
		})
	} catch(ex) {
		console.log(`Error while connecting to DeepStack server, Error: ${ex}`)
	}
}

s.detectObject = function(buffer,d,tx,frameLocation,callback){
	var timeStart = new Date()
	var detectStuff = async function(frame){
		try{
			image_stream = fs.createReadStream(frame)
			
			var form = {
				"image":image_stream
			}
			
			if(deepStackApiKey) {
				form["api_key"] = deepStackApiKey
			}

			request.post({url:faceRecognitionUrl, formData:form}, function(err,res,body){
				var responseDate = new Date()
				
				var responseTime = (responseDate.getTime() - timeStart.getTime());
				
				var response = JSON.parse(body)
				
				var success = response["success"]
				var predictions = response["predictions"]
				var mats = []
				
				var unknownCount = 0
				var identified = []

				if(success) {
					predictions.forEach(function(v){
						var userId = v["userid"]
						var confidence = v["confidence"]
						var y_min = v["y_min"]
						var x_min = v["x_min"]
						var y_max = v["y_max"]
						var x_max = v["x_max"]
						var width = x_max - x_min
						var height = y_max - y_min
						
						if(userId === "unknown") {
							unknownCount++
						} else {
							identified.push(`${userId}: ${confidence}`)
						}
						
						mats.push({
							x: x_min,
							y: y_min,
							width: width,
							height: height,
							tag: userId,
							confidence: confidence,
						})
					})		   
				}

				var shouldTrigger = (unknownCount + identified.length) > 0

				if(unknownCount > 0) {
					console.log(`${unknownCount} unknown faces detected by ${d.id}`)
				}
				
				if(identified.length > 0) {
					identifiedStr = identified.join(",")
					
					console.log(`${d.id} identified faces: ${identifiedStr}`)
				}

                if (shouldTrigger) {
                    var isObjectDetectionSeparate = d.mon.detector_pam === '1' && d.mon.detector_use_detect_object === '1'
                    var width = parseFloat(isObjectDetectionSeparate  && d.mon.detector_scale_y_object ? d.mon.detector_scale_y_object : d.mon.detector_scale_y)
                    var height = parseFloat(isObjectDetectionSeparate  && d.mon.detector_scale_x_object ? d.mon.detector_scale_x_object : d.mon.detector_scale_x)

                    tx({
                        f:'trigger',
                        id:d.id,
                        ke:d.ke,
                        details:{
                            plug:config.plug,
                            name: `DeepStack-Face`,
                            reason:'face',
                            matrices:mats,
                            imgHeight:width,
                            imgWidth:height,
                            time: responseTime
                        }
                    })
				}
			})
		}catch(err){
			console.log(err)
		}
		callback()
	}

	if(frameLocation){
		detectStuff(frameLocation)
	}else{
		d.tmpFile=s.gid(5)+'.jpg'
		if(!fs.existsSync(s.dir.streams)){
			fs.mkdirSync(s.dir.streams);
		}
		
		d.dir=s.dir.streams+d.ke+'/'
		if(!fs.existsSync(d.dir)){
			fs.mkdirSync(d.dir);
		}
	
		d.dir=s.dir.streams+d.ke+'/'+d.id+'/'
		if(!fs.existsSync(d.dir)){
			fs.mkdirSync(d.dir);
		}
	
		fs.writeFile(d.dir+d.tmpFile,buffer,function(err){
			if(err) return s.systemLog(err);
		
			try{
				detectStuff(d.dir+d.tmpFile)
			}catch(error){
				console.error('Catch: ' + error);
			}
		})
	}
}

startUp()