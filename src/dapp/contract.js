import Web3 from 'web3';
import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.account = null;
        this.airlines = [];
        this.passengers = [];
        this.flights = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];
            this.account = accts[1];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    setOperatingStatus(mode, callback) {
        this.flightSuretyApp.methods.setOperatingStatus(mode).send({from: this.owner}, callback).then(console.log);
    }

    fetchFlightStatus(airline, flight, timestamp, flightKey, callback) {
        this.flightSuretyApp.methods.fetchFlightStatus(airline, flight, timestamp, flightKey).send({from: self.owner}, (error, result) => {
            callback(error, result);
        });
    }

    registerAirline(airline, callback) {
        this.flightSuretyApp.methods.registerAirline(airline).send({from: this.account}, callback).then(console.log);
    }

    fund(amount, callback) {
        this.flightSuretyApp.methods.fund().send({ from: this.account, value: this.web3.utils.toWei(amount, "ether")}, callback).then(console.log);
    }

    registerFlight(flightNumber, departureLocation, arrivalLocation, callback){
        let timestamp = Math.floor(date.now() / 1000);
        this.flightSuretyApp.methods.registerFlight(timestamp, flightNumber, departureLocation, arrivalLocation).send({from: this.account, gas: 10000000}, callback).then(console.log)
    }

    buy(flightKey, amount) {
        this.flightSuretyApp.methods.buy(flightKey).send({from: this.account, value: this.web3.utils.toWei(amount, "ether"), gas: 10000000}).then(console.log);
    }

    pay(callback) {
        this.flightSuretyApp.methods.pay().send({from: this.account, gas: 10000000}, callback)
    }
}