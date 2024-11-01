const {
    readCsv,
    createRoute,
    getAircraftType,
    calculateTotalSeats,
    getDistance,
    calculateExpense,
    calculateIncome,
    formatCurrency,
    buildProfitChart,
} = require('./planning.js');

// Mock data for tests
const planeData = [
    [ 'Medium narrow body', '£8', '2650', '160', '12', '0' ],
    [ 'Large narrow body', '£7', '5600', '180', '20', '4' ],
    [ 'Medium wide body', '£5', '4050', '380', '20', '8' ]
];

const potentialBookings = [
    ['MAN', 'JFK', 'Large narrow body', '100', '50', '10', '150', '500', '1000'],
    ['MAN', 'XYZ', 'Medium narrow body', '200', '50', '10', '150', '500', '1000'] // Invalid route
];


// Jest setup
describe('Profit Chart Function Tests', () => {

    test("T01_ValidRouteCreation", () => {
        expect(createRoute('MAN', 'JFK')).toBe('MAN to JFK');
        expect(createRoute('LGW', 'MAD')).toBe('LGW to MAD');
        expect(createRoute('XYZ', 'JFK')).toBe(null);
        expect(createRoute('MAN', 'XYZ')).toBe(null);
    });

    test("T02_GetAircraftType", () => {
        expect(getAircraftType('Large narrow body')).toEqual(["Large narrow body", "LNB"]);
        expect(getAircraftType('Medium narrow body')).toEqual(["Medium narrow body", "MNB"]);
        expect(getAircraftType('Unknown type')).toEqual(["Unknown type", "invalid plane type"]);
    });

    test("T03_CalculateTotalSeats_ValidSeats", () => {
        // Simulate potential bookings with valid values
        expect(calculateTotalSeats(100, 50, 10, planeData, potentialBookings)).toBe(0);
    });

    test("T04_CalculateTotalSeats_Overbooking", () => {
        // Test overbooking with values that exceed the maximum for a plane
        expect(calculateTotalSeats(200, 150, 50, planeData, potentialBookings)).toBe(0); // Overbooking scenario
    });

    test("T05_GetDistance_ValidDistance", () => {
        const airportsData = [
            ['JFK', 'John F. Kennedy', '5500', '5700'],
            ['ORY', 'Orly', '500', '520'],
        ];
        expect(getDistance('MAN', 'JFK', airportsData)).toBe(5500);
        expect(getDistance('LGW', 'ORY', airportsData)).toBe(520);
    });

    test("T06_GetDistance_InvalidDestination", () => {
        const airportsData = [
            ['JFK', 'John F. Kennedy', '5500', '5700'],
            ['ORY', 'Orly', '500', '520'],
        ];
        expect(getDistance('MAN', 'XYZ', airportsData)).toBe(0);
    });

    test("T07_CalculateExpense", () => {
        expect(calculateExpense(5500, '£100', 200)).toBe(1100000);
        expect(calculateExpense(0, '£100', 200)).toBe(0);  // Invalid distance
    });

    test("T08_CalculateIncome", () => {
        // Correct expected value should be 50000 according to the provided logic in `calculateIncome`
        expect(calculateIncome(100, 50, 10, 150, 500, 1000)).toBe(50000);
    });

    test("T09_FormatCurrency", () => {
        expect(formatCurrency(12345.678)).toBe("£12,345.68");
        expect(formatCurrency(987654321)).toBe("£987,654,321.00");
    });

    test("T10_BuildProfitChart_WithErrors", () => {
        const airportsData = [
            ['JFK', 'John F. Kennedy', '5500', '5700'],
            ['ORY', 'Orly', '500', '520'],
        ];
        
        const profitChart = buildProfitChart(potentialBookings, airportsData, planeData);
        expect(profitChart.length).toBe(3);  // Header + 2 rows

        const rowWithError = profitChart[2];
        expect(rowWithError[6]).toContain("Invalid route");
    });

});
