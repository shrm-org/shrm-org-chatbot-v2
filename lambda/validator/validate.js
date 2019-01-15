const fs = require("fs")
const AWS = require("aws-sdk")
AWS.config.update({
  region: "us-east-1"
})
const Lambda = new AWS.Lambda({
  region: "us-east-1"
})
const SES = new AWS.SES({
  apiVersion: '2010-12-01'
})

async function executeQuery(input, res) {
  const payload = {
    req: {
      question: input,
      _info: {
        es: {
          address: process.env.ES_ADDRESS,
          index: process.env.ES_INDEX,
          type: process.env.ES_TYPE
        }
      }
    }, res
  }
  const params = {
    FunctionName: process.env.ES_QUERY_LAMBDA,
    Payload: JSON.stringify(payload)
  }
  return await Lambda.invoke(params, (error, data) => {
    if (error) {
      throw new Error(`Error executing query while running tests for new question: ${JSON.stringify(error)}`)
    } else if (data) {
      return data
    }
  }).promise()
}

function assessQueryResult(queryResult, expectedResult) {
  queryResult = JSON.parse(queryResult).res
  const actual = {}
  if (queryResult.card && queryResult.card.send) {
    actual.topic = queryResult.session.topic
  } else if (queryResult.qid) {
    actual.qid = queryResult.qid
  } else {
    actual.message = queryResult.message
  }
  const isPassing = actual.qid && expectedResult.qid && actual.qid === expectedResult.qid ||
      actual.topic && expectedResult.topic && actual.topic === expectedResult.topic
  return { expectedResult, actual, isPassing }
}

function printList(list) {
  let ret = ''
  list.forEach(item => {
    ret += `
      <li>${item}</li>
    `
  })
  return ret
}

function printResults(results) {
  let ret = ``
  results.forEach(test => {
    ret += `
      <ul>
        <li>Input:
          <ul>
            <li>${test.input}</li>
          </ul>
        </li>
        <li>Expected result:
          <ul>
            <li>${test.expectedResult.qid ? test.expectedResult.qid : test.expectedResult.topic + " Response Card"}</li>
          </ul>
        </li>
        <li>Actual result:
          <ul>
            <li>${test.actual.qid ? test.actual.qid : (test.actual.topic ? test.actual.topic + " Response Card" : test.actual.message)}</li>
          </ul>
        </li>
      </ul>
    `
  })
  return ret
}

function reportTestResults(newQuestion, passed, failed) {
  let html = `
    <html>
      <body>
        <p>Hello,</p>
        <p>A new question-answer entry has been added to the SHRM chatbot:</p>
        <ul>
          <li>QID:
            <ul>
              <li>${newQuestion.qid ? newQuestion.qid : `<p>N/A</p>`}</li>
            </ul>
          </li>
          <li>Question(s):
            <ul>${newQuestion.q ? printList(newQuestion.q) : `<p>N/A</p>`}</ul>
          </li>
          <li>Answer:
            <ul>
              <li>${newQuestion.a ? newQuestion.a : `<p>N/A</p>`}</li>
            </ul>
          </li>
        </ul>
        <p>Here are the results of automatic regression testing:</p>
        <ul>
          <li><b># of tests:</b> ${passed.length + failed.length}</li>
          <li><b># Failed:</b> <span style="color: red">${failed.length}</span></li>
          <li><b># Passed:</b> <span style="color: green">${passed.length}</span></li>
        </ul>
        <p><b>Failed tests:</b></p>
        ${failed.length ? printResults(failed) : `<p>N/A</p>`}
        <p><b>Passed tests:</b></p>
        ${passed.length ? printResults(passed) : `<p>N/A</p>`}
      </body>
    </html>
  `
  const params = {
    Destination: {
      ToAddresses: process.env.TO_ADDRESSES.split(',')
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: html
        }
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Chatbot Regression Testing Results"
      }
    },
    Source: process.env.FROM_ADDRESS
  }
  return SES.sendEmail(params).promise()
}


module.exports = async (req, res) => {
  const passed = []
  const failed = []
  const newQuestion = req.newQuestion

  let fileData = fs.readFileSync('./tests.json')
  if (fileData) {
    const { tests } = JSON.parse(fileData)
    if (tests) {
      for (let i = 0; i < tests.length; i++) {
        const { input, expectedResult } = tests[i]
        try {
          const queryResult = await executeQuery(input, res)
          if (queryResult) {
            const testResult = { input, ...assessQueryResult(queryResult.Payload, expectedResult) }
            if (testResult.isPassing) {
              passed.push(testResult)
            } else {
              failed.push(testResult)
            }
          }
        } catch (e) {
          throw e
        }
      }
      reportTestResults(newQuestion, passed, failed)
    }
  }
}