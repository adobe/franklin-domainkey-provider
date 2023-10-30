export const parseQuery = (queryString) => {
    var query = {};

    if (!queryString) {
        return query;
    } else if (typeof queryString !== 'string') {
        return query;
    } else if (queryString[0] !== '?' && queryString[0] !== '#') {
        return query;
    }

    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
}