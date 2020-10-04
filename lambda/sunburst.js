const https = require('https');
const qs = require('querystring');

// Sunburst API docs: https://sunburst.sunsetwx.com/v1/docs/

class Sunburst {
  constructor(config) {
    this.agent = new https.Agent(); // TODO: should it use { keepAlive: true }
    this.username = config.username;
    this.password = config.password;
    this.accessToken = null; // this will be managed by request()
  }

  async request(endpoint, options = {}, data, isRetry = false) {
    const self = this; // keep reference in closure
    return new Promise(async function(resolve, reject) {
      // quick and dirty deep copy of options with default values
      const requestOptions = Object.assign({}, {
        agent: self.agent,
        hostname: 'sunburst.sunsetwx.com',
        path: `/v1/${endpoint}`,
        headers: {},
      }, JSON.parse(JSON.stringify(options)));

      if (!requestOptions.headers.authorization) {
        if (!self.accessToken) {
          self.accessToken = await self.login();
        }
        requestOptions.headers.authorization = `Bearer ${self.accessToken}`;
      }

      const req = https.request(requestOptions, (res) => {
        const chunks = [];
        res.on("data", (chunk) => {
          chunks.push(chunk);
        });
        res.on("end", async () => {
          try {
            let response;
            const {statusCode} = res;
            if (statusCode === 200) {
              response = JSON.parse(Buffer.concat(chunks).toString());
            } else if (statusCode === 401 && !isRetry) {
              self.accessToken = null;
              response = await self.request(endpoint, options, data, true);
            } else { // TODO: are there any other cases that should retry?
              throw new Error(`Sunburst: unexpected response ${statusCode}`);
            }
            resolve(response);
          } catch (parseError) {
            reject(parseError);
          }
        });
        res.on("error", (error) => {
          reject(error);
        });
      });
      if (data) {
        req.write(data);
      }
      req.end();
    });
  }

  async login() {
    const authorization = 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString("base64");
    const options = {
      method: 'POST',
      'headers': {
        authorization,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };
    const postData = qs.stringify({
      'grant_type': 'password',
      'expires_in': '900', // 900 to 604800 seconds (15 mins to 1 week)
    });
    const response = await this.request('login', options, postData);
    const {access_token: accessToken} = response;
    if (!accessToken) {
      throw new Error("Sunburst: could not login");
    }
    return accessToken;
  }

  async getQuality(geo) {
    const queryParams = qs.stringify({geo});
    return this.request(`quality?${queryParams}`);
  }
}

module.exports = { Sunburst }
