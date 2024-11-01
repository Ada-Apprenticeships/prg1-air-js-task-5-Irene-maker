const fs = require('fs');

const airportsData = readCsv('airports.csv');
const planeData = readCsv('aeroplanes.csv');

// const potentialBookings = readCsv('valid_flight_data.csv');
const potentialBookings = readCsv('invalid_flight_data.csv');

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
    // Define valid airport codes inside the function
    const validOrigins = ['MAN', 'LGW'];
    const validDestinations = ['JFK', 'ORY', 'MAD', 'AMS', 'CAI'];
   
    // Check if both origin and destination are valid
    if (!validOrigins.includes(origin)) {
        console.error(`Invalid origin code: ${origin}`);
        return null; // or throw an error
    }
    if (!validDestinations.includes(destination)) {
        console.error(`Invalid destination code: ${destination}`);
        return null; // or throw an error
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
        for (let record of potentialBookings) {
            
            const planeType = record[2];
            const es = parseInt(record[3]); // economy seats booked
            const bs = parseInt(record[4]); // business seats booked
            const fs = parseInt(record[5]);

            let maxESeat = null
            let maxBSeat = null
            let maxFSeat = null

            for (let i = 0; i < planeData.length; i++) {
                if (planeData[i][0] === planeType) {
                    maxESeat = parseInt(planeData[i][3]);
                    maxBSeat = parseInt(planeData[i][4]);
                    maxFSeat = parseInt(planeData[i][5]);
                    break;
                }
            }

            if (es > maxESeat || bs > maxBSeat || fs > maxFSeat){
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
    // Strip any £ sign or commas from price per seat and convert to float
    const numericPricePerSeat = parseFloat(pricePerSeat.replace(/[£,]/g, ''));
    
    if (isNaN(numericPricePerSeat) || isNaN(distance)) {
        console.error(`Invalid input for expense calculation: distance=${distance}, pricePerSeat=${pricePerSeat}`);
        return 0; // Return 0 if invalid inputs
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

// Convert the 2D profit chart array into a formatted string
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

// Main function to build the profit chart, with error handling
function buildProfitChart(potentialBookings, airportsData, planeData) {
    const profitChart = [
        ["Route", "Plane Type", "Total Seats Booked", "Expense", "Income", "Profit", "Error"]
    ];

    potentialBookings.forEach(row => {
        const [origin, destination, aircraftType, economySeats, businessSeats, firstClassSeats, economyPrice, businessPrice, firstClassPrice] = row;

        // Initialize error message and default row data
        let error = '';
        let route = '';
        let planeAbbreviation = ''; // Declare once outside conditional
        let totalSeats = 0, expense = 0, income = 0, profit = 0;


        // 1. Route validation
        route = createRoute(origin, destination);
        if (!route) {
            error += `Invalid route: ${origin} to ${destination}. ` ;
        }

        // 2. Plane Type and Abbreviation
        const [planeTypeFull, abbreviation] = getAircraftType(aircraftType);
        planeAbbreviation = abbreviation || "N/A";  // Assign planeAbbreviation once here

        if (planeAbbreviation === "invalid plane type") {
            error += `Invalid aircraft type: ${aircraftType}. ` ;
        }

        // 3, 4, 5. Seats Booked with Validation
        const eSeatsBooked = parseInt(economySeats);
        const bSeatsBooked = parseInt(businessSeats);
        const fSeatsBooked = parseInt(firstClassSeats);


        totalSeats = calculateTotalSeats(eSeatsBooked, bSeatsBooked, fSeatsBooked, planeData, potentialBookings);
        if (totalSeats === 0) {
            error += `Overbooking or invalid seat numbers. ` ;
        }

        // 6. Distance and Expense Calculation
        const distance = getDistance(origin, destination, airportsData);
        if (distance === 0) {
            error += `Invalid distance or mileage issue. ` ;
        }

        // 7. Price per Seat and Expense Calculation
        const planeInfo = planeData.find(plane => plane[0] === aircraftType);
        if (planeInfo) {
            const pricePerSeat = planeInfo[1];
            expense = calculateExpense(distance, pricePerSeat, totalSeats);
        } else {
            error += ` Missing price data for aircraft type: ${aircraftType}. ` ;
        }

        // 8. Income Calculation
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



// Write to profitChartWithErrors.txt with error details
const profit = buildProfitChart(potentialBookings, airportsData, planeData);
const profitFormatted = formatProfitChart(profit);

// fs.writeFile('profit.txt', profitFormatted, 'utf8', err => {
//     if (err) {
//         console.error("Error writing to file:", err.message);
//     } else {
//         console.log("Profit chart with error handling successfully written to profit.txt");
//     }
// });

fs.writeFile('profitError.txt', profitFormatted, 'utf8', err => {
    if (err) {
        console.error("Error writing to file:", err.message);
    } else {
        console.log("Profit chart with error handling successfully written to profitError.txt");
    }
});