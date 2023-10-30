export const MISSING_HLX_RUN_QUERY_DOMAIN_KEY = 'No HELIX_RUN_QUERY_DOMAIN_KEY set. This is a configuration error';
export const MISSING_DOMAIN = 'No domain specified';
export const MISSING_DOMAIN_KEY = 'domainkey not set';
export const ERROR_ROTATING_KEYS = 'Error while rotating domain keys';

export const HEADERS_TEXT_DEFAULT = {
    'Content-Type': 'text/plain',
};

export const HEADERS_JSON_DEFAULT = {
    'Content-Type': 'application/json',
};

export const endpoints = {
    rotateDomainkeys: 'https://helix-pages.anywhere.run/helix-services/run-query@v3/rotate-domainkeys'
}