/**
 * Formats a full name to initial of first name + first 8 characters of last name
 * Example: "John Doe" => "J. Doe"
 * Example: "Maria Garcia Lopez" => "M. Garcia L"
 * @param {string} fullName - The full name to format
 * @returns {string} - Formatted name as "Initial. LastName"
 */
export const formatUserName = (fullName) => {
    if (!fullName || typeof fullName !== 'string') {
        return '';
    }

    const nameParts = fullName.trim().split(/\s+/);
    
    if (nameParts.length === 0) {
        return '';
    }

    if (nameParts.length === 1) {
        // Only one name part, return initial with first 8 chars
        return `${nameParts[0].charAt(0)}. ${nameParts[0].substring(1, 9)}`.trim();
    }

    // First part is first name, last part is last name
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    const initial = firstName.charAt(0).toUpperCase();
    const lastNameTruncated = lastName.substring(0, 8);
    
    return `${initial}. ${lastNameTruncated}`;
};
