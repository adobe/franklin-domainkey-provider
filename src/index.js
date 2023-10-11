/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import wrap from '@adobe/helix-shared-wrap';
import { logger } from '@adobe/helix-universal-logger';
import { helixStatus } from '@adobe/helix-status';
import { Response, fetch } from '@adobe/fetch';
import bodyData from '@adobe/helix-shared-body-data';
import { randomUUID, createHash } from 'crypto';
import { resolveTxt } from 'dns';
import { promisify } from 'util';
// import { IdentityClient, FronteggContext } from '@frontegg/client';

const resolveTxtAsync = promisify(resolveTxt);

function hashMe(domain, domainkey) {
  const hash = createHash('sha256');
  hash.update(domain);
  hash.update(domainkey);
  return hash.digest('hex');
}

/**
 * parses a JWT token
 * @param {String} token The access token from frontegg
 */
/* c8 ignore start */
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`).join(''));

  return JSON.parse(jsonPayload);
}
/* c8 ignore stop */

/**
 * This is the main function
 * @param {Request} request the request object (see fetch api)
 * @param {UniversalContext} context the context of the universal serverless function
 * @returns {Response} a response
 */
async function run(request, context) {
  const {
    // eslint-disable-next-line no-unused-vars
    HELIX_RUN_QUERY_DOMAIN_KEY, FRONTEGG_API_KEY, FRONTEGG_CLIENT_ID,
  } = context.env;
  const { data } = context;
  const {
    domain, expiry, domainkey, token, dktoken,
  } = data;
  if (!HELIX_RUN_QUERY_DOMAIN_KEY) {
    return new Response('No HELIX_RUN_QUERY_DOMAIN_KEY set. This is a configuration error', {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  /* c8 ignore start */
  // TODO probably delete this once CORS issues resolved
  if (request.method === 'OPTIONS') {
    return new Response('Preflight request valid', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  /* c8 ignore stop */

  /* c8 ignore start */
  // from domainkey generator
  if (dktoken && request.method === 'POST') {
    const user = parseJwt(dktoken);

    if (user && user.email) {
      const email = user.email.split('@')[0];

      // for domain key creation
      let urlforkey = '';
      if (domain) {
        urlforkey = domain;
      }

      // create new domain key by making API request
      const endpoint = new URL('https://helix-pages.anywhere.run/helix-services/run-query@v3/rotate-domainkeys');
      const body = {
        url: urlforkey,
        domainkey: HELIX_RUN_QUERY_DOMAIN_KEY,
        readonly: true,
        note: `from domainkey generator by ${email}`,
      };
      if (expiry) {
        body.expiry = expiry;
      }
      if (domainkey) {
        body.newkey = domainkey;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok || json.results.data[0].status !== 'success') {
        return new Response(`Error while rotating domain keys: ${res.statusText}`, {
          status: 503,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }
      return new Response(JSON.stringify(json.results.data[0]), {
        status: 201,
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
  }

  // from frontegg
  if (token && request.method === 'POST') {
    const user = parseJwt(token);

    if (user) {
      if (user.email_verified) {
        const emaildomain = user.email.split('@').pop();

        // set defaults for domain key creation
        let urlforkey = emaildomain;
        // 7 days from now, in YYYY-MM-DD format
        let expiryforkey = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Adobe employees have more flexibility in domain key creation
        if (emaildomain === 'adobe.com') {
          if (domain) {
            urlforkey = domain;
          } else {
            urlforkey = '';
          }
          // domain key to expire either on given date or never
          expiryforkey = expiry;
        }

        // create new domain key by making API request
        const endpoint = new URL('https://helix-pages.anywhere.run/helix-services/run-query@v3/rotate-domainkeys');
        const body = {
          url: urlforkey,
          newkey: domainkey,
          domainkey: HELIX_RUN_QUERY_DOMAIN_KEY,
          readonly: true,
          note: 'from franklin-domainkey-provider',
          expiry: expiryforkey,
        };
        const res = await fetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const json = await res.json();
        if (!res.ok || json.results.data[0].status !== 'success') {
          return new Response(`Error while rotating domain keys: ${res.statusText}`, {
            status: 503,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
          });
        }
        return new Response(JSON.stringify(json.results.data[0]), {
          status: 201,
          headers: {
            'content-type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      } else {
        // email not verified
        return new Response('Email not verified', {
          status: 503,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }
    }
  }
  /* c8 ignore stop */

  if (!domain) {
    return new Response('No domain specified', {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  if (!domainkey) {
    // the domain key is not set, so generate a new key (a UUID) for the domain and
    // provide instructions on how to set up DNS validation
    const newkey = randomUUID();
    const hash = hashMe(domain, newkey);
    const currentURL = new URL(request.url);
    currentURL.search = '';

    const instructions = `Please add a TXT record for _rum-challenge.${domain} with the value ${hash}. Once
the record is added, you can verify that it is set up correctly by making a POST request to this URL including
the domain and domainkey parameters. For example:

curl -X POST -F "domain=${domain}" -F "domainkey=${newkey}" ${currentURL}
`;
    return new Response(instructions, {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        'x-error': 'domainkey not set',
        'x-domainkey': newkey,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  // the domain key is set, so verify that the TXT record is set up correctly
  const hash = hashMe(domain, domainkey);
  const txt = `_rum-challenge.${domain}`;
  let txtrecords = [];
  try {
    txtrecords = await resolveTxtAsync(txt);
  } catch (e) {
    context.logger.error(`Error while resolving TXT record for ${txt}: ${e.message}`);
  }
  if (txtrecords.length === 0) {
    return new Response(`No TXT record found for ${txt}`, {
      status: 404,
      headers: {
        'x-error': 'TXT record not found',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  if (txtrecords[0].indexOf(hash) === -1) {
    return new Response(`TXT record for ${txt} does not contain ${hash}`, {
      status: 403,
      headers: {
        'x-error': 'TXT record does not match',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  // create new domain key by making API request
  const endpoint = new URL('https://helix-pages.anywhere.run/helix-services/run-query@v3/rotate-domainkeys');
  const body = {
    url: domain,
    newkey: domainkey,
    domainkey: HELIX_RUN_QUERY_DOMAIN_KEY,
    readonly: false,
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json();
  if (!res.ok || json.results.data[0].key !== domainkey) {
    return new Response(`Error while rotating domain keys: ${res.statusText}`, {
      status: 503,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  const confirmedkey = json.results.data[0].key;
  return new Response(`TXT record for ${txt} contains ${hash}, you can now use the domainkey ${confirmedkey}`, {
    status: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export const main = wrap(run)
  .with(helixStatus)
  .with(logger.trace)
  .with(logger)
  .with(bodyData);
