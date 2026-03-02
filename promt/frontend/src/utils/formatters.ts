export const formatCurrency = (value: number, minDecimals = 2, maxDecimals = 2) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
    }).format(value);
};

export const formatAddress = (address: string, chars = 4) => {
    if (!address) return '';
    if (address.length <= chars * 2) return address;
    return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
};

export const formatTime = (date: Date = new Date()) => {
    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};
