# Franklin Domainkey Provider

> Create domainkeys for your domain by completing a DNS challenge

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/franklin-domainkey-provider.svg)](https://codecov.io/gh/adobe/franklin-domainkey-provider)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/franklin-domainkey-provider.svg)](https://circleci.com/gh/adobe/franklin-domainkey-provider)
[![GitHub license](https://img.shields.io/github/license/adobe/franklin-domainkey-provider.svg)](https://github.com/adobe/franklin-domainkey-provider/blob/main/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/franklin-domainkey-provider.svg)](https://github.com/adobe/franklin-domainkey-provider/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/franklin-domainkey-provider.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/franklin-domainkey-provider)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Usage

Start by calling the service

```bash
curl https://eynvwoxb7l.execute-api.us-east-1.amazonaws.com/helix-services/domainkey-provider/v1/
```

It will tell you that it needs a `domain` parameter, so we try again

```bash
curl -X POST -d domain=example.com https://eynvwoxb7l.execute-api.us-east-1.amazonaws.com/helix-services/domainkey-provider/v1/
```

This will return instruction on setting completing the callenge. The response
contains a domain key that will be a UUID like `f4a5cb7f-adac-450c-919f-a12b13cec116`
as well as a challenge that is a hash of the domain key and your domain like
`4a159285c173d7ac98a3e20c746b46d191ea14dd53214b42a2f6ed36f7d2aeb7`

Create a TXT record for `_rum_-challenge.example.com` with the value of the challenge. 
You can verify that the record has been set using `dig`

```bash
dig TXT _rum-challenge.example.com
```

Once the record is set, you can call the service again to verify that the challenge
has been completed and start issuing domain keys.

```bash
curl -X POST -d "domain=example.com&domainkey=f4a5cb7f-adac-450c-919f-a12b13cec116" https://eynvwoxb7l.execute-api.us-east-1.amazonaws.com/helix-services/domainkey-provider/v1/
```

If the domain key has been verified and activated, you will see a response status of
201. If the domain key has not been verified, you will see a response status of 403.

## Development

### Deploying Franklin Domainkey Provider

All commits to main that pass the testing will be deployed automatically. All commits to branches that will pass the testing will get commited as `/helix-services/service@ci<num>` and tagged with the CI build number.
