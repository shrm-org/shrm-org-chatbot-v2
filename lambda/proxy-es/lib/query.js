//start connection
var Promise=require('bluebird')
var bodybuilder = require('bodybuilder')
var aws=require('aws-sdk')
var url=require('url')
var _=require('lodash')
var request=require('./request')
var faq = require('./faq')

/*
	This function can be used/modified to designate ambiguous results, e.g. two high-scoring answers with scores within close range of each other
 */
function isAmbiguous(results) {
  var isAmbiguous = false;
	var hits = results.hits.hits;
	if (hits.length > 1) {
		var highest = hits[0]._score;
		var secondHighest = hits[1]._score;
		isAmbiguous = highest >= 25 && secondHighest >= 25 &&
				highest - secondHighest < Math.floor((highest + secondHighest) / 10)
		console.log(`Highest: ${highest} | 2nd Highest: ${secondHighest} | Ambiguity: ${Math.floor((highest + secondHighest) / 5)}`);
	}
	console.log(`isAmbiguous: ${isAmbiguous}`);
	return isAmbiguous;
}

function getCapitalizedList(list) {
	var ret = [];
	list.forEach(item => ret.push(item.charAt(0).toUpperCase() + item.substr(1)));
	return ret;
}

function getLowercaseList(list) {
	var ret = [];
	list.forEach(item => ret.push(item.charAt(0).toLowerCase() + item.substr(1)));
	return ret;
}

module.exports=function(req,res){
    console.log(JSON.stringify({req,res},null,2))
		// Remove punctuation and any extra spaces that are leftover from their removal
		var queryString = req.question.replace(/[.,\?\/#!$%\^&\*;:{}=_`~()]/g, "").replace(/\s{2,}/g, " ");
    console.log(`Query String: ${queryString}`);
		var query=bodybuilder()
		.orQuery('nested',{
					path:'questions',
					score_mode:'sum',
					boost:2},
				q=>q.query('common','questions.q',{query: queryString, cutoff_frequency: 0.0001, minimum_should_match: {high_freq: 3}})
		)
		.orQuery('match','a',queryString)
		.orQuery('common','alt.markdown',{query: queryString, cutoff_frequency: 0.001, minimum_should_match: {high_freq: 3}})
		.orQuery('match','t', {query: queryString, boost: 2.5})
		.from(0)
		.size(1)
		.build()

    console.log("ElasticSearch Query",JSON.stringify(query,null,2))
    return request({
        url:`https://${req._info.es.address}/${req._info.es.index}/${req._info.es.type}/_search?search_type=dfs_query_then_fetch`,
        method:"GET",
        body:query
    })
    .then(function(result){
		console.log("ES result:"+JSON.stringify(result,null,2))
		res.result = _.get(result, "hits.hits[0]._source")
		if (res.result) {
			var maxScore = _.get(result, "hits.max_score")
			var topic = _.get(res.result, "t")
			var faqObj
			if (maxScore > 15 && maxScore < 30 && topic && (faqObj = faq(topic))) {
				res.type="PlainText"
				res.session.topic = topic
				res.message=`Your question appears to be about ${res.session.topic}. Here are some frequently asked questions about ${res.session.topic}:`
				if (!res.card) res.card = {}
				res.card.send = true
				res.card.title = `Frequently asked questions about ${res.session.topic}`
				res.card.imageUrl = faqObj.imageUrl
				res.card.buttons = faqObj.buttons
			} else if (maxScore > 15) {
				res.type="PlainText"
				res.message=res.result.a
				res.plainMessage=res.result.a
				res.qid = res.result.qid
				
				_.set(res,"session.appContext.altMessages",
				_.get(res,"result.alt",{})
				)

				if (res.result.alt.markdown) {
					res.result.alt.markdown += '<hr><p class="text-medium">If you did not find this answer helpful, please <a href="https://shrm.org/about-shrm/Pages/Contact-Us.aspx" target="_blank">contact a representative</a> for assistance.</p><p></p><p><a href="http://survey.usabilla.com/live/s/5bd34f1b4cc4f40c9c3eabd7" target="_blank" class="satisfaction-survey" data-action="Satisfaction survey click">Rate your bot experience</a></p>'
				}

				if(req.outputDialogMode!=="Text"){
					if(_.get(res,"result.alt.ssml")){
						res.type="SSML"
						res.message=res.result.alt.ssml.replace(/\r?\n|\r/g,' ')
					}
				}
				console.log(res.message)
				var card=_.get(res,"result.r.title") ? res.result.r : null
				
				if (card) {
					res.card.send=true
					res.card.title=_.get(card,'title')
					res.card.subTitle=_.get(card,'subTitle')
					res.card.imageUrl=_.get(card,'imageUrl')
				}

				//res.session.topic=_.get(res.result,"t")
				
				var navigationJson = _.get(res,"session.navigation",false)
				var previousQid = _.get(res,"session.previous.qid",false)
				var previousArray  = _.get(res,"session.navigation.previous",[])
				
				if(
				previousQid != _.get(res.result,"qid") && 
				_.get(navigationJson,"hasParent",true) == false && 
				req._info.es.type=='qna')
				{
				if(previousArray.length == 0){
					previousArray.push(previousQid)
				}
				else if(previousArray[previousArray.length -1] != previousQid){
					previousArray.push(previousQid)
				}
				
				}
				if(previousArray.length > 10){
				previousArray.shift()
				}
				var hasParent = true
				if("next" in res.result){
				hasParent = false
				}
				res.session.previous={    
				qid:_.get(res.result,"qid"),
				a:_.get(res.result,"a"),
				alt:_.get(res.result,"alt",{}),
				q:req.question
				}
				res.session.navigation={
				next:_.get(res.result,
					"next",
					_.get(res,"session.navigation.next","")
				),
				previous:previousArray,
				hasParent:hasParent
				}
			} else {
				res.type = "PlainText"
				res.message = process.env.EMPTYMESSAGE
			}
		} else {
			res.type="PlainText"
			res.message=process.env.EMPTYMESSAGE
		}
        console.log("RESULT",JSON.stringify(req),JSON.stringify(res))
    })
}
