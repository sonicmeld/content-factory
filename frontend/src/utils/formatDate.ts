export function formatToJakartaTime(utcDateString: string | null | undefined): string {
    if (!utcDateString) return 'N/A';
    
    try {
        // Ensure the string is treated as UTC if it doesn't already have timezone info
        const dateStr = utcDateString.endsWith('Z') ? utcDateString : `${utcDateString}Z`;
        const date = new Date(dateStr);
        
        // Return formatting like: Jun 5, 2026, 10:30 AM (WIB)
        return date.toLocaleString('en-US', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }) + ' WIB';
    } catch (e) {
        return 'Invalid Date';
    }
}
