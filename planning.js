const fs = require('fs');

const airportsData = readCsv('airports.csv');
const planeData = readCsv('aeroplanes.csv');
const potentialBookings = readCsv('valid_flight_data.csv');


function readCsv(filename, delimiter = ',') {
    try {
        const fileContent = fs.readFileSync(filename, { encoding: 'utf-8' });
        const rows = fileContent.split('\n');
        const data = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].trim();
            if (row) {
                const columns = row.split(delimiter);
                data.push(columns);
            }
        }

        return data;
    } catch (err) {
        console.error("Error reading file:", err.message);
        return null;
    }
}

// Helper functions

function createRoute(origin, destination) {
    const validOrigins = ['MAN', 'LGW'];
    const validDestinations = ['JFK', 'ORY', 'MAD', 'AMS', 'CAI'];

    if (!validOrigins.includes(origin)) {
        console.error(`Invalid origin code: ${origin}`);
        return null; 
    }
    if (!validDestinations.includes(destination)) {
        console.error(`Invalid destination code: ${destination}`);
        return null; 
    }
    return `${origin} to ${destination}`;
}

function getAircraftType(type) {
    const abbreviations = {
        "Large narrow body": "LNB",
        "Medium narrow body": "MNB",
        "Medium wide body": "MWB"
    };
    return [type, abbreviations[type] || "invalid plane type"];
}

function calculateTotalSeats(economy, business, firstClass, planeData, potentialBookings) {
    
    function validateSeatsRecords(planeData,potentialBookings){
        // looping through potentialBookings to find plane type match 
        for (let record of potentialBookings) {
            const planeType = record[2];
            const ecoSeats = parseInt(record[3]); 
            const bizSeats = parseInt(record[4]); 
            const firstSeats = parseInt(record[5]);

            let maxEcoSeat = null
            let maxBizSeat = null
            let maxFirstSeat = null
            // looping through planeData to get max seat for a specific plane type 
            for (let i = 0; i < planeData.length; i++) {
                if (planeData[i][0] === planeType) {
                    maxEcoSeat = parseInt(planeData[i][3]);
                    maxBizSeat = parseInt(planeData[i][4]);
                    maxFirstSeat = parseInt(planeData[i][5]);
                    break;
                }
            }
            if (ecoSeats > maxEcoSeat || bizSeats > maxBizSeat || firstSeats > maxFirstSeat){
                console.error ('overbooking')
                return false;
            }
        }
        return true;
    }
    if (!validateSeatsRecords(planeData, potentialBookings)) {
        return 0; // Stop execution if overbooking detected
    }
    return economy + business + firstClass;
}


function getDistance(origin, destination, airportsData) {
    const airport = airportsData.find(row => row[0] === destination);
    if (!airport) {
        console.error(`No distance data for destination: ${destination}`);
        return 0;
    }
    if (planeData[2]< airportsData[2] || planeData[2]< airportsData[3]) {
        console.error(`Not enough mileage`);
        return 0;
    }
    return origin === 'MAN' ? parseFloat(airport[2]) : parseFloat(airport[3]);
}

function calculateExpense(distance, pricePerSeat,totalSeats) {
    // Stripping any £ sign or commas from price per seat 
    const numericPricePerSeat = parseFloat(pricePerSeat.replace(/[£,]/g, ''));
    
    if (isNaN(numericPricePerSeat) || isNaN(distance)) {
        console.error(`Invalid input for expense calculation: distance=${distance}, pricePerSeat=${pricePerSeat}`);
        return 0; 
    }
    const expense = ((numericPricePerSeat * distance) / 100) * totalSeats;
    return parseFloat(expense.toFixed(2));
}

function calculateIncome(economySeats, businessSeats, firstClassSeats, economyPrice, businessPrice, firstClassPrice) {
    const income = (economySeats * economyPrice) + (businessSeats * businessPrice) + (firstClassSeats * firstClassPrice);
    return parseFloat(income.toFixed(2));
}

// Formatter for currency with £ and commas
function formatCurrency(amount) {
    return '£' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Converting the 2D profit chart array  for aesthetics and improving data readbility
function formatProfitChart(profitChart) {
    const headers = profitChart[0];
    const rows = profitChart.slice(1);

    // Determine column widths based on the longest value in each column
    const columnWidths = headers.map((header, i) =>
        Math.max(
            header.length,
            ...rows.map(row => String(row[i]).length)
        )
    );

    // Helper function to format a row with consistent column spacing
    const formatRow = row =>
        row.map((cell, i) => cell.toString().padEnd(columnWidths[i])).join(" | ");

    // Construct formatted string for headers and rows
    const headerRow = formatRow(headers);
    const separator = columnWidths.map(width => "-".repeat(width)).join("-+-");
    const dataRows = rows.map(formatRow).join("\n");

    return `${headerRow}\n${separator}\n${dataRows}`;
}

// Main function to build the final profit chart, with error handling ability
function buildProfitChart(potentialBookings, airportsData, planeData) {
    const profitChart = [
        ["Route", "Plane Type", "Total Seats Booked", "Expense", "Income", "Profit", "Error"]
    ];

    potentialBookings.forEach(row => {
        const [origin, destination, aircraftType, economySeats, businessSeats, firstClassSeats, economyPrice, businessPrice, firstClassPrice] = row;

        // Initialize error message and default row data
        let error = '';
        let route = '';
        let planeAbbreviation = ''; 
        let totalSeats = 0, expense = 0, income = 0, profit = 0;

        // Route validation
        route = createRoute(origin, destination);
        if (!route) {
            error += `Invalid route: ${origin} to ${destination}. ` ;
        }

        //Plane Type and Abbreviation
        const [planeTypeFull, abbreviation] = getAircraftType(aircraftType);
        planeAbbreviation = abbreviation || "N/A";  

        if (planeAbbreviation === "invalid plane type") {
            error += `Invalid aircraft type: ${aircraftType}. ` ;
        }

        //Seats Booked with Validation
        const eSeatsBooked = parseInt(economySeats);
        const bSeatsBooked = parseInt(businessSeats);
        const fSeatsBooked = parseInt(firstClassSeats);

        totalSeats = calculateTotalSeats(eSeatsBooked, bSeatsBooked, fSeatsBooked, planeData, potentialBookings);
        if (totalSeats === 0) {
            error += `Overbooking or invalid seat numbers. ` ;
        }

        //Distance and Expense Calculation
        const distance = getDistance(origin, destination, airportsData);
        if (distance === 0) {
            error += `Invalid distance or mileage issue. ` ;
        }

        // Price per Seat and Expense Calculation
        const planeInfo = planeData.find(plane => plane[0] === aircraftType);
        if (planeInfo) {
            const pricePerSeat = planeInfo[1];
            expense = calculateExpense(distance, pricePerSeat, totalSeats);
        } else {
            error += ` Missing price data for aircraft type: ${aircraftType}. ` ;
        }

        //Income Calculation
        if (!isNaN(parseFloat(economyPrice)) && !isNaN(parseFloat(businessPrice)) && !isNaN(parseFloat(firstClassPrice))) {
            income = calculateIncome(
                eSeatsBooked,
                bSeatsBooked,
                fSeatsBooked,
                parseFloat(economyPrice),
                parseFloat(businessPrice),
                parseFloat(firstClassPrice)
            );
            profit = income - expense;
        } else {
            error += `Invalid seat prices.` ;
        }

        // Fill row with data or zeros and error message
        profitChart.push([
            route || `${origin} to ${destination}`,
            planeAbbreviation || "N/A",
            totalSeats || 0,
            formatCurrency(expense) || "£0.00",
            formatCurrency(income) || "£0.00",
            formatCurrency(profit) || "£0.00",
            error || "No errors"
        ]);
    });

    return profitChart;
}



// Synchronous version of writing to file
const profit = buildProfitChart(potentialBookings, airportsData, planeData);
const profitFormatted = formatProfitChart(profit);
try {
    fs.writeFileSync('profit.txt', profitFormatted, 'utf8');
    console.log("Profit chart with error handling successfully written to profit.txt");
} catch (err) {
    console.error("Error writing to file:", err.message);
};

// for test file 
module.exports = {
    readCsv,
    createRoute,
    getAircraftType,
    calculateTotalSeats,
    getDistance,
    calculateExpense,
    calculateIncome,
    formatCurrency,
    buildProfitChart
  }