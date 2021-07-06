pragma solidity ^0.5.17;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private authorizedContracts;

    struct Airline {
        uint256 funds;
        bool isFunded;
        bool isRegistered;
    }

    struct Flight {
        bool isRegistered;
        address airline;
        bytes32 flightKey;
        string flightNumber;
        uint8 statusCode;
        uint256 timeStamp;
        string departureLocation;
        string arrivalLocation;
    }

    struct Insurance{
        bool isCredited;
        address passenger;
        uint256 purchase;
        uint256 payoutPercentage;
    }

    uint256 registeredAirlineNum = 0;
    uint256 fundedAirlineNum = 0;
    mapping(address => Airline) private airlines;

    mapping(bytes32 => Flight) public flights;
    bytes32[] public registeredFlights;

    mapping(bytes32 => Insurance[]) public flightInsurance;

    mapping(address => uint256) public insuranceFunds;
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AirlineRegistered(address airline);
    event AirlineFunded(address airline);
    event FlightRegistered(bytes32 flightKeys);
    event ProcessedFlightStatus(bytes32 flightKey, uint8 statusCode);
    event PassengerInsured(bytes32 flightKey, address passenger, uint256 amount, uint256 payout);
    event CreditInsuree(bytes32 flightKey, address passenger, uint256 amount);
    event PayInsuree(address payoutAddress, uint256 amount);
    

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    address airline
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        airlines[airline] = Airline(0, true, false);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAuthorizedCaller()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    modifier requireAirlineRegistered(address airline)
    {
        require(airlines[airline].isRegistered, "Airline is not registered");
        _;
    }

    modifier requireAirlineNotRegistered(address airline)
    {
        require(!airlines[airline].isRegistered, "Airline is already registered");
        _;
    }

    modifier requireAirlineFunded(address airline)
    {
        require(airlines[airline].isFunded, "Airline is not funded");
        _;
    }

    modifier requireAirlineNotFunded(address airline)
    {
        require(!airlines[airline].isFunded, "Airline is already funded");
        _;
    }

    modifier requireFlightRegistered(bytes32 flightKey)
    {
        require(flights[flightKey].isRegistered, "Flight is not registered");
        _;
    }

    modifier requireFlightNotRegistered(bytes32 flightKey){
        require(!flights[flightKey].isRegistered, "Flight is already registered");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    function getAirlineRegisterStatus
                            (
                                address airline
                            )
                            public
                            view
                            requireIsOperational
                            returns(bool)
    {
        return airlines[airline].isRegistered;
    }

    function getAirlineFundedStatus
                            (
                                address airline
                            )
                            public
                            returns(bool)
    {
        return airlines[airline].isFunded;
    }

    function getRegisteredAirlineNum
                            (
                            )
                            public
                            view
                            requireIsOperational
                            requireAuthorizedCaller
                            returns(uint256)
    {
        return registeredAirlineNum;
    }

    function getFlightRegisterStatus
                            (
                                bytes32 flightKey
                            )
                            public
                            view
                            returns(bool)
    {
        return flights[flightKey].isRegistered;
    }

    function getFlightCodeStatus
                            (
                                bytes32 flightKey
                            )
                            public
                            view
                            returns(bool)
    {
        if(flights[flightKey].statusCode > 0){
            return true;
        }
        return false;
    }

    function getFlightInsurance
                            (
                                bytes32 flightKey,
                                address passenger
                            )
                            public
                            view
                            returns(bool)
    {
        Insurance[] memory insurances = flightInsurance[flightKey];
        for(uint256 i=0; i < insurances.length; i++){
            if(insurances[i].passenger == passenger){
                return true;
            }
        }
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (
                                address newAirline,
                                address airlineForRegistration   
                            )
                            external
                            requireIsOperational
                            requireAuthorizedCaller
                            requireAirlineNotRegistered(newAirline)
                            requireAirlineFunded(airlineForRegistration)
    {
        airlines[newAirline] = Airline(0, true, false);
        registeredAirlineNum = registeredAirlineNum.add(1);
        emit AirlineRegistered(newAirline);
    }

    function registerFlight
                            (
                                bytes32 flightKey,
                                uint256 timestamp,
                                address airline,
                                string memory flightNumber,
                                string memory departureLocation,
                                string memory arrivalLocation
                            )
                            public
                            payable
                            requireIsOperational
                            requireAuthorizedCaller
                            requireAirlineFunded(airline)
                            requireFlightNotRegistered(flightKey)
    {
        flights[flightKey] = Flight(true, airline, flightKey, flightNumber, 0, timestamp, departureLocation, arrivalLocation);
        registeredFlights.push(flightKey);
        emit FlightRegistered(flightKey);
    }

    function processFlightStatus
                            (
                                address airline,
                                string calldata flight,
                                uint256 timestamp,
                                uint8 statusCode
                            )
                            external
                            requireIsOperational
                            requireAuthorizedCaller
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        require(!getFlightCodeStatus(flightKey), "Flight has already landed");
        if(flights[flightKey].statusCode == 0){
            flights[flightKey].statusCode = statusCode;
            if(statusCode == 20){
                creditInsurees(flightKey);
            }
        }
        emit ProcessedFlightStatus(flightKey, statusCode);
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (  
                                bytes32 flightKey,
                                address passenger,
                                uint256 amount,
                                uint256 payout                           
                            )
                            external
                            payable
                            requireIsOperational
                            requireAuthorizedCaller
    {
        require(getFlightRegisterStatus(flightKey), "Flight is already registered");
        require(!getFlightCodeStatus(flightKey), "Flight has already landed");

        // Insurance storage newFlightInsurance = Insurance(passenger, amount, payout, false);
        flightInsurance[flightKey].push(Insurance(false, passenger, amount, payout));
        emit PassengerInsured(flightKey, passenger, amount, payout);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    bytes32 flightKey
                                )
                                internal
                                requireIsOperational
                                requireAuthorizedCaller
    {
        for(uint256 i = 0; i < flightInsurance[flightKey].length; i++){
            Insurance memory newInsurance = flightInsurance[flightKey][i];
            newInsurance.isCredited = true;
            uint256 amount = newInsurance.purchase.mul(newInsurance.payoutPercentage).div(100);
            insuranceFunds[newInsurance.passenger] = insuranceFunds[newInsurance.passenger].add(amount);
            emit CreditInsuree(flightKey, newInsurance.passenger, amount);
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                                address payable payoutAddress
                            )
                            external
                            payable
                            requireIsOperational
                            requireAuthorizedCaller
    {
        uint256 amount = insuranceFunds[payoutAddress];
        require(address(this).balance >= amount, "Contract has insufficient funds");
        require(amount > 0, "No funds available for withdraw");
        insuranceFunds[payoutAddress] = 0;
        address(uint256(address(payoutAddress))).transfer(amount);
        emit PayInsuree(payoutAddress, amount);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (
                                address airline,
                                uint256 amount
                            )
                            external
                            requireIsOperational
                            requireAuthorizedCaller
                            requireAirlineRegistered(airline)
                            requireAirlineNotFunded(airline)
                            returns(bool)
    {
        airlines[airline].isFunded = true;
        airlines[airline].funds = airlines[airline].funds.add(amount);
        fundedAirlineNum = fundedAirlineNum.add(1);
        emit AirlineFunded(airline);
        return airlines[airline].isFunded;
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        // fund();
    }


}

