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

/* eslint-env mocha */
import assert from 'assert';
import { Request } from '@adobe/fetch';
import { main } from '../src/index.js';

describe('Index Tests', () => {
  it('index rejects to run if no domain key is available', async () => {
    const result = await main(new Request('https://localhost/'), {
      env: {},
    });
    assert.equal(result.status, 500);
    assert.strictEqual(await result.text(), 'No HELIX_RUN_QUERY_DOMAIN_KEY set. This is a configuration error');
  });

  it('index requires a domain', async () => {
    const result = await main(new Request('https://localhost/'), {
      env: {
        HELIX_RUN_QUERY_DOMAIN_KEY: 'foo',
      },
    });
    assert.equal(result.status, 400);
    assert.strictEqual(await result.text(), 'No domain specified');
  });

  it('index generates a domain key if not specified', async () => {
    const result = await main(new Request('https://localhost/?domain=example.com'), {
      env: {
        HELIX_RUN_QUERY_DOMAIN_KEY: 'foo',
      },
    });
    assert.equal(result.status, 404);
    const newkey = result.headers.get('x-domainkey');
    const txt = await result.text();
    assert(txt.indexOf(newkey) >= 0);
    console.log(txt);
  });

  it('index returns 404 if text record is not set', async () => {
    const result = await main(new Request('https://localhost/?domain=example.com&domainkey=foo'), {
      env: {
        HELIX_RUN_QUERY_DOMAIN_KEY: 'foo',
      },
      logger: console,
    });
    assert.equal(result.status, 404);
  });

  it('index returns 403 if text record is set but wrong', async () => {
    const result = await main(new Request('https://localhost/?domain=johansminecraft.club&domainkey=bar'), {
      env: {
        HELIX_RUN_QUERY_DOMAIN_KEY: 'foo',
      },
      logger: console,
    });
    assert.equal(result.status, 403);
  });

  it('index returns 503 if rotating the domainkey failed for backend reasons', async () => {
    const result = await main(new Request('https://localhost/?domain=johansminecraft.club&domainkey=foo'), {
      env: {
        HELIX_RUN_QUERY_DOMAIN_KEY: 'baz', // this key is wrong on purpose so that the update won't go through
      },
      logger: console,
    });
    assert.equal(result.status, 503);
  }).timeout(50000);

  it('index returns 201 if rotating the domainkey worked as expected', async () => {
    const result = await main(new Request('https://localhost/?domain=johansminecraft.club&domainkey=foo'), {
      env: {
        HELIX_RUN_QUERY_DOMAIN_KEY: process.env.TEST_DOMAINKEY, // this one is real,
        // but only for one domain
      },
      logger: console,
    });
    assert.equal(result.status, 201, await result.text());
  }).timeout(50000);
});
