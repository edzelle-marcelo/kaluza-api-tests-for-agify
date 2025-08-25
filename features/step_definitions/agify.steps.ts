import { After, Before, Given, Then, When, setDefaultTimeout } from '@cucumber/cucumber';
import axios, { AxiosResponse } from 'axios';

import assert from 'assert';
import nock from 'nock';

setDefaultTimeout(60 * 1000);

let endpoint = '';
let queryParams: Record<string, string | string[]> = {};
let preparedRequestValid = false;
let response: AxiosResponse | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Before(function () {
  // Reset state
  endpoint = '';
  queryParams = {};
  preparedRequestValid = false;
  response = null;

  // Setup nock to mock the Agify API and prevent real network calls
  nock.cleanAll();
  nock.disableNetConnect();

  const base = 'https://api.agify.io';

  // Single-name mock for edzelle
  nock(base)
    .get('/')
    .query((q) => q.name === 'edzelle')
    .reply(200, { name: 'edzelle', age: 44, count: 4 }, { 'Content-Type': 'application/json' });

  // Unknown name mock
  nock(base)
    .get('/')
    .query((q) => q.name === 'zzzzzzzz')
    .reply(200, { name: 'zzzzzzzz', age: null, count: 0 }, { 'Content-Type': 'application/json' });

  // Multi-name mock: two responses in array when query uses name[]
  nock(base)
    .get('/')
    .query(true)
    .reply(function (uri) {
      const url = new URL(base + uri);
      const nameArray = url.searchParams.getAll('name[]');
      if (nameArray && nameArray.length > 0) {
        const body = nameArray.map((n) => ({ name: n, age: n === 'edzelle' ? 69 : 36, count: 100 }));
        return [200, body, { 'Content-Type': 'application/json' }];
      }
      // Not matched — let other interceptors handle
      return [404, { message: 'Not mocked' }];
    });
});

After(function () {
  nock.enableNetConnect();
  nock.cleanAll();
});

Given('the API endpoint is {string}', function (url: string) {
  endpoint = url;
});

Given('the query parameter {string} is set to {string}', function (key: string, value: string) {
  // Support multiple entries for keys like "name[]"
  if (key.endsWith('[]')) {
    const baseKey = key;
    if (!Array.isArray(queryParams[baseKey])) queryParams[baseKey] = [];
    (queryParams[baseKey] as string[]).push(value);
  } else {
    queryParams[key] = value;
  }
});

When('I prepare the request', function () {
  const allowedNameRegex = /^[a-zA-Z'-]+$/;
  const name = (queryParams['name'] as string) || '';
  const nameArray = (queryParams['name[]'] as string[]) || [];

  const singleValid = typeof name === 'string' && name.trim().length > 0 && allowedNameRegex.test(name.trim());
  const arrayValid = Array.isArray(nameArray) && nameArray.length > 0 && nameArray.every((n) => allowedNameRegex.test(n));

  preparedRequestValid = Boolean(endpoint) && (singleValid || arrayValid);
});

Then('the request should be valid', function () {
  assert.strictEqual(preparedRequestValid, true, 'Expected request to be valid but it was invalid');
});

Then('the request should contain the query parameter {string}', function (key: string) {
  assert.ok(Object.prototype.hasOwnProperty.call(queryParams, key), `Request missing query parameter: ${key}`);
});

Then('the request should be invalid', function () {
  assert.strictEqual(preparedRequestValid, false, 'Expected request to be invalid but it was valid');
});

When('I send the request', async function () {
  if (!endpoint) throw new Error('Endpoint is not set');

  const qsParts: string[] = [];
  for (const [k, v] of Object.entries(queryParams)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        qsParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(item)}`);
      }
    } else {
      qsParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`);
    }
  }
  const queryString = qsParts.join('&');
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  try {
    response = await axios.get(url, { timeout: 5000, validateStatus: () => true });
    if (response?.status === 429) {
      const retryAfter = parseInt(String(response.headers['retry-after'] || response.headers['Retry-After'] || '0'), 10) || 0;
      if (retryAfter > 0) {
        await sleep(retryAfter * 1000);
        response = await axios.get(url, { timeout: 5000, validateStatus: () => true });
      }
    }
  } catch (err) {
    throw err;
  }
});

Then('the response status code should be {int}', function (code: number) {
  assert.ok(response, 'No response received from the API');
  assert.strictEqual(response!.status, code, `Expected status ${code} but got ${response!.status}`);
});

Then('the response should have a JSON content type', function () {
  assert.ok(response, 'No response received from the API');
  const ct = response!.headers['content-type'] || response!.headers['Content-Type'];
  assert.ok(ct && String(ct).toLowerCase().includes('application/json'), `Expected application/json content-type but got: ${ct}`);
});

Then('the response body should contain the {string} property', function (prop: string) {
  assert.ok(response, 'No response received from the API');
  assert.ok(response!.data && Object.prototype.hasOwnProperty.call(response!.data, prop), `Response body missing property: ${prop}`);
});

Then('the response body should contain the {string} property with value {string}', function (prop: string, value: string) {
  assert.ok(response, 'No response received from the API');
  assert.strictEqual(String(response!.data[prop]), value, `Expected response.${prop} to be "${value}" but got "${response!.data[prop]}"`);
});

Then('the response body should contain the {string} property as number', function (prop: string) {
  assert.ok(response, 'No response received from the API');
  const val = response!.data[prop];
  assert.strictEqual(typeof val, 'number', `Expected ${prop} to be a number but got ${typeof val}`);
});

Then('the response body should contain the {string} property as number or null', function (prop: string) {
  assert.ok(response, 'No response received from the API');
  const val = response!.data[prop];
  const ok = val === null || typeof val === 'number';
  assert.ok(ok, `Expected ${prop} to be number or null but got ${typeof val}`);
});

Then('the response body should be an array with length {int}', function (len: number) {
  assert.ok(response, 'No response received from the API');
  assert.ok(Array.isArray(response!.data), 'Expected response body to be an array');
  assert.strictEqual((response!.data as any[]).length, len, `Expected array length ${len} but got ${(response!.data as any[]).length}`);
});

Then('the first item should contain the {string} property', function (prop: string) {
  assert.ok(response, 'No response received from the API');
  assert.ok(Array.isArray(response!.data), 'Expected response body to be an array');
  assert.ok(Object.prototype.hasOwnProperty.call((response!.data as any[])[0], prop), `First item missing property: ${prop}`);
});
