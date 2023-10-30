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

const resolveTxtAsync = promisify(resolveTxt);

function hashMe(domain, domainkey) {
  const hash = createHash('sha256');
  hash.update(domain);
  hash.update(domainkey);
  return hash.digest('hex');
}

/**
 * This is the main function
 * @param {Request} request the request object (see fetch api)
 * @param {UniversalContext} context the context of the universal serverless function
 * @returns {Response} a response
 */
export async function run(request, context) {
  const { HELIX_RUN_QUERY_DOMAIN_KEY } = context.env;
  const { data } = context;
  const { domain, domainkey } = data;
  if (!HELIX_RUN_QUERY_DOMAIN_KEY) {
    return new Response('No HELIX_RUN_QUERY_DOMAIN_KEY set. This is a configuration error', {
      status: 500,
    });
  }
  if (!domain) {
    return new Response('No domain specified', {
      status: 400,
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

curl -X POST -d "domain=${domain}&domainkey=${newkey}" ${currentURL}
`;
    return new Response(instructions, {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        'x-error': 'domainkey not set',
        'x-domainkey': newkey,
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
    //context.logger.error(`Error while resolving TXT record for ${txt}: ${e.message}`);
  }
  if (txtrecords.length === 0) {
    return new Response(`No TXT record found for ${txt}`, {
      status: 404,
      headers: {
        'x-error': 'TXT record not found',
      },
    });
  }
  if (txtrecords[0].indexOf(hash) === -1) {
    return new Response(`TXT record for ${txt} does not contain ${hash}`, {
      status: 403,
      headers: {
        'x-error': 'TXT record does not match',
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
    });
  }
  const confirmedkey = json.results.data[0].key;
  return new Response(`TXT record for ${txt} contains ${hash}, you can now use the domainkey ${confirmedkey}`, {
    status: 201,
  });
}