import cors from "cors";
import express from 'express';
import Web3 from 'web3';
import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

let oracleAccounts = [];
let oraclesIndexList = [];

const TEST_ORACLES_COUNT = 25;

let STATUS_CODE_UNKNOWN = 0;
let STATUS_CODE_ON_TIME = 10;
let STATUS_CODE_LATE_AIRLINE = 20;
let STATUS_CODE_LATE_WEATHER = 30;
let STATUS_CODE_LATE_TECHNICAL = 40;
let STATUS_CODE_LATE_OTHER = 50;

let currentStatus = STATUS_CODE_ON_TIME;

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    console.log(event)
});

const app = express();

app.use(cors());

app.listen(80, function () {
 console.log("CORS-enabled web server listening on port 80");
});

app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

app.get("/api/flight-status/:status", (req, res) => {
  let status = req.params.status;
  let message = "Status changed to: ";
  switch(status) {
    case "10":
      currentStatus = STATUS_CODE_ON_TIME;
      message = message.concat("ON TIME");
      break;
    case "20":
      currentStatus = STATUS_CODE_LATE_AIRLINE;
      message = message.concat("LATE AIRLINE");
      break;
    case "30":
      currentStatus = STATUS_CODE_LATE_WEATHER;
      message = message.concat("LATE WEATHER");
      break;
    case "40":
      currentStatus = STATUS_CODE_LATE_TECHNICAL;
      message = message.concat("LATE TECHNICAL");
      break;
    case "50":
      currentStatus = STATUS_CODE_LATE_OTHER;
      message = message.concat("LATE OTHER");
      break;
    default:
      currentStatus = STATUS_CODE_UNKNOWN;
      message = message.concat("UNKNOWN");
      break;
  }
  res.send({
    message: message
  });
})

flightSuretyApp.events.OracleRequest(
  {
    fromBlock: "latest"
  },
  (error, event) => {
    if(error) {
      console.log(error);
    }
    console.log(event);
    let index = event.returnValues.index;
    console.log(`Triggered index: ${index}`);
    let idx = 0;
    oraclesIndexList.forEach((indexes) => {
      let oracle = oracleAccounts[idx];
      if(indexes[0] == index || indexes[1] == index || indexes[2] == index) {
        console.log(`Oracle: ${oracle} triggered. Indexes: ${indexes}`);
        submitOracleResponse(oracle, index, event.returnValues.airline, event.returnValues.flight, event.returnValues.timestamp);
      }
      idx++;
    });
  }
)

flightSuretyData.events.allEvents(
  {
    fromBlock: "latest"
  },
  (error, event) => {
    if(error) {
      console.log(`Error: ${error}`);
    } else {
      console.log(`Event: ${event}`);
    }
  }
)

function submitOracleResponse(oracle, index, airline, flight, timestamp) {
  let payload = {
    index: index,
    airline: airline,
    flight: flight,
    timestamp: timestamp,
    statusCode: currentStatus
  }
  flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, currentStatus).send({from: oracle, gas: 450000, gasPrice: 200000000}, (error, result) => {
    if(error) {
      console.log(error, result);
    }
  });
  if(currentStatus == STATUS_CODE_LATE_AIRLINE){
    flightSuretyData.methods.creditInsurees(flight).call({from: oracle}, (error, result) => {
      if(error) {
        console.log(error, result);
      } else {
        console.log("Credit is set for insuree");
      }
    })
  }
}

function getOracleAccounts() {
  return new Promise((resolve, reject) => {
    web3.eth.getAccounts().then((accountList) => {
      oracleAccounts = accountList.slice(20, 20 + TEST_ORACLES_COUNT);
    }).catch((err) => {
      reject(err);
    }).then(() => {
      resolve(oracleAccounts);
    })
  })
}

function initOracles(accounts) {
  return new Promise((resolve, reject) => {
    flightSuretyApp.methods.REGISTRATION_FEE().call().then((fee) => {
      for(let i = 0; i < TEST_ORACLES_COUNT; i++){
        flightSuretyApp.methods.registerOracle().send({
          from: accounts[i],
          value: fee,
          gas: 5000000,
          gasPrice: 20000000
        }).then(() => {
          flightSuretyApp.methods.getMyIndexes().call({
            from: accounts[i]
          }).then((result) => {
            console.log(`Oracle ${i} is registered at ${accounts[i]} with [${result}] indexes.`);
            oraclesIndexList.push(result);
          }).catch((err) => {
            reject(err);
          })
        }).catch((err) => {
          reject(err);
        })
      }
      resolve(oraclesIndexList);
    }).catch((err) => {
      reject(err);
    })
  })
}

getOracleAccounts().then((accounts) => {
  initOracles(accounts).catch((err) => {
    console.log(err.message);
  })
})

export default app;


