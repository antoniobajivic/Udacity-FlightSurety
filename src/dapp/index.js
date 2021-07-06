
import Contract from './contract';
import DOM from './dom';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        DOM.elid("dropdown__default-suggestion").value=contract.owner;
        DOM.elid("selected-airline__name").value="CroatiaAirlines";
        DOM.elid("selected-airline__address").value=contract.owner;
    

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            let selectedAirlineAddress = DOM.elid("selected-airline__address").value;
            // Write transaction
            contract.fetchFlightStatus(selectedAirlineAddress, flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + " " + getTimeFromTimestamp(result.timestamp)} ]);
                let newTime = result.timestamp;
                enableSpinner();
                setTimeout(() => {
                    contract.viewFlightStatus(selectedAirlineAddress, flight, (error, result) => {
                        if(!error){
                            changeFlightStatus(flight, result, newTime);
                        }
                    })
                    disableSpinner();
                }, 2000);

            });
        })
    
    });
    
    DOM.elid("register-airline__button").addEventListener("click", async() => {
        let address = DOM.elid("airline-address").value;
        let name = DOM.elid("airline-name").value;
        let sender = DOM.elid("selected-airline__address");

        contract.registerAirline(address, name, sender, (error, result) => {
            display("", "New airline address and name: ", [
                {label: "Register Airline", error: error, value: result.message}
            ]);
            if(error) {
                console.log("Error: ", error);
            } else if(result.registered == true) {
                addAirlineToDropdown(name, address);
            }
        })
    })

    DOM.elid("fund").addEventListener("click", async() => {
        let funds = DOM.elid("funds").value;

        contract.fund(funds, (error, result) => {
            display("", "Funds added", [
                {
                    label: "Funds added to airline: ",
                    error: error,
                    value: result.funds + " wei"
                }
            ]);
            display("", "", [{label: "Airline is active: ", value: result.active}]);
        })
    })

    DOM.elid("register-flight__button").addEventListener("click", async () => {
        let flight = DOM.elid("register-flight__number").value;
        let destination = DOM.elid("register-flight__destination").value;

        contract.registerFlight(flight, destination, (error, result) => {
            display("", "Register New Flight", [
                {
                    label: "Info: ",
                    error: error,
                    value: "Flight code: " + result.flight + " Destination: " + result.destination
                }
            ])
        })
    });

    DOM.elid("insurance-buy__button").addEventListener("click", () => {
        let flight = DOM.elid("insurance-flight").value;
        let price = DOM.elid("insurance-price").value;

        contract.buy(flight, price, (error, result) => {
            display("", "Purchased New Flight Insurance", [
                {
                    label: "Insurance Details",
                    error: error,
                    value: `Flight: ${result.flight}. Paid: ${result.price} wei. Passenger: ${result.passenger}`
                }
            ])
        })
    });

    DOM.elid("credit-check__button").addEventListener("click", () => {
        contract.getCreditToPay((error, result) => {
            let creditDisplay = DOM.elid("credit-amount");
            if(error) {
                console.log(error);
                creditDisplay.value = "Error happened while getting your credit";
            } else {
                creditDisplay.value = result + " wei";
            }
        })
    })

    DOM.elid("claim-credit__button").addEventListener("click", () => {
        contract.pay((error, result) => {
            let creditDisplay = DOM.elid("credit-amount");
            if(error){
                console.log(error);
                alert("There has been an error and currently withdraw is unavailable.");
            } else {
                alert(`Successfully withdrawn ${creditDisplay.value} wei!`);
                creditDisplay.value = "0 ETH";
            }
        })
    });

    DOM.elid("claim-credit__button").addEventListener("click", (e) => {
        e.preventDefault();

        DOM.elid("selected-airline__name").value = e.target.innerHTML;
        DOM.elid("selected-airline__address").value = e.target.value;
    });

    DOM.elid("flight-status__button").addEventListener("click", async (e) => {
        e.preventDefault();
        let flightStatusValue = e.target.value;
        const response = await fetch(`http://localhost:3000/api/flight-status/${flightStatusValue}`);
        const flightStatus = response.json();
        display("", "Successfully Changed Flight's Status", [
            {
                label: "Server response: ", value: flightStatus.message
            }
        ])
    });

})();

let flightNum = 0;

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}

function getTimeFromTimestamp(timestamp){
  return new Date(timestamp * 1000).toLocaleTimeString("en-US").slice(0, -3);  
}

function enableSpinner(){
    document.getElementById("oracles-spinner").hidden = false;
    document.getElementById("submit-oracle").disabled = true;
}

function disableSpinner(){
    document.getElementById("oracles-spinner").hidden = true;
    document.getElementById("submit-oracle").disabled = false;
}

function addAirlineToDropdown(airlineName, hash) {
    let dropdown = DOM.elid("airline-dropdown__list");
    let newItem = DOM.button(
        {
            className: "dropdown-item", value: hash, type: "button"
        }, airlineName
    );
    dropdown.appendChild(newItem);
}

function changeFlightStatus(flight, status, newTime) {
    let row = DOM.elid(flight);
    row.deleteCell(3);
    row.deleteCell(2);
    let cell3 = row.insertCell(2);
    let cell4 = row.insertCell(3);
    let statusText = "";
    switch (status) {
     case "10":
      statusText = "ON TIME";
      cell3.style = "color:white";
      cell4.style = "color:green";
      break;
     case "20":
      statusText = "LATE AIRLINE";
      cell3.style = "color:red";
      cell4.style = "color:red";
      break;
     case "30":
      statusText = "LATE WEATHER";
      cell3.style = "color:red";
      cell4.style = "color:yellow";
      break;
     case "40":
      statusText = "LATE TECHNICAL";
      cell3.style = "color:red";
      cell4.style = "color:yellow";
      break;
     case "50":
      statusText = "LATE OTHER";
      cell3.style = "color:red";
      cell4.style = "color:yellow";
      break;
     default:
      statusText = "UNKNOWN";
      cell3.style = "color:white";
      cell4.style = "color:white";
      break;
    }
    cell3.innerHTML = getTimeFromTimestamp(newTime);
    cell4.innerHTML = statusText;
}

function flightDisplay(flight, destination, airlineName, time){
    let flightsTable = DOM.elid("flights-display__table");
    flightNum++;

    let flightRow = table.insertRow(flightCount);
    flightRow.id = flight;

    let cell1 = row.insertCell(0);
    let cell2 = row.insertCell(1);
    let cell3 = row.insertCell(2);
    let cell4 = row.insertCell(3);

    let date = new Date(+time);

    cell1.innerHTML = `${flight}`;
    cell1.setAttribute("data-toggle", "tooltip");
    cell1.setAttribute("data-placement", "top");
    cell1.title = "Click on flight code to copy";
    cell2.innerHTML = destination.toUpperCase();
    cell3.innerHTML = date.getHours() + ":" + date.getMinutes();
    cell4.innerHTML = "ON TIME";
    cell4.style = "color: green";
    $('[data-toggle="tooltip"').tooltip().mouseover();
    setTimeout(() => {
        $('[data-toggle="tooltip"').tooltip("hide");
    }, 3000);
}













