export const buildTxtRecordInstructions = (domain, hash, newkey, currentURL) => {
    return `Please add a TXT record for _rum-challenge.${domain} with the value ${hash}. Once
    the record is added, you can verify that it is set up correctly by making a POST request to this URL including
    the domain and domainkey parameters. For example:
    
    curl -X POST -d "domain=${domain}&domainkey=${newkey}" ${currentURL}
    `;
}