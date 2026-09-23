/**
 * Class for handling invoice calculations
 */
class InvoiceCalculations {
    /**
     * Calculate rounding adjustment (Swedish "öresavrundning")
     * Rounds to nearest whole number and returns the adjustment amount.
     * 
     * @param {number} amount - The amount to calculate rounding for
     * @returns {number} - The rounding adjustment:
     *   - Negative if decimal < 0.50 (rounds down)
     *   - Positive if decimal >= 0.50 (rounds up)
     * 
     * @example
     * calculateRounding(100.30) // returns -0.30 (rounds down to 100)
     * calculateRounding(100.70) // returns 0.30 (rounds up to 101)
     * calculateRounding(100.50) // returns 0.50 (rounds up to 101)
     */
    static calculateRounding(amount) {
        const decimalPart = amount % 1;
        
        if (decimalPart < 0.50) {
            // Round down: return negative of decimal part
            return -decimalPart;
        } else {
            // Round up: return difference up to 1.00
            return 1 - decimalPart;
        }
    }

    /**
     * Get the rounded total after applying rounding adjustment
     * 
     * @param {number} amount - The amount to round
     * @returns {number} - The rounded amount
     */
    static getRoundedTotal(amount) {
        return amount + this.calculateRounding(amount);
    }
}

export default InvoiceCalculations;
